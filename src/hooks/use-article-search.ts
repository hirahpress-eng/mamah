'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SearchMatch {
  sectionIndex: number;
  text: string;
  startIndex: number;
  endIndex: number;
  /** Global index across all sections (for current match navigation) */
  globalIndex: number;
}

export interface UseArticleSearchOptions {
  /** Array of section content strings to search through */
  sections: string[];
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Escape special regex characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Find all matches of `query` (case-insensitive) in `text`, returning positions */
function findMatchesInText(text: string, query: string): { text: string; startIndex: number; endIndex: number }[] {
  if (!query) return [];
  const escaped = escapeRegex(query);
  const regex = new RegExp(escaped, 'gi');
  const results: { text: string; startIndex: number; endIndex: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    results.push({
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
    // Prevent infinite loop for zero-length matches
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }

  return results;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useArticleSearch({ sections, debounceMs = 300 }: UseArticleSearchOptions) {
  const [searchQuery, setSearchQueryRaw] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounce search input ──
  const setSearchQuery = useCallback(
    (value: string) => {
      setSearchQueryRaw(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setDebouncedQuery(value);
      }, debounceMs);
    },
    [debounceMs],
  );

  // ── Clean up debounce timer ──
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Compute all matches across sections ──
  const matches: SearchMatch[] = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const allMatches: SearchMatch[] = [];
    let globalIndex = 0;

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const sectionMatches = findMatchesInText(sections[sectionIndex], debouncedQuery);
      for (const m of sectionMatches) {
        allMatches.push({
          sectionIndex,
          text: m.text,
          startIndex: m.startIndex,
          endIndex: m.endIndex,
          globalIndex,
        });
        globalIndex++;
      }
    }

    return allMatches;
  }, [debouncedQuery, sections]);

  const totalMatches = matches.length;

  // ── Reset current match index when matches change ──
  useEffect(() => {
    const id = requestAnimationFrame(() => setCurrentMatchIndex(0));
    return () => cancelAnimationFrame(id);
  }, [totalMatches]);

  // ── Navigation ──
  const goToNextMatch = useCallback(() => {
    setCurrentMatchIndex((prev) => (totalMatches > 0 ? (prev + 1) % totalMatches : 0));
  }, [totalMatches]);

  const goToPrevMatch = useCallback(() => {
    setCurrentMatchIndex((prev) => (totalMatches > 0 ? (prev - 1 + totalMatches) % totalMatches : 0));
  }, [totalMatches]);

  const goToMatch = useCallback(
    (index: number) => {
      setCurrentMatchIndex(Math.max(0, Math.min(index, totalMatches - 1)));
    },
    [totalMatches],
  );

  // ── Clear search ──
  const clearSearch = useCallback(() => {
    setSearchQueryRaw('');
    setDebouncedQuery('');
    setCurrentMatchIndex(0);
  }, []);

  const isSearching = searchQuery.trim().length > 0;

  return {
    searchQuery,
    setSearchQuery,
    matches,
    currentMatchIndex,
    goToNextMatch,
    goToPrevMatch,
    goToMatch,
    totalMatches,
    clearSearch,
    isSearching,
  };
}
