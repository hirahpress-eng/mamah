'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useArticleStore } from '@/store/article-store';
import type { ArticleSection, Reference } from '@/store/article-store';
import { exportToMarkdown } from '@/lib/export-markdown';
import { exportToPdf } from '@/lib/export-pdf';
import { useArticleSearch } from '@/hooks/use-article-search';
import ArticleSearchBar from '@/components/article-search-bar';
import { useTheme } from 'next-themes';

import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileText,
  Copy,
  Download,
  ChevronUp,
  Printer,
  BookOpen,
  ArrowRight,
  List,
  Maximize2,
  Check,
  ExternalLink,
  GraduationCap,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Sparkles,
  Clock,
  Loader2,
  RefreshCw,
  FileDown,
  X,
  Sun,
  Moon,
  } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_WORD_COUNT = 18000;
const WORDS_PER_MINUTE = 200;

const SECTION_TARGET_WORDS: Record<string, number> = {
  abstract: 400,
  introduction: 5250,
  method: 2000,
  results: 7250,
  conclusion: 800,
  bibliography: 500,
};

const SECTION_META: Record<
  string,
  { label: string; number: string; icon: React.ReactNode }
> = {
  abstract: {
    label: 'Abstract',
    number: '1',
    icon: <FileText className="size-4" />,
  },
  introduction: {
    label: 'Introduction',
    number: '2',
    icon: <BookOpen className="size-4" />,
  },
  method: {
    label: 'Methodology',
    number: '3',
    icon: <GraduationCap className="size-4" />,
  },
  results: {
    label: 'Results & Discussion',
    number: '4',
    icon: <FileText className="size-4" />,
  },
  conclusion: {
    label: 'Conclusion',
    number: '5',
    icon: <BookOpen className="size-4" />,
  },
  bibliography: {
    label: 'References',
    number: '6',
    icon: <BookOpen className="size-4" />,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatReference(ref: Reference, index: number): string {
  const parts: string[] = [];

  parts.push(ref.authors);
  parts.push(`(${ref.year}).`);
  parts.push(ref.title);

  if (ref.journal) {
    let journalPart = ref.journal;
    if (ref.volume) journalPart += `, ${ref.volume}`;
    if (ref.issue) journalPart += `(${ref.issue})`;
    if (ref.pages) journalPart += `, ${ref.pages}`;
    journalPart += '.';
    parts.push(journalPart);
  } else {
    parts.push('.');
  }

  if (ref.doi) {
    parts.push(`https://doi.org/${ref.doi}`);
  }

  return `[${index + 1}] ${parts.join(' ')}`;
}

function buildPlainText(article: NonNullable<ReturnType<typeof useArticleStore.getState>['generatedArticle']>): string {
  const lines: string[] = [];
  const hasBibliographySection = article.sections.some((s) => s.type === 'bibliography');

  lines.push(article.title);
  lines.push('');
  lines.push(`Kata Kunci: ${article.keywords.join(', ')}`);
  lines.push('');
  lines.push(`Jumlah Kata Total: ${article.totalWordCount}`);
  lines.push('');
  lines.push('─'.repeat(60));
  lines.push('');

  for (const section of article.sections) {
    const meta = SECTION_META[section.type] || { label: section.type, number: '•' };
    lines.push(`${meta.number}. ${meta.label}`);
    lines.push('');
    // Bibliography section already contains markdown-formatted references
    lines.push(section.content);
    lines.push('');
    lines.push(`Word count: ${section.wordCount}`);
    lines.push('');
    lines.push('─'.repeat(60));
    lines.push('');
  }

  // Only show inline references if there's no bibliography section
  if (article.references.length > 0 && !hasBibliographySection) {
    lines.push('References');
    lines.push('');
    for (let i = 0; i < article.references.length; i++) {
      lines.push(formatReference(article.references[i], i));
    }
  }

  return lines.join('\n');
}

/** Returns 'good' | 'needs-work' | 'empty' based on word count vs target */
function getSectionCompletion(wordCount: number, targetWords: number): 'good' | 'needs-work' | 'empty' {
  const ratio = wordCount / targetWords;
  // 'good' = close to target (80-110%)
  // 'needs-work' = below 80% of target
  // 'empty' = 0 or nearly empty
  if (ratio >= 0.8) return 'good';
  if (ratio >= 0.3) return 'needs-work';
  return 'empty';
}

/** Estimated reading time in minutes */
function getReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

// ─── Animated Counter Hook ────────────────────────────────────────────────

/** Animates a number from 0 to target using requestAnimationFrame with cubic ease-out */
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      requestAnimationFrame(() => {
        setCount(0);
      });
      return;
    }

    let startTime: number | null = null;
    const startValue = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (target - startValue) * eased);

      requestAnimationFrame(() => {
        setCount(current);
      });

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

// ─── Search Highlight Helpers ─────────────────────────────────────────────

/** Escape special regex characters */
function escapeSearchRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Split text by query matches and wrap in highlight spans */
function highlightTextNode(text: string, query: string): React.ReactNode[] {
  if (!query.trim() || typeof text !== 'string') return [text];
  const escaped = escapeSearchRegex(query);
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return <mark key={i} className="article-search-highlight">{part}</mark>;
    }
    return part;
  });
}

/** Process children to apply highlights to string nodes */
function processChildrenForHighlight(children: React.ReactNode, query: string): React.ReactNode {
  if (!query.trim()) return children;
  if (typeof children === 'string') {
    return highlightTextNode(children, query);
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => {
      if (typeof child === 'string') {
        return <React.Fragment key={i}>{highlightTextNode(child, query)}</React.Fragment>;
      }
      return child;
    });
  }
  return children;
}

// ─── Markdown Renderer ───────────────────────────────────────────────────────

function ArticleMarkdown({ content, className, searchQuery }: { content: string; className?: string; searchQuery?: string }) {
  const hasSearch = searchQuery && searchQuery.trim().length > 0;

  return (
    <div className={`article-markdown ${className ?? ''}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-foreground mt-6 mb-3">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-foreground mt-5 mb-2">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-medium text-foreground mt-3 mb-1">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm leading-7 text-foreground/90 mb-3">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-5 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-5 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm leading-7 text-foreground/90">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-500/40 pl-4 my-4 italic text-foreground/80 bg-muted/30 rounded-r-lg py-2 pr-3">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-foreground border-b">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-foreground/90 border-b last:border-b-0">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </td>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground/85">
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </em>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
            >
              {hasSearch ? processChildrenForHighlight(children, searchQuery) : children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-muted rounded-lg p-4 overflow-x-auto my-3 text-sm font-mono">
              {children}
            </pre>
          ),
          hr: () => (
            <hr className="my-6 border-border" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ─── Section Word Count Badge ───────────────────────────────────────────────

function SectionWordBadge({ wordCount, target }: { wordCount: number; target: number }) {
  const progress = Math.min((wordCount / target) * 100, 100);
  const isOver = wordCount >= target;
  const completion = getSectionCompletion(wordCount, target);

  const dotColor =
    completion === 'good'
      ? 'bg-emerald-500'
      : completion === 'needs-work'
        ? 'bg-amber-500'
        : 'bg-red-500';

  const barColor =
    completion === 'good'
      ? '[&>div]:bg-emerald-500'
      : completion === 'needs-work'
        ? '[&>div]:bg-amber-500'
        : '[&>div]:bg-red-500';

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`size-1.5 rounded-full ${dotColor} shrink-0`} />
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {wordCount.toLocaleString()} / {target.toLocaleString()} target
        </span>
      </div>
      <Progress
        value={progress}
        className={`h-1.5 flex-1 max-w-[100px] ${barColor}`}
      />
      {isOver && (
        <Check className="size-3 text-emerald-500 shrink-0" />
      )}
    </div>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────

/** Get gradient border classes based on section completion status */
function getSectionBorderGradient(completion: 'good' | 'needs-work' | 'empty'): string {
  switch (completion) {
    case 'good':
      return 'border-l-emerald-500';
    case 'needs-work':
      return 'border-l-amber-500';
    case 'empty':
      return 'border-l-red-500';
  }
}

/** Get number badge color classes based on section completion status */
function getSectionBadgeColors(completion: 'good' | 'needs-work' | 'empty'): string {
  switch (completion) {
    case 'good':
      return 'bg-emerald-500 text-white';
    case 'needs-work':
      return 'bg-amber-500 text-white';
    case 'empty':
      return 'bg-red-500 text-white';
  }
}

function SectionCard({
  section,
  sectionIndex,
  isExpanded,
  onToggleExpand,
  searchQuery,
}: {
  section: ArticleSection;
  sectionIndex: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  searchQuery?: string;
}) {
  const [copied, setCopied] = useState(false);
  const sectionId = `section-${section.type}`;
  const meta = SECTION_META[section.type] || { label: section.type, number: '•', icon: <FileText className="size-4" /> };
  const isAbstract = section.type === 'abstract';
  const target = SECTION_TARGET_WORDS[section.type] ?? 1000;
  const completion = getSectionCompletion(section.wordCount, target);
  const borderGradientClass = getSectionBorderGradient(completion);
  const badgeColors = getSectionBadgeColors(completion);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(section.content);
      setCopied(true);
      toast.success(`${meta.label} disalin ke clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin bagian');
    }
  }, [section.content, meta.label]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card
        id={sectionId}
        className={`scroll-mt-24 rounded-lg border border-border/50 border-l-4 ${borderGradientClass} transition-all duration-200 -translate-y-0 hover:-translate-y-0.5 hover:shadow-lg ${
          isAbstract ? 'border-emerald-200 dark:border-emerald-900/50' : ''
        }`}
      >
        <CardHeader>
          <div className="flex items-center gap-3">
            {/* Section number badge - colored circle based on completion */}
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeColors}`}>
              {meta.number}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg text-foreground">{meta.label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {section.wordCount.toLocaleString()} words
              </p>
              {/* Section word count badge with progress bar */}
              <SectionWordBadge wordCount={section.wordCount} target={target} />
            </div>
          </div>
          <CardAction className="flex items-center gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => {
                      toast.info(`Buat ulang ${meta.label}? Pembuatan ulang bagian segera hadir!`);
                    }}
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Buat Ulang Bagian</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Salin Bagian</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={isExpanded ? 'expanded' : 'collapsed'}
                          initial={{ rotate: -90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={{ rotate: 90, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <ChevronUp className="size-3.5" />
                        </motion.div>
                      </AnimatePresence>
                    </Button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                <TooltipContent>{isExpanded ? 'Perkecil' : 'Perluas'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardAction>
        </CardHeader>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              <CardContent>
                {isAbstract ? (
                  <div className="max-w-2xl mx-auto">
                    <ArticleMarkdown content={section.content} className="italic" searchQuery={searchQuery} />
                  </div>
                ) : (
                  <ArticleMarkdown content={section.content} searchQuery={searchQuery} />
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </Collapsible>
  );
}

// ─── References Card ─────────────────────────────────────────────────────────

function ReferencesCard({
  references,
  isExpanded,
  onToggleExpand,
}: {
  references: Reference[];
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const text = references.map((ref, i) => formatReference(ref, i)).join('\n\n');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Referensi disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin referensi');
    }
  }, [references]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card id="section-references" className="scroll-mt-24 rounded-lg border border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              <span className="text-sm font-bold">R</span>
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg text-foreground">References</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                APA 7 Format · {references.length} sources
              </p>
            </div>
          </div>
          <CardAction className="flex items-center gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" onClick={handleCopy}>
                    {copied ? (
                      <Check className="size-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Salin Referensi</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={isExpanded ? 'expanded' : 'collapsed'}
                          initial={{ rotate: -90, opacity: 0 }}
                          animate={{ rotate: 0, opacity: 1 }}
                          exit={{ rotate: 90, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <ChevronUp className="size-3.5" />
                        </motion.div>
                      </AnimatePresence>
                    </Button>
                  </CollapsibleTrigger>
                </TooltipTrigger>
                <TooltipContent>{isExpanded ? 'Perkecil' : 'Perluas'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardAction>
        </CardHeader>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              <CardContent>
                <div className="space-y-3">
                  {references.map((ref, index) => (
                    <div
                      key={ref.id}
                      className="group flex gap-3 text-sm leading-relaxed text-foreground/90 hover:bg-muted/30 rounded-lg p-2 -mx-2 transition-colors"
                    >
                      <span className="shrink-0 text-muted-foreground font-mono text-xs pt-0.5 w-6 text-right">
                        [{index + 1}]
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground/90 leading-6">
                          {ref.authors} ({ref.year}).{' '}
                          <span className="font-medium">{ref.title}</span>
                          {ref.journal && (
                            <span className="text-muted-foreground">
                              {' '}
                              <em>{ref.journal}</em>
                              {ref.volume && `, ${ref.volume}`}
                              {ref.issue && `(${ref.issue})`}
                              {ref.pages && `, ${ref.pages}`}
                            </span>
                          )}
                        </p>
                        {ref.doi && (
                          <a
                            href={`https://doi.org/${ref.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 mt-1"
                          >
                            doi:{ref.doi}
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </Collapsible>
  );
}

// ─── Section Completion Dot ─────────────────────────────────────────────────

function CompletionDot({ completion }: { completion: 'good' | 'needs-work' | 'empty' }) {
  const color =
    completion === 'good'
      ? 'bg-emerald-500'
      : completion === 'needs-work'
        ? 'bg-amber-500'
        : 'bg-red-500';

  const pulseColor =
    completion === 'good'
      ? 'ring-emerald-500/30'
      : completion === 'needs-work'
        ? 'ring-amber-500/30'
        : 'ring-red-500/30';

  return (
    <span className={`relative flex size-2.5 shrink-0`}>
      <span
        className={`absolute inset-0 rounded-full ${color} opacity-40 animate-ping`}
        style={{ animationDuration: '2s' }}
      />
      <span className={`relative rounded-full ${color} ring-2 ${pulseColor} ring-offset-1 ring-offset-background`} />
    </span>
  );
}

// ─── Table of Contents (Desktop Sidebar) ────────────────────────────────────

function TableOfContents({
  sections,
  references,
  activeSection,
}: {
  sections: ArticleSection[];
  references: Reference[];
  activeSection: string;
}) {
  const hasBibliographySection = sections.some((s) => s.type === 'bibliography');
  const allSections = [
    ...sections.map((s) => ({
      id: `section-${s.type}`,
      ...SECTION_META[s.type],
      wordCount: s.wordCount,
      target: SECTION_TARGET_WORDS[s.type] ?? 1000,
    })),
    // Only show References TOC item if there's no bibliography section
    ...(hasBibliographySection ? [] : [{
      id: 'section-references',
      label: 'References',
      number: 'R',
      icon: <BookOpen className="size-3.5" />,
      wordCount: references.length,
      target: 20, // references target
    }]),
  ];

  return (
    <nav aria-label="Daftar Isi">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <List className="size-4 text-emerald-600" />
        Daftar Isi
      </h3>
      <ScrollArea className="max-h-[calc(100vh-14rem)]">
        <ul className="space-y-0.5">
          {allSections.map((item) => {
            const isActive = activeSection === item.id;
            const completion = getSectionCompletion(item.wordCount, item.target);
            const progressPct = Math.min((item.wordCount / item.target) * 100, 100);

            return (
              <li key={item.id} className="relative">
                {/* Active section emerald left border */}
                {isActive && (
                  <motion.div
                    layoutId="toc-active-border"
                    className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-emerald-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <a
                  href={`#${item.id}`}
                  className={`
                    flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200
                    ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 font-medium dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }
                  `}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {/* Completion dot */}
                  <CompletionDot completion={completion} />
                  <div
                    className={`
                      flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold transition-colors
                      ${
                        isActive
                          ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200'
                          : 'bg-muted text-muted-foreground'
                      }
                    `}
                  >
                    {item.number}
                  </div>
                  <span className="flex-1 truncate">{item.label}</span>
                  {/* Mini progress indicator */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          completion === 'good'
                            ? 'bg-emerald-500'
                            : completion === 'needs-work'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {item.wordCount.toLocaleString()}
                    </span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </nav>
  );
}

// ─── Back to Top Button ──────────────────────────────────────────────────────

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shadow-lg bg-background border-border"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <ArrowUp className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Kembali ke atas</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Step4Output() {
  const {
    generatedArticle,
    setPolishedArticle,
    nextStep,
    resetAll,
    setCurrentStep,
  } = useArticleStore();

  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true);
    });
  }, []);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(['abstract', 'introduction', 'method', 'results', 'discussion', 'conclusion', 'bibliography', 'references'])
  );
  const [activeSection, setActiveSection] = useState<string>('section-abstract');
  const [copiedAll, setCopiedAll] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [fullscreenReadingProgress, setFullscreenReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const fullscreenContentRef = useRef<HTMLDivElement>(null);

  // ── Article or null guard ──
  const article = generatedArticle;

  // ── Intersection Observer for active section ──
  useEffect(() => {
    if (!article) return;

    const sectionIds = [
      ...article.sections.map((s) => `section-${s.type}`),
      // Only observe references section if it exists in the DOM
      ...(document.getElementById('section-references') ? ['section-references'] : []),
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveSection(topEntry.target.id);
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    );

    // Small delay to allow DOM to settle after render
    const timer = setTimeout(() => {
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [article]);

  // ── Copy all ──
  const handleCopyAll = useCallback(async () => {
    if (!article) return;
    try {
      const text = buildPlainText(article);
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      toast.success('Berhasil disalin ke clipboard');
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast.error('Gagal menyalin');
    }
  }, [article]);

  // ── Download as text ──
  const handleDownloadText = useCallback(() => {
    if (!article) return;
    const text = buildPlainText(article);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Artikel diunduh sebagai file teks');
  }, [article]);

  // ── Print ──
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ── Export as PDF ──
  const handleExportPdf = useCallback(async () => {
    if (!article || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportToPdf(article);
      toast.success('Artikel diunduh sebagai PDF');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Gagal membuat PDF. Silakan coba lagi.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [article, isExportingPdf]);

  // ── Toggle section ──
  const toggleSection = useCallback((type: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // ── Expand / Collapse All ──
  const expandAll = useCallback(() => {
    if (!article) return;
    const allKeys = new Set([
      ...article.sections.map((s) => s.type),
      'references',
    ]);
    setExpandedSections(allKeys);
  }, [article]);

  const collapseAll = useCallback(() => {
    setExpandedSections(new Set());
  }, []);

  const hasBibliographySection = article?.sections.some((s) => s.type === 'bibliography') ?? false;
  const allExpanded = article
    ? article.sections.every((s) => expandedSections.has(s.type)) &&
      (!hasBibliographySection || expandedSections.has('references'))
    : false;

  const noneExpanded = expandedSections.size === 0;

  // ── Polish article ──
  const handlePolish = useCallback(() => {
    if (!article) return;
    setPolishedArticle(article);
    nextStep();
  }, [article, setPolishedArticle, nextStep]);

  // ── Start new ──
  const handleStartNew = useCallback(() => {
    resetAll();
    toast.success('Siap untuk artikel baru');
  }, [resetAll]);

  // ── Generate first article (navigate to step 1) ──
  const handleGenerateFirst = useCallback(() => {
    resetAll();
    setCurrentStep(1);
    toast.info('Pergi ke Langkah 1 untuk membuat artikel Anda');
  }, [resetAll, setCurrentStep]);

  // ── Word count progress ──
  const wordCountProgress = article
    ? Math.min((article.totalWordCount / MAX_WORD_COUNT) * 100, 100)
    : 0;

  // ── Animated word count ──
  const animatedWordCount = useAnimatedCounter(article?.totalWordCount ?? 0);

  // ── Reading time ──
  const readingTime = article ? getReadingTime(article.totalWordCount) : 0;

  // ── Reading progress scroll handler for content area ──
  const handleContentScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    if (scrollHeight > clientHeight) {
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      requestAnimationFrame(() => {
        setReadingProgress(Math.min(progress, 100));
      });
    }
  }, []);

  // Track scroll on content container when it's scrollable
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleContentScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleContentScroll);
  }, [handleContentScroll]);

  // ── Fullscreen reading progress scroll handler ──
  const handleFullscreenScroll = useCallback(() => {
    const el = fullscreenContentRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    if (scrollHeight > clientHeight) {
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      requestAnimationFrame(() => {
        setFullscreenReadingProgress(Math.min(progress, 100));
      });
    }
  }, []);

  // Track scroll on fullscreen container when open
  useEffect(() => {
    if (!isFullscreen) return;
    const el = fullscreenContentRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleFullscreenScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleFullscreenScroll);
  }, [isFullscreen, handleFullscreenScroll]);

  // ── Article Search ──
  const sectionContents = article ? article.sections.map((s) => s.content) : [];
  const {
    searchQuery,
    setSearchQuery,
    matches,
    currentMatchIndex,
    goToNextMatch,
    goToPrevMatch,
    totalMatches,
    clearSearch,
    isSearching,
  } = useArticleSearch({ sections: sectionContents });

  const isSearchBarOpen = searchOpen || isSearching;

  const clearSearchAndClose = useCallback(() => {
    clearSearch();
    setSearchOpen(false);
  }, [clearSearch]);

  // ── Auto-scroll to current search match ──
  useEffect(() => {
    if (!isSearching || totalMatches === 0) {
      document.querySelectorAll('.article-search-highlight.current').forEach((el) => {
        el.classList.remove('current');
      });
      return;
    }

    const timer = setTimeout(() => {
      const highlights = document.querySelectorAll('.article-search-highlight');
      highlights.forEach((el, idx) => {
        el.classList.remove('current');
        if (idx === currentMatchIndex) {
          el.classList.add('current');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [currentMatchIndex, isSearching, totalMatches]);

  // ── Guard: no article ──
  if (!article) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6"
        >
          <div className="relative mx-auto">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-900/20">
              <FileText className="size-9 text-emerald-500" />
            </div>
            <div className="absolute -top-1 -right-1 size-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Sparkles className="size-3 text-amber-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Belum Ada Artikel yang Dihasilkan</h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Selesaikan langkah sebelumnya untuk membuat artikel akademik Anda. Mulai dengan menentukan topik riset, menemukan referensi, dan mengonfigurasi metode pembuatan artikel.
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8"
              onClick={handleGenerateFirst}
            >
              <Sparkles className="size-4" />
              Hasilkan Artikel Pertama Anda
              <ArrowRight className="size-4" />
            </Button>
          </motion.div>
          <p className="text-xs text-muted-foreground">
            Anda akan diarahkan ke Langkah 1 untuk memulai
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Render article content for fullscreen mode (must be before return) ──
  function renderArticleContent() {
    if (!article) return null;
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground leading-tight tracking-tight">
          {article.title}
        </h1>
        {article.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.keywords.map((kw) => (
              <Badge
                key={kw}
                variant="secondary"
                className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
              >
                {kw}
              </Badge>
            ))}
          </div>
        )}
        <Separator />
        {article.sections.map((section) => (
          <div key={section.type}>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-sm font-bold">
                {SECTION_META[section.type]?.number || '•'}
              </span>
              {SECTION_META[section.type]?.label || section.type}
            </h2>
            <ArticleMarkdown
              content={section.content}
              className={section.type === 'abstract' ? 'italic max-w-2xl mx-auto' : ''}
              searchQuery={searchQuery}
            />
          </div>
        ))}
        {article.references.length > 0 && !hasBibliographySection && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-sm font-bold">
                R
              </span>
              References
            </h2>
            <div className="space-y-3">
              {article.references.map((ref, index) => (
                <div key={ref.id} className="text-sm leading-relaxed text-foreground/90">
                  <span className="text-muted-foreground font-mono text-xs mr-2">
                    [{index + 1}]
                  </span>
                  {ref.authors} ({ref.year}). <span className="font-medium">{ref.title}</span>
                  {ref.journal && (
                    <span className="text-muted-foreground">
                      {' '}
                      <em>{ref.journal}</em>
                      {ref.volume && `, ${ref.volume}`}
                      {ref.issue && `(${ref.issue})`}
                      {ref.pages && `, ${ref.pages}`}
                    </span>
                  )}
                  {ref.doi && (
                    <a
                      href={`https://doi.org/${ref.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 text-xs ml-2"
                    >
                      doi:{ref.doi}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      {/* ── Fullscreen overlay ── */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background overflow-y-auto"
            ref={fullscreenContentRef}
          >
            {/* ── Fullscreen Reading Progress Bar ── */}
            <div className="fixed top-0 left-0 right-0 z-[60] h-[3px]">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400"
                style={{ width: `${fullscreenReadingProgress}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* ── Fullscreen Toolbar ── */}
            <div className="sticky top-0 z-10 px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
              <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setIsFullscreen(false)}
                  >
                    <X className="size-4" />
                  </Button>
                  <span className="text-sm font-medium text-foreground hidden sm:inline truncate max-w-[200px]">
                    {article.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Reading progress percentage */}
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
                    <BookOpen className="size-3.5" />
                    <span className="tabular-nums">{Math.round(fullscreenReadingProgress)}% read</span>
                  </div>
                  {/* Search */}
                  <ArticleSearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    totalMatches={totalMatches}
                    currentMatchIndex={currentMatchIndex}
                    onNext={goToNextMatch}
                    onPrev={goToPrevMatch}
                    onClear={clearSearchAndClose}
                    isOpen={isSearchBarOpen}
                    onOpen={() => setSearchOpen(true)}
                  />
                  {/* Download PDF */}
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={handleExportPdf}
                          disabled={isExportingPdf}
                        >
                          {isExportingPdf ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <FileDown className="size-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Unduh sebagai PDF</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {/* Copy All */}
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={handleCopyAll}
                        >
                          {copiedAll ? (
                            <Check className="size-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Salin Semua</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {/* Dark/Light Toggle */}
                  {mounted && (
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                          >
                            {resolvedTheme === 'dark' ? (
                              <Sun className="size-3.5" />
                            ) : (
                              <Moon className="size-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{resolvedTheme === 'dark' ? 'Mode terang' : 'Mode gelap'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>

            {/* ── Fullscreen Content with paper effect ── */}
            <div className="max-w-3xl mx-auto px-4 pb-12 pt-6">
              <div className="bg-card rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.08)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] border border-border/50 p-8 sm:p-12">
                <div className="prose-lg">
                  {renderArticleContent()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Layout ── */}
      <div
        className={`w-full ${isFullscreen ? 'hidden' : 'block'}`}
      >
        {/* ── Header ── */}
        <header className="mb-8 print:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight tracking-tight">
                {article.title}
              </h1>
              {article.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {article.keywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* ── Expand All / Collapse All ── */}
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={expandAll}
                      disabled={allExpanded}
                    >
                      <ChevronsDown className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Perluas semua bagian</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={collapseAll}
                      disabled={noneExpanded}
                    >
                      <ChevronsUp className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Perkecil semua bagian</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="size-4" />
                    <span className="hidden sm:inline">Ekspor</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Download className="size-4" />
                    Opsi Ekspor
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDownloadText} className="gap-3">
                    <FileText className="size-4" />
                    <div className="flex flex-col">
                      <span>Unduh sebagai Teks</span>
                      <span className="text-[10px] text-muted-foreground">Teks biasa (.txt)</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { if (article) { exportToMarkdown(article); toast.success('Artikel diunduh sebagai Markdown'); } }} className="gap-3">
                    <FileDown className="size-4" />
                    <div className="flex flex-col">
                      <span>Unduh sebagai Markdown</span>
                      <span className="text-[10px] text-muted-foreground">Markdown (.md)</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf} disabled={isExportingPdf} className="gap-3">
                    {isExportingPdf ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                    <div className="flex flex-col">
                      <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh sebagai PDF'}</span>
                      <span className="text-[10px] text-muted-foreground">Dokumen PDF (.pdf)</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handlePrint} className="gap-3">
                    <Printer className="size-4" />
                    <div className="flex flex-col">
                      <span>Cetak Artikel</span>
                      <span className="text-[10px] text-muted-foreground">Buka dialog cetak</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAll}
              >
                {copiedAll ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
                <span className="hidden sm:inline">Salin Semua</span>
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Maximize2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Membaca layar penuh</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ── Word Count Bar (sticky) ── */}
          <div className="sticky top-16 z-10 bg-background/90 backdrop-blur-sm -mx-6 px-6 py-3 space-y-2 border-b border-border/30 print:hidden">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Jumlah Kata Total
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {animatedWordCount.toLocaleString()} / {MAX_WORD_COUNT.toLocaleString()}
              </span>
            </div>
            <Progress
              value={wordCountProgress}
              className="h-2"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {article.totalWordCount >= MAX_WORD_COUNT
                  ? '✅ Jumlah kata target tercapai'
                  : `${(MAX_WORD_COUNT - animatedWordCount).toLocaleString()} words remaining to target`}
              </p>
              {/* ── Reading Time Estimate ── */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                <span>Perkiraan waktu baca: <strong className="text-foreground">{readingTime} menit</strong></span>
              </div>
            </div>
          </div>

          {/* ── Article Search Bar ── */}
          <div className="mt-4 print:hidden">
            <ArticleSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalMatches={totalMatches}
              currentMatchIndex={currentMatchIndex}
              onNext={goToNextMatch}
              onPrev={goToPrevMatch}
              onClear={clearSearchAndClose}
              isOpen={isSearchBarOpen}
              onOpen={() => setSearchOpen(true)}
            />
          </div>
        </header>

        <Separator className="mb-8" />

        {/* ── Body: Sidebar + Content ── */}
        <div className="flex gap-8 print:gap-0">
          {/* ── Desktop Sidebar TOC ── */}
          <aside className="hidden lg:block w-64 shrink-0 print:hidden border-r border-border/50 pr-8">
            <div className="sticky top-24">
              <TableOfContents
                sections={article.sections}
                references={article.references}
                activeSection={activeSection}
              />
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="flex-1 min-w-0 max-w-3xl overflow-y-auto max-h-[calc(100vh-20rem)]" ref={contentRef}>
            {/* ── Reading Progress Bar ── */}
            <div className="relative h-[3px] mb-6 print:hidden rounded-full overflow-hidden bg-muted">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 rounded-full"
                style={{ width: `${readingProgress}%` }}
                transition={{ duration: 0.15 }}
              />
            </div>

            {/* ── Mobile TOC Dropdown ── */}
            <div className="lg:hidden mb-6 print:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <List className="size-4" />
                      Lompat ke Bagian
                    </span>
                    <ChevronUp className="size-4 rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {article.sections.map((s) => {
                    const meta = SECTION_META[s.type] || { label: s.type, number: '•', icon: <FileText className="size-3.5" /> };
                    const target = SECTION_TARGET_WORDS[s.type] ?? 1000;
                    const completion = getSectionCompletion(s.wordCount, target);
                    const dotColor =
                      completion === 'good'
                        ? 'bg-emerald-500'
                        : completion === 'needs-work'
                          ? 'bg-amber-500'
                          : 'bg-red-500';

                    return (
                      <DropdownMenuItem
                        key={s.type}
                        onClick={() => {
                          document.getElementById(`section-${s.type}`)?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          });
                        }}
                      >
                        <span className={`size-2 rounded-full ${dotColor} mr-1`} />
                        <span className="font-bold text-muted-foreground mr-2">{meta.number}.</span>
                        {meta.label}
                        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                          {s.wordCount.toLocaleString()}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      document.getElementById('section-references')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }}
                  >
                    <span className="size-2 rounded-full bg-emerald-500 mr-1" />
                    <span className="font-bold text-muted-foreground mr-2">R.</span>
                    References
                    <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                      {article.references.length}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* ── Article Sections ── */}
            <div className="space-y-6">
              {article.sections.map((section, index) => (
                <SectionCard
                  key={section.type}
                  section={section}
                  sectionIndex={index}
                  isExpanded={expandedSections.has(section.type)}
                  onToggleExpand={() => toggleSection(section.type)}
                  searchQuery={searchQuery}
                />
              ))}

              {/* ── Decorative Divider ── */}
              <div className="flex items-center gap-4 py-2 print:hidden">
                <Separator className="flex-1" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="size-1.5 rounded-full bg-emerald-400" />
                  <div className="size-1.5 rounded-full bg-emerald-400/60" />
                  <div className="size-1.5 rounded-full bg-emerald-400/30" />
                </div>
                <Separator className="flex-1" />
              </div>

              {/* ── References (only show if no bibliography section) ── */}
              {article.references.length > 0 && !article.sections.some((s) => s.type === 'bibliography') && (
                <ReferencesCard
                  references={article.references}
                  isExpanded={expandedSections.has('references')}
                  onToggleExpand={() => toggleSection('references')}
                />
              )}
            </div>

            {/* ── Bottom Actions ── */}
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 print:hidden">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handlePolish}
              >
                <FileText className="size-4" />
                Polish Article
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleDownloadText}
              >
                <Download className="size-4" />
                Unduh sebagai Teks
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto text-muted-foreground"
                onClick={handleStartNew}
              >
                Artikel Baru
              </Button>
            </div>
          </main>
        </div>
      </div>

      {/* ── Back to Top ── */}
      <BackToTopButton />
    </TooltipProvider>
  );
}
