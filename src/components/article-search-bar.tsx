'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// ── Types ────────────────────────────────────────────────────────────────────

interface ArticleSearchBarProps {
  /** Current search query text */
  searchQuery: string;
  /** Handler to update search query */
  onSearchChange: (value: string) => void;
  /** Total number of matches found */
  totalMatches: number;
  /** Index of currently selected match (1-based display) */
  currentMatchIndex: number;
  /** Navigate to next match */
  onNext: () => void;
  /** Navigate to previous match */
  onPrev: () => void;
  /** Clear search */
  onClear: () => void;
  /** Whether search is active (bar should be visible) */
  isOpen: boolean;
  /** Callback to open the search bar (e.g. via Ctrl+F) */
  onOpen: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ArticleSearchBar({
  searchQuery,
  onSearchChange,
  totalMatches,
  currentMatchIndex,
  onNext,
  onPrev,
  onClear,
  isOpen,
  onOpen,
}: ArticleSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Focus input when opened ──
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // ── Keyboard shortcut: Ctrl+F / Cmd+F to open ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        onOpen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpen]);

  // ── Keyboard navigation within input ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onNext();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClear();
      }
    },
    [onNext, onPrev, onClear],
  );

  const displayIndex = totalMatches > 0 ? currentMatchIndex + 1 : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/90 backdrop-blur-sm shadow-lg px-3 py-2 no-print"
        >
          {/* Search icon */}
          <Search className="size-4 text-muted-foreground shrink-0" />

          {/* Input */}
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search in article..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-sm placeholder:text-muted-foreground/50 min-w-[180px] max-w-[300px]"
          />

          {/* Match count */}
          {searchQuery.trim().length > 0 && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-xs text-muted-foreground whitespace-nowrap tabular-nums"
            >
              {displayIndex} of {totalMatches}
            </motion.span>
          )}

          {/* Navigation buttons */}
          {totalMatches > 0 && (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onPrev}
                aria-label="Previous match"
              >
                <ChevronUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onNext}
                aria-label="Next match"
              >
                <ChevronDown className="size-3.5" />
              </Button>
            </div>
          )}

          {/* Clear button */}
          {searchQuery.trim().length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={onClear}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </Button>
          )}

          {/* Keyboard hint */}
          <span className="hidden lg:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/40 whitespace-nowrap">
            <kbd className="rounded border border-border/40 px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            <kbd className="rounded border border-border/40 px-1 py-0.5 font-mono text-[10px]">F</kbd>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
