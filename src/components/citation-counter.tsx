'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Users } from 'lucide-react';
import type { GeneratedArticle } from '@/store/article-store';

// ─── Animated Counter Hook ──────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1000, enabled = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      const id = requestAnimationFrame(() => setValue(0));
      return () => cancelAnimationFrame(id);
    }

    let rafId: number;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, enabled]);

  return value;
}

// ─── Citation Analysis ──────────────────────────────────────────────────

interface CitationResult {
  total: number;
  uniqueAuthors: number;
}

function analyzeCitations(article: GeneratedArticle): CitationResult {
  const allContent = article.sections.map((s) => s.content).join(' ');

  if (!allContent.trim()) return { total: 0, uniqueAuthors: 0 };

  // Match APA patterns: (Author, Year), (Author et al., Year), (Author & Author, Year)
  const pattern = /\(([^)]+?),\s*\d{4}\)/g;
  const matches = allContent.match(pattern);

  if (!matches) return { total: 0, uniqueAuthors: 0 };

  const total = matches.length;

  // Extract unique author names (normalised to lowercase)
  const authorSet = new Set<string>();
  for (const match of matches) {
    // Extract text before the comma and year
    const inner = match.slice(1, -1); // remove parens
    const lastComma = inner.lastIndexOf(',');
    if (lastComma > 0) {
      let authorPart = inner.slice(0, lastComma).trim().toLowerCase();
      // Remove "et al." for deduplication
      authorPart = authorPart.replace(/\s*et\s+al\.?\s*$/i, '').trim();
      // For "&" citations, take the first author
      if (authorPart.includes('&')) {
        authorPart = authorPart.split('&')[0].trim();
      }
      if (authorPart) authorSet.add(authorPart);
    }
  }

  return {
    total,
    uniqueAuthors: authorSet.size,
  };
}

// ─── Citation Counter Component ─────────────────────────────────────────

interface CitationCounterProps {
  article: GeneratedArticle;
}

export default function CitationCounter({ article }: CitationCounterProps) {
  const analysis = useMemo(() => analyzeCitations(article), [article]);
  const animatedTotal = useAnimatedCounter(analysis.total, 1000, true);
  const animatedAuthors = useAnimatedCounter(analysis.uniqueAuthors, 800, true);
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="relative">
      {/* Pill badge */}
      <motion.button
        onClick={() => setShowDetail((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
          bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300
          border border-emerald-200/60 dark:border-emerald-800/50
          hover:bg-emerald-100 dark:hover:bg-emerald-900/50
          transition-colors cursor-pointer select-none"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        aria-label={`${analysis.total} citations found`}
      >
        <Quote className="size-3.5 shrink-0" />
        <span className="tabular-nums font-semibold">{animatedTotal}</span>
        <span className="hidden sm:inline">citations</span>
      </motion.button>

      {/* Expanded breakdown tooltip */}
      <AnimatePresence>
        {showDetail && (
          <>
            {/* Backdrop to dismiss */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetail(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute top-full mt-2 right-0 z-50 w-56 rounded-xl border border-border/60
                bg-white dark:bg-slate-900 shadow-lg p-3 space-y-2.5"
            >
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Quote className="size-3.5 text-emerald-500" />
                Citation Breakdown
              </p>

              <div className="space-y-2">
                {/* Total citations */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Total citations</span>
                  <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {animatedTotal}
                  </span>
                </div>

                {/* Unique authors */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Users className="size-3" />
                    Unique authors
                  </span>
                  <span className="text-sm font-bold tabular-nums text-teal-600 dark:text-teal-400">
                    {animatedAuthors}
                  </span>
                </div>

                {/* Small divider */}
                <div className="h-px bg-border/60" />

                {/* Density hint */}
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {analysis.total >= 30
                    ? '✨ Well-cited — excellent academic rigour'
                    : analysis.total >= 15
                      ? '👍 Good citation density for an academic article'
                      : '💡 Consider adding more citations to strengthen arguments'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
