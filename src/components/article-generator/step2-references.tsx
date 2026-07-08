'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useArticleStore, type Reference } from '@/store/article-store';
import { exportSlrCsv } from '@/lib/export-slr-csv';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Filter,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Library,
  Lightbulb,
  Sparkles,
  MousePointerClick,
  ExternalLink,
  Layers,
  Info,
  Database,
  Copy,
  FileDown,
  X,
  Calendar,
  Hash,
  Tag,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Brain,
  BookMarked,
  AlertTriangle,
  Languages,
  FlaskConical,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/* ─── Constants ─── */

const SEARCH_DATABASES = [
  'Scopus',
  'Semantic Scholar',
  'OpenAlex',
  'Crossref',
  'PubMed',
  'arXiv',
  'BASE',
  'PLOS',
  'ERIC',
  'CORE',
  'Tavily',
];

/* ─── Type badge helpers ─── */

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string; barColor: string }
> = {
  'Journal Article': {
    label: 'Journal Article',
    color: 'text-emerald-800 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    barColor: '#10b981',
  },
  'Conference Paper': {
    label: 'Conference Paper',
    color: 'text-blue-800 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    barColor: '#3b82f6',
  },
  'Book': {
    label: 'Book',
    color: 'text-amber-800 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    barColor: '#f59e0b',
  },
  'Preprint': {
    label: 'Preprint',
    color: 'text-violet-800 dark:text-violet-300',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    borderColor: 'border-violet-200 dark:border-violet-800',
    barColor: '#8b5cf6',
  },
  'Thesis': {
    label: 'Thesis (Skripsi/Disertasi)',
    color: 'text-rose-800 dark:text-rose-300',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
    borderColor: 'border-rose-200 dark:border-rose-800',
    barColor: '#f43f5e',
  },
  'Skripsi': {
    label: 'Skripsi',
    color: 'text-pink-800 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    borderColor: 'border-pink-200 dark:border-pink-800',
    barColor: '#ec4899',
  },
  'Disertasi': {
    label: 'Disertasi',
    color: 'text-fuchsia-800 dark:text-fuchsia-300',
    bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
    borderColor: 'border-fuchsia-200 dark:border-fuchsia-800',
    barColor: '#d946ef',
  },
  'Report': {
    label: 'Report',
    color: 'text-cyan-800 dark:text-cyan-300',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    barColor: '#06b6d4',
  },
};

const FALLBACK_TYPE_CONFIG = {
  label: 'Other',
  color: 'text-gray-800 dark:text-gray-300',
  bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  borderColor: 'border-gray-200 dark:border-gray-800',
  barColor: '#6b7280',
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || FALLBACK_TYPE_CONFIG;
}

function TypeBadge({ type }: { type: string }) {
  const config = getTypeConfig(type);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
        config.color,
        config.bgColor,
        config.borderColor
      )}
    >
      {config.label}
    </span>
  );
}

/* ─── Relevance score bar ─── */

function RelevanceIndicator({ score }: { score?: number }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? 'bg-emerald-500'
      : pct >= 60
        ? 'bg-teal-500'
        : pct >= 40
          ? 'bg-amber-500'
          : 'bg-orange-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

/* ─── Skeleton cards for loading state ─── */

function ReferenceSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="size-5 shrink-0 rounded" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Animated counter hook ─── */

function useAnimatedCounter(target: number, _duration: number = 600) {
  // Simple approach: just use the target directly with a CSS transition for visual smoothness
  return target;
}

/* ─── Reference Type Distribution Bar ─── */

function TypeDistributionBar({ references }: { references: Reference[] }) {
  const distribution = useMemo(() => {
    const counts: Record<string, number> = {};
    references.forEach((r) => {
      counts[r.refType] = (counts[r.refType] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({
        type,
        count,
        pct: (count / references.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [references]);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (distribution.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Tipe Referensi</span>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {distribution.map((d, i) => {
            const config = getTypeConfig(d.type);
            return (
              <span
                key={d.type}
                className={cn(
                  'flex items-center gap-1 text-[11px] transition-opacity',
                  hoveredIdx !== null && hoveredIdx !== i ? 'opacity-40' : 'opacity-100'
                )}
              >
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: config.barColor }}
                />
                {config.label} ({d.count})
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60">
        {distribution.map((d, i) => {
          const config = getTypeConfig(d.type);
          return (
            <motion.div
              key={d.type}
              initial={{ width: 0 }}
              animate={{ width: `${d.pct}%` }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.08, ease: 'easeOut' }}
              className="h-full cursor-pointer transition-all first:rounded-l-full last:rounded-r-full hover:brightness-110"
              style={{ backgroundColor: config.barColor }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── Improved Empty State ─── */

function EmptyStateIllustration() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Gradient circle background */}
      <div className="absolute size-32 rounded-full bg-gradient-to-br from-emerald-200 via-teal-200 to-cyan-200 opacity-40 blur-2xl dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30" />
      <div className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 ring-4 ring-white dark:ring-gray-900">
        <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
          <Search className="size-6 text-white" />
        </div>
      </div>
      {/* Floating sparkles */}
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, 15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-2 -top-1"
      >
        <Sparkles className="size-4 text-amber-400" />
      </motion.div>
      <motion.div
        animate={{ y: [0, 5, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute -bottom-1 -left-3"
      >
        <BookOpen className="size-4 text-emerald-400" />
      </motion.div>
    </div>
  );
}

/* ─── BibTeX helpers ─── */

function generateBibtexKey(ref: Reference): string {
  // Extract first author surname
  const authorsStr = ref.authors || '';
  const firstAuthor = authorsStr.split(',')[0].split(' ').pop()?.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'unknown';
  // Extract year
  const year = String(ref.year || '0000');
  // Extract first significant word from title
  const stopWords = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'for', 'and', 'or', 'to', 'is', 'are', 'with', 'by', 'from', 'at', 'as', 'its', 'their', 'this', 'that', 'which', 'be', 'has', 'have', 'was', 'were', 'been', 'being', 'not', 'but', 'can', 'will', 'do', 'does', 'did', 'no', 'all', 'any', 'some', 'such', 'into', 'how', 'what', 'where', 'when', 'who', 'why']);
  const titleWords = ref.title.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
  const titleWord = (titleWords[0] || 'untitled').toLowerCase();
  return `${firstAuthor}${year}${titleWord}`;
}

function referenceToBibtex(ref: Reference): string {
  const key = generateBibtexKey(ref);
  const lines: string[] = `@article{${key},`.split('\n');
  lines.push(`  title = {${ref.title}},`);
  lines.push(`  author = {${ref.authors}},`);
  if (ref.journal) lines.push(`  journal = {${ref.journal}},`);
  lines.push(`  year = {${ref.year}},`);
  if (ref.volume) lines.push(`  volume = {${ref.volume}},`);
  if (ref.issue) lines.push(`  number = {${ref.issue}},`);
  if (ref.pages) lines.push(`  pages = {${ref.pages}},`);
  if (ref.doi) lines.push(`  doi = {${ref.doi}},`);
  lines.push('}');
  return lines.join('\n');
}

/* ─── Reference Detail Modal ─── */

function ReferenceDetailModal({
  reference,
  open,
  onOpenChange,
  onToggleSelect,
}: {
  reference: Reference;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleSelect: () => void;
}) {
  const [doiCopied, setDoiCopied] = useState(false);
  const relevancePct = reference.relevanceScore != null ? Math.round(reference.relevanceScore * 100) : null;
  const relevanceColor =
    relevancePct == null
      ? 'bg-muted'
      : relevancePct >= 80
        ? 'bg-emerald-500'
        : relevancePct >= 60
          ? 'bg-teal-500'
          : relevancePct >= 40
            ? 'bg-amber-500'
            : 'bg-orange-500';

  const handleCopyDoi = useCallback(() => {
    if (!reference.doi) return;
    navigator.clipboard.writeText(reference.doi).then(() => {
      setDoiCopied(true);
      toast.success('DOI disalin ke clipboard');
      setTimeout(() => setDoiCopied(false), 2000);
    });
  }, [reference.doi]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shrink-0" />

        <DialogHeader className="p-6 pb-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <TypeBadge type={reference.refType} />
                {reference.source && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Database className="size-2.5" />
                    {reference.source}
                  </span>
                )}
              </div>
              <DialogTitle className="text-lg font-bold leading-snug md:text-xl">
                {reference.title}
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold text-foreground/90">
                {reference.authors}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-5">
          {/* Publication details */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="space-y-3"
          >
            {/* Year badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Calendar className="size-3" />
                {reference.year}
              </span>
              <TypeBadge type={reference.refType} />
            </div>

            {/* Journal info */}
            {(reference.journal || reference.volume || reference.issue || reference.pages) && (
              <div className="flex items-start gap-2 text-sm">
                <Library className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">
                    {reference.journal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[reference.volume && `Vol. ${reference.volume}`, reference.issue && `No. ${reference.issue}`, reference.pages && `pp. ${reference.pages}`].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* DOI section */}
            {reference.doi && (
              <div className="flex items-center gap-2">
                <Hash className="size-4 shrink-0 text-muted-foreground" />
                <a
                  href={`https://doi.org/${reference.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 break-all"
                >
                  {reference.doi}
                </a>
                <ExternalLink className="size-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyDoi}
                  className="shrink-0 h-7 gap-1 text-xs px-2"
                >
                  {doiCopied ? <span className="text-emerald-600">Disalin!</span> : <><Copy className="size-3" /> Salin DOI</>}
                </Button>
              </div>
            )}
          </motion.div>

          <Separator />

          {/* Relevance Score */}
          {relevancePct != null && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Skor Relevansi</span>
                <span className="text-sm font-bold tabular-nums text-foreground">{relevancePct}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${relevancePct}%` }}
                  transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', relevanceColor)}
                />
              </div>
            </motion.div>
          )}

          {/* Abstract */}
          {reference.abstract && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="space-y-2"
            >
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Abstrak</h4>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border/50 bg-muted/30 p-4">
                <p className="text-sm leading-relaxed text-foreground/90">{reference.abstract}</p>
              </div>
            </motion.div>
          )}

          {/* Keywords */}
          {reference.keywords && reference.keywords.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Tag className="size-3" />
                Keywords
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reference.keywords.map((kw, i) => (
                  <Badge key={i} variant="outline" className="text-xs px-2 py-0.5 border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                    {kw}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-6 py-3 shrink-0">
          <Button
            variant={reference.isSelected ? 'outline' : 'default'}
            size="sm"
            onClick={() => {
              onToggleSelect();
            }}
            className={cn(
              'gap-1.5',
              !reference.isSelected && 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {reference.isSelected ? (
              <><Square className="size-3.5" /> Deselect this reference</>
            ) : (
              <><CheckSquare className="size-3.5" /> Select this reference</>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Reference card ─── */

function ReferenceCard({
  reference,
  isExpanded,
  onToggleExpand,
  onToggleSelect,
  onOpenDetail,
}: {
  reference: Reference;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <Card
      className={cn(
        'group transition-all duration-200 hover:shadow-md cursor-pointer',
        reference.isSelected
          ? 'border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-950/20'
          : 'border-border/60 hover:border-border'
      )}
      onClick={onOpenDetail}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Checkbox */}
          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={reference.isSelected}
              onCheckedChange={() => {
                onToggleSelect();
              }}
              className={cn(
                'size-5 cursor-pointer transition-colors',
                reference.isSelected && 'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
              )}
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Top row: type badge + source badge + year + relevance */}
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <TypeBadge type={reference.refType} />
              {reference.source && (
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <Database className="size-2.5" />
                  {reference.source}
                </span>
              )}
              <span className="text-xs font-medium text-muted-foreground">{reference.year}</span>
              <div className="ml-auto">
                <RelevanceIndicator score={reference.relevanceScore} />
              </div>
            </div>

            {/* Authors */}
            <p className="mb-1 text-sm font-semibold leading-snug text-foreground">
              {reference.authors}
            </p>

            {/* Title */}
            <p className="mb-1.5 text-sm leading-snug text-foreground/90">{reference.title}</p>

            {/* Journal info */}
            {(reference.journal || reference.doi) && (
              <p className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {reference.journal && (
                  <>
                    <Library className="size-3 shrink-0" />
                    <span className="italic">
                      {reference.journal}
                      {reference.volume && `, ${reference.volume}`}
                      {reference.issue && `(${reference.issue})`}
                      {reference.pages && `: ${reference.pages}`}
                    </span>
                  </>
                )}
                {reference.doi && (
                  <>
                    {reference.journal && (
                      <span className="text-muted-foreground/40">|</span>
                    )}
                    <a
                      href={`https://doi.org/${reference.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        ✅ DOI
                      </span>
                      <ExternalLink className="size-3 shrink-0" />
                      <span className="max-w-[140px] truncate text-[11px]">{reference.doi}</span>
                    </a>
                  </>
                )}
              </p>
            )}

            {/* Expand button + abstract */}
            {reference.abstract && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand();
                  }}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="size-3" /> Hide Abstract
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-3" /> Show Abstract
                    </>
                  )}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-md border border-border/40 bg-muted/30 p-3">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {reference.abstract}
                        </p>
                        {reference.keywords && reference.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {reference.keywords.map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Filter types ─── */

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'relevance', label: 'Relevansi' },
  { value: 'year-desc', label: 'Tahun (Terbaru)' },
  { value: 'year-asc', label: 'Tahun (Terlama)' },
  { value: 'author', label: 'Nama Penulis' },
];

/* ─── Main component ─── */

export default function Step2References() {
  const {
    selectedTitle,
    inputTitle,
    keywords,
    selectedKeywords,
    references,
    setReferences,
    toggleReference,
    selectAllReferences,
    deselectAllReferences,
    isSearchingReferences,
    setIsSearchingReferences,
    referenceSearchProgress,
    setReferenceSearchProgress,
    setCurrentStep,
    nextStep,
  } = useArticleStore();

  // Effective title: use selectedTitle (from generated titles) or fallback to inputTitle (manually typed)
  const effectiveTitle = selectedTitle || inputTitle || '';
  // Effective keywords: use selectedKeywords (from AI-generated selection) or fallback to manually entered keywords
  const effectiveKeywords = selectedKeywords.length > 0 ? selectedKeywords : keywords.filter(k => k.trim() !== '');

  // Local UI state
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);
  const [yearRange, setYearRange] = useState<number[]>([2020, 2025]);
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [searchText, setSearchText] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [prevRefCount, setPrevRefCount] = useState(0);

  // Include/Exclude keywords
  const [includeKeywords, setIncludeKeywords] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);

  // Boolean mode
  const [booleanMode, setBooleanMode] = useState<'OR' | 'AND'>('OR');

  // Multi-language search — always auto-search in all 5 research languages
  const [searchLanguages, setSearchLanguages] = useState<string[]>(['English', 'Chinese', 'Spanish', 'German', 'French']);
  const [isTranslating, setIsTranslating] = useState(false);

  // Auto-generated Boolean keywords
  const [generatedBoolean, setGeneratedBoolean] = useState<any>(null);
  const [isGeneratingBoolean, setIsGeneratingBoolean] = useState(false);

  // Search meta (pipeline counts)
  const [searchMeta, setSearchMeta] = useState<Record<string, number>>({});

  // Theory detection
  const [theories, setTheories] = useState<any>(null);
  const [isDetectingTheories, setIsDetectingTheories] = useState(false);

  // Reference detail modal state
  const [detailReference, setDetailReference] = useState<Reference | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Real search data tracking
  const [isRealData, setIsRealData] = useState(false);
  const [searchedDatabaseCount, setSearchedDatabaseCount] = useState(0);
  const [searchStatusMessage, setSearchStatusMessage] = useState('');

  const selectedCount = useMemo(
    () => references.filter((r) => r.isSelected).length,
    [references]
  );
  const totalCount = references.length;

  /* ─── Multi-type filter toggle helper ─── */

  const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'Semua Tipe' },
    { value: 'Journal Article', label: 'Artikel Jurnal' },
    { value: 'Conference Paper', label: 'Paper Konferensi' },
    { value: 'Book', label: 'Buku' },
    { value: 'Preprint', label: 'Preprint' },
    { value: 'Thesis', label: 'Tesis' },
    { value: 'Skripsi', label: 'Skripsi' },
    { value: 'Disertasi', label: 'Disertasi' },
    { value: 'Report', label: 'Laporan' },
  ];

  function toggleTypeFilter(type: string) {
    if (type === 'all') {
      setSelectedTypes(['all']);
    } else {
      setSelectedTypes(prev => {
        const without = prev.filter(t => t !== 'all' && t !== type);
        if (prev.includes(type)) return without.length ? without : ['all'];
        return [...without, type];
      });
    }
  }

  // Animated counter for total references (animates on first load)
  const animatedTotal = useAnimatedCounter(totalCount, 800);
  // Animated counter for selected count
  const animatedSelected = useAnimatedCounter(selectedCount, 400);

  // Track when references first load to trigger counter animation
  useEffect(() => {
    if (references.length > 0 && prevRefCount === 0) {
      setPrevRefCount(references.length);
    }
  }, [references.length, prevRefCount]);

  // Animate database list during search
  const searchAnimationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isSearchingReferences) {
      setSearchedDatabaseCount(0);
      let count = 0;
      searchAnimationRef.current = setInterval(() => {
        count += 1;
        setSearchedDatabaseCount(count);
        if (count >= SEARCH_DATABASES.length) {
          if (searchAnimationRef.current) clearInterval(searchAnimationRef.current);
        }
      }, 350);
    } else {
      if (searchAnimationRef.current) {
        clearInterval(searchAnimationRef.current);
        searchAnimationRef.current = null;
      }
    }
    return () => {
      if (searchAnimationRef.current) {
        clearInterval(searchAnimationRef.current);
        searchAnimationRef.current = null;
      }
    };
  }, [isSearchingReferences]);

  /* ─── Search handler — auto Boolean + auto 5-language translation ─── */

  const handleSearch = useCallback(async () => {
    if (!effectiveTitle.trim()) return;

    setIsSearchingReferences(true);
    setReferenceSearchProgress(0);
    setIsRealData(false);
    setSearchMeta({});
    setTheories(null);
    setGeneratedBoolean(null);

    try {
      // ── Phase 1: Auto-generate Boolean + Auto-translate in parallel ──
      setReferenceSearchProgress(5);
      setIsGeneratingBoolean(true);
      setIsTranslating(true);

      // Helper to poll a job
      const pollJob = async (url: string, maxMs = 60_000): Promise<any> => {
        return new Promise<any>((resolve, reject) => {
          const interval = setInterval(async () => {
            try {
              const res = await fetch(url);
              if (!res.ok) { clearInterval(interval); reject(new Error('Poll failed')); return; }
              const data = await res.json();
              if (data.status === 'done' && data.result) { clearInterval(interval); resolve(data.result); }
              else if (data.status === 'error') { clearInterval(interval); reject(new Error(data.error || 'Job failed')); }
            } catch { /* continue polling */ }
          }, 1500);
          setTimeout(() => { clearInterval(interval); reject(new Error('Timed out')); }, maxMs);
        });
      };

      // Launch both requests in parallel (now synchronous — no polling needed)
      const [booleanResult, translateResult] = await Promise.allSettled([
        // Boolean generation
        (async () => {
          const postRes = await fetch('/api/references/generate-boolean', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: effectiveKeywords, title: effectiveTitle }),
          });
          if (!postRes.ok) throw new Error('Boolean generation failed');
          const postData = await postRes.json();
          if (!postData.success) throw new Error('Boolean generation returned error');
          // Synchronous mode: result is directly in the response (no jobId/polling)
          if (postData.booleanQueries) return postData;
          // Legacy job mode: poll for result
          if (postData.jobId) return pollJob(`/api/references/generate-boolean?jobId=${postData.jobId}`);
          throw new Error('Invalid boolean response');
        })(),
        // Translation
        (async () => {
          const postRes = await fetch('/api/references/translate-keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: effectiveKeywords, title: effectiveTitle, languages: searchLanguages }),
          });
          if (!postRes.ok) throw new Error('Translation failed');
          const postData = await postRes.json();
          if (!postData.success) throw new Error('Translation returned error');
          // Synchronous mode: result is directly in the response (no jobId/polling)
          if (postData.languages) return postData;
          // Legacy job mode: poll for result
          if (postData.jobId) return pollJob(`/api/references/translate-keywords?jobId=${postData.jobId}`);
          throw new Error('Invalid translation response');
        })(),
      ]);

      setIsGeneratingBoolean(false);
      setIsTranslating(false);
      setReferenceSearchProgress(25);

      // Extract results
      let boolData: any = null;
      if (booleanResult.status === 'fulfilled') {
        boolData = booleanResult.value;
        setGeneratedBoolean(boolData);
      } else {
        toast.warning('Pembuatan Boolean otomatis dilewati — menggunakan bawaan');
      }

      let transData: any = null;
      if (translateResult.status === 'fulfilled') {
        transData = translateResult.value;
      } else {
        toast.warning('Translasi dilewati — mencari hanya dalam bahasa Inggris');
      }

      // ── Phase 2: Build all query variants ──
      const allTranslatedQueries: string[][] = [];
      const titleInLanguages: string[] = [];

      // 1) Original keywords (always included)
      allTranslatedQueries.push(effectiveKeywords);

      // 2) Boolean queries (AND, OR, combined)
      if (boolData?.booleanQueries) {
        const bq = boolData.booleanQueries;
        // AND queries — each is a single string, split to array
        if (Array.isArray(bq.and)) {
          for (const q of bq.and) {
            if (typeof q === 'string' && q.trim()) {
              allTranslatedQueries.push([q.trim()]);
            }
          }
        }
        // OR queries
        if (Array.isArray(bq.or)) {
          for (const q of bq.or) {
            if (typeof q === 'string' && q.trim()) {
              allTranslatedQueries.push([q.trim()]);
            }
          }
        }
        // Combined queries (most precise)
        if (Array.isArray(bq.combined)) {
          for (const q of bq.combined) {
            if (typeof q === 'string' && q.trim()) {
              allTranslatedQueries.push([q.trim()]);
            }
          }
        }
      }

      // 3) Expanded keywords from Boolean generation
      if (Array.isArray(boolData?.expandedKeywords)) {
        const expanded = boolData.expandedKeywords.filter((k: any) => typeof k === 'string' && k.trim());
        if (expanded.length > 0) {
          allTranslatedQueries.push(expanded);
        }
      }

      // 4) Title variants from Boolean generation
      if (Array.isArray(boolData?.titleVariants)) {
        for (const tv of boolData.titleVariants) {
          if (typeof tv === 'string' && tv.trim()) {
            allTranslatedQueries.push([tv.trim()]);
            titleInLanguages.push(tv.trim());
          }
        }
      }

      // 5) Per-language keyword queries and title translations
      if (transData?.languages && typeof transData.languages === 'object') {
        const langs = transData.languages as Record<string, any>;
        for (const [code, langData] of Object.entries(langs)) {
          // Keyword queries per language
          if (Array.isArray(langData.keywordQueries)) {
            for (const q of langData.keywordQueries) {
              if (typeof q === 'string' && q.trim()) {
                allTranslatedQueries.push([q.trim()]);
              }
            }
          }
          // Title translation per language
          if (typeof langData.titleTranslation === 'string' && langData.titleTranslation.trim()) {
            const translatedTitle = langData.titleTranslation.trim();
            allTranslatedQueries.push([translatedTitle]);
            titleInLanguages.push(translatedTitle);
          }
        }
      }

      // Also add the original title as a search query
      allTranslatedQueries.push([effectiveTitle.trim()]);
      titleInLanguages.push(effectiveTitle.trim());

      // ── Phase 3: Execute the main search with all variants ──
      setReferenceSearchProgress(30);

      const postRes = await fetch('/api/references/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: effectiveTitle,
          keywords: effectiveKeywords,
          yearStart: yearRange[0],
          yearEnd: yearRange[1],
          booleanMode,
          includeKeywords: includeKeywords.length > 0 ? includeKeywords : undefined,
          excludeKeywords: excludeKeywords.length > 0 ? excludeKeywords : undefined,
          referenceTypes: selectedTypes.includes('all') ? undefined : selectedTypes,
          translatedQueries: allTranslatedQueries.length > 1 ? allTranslatedQueries : undefined,
        }),
      });

      if (!postRes.ok) throw new Error('Search failed to start');

      const postData = await postRes.json();

      // Synchronous mode: result is directly in the POST response
      setReferenceSearchProgress(50);

      if (!postData.success || !postData.result) {
        throw new Error(postData.error || 'Invalid search response');
      }

      const pollResult = postData.result;

      setReferenceSearchProgress(100);

      if (Array.isArray(pollResult.references)) {
        setReferences(pollResult.references);
        toast.success(`Ditemukan ${pollResult.references.length} referensi dari 5 bahasa`);

        if (pollResult.meta?.isRealData) {
          setIsRealData(true);
        }
      }

      if (pollResult.meta) {
        setSearchMeta(pollResult.meta);
      }

      setTimeout(() => {
        setReferenceSearchProgress(0);
        setIsSearchingReferences(false);
      }, 600);
    } catch {
      setReferenceSearchProgress(0);
      setIsSearchingReferences(false);
      setIsGeneratingBoolean(false);
      setIsTranslating(false);
      toast.error('Pencarian gagal. Silakan coba lagi.');
    }
  }, [effectiveTitle, effectiveKeywords, yearRange, booleanMode, includeKeywords, excludeKeywords, selectedTypes, searchLanguages, setReferences, setIsSearchingReferences, setReferenceSearchProgress]);

  /* ─── Select all handler with toast ─── */
  const handleSelectAll = useCallback(() => {
    selectAllReferences();
    toast.info('Semua referensi dipilih');
  }, [selectAllReferences]);

  /* ─── Open detail modal ─── */
  const handleOpenDetail = useCallback((ref: Reference) => {
    setDetailReference(ref);
    setDetailOpen(true);
  }, []);

  /* ─── Export BibTeX ─── */
  const handleExportBibTeX = useCallback(() => {
    const selectedRefs = references.filter((r) => r.isSelected);
    if (selectedRefs.length === 0) {
      toast.error('Tidak ada referensi yang dipilih untuk diekspor');
      return;
    }
    const bibtex = selectedRefs.map(referenceToBibtex).join('\n\n');
    const blob = new Blob([bibtex], { type: 'text/x-bibtex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'references.bib';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${selectedRefs.length} referensi diekspor sebagai BibTeX`);
  }, [references]);

  /* ─── Toggle expand ─── */

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /* ─── Filtering & sorting ─── */

  const filteredReferences = useMemo(() => {
    let result = [...references];

    // Multi-type filter
    if (!selectedTypes.includes('all')) {
      result = result.filter((r) => selectedTypes.includes(r.refType));
    }

    // Year range filter
    result = result.filter((r) => Number(r.year) >= yearRange[0] && Number(r.year) <= yearRange[1]);

    // Include keywords filter
    if (includeKeywords.length > 0) {
      result = result.filter((r) => {
        const text = `${r.title} ${r.abstract} ${r.authors} ${(r.keywords || []).join(' ')}`.toLowerCase();
        return includeKeywords.some(kw => text.includes(kw.toLowerCase()));
      });
    }

    // Exclude keywords filter
    if (excludeKeywords.length > 0) {
      result = result.filter((r) => {
        const text = `${r.title} ${r.abstract} ${r.authors} ${(r.keywords || []).join(' ')}`.toLowerCase();
        return !excludeKeywords.some(kw => text.includes(kw.toLowerCase()));
      });
    }

    // Search text filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.authors.toLowerCase().includes(q) ||
          r.journal?.toLowerCase().includes(q) ||
          r.abstract?.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case 'year-desc':
        result.sort((a, b) => Number(b.year) - Number(a.year));
        break;
      case 'year-asc':
        result.sort((a, b) => Number(a.year) - Number(b.year));
        break;
      case 'author':
        result.sort((a, b) => a.authors.localeCompare(b.authors));
        break;
      case 'relevance':
      default:
        result.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
        break;
    }

    return result;
  }, [references, selectedTypes, yearRange, includeKeywords, excludeKeywords, searchText, sortBy]);

  // Compute source distribution for summary
  const sourceDistribution = useMemo(() => {
    if (references.length === 0) return { count: 0, databases: 0 };
    const sources = new Set(references.map((r) => r.source).filter(Boolean));
    return { count: references.length, databases: sources.size };
  }, [references]);

  /* ─── Has results loaded ─── */
  const hasResults = references.length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-28">
      {/* ─── Header Section ─── */}
      <section className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <BookOpen className="size-4 text-emerald-600" />
              Langkah 2 — Pemilihan Referensi
            </div>
            <h2 className="text-xl font-bold leading-tight tracking-tight md:text-2xl">
              {effectiveTitle || 'Pilih judul di Langkah 1'}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasResults && selectedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportBibTeX}
                className="hidden sm:inline-flex gap-1.5"
              >
                <FileDown className="size-4" />
                <span>Ekspor BibTeX</span>
              </Button>
            )}
            {hasResults && references.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  try {
                    exportSlrCsv(references, {
                      filename: `slr-${(effectiveTitle || 'references').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50)}`,
                    });
                    toast.success(`${references.length} referensi berhasil diekspor ke CSV`);
                  } catch {
                    toast.error('Gagal mengekspor CSV');
                  }
                }}
                className="inline-flex gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-900/30"
              >
                <Database className="size-4" />
                <span className="hidden sm:inline">Ekspor CSV SLR</span>
                <span className="sm:hidden">CSV</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(1)}
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Edit Pilihan</span>
            </Button>
          </div>
        </div>

        {/* Keywords */}
        {effectiveKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {effectiveKeywords.map((kw, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
              >
                {kw}
              </Badge>
            ))}
          </div>
        )}

        {/* Animated selection counter */}
        {hasResults && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <CheckSquare className="size-4 text-emerald-600" />
            <span>
              <strong className="text-foreground font-mono tabular-nums">{animatedSelected}</strong> dari{' '}
              <strong className="text-foreground font-mono tabular-nums">{animatedTotal}</strong> referensi dipilih
            </span>
          </motion.div>
        )}
      </section>

      {/* ─── Quick Stats Row ─── */}
      {hasResults && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="flex flex-wrap items-center gap-2"
        >
          {Object.keys(searchMeta).length > 0 ? (
            <>
              <Badge variant='secondary' className='bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 gap-1'>
                <Database className='size-3' /> Total: {searchMeta.totalRaw ?? '—'}
              </Badge>
              <span className='text-muted-foreground text-xs'>→</span>
              <Badge variant='secondary' className='bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 gap-1'>
                Dedupe: {searchMeta.afterDedupe ?? '—'}
              </Badge>
              <span className='text-muted-foreground text-xs'>→</span>
              <Badge variant='secondary' className='bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 gap-1'>
                Akhir: {references.length}
              </Badge>
            </>
          ) : (
            <Badge
              variant="secondary"
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1.5 px-2.5 py-1"
            >
              <Library className="size-3" />
              {totalCount} referensi
            </Badge>
          )}
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1.5 px-2.5 py-1"
          >
            <CheckSquare className="size-3" />
            {selectedCount} dipilih
          </Badge>
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1.5 px-2.5 py-1"
          >
            <Layers className="size-3" />
            {new Set(references.map((r) => r.refType)).size} tipe
          </Badge>
          {sourceDistribution.databases > 0 && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 gap-1.5 px-2.5 py-1"
            >
              <Database className="size-3" />
              {sourceDistribution.databases} database
            </Badge>
          )}
        </motion.div>
      )}

      <Separator />

      {/* ─── Reference Search Tips (above empty state) ─── */}
      {!hasResults && !isSearchingReferences && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-950/20">
            <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Tips Pencarian Referensi
              </p>
              <ul className="mt-1 space-y-0.5 text-[11px] text-blue-600 dark:text-blue-400">
                <li>• Semua hasil berasal dari database akademik nyata dengan DOI yang dapat diverifikasi</li>
                <li>• Campurkan tipe referensi untuk cakupan yang komprehensif</li>
                <li>• Pilih setidaknya 5 untuk pembuatan artikel</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Improved Empty State (before search) ─── */}
      {!hasResults && !isSearchingReferences && (
        <Card className="border-dashed border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20">
          <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
            <EmptyStateIllustration />
            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-semibold">
                Temukan Referensi Akademik yang Relevan
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Otomatis membuat kueri pencarian Boolean, menerjemahkan kata kunci ke <strong className="text-foreground">5 bahasa penelitian utama</strong> (Inggris, Mandarin, Spanyol, Jerman, Prancis), dan mencari di <strong className="text-foreground">11 database akademik</strong> termasuk Scopus, Semantic Scholar, OpenAlex, PubMed, dan lainnya untuk menemukan referensi terverifikasi dengan DOI asli.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <Button
                onClick={handleSearch}
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold shadow-lg shadow-emerald-500/25"
                disabled={!effectiveTitle.trim()}
              >
                <Search className="size-5" />
                Cari Referensi
                <ArrowRight className="size-4" />
              </Button>
              {!effectiveTitle.trim() && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Selesaikan Langkah 1 terlebih dahulu
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Search Progress with Database Animation ─── */}
      {(isSearchingReferences || isTranslating || isGeneratingBoolean) && (
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="space-y-4 p-6">
            {/* Phase 1: Boolean Generation */}
            {isGeneratingBoolean && (
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                  <Brain className="size-3.5 text-violet-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    Otomatis membuat kueri pencarian Boolean...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AI sedang membuat kueri AND/OR/kombinasi optimal dengan ekspansi sinonim
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300 shrink-0">
                  Fase 1/3
                </Badge>
              </div>
            )}

            {/* Phase 1: Translation */}
            {isTranslating && (
              <div className="flex items-center gap-3">
                <div className="flex size-7 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
                  <Languages className="size-3.5 text-teal-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    Menerjemahkan kata kunci ke 5 bahasa penelitian...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Inggris, Mandarin, Spanyol, Jerman, Prancis — termasuk terjemahan judul
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {searchLanguages.map((lang) => (
                    <Badge key={lang} variant="outline" className="text-[9px] px-1 py-0 border-teal-200 text-teal-700 dark:border-teal-800 dark:text-teal-300">
                      {lang.slice(0, 2).toUpperCase()}
                    </Badge>
                  ))}
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-teal-200 text-teal-700 dark:border-teal-800 dark:text-teal-300 shrink-0">
                  {isGeneratingBoolean ? 'Fase 1/3' : 'Fase 2/3'}
                </Badge>
              </div>
            )}

            {/* Phase 3: Database search */}
            {isSearchingReferences && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex size-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                    <Database className="size-3.5 text-emerald-600 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {searchStatusMessage || 'Mencari di 11 database akademik dengan semua varian kueri...'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Kata kunci asli + kueri Boolean + judul dalam 5 bahasa
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 shrink-0">
                    Fase 3/3
                  </Badge>
                </div>
                <Progress value={referenceSearchProgress} className="h-2 [&>div]:bg-emerald-500" />
                <p className="text-right text-xs text-muted-foreground tabular-nums">
                  {Math.round(referenceSearchProgress)}%
                </p>

                {/* Animated database list */}
                <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                  <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                    <Database className="mr-1 inline size-3" />
                    Mencari di database:
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                    {SEARCH_DATABASES.map((db, i) => (
                      <motion.div
                        key={db}
                        initial={{ opacity: 0, x: -8 }}
                        animate={
                          i < searchedDatabaseCount
                            ? { opacity: 1, x: 0 }
                            : { opacity: 0.2, x: 0 }
                        }
                        transition={{ duration: 0.3, delay: 0.05 }}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        {i < searchedDatabaseCount ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="size-1.5 rounded-full bg-emerald-500"
                          />
                        ) : (
                          <Loader2 className="size-2.5 animate-spin text-muted-foreground/40" />
                        )}
                        <span
                          className={cn(
                            'text-muted-foreground',
                            i < searchedDatabaseCount && 'text-foreground font-medium'
                          )}
                        >
                          {db}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <ReferenceSkeleton />
                  <ReferenceSkeleton />
                  <ReferenceSkeleton />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Results section (only show after search) ─── */}
      {hasResults && (
        <>
          {/* Real Data Success Banner */}
          {isRealData && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-800/40 dark:bg-emerald-950/20"
            >
              <span className="text-base leading-none">✅</span>
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Semua referensi terverifikasi dari database akademik nyata. DOI mengarah ke paper asli.
              </p>
            </motion.div>
          )}

          {/* Reference Type Distribution Bar */}
          <TypeDistributionBar references={references} />

          {/* Drag Selection Hint */}
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2 dark:border-blue-800/40 dark:bg-blue-950/20">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                    <Lightbulb className="size-3.5 shrink-0" />
                    <span>
                      <strong>Tips:</strong> Klik kartu untuk melihat detail, atau gunakan checkbox untuk memilih langsung
                    </span>
                    <MousePointerClick className="size-3 shrink-0" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  <p>Klik kartu referensi untuk melihat detail lengkap. Gunakan checkbox untuk memilih/membatalkan pilihan.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </motion.div>

          {/* Search again + filter toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={isSearchingReferences}
            >
              {isSearchingReferences ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Cari Lagi
            </Button>
            {/* On mobile: show "Perbaiki" button, on desktop: show "Filter" with toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'sm:hidden',
                showFilters && 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700'
              )}
            >
              <Filter className="size-4" />
              Perbaiki
              <ChevronDown
                className={cn('size-3 transition-transform', showFilters && 'rotate-180')}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'hidden sm:inline-flex',
                showFilters && 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700'
              )}
            >
              <Filter className="size-4" />
              Filter
              <ChevronDown
                className={cn('size-3 transition-transform', showFilters && 'rotate-180')}
              />
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs">
                <CheckSquare className="size-3.5" />
                Pilih Semua
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAllReferences} className="text-xs">
                <Square className="size-3.5" />
                Batalkan Semua
              </Button>
            </div>
          </div>

          {/* Filter panel - animated slide down */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <Card className="border-border/60">
                  <CardContent className="space-y-5 p-4">
                    {/* Include/Exclude Keywords */}
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kriteria Kata Kunci</label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-medium text-muted-foreground">Harus Memuat</span>
                        </div>
                        <div className='flex items-center gap-2 flex-wrap'>
                          {includeKeywords.map((kw, i) => (
                            <Badge key={i} variant='outline' className='gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer' onClick={() => setIncludeKeywords(prev => prev.filter((_, j) => j !== i))}>
                              <ShieldCheck className='size-3' /> {kw} <X className='size-3' />
                            </Badge>
                          ))}
                          <input className='text-xs bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-emerald-500 outline-none px-1 py-0.5 w-24' placeholder='Tambah kata kunci...' onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { setIncludeKeywords(prev => [...prev, e.currentTarget.value.trim()]); e.currentTarget.value = ''; } }} />
                        </div>

                        <div className="flex items-center gap-2">
                          <ShieldAlert className="size-3.5 text-red-600 shrink-0" />
                          <span className="text-xs font-medium text-muted-foreground">Harus Mengecualikan</span>
                        </div>
                        <div className='flex items-center gap-2 flex-wrap'>
                          {excludeKeywords.map((kw, i) => (
                            <Badge key={i} variant='outline' className='gap-1 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800 cursor-pointer' onClick={() => setExcludeKeywords(prev => prev.filter((_, j) => j !== i))}>
                              <ShieldAlert className='size-3' /> {kw} <X className='size-3' />
                            </Badge>
                          ))}
                          <input className='text-xs bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-red-500 outline-none px-1 py-0.5 w-24' placeholder='Tambah kata kunci...' onKeyDown={(e) => { if (e.key === 'Enter' && e.currentTarget.value.trim()) { setExcludeKeywords(prev => [...prev, e.currentTarget.value.trim()]); e.currentTarget.value = ''; } }} />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Boolean Mode + Sort */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Urutkan</label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Relevansi" />
                          </SelectTrigger>
                          <SelectContent>
                            {SORT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Mode Boolean</label>
                        <div className='flex items-center gap-2'>
                          <div className='flex rounded-lg border p-0.5'>
                            <button className={`px-3 py-1.5 text-xs rounded-md transition-colors ${booleanMode === 'OR' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} onClick={() => setBooleanMode('OR')}>OR</button>
                            <button className={`px-3 py-1.5 text-xs rounded-md transition-colors ${booleanMode === 'AND' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} onClick={() => setBooleanMode('AND')}>AND</button>
                          </div>
                          <span className='text-[11px] text-muted-foreground'>{booleanMode === 'OR' ? 'Cocokkan salah satu kata kunci' : 'Semua kata kunci diperlukan'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Multi-select Reference Type Filter */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Tipe Referensi
                      </label>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
                        {TYPE_FILTER_OPTIONS.map((opt) => {
                          const config = opt.value !== 'all' ? getTypeConfig(opt.value) : null;
                          const isChecked = selectedTypes.includes(opt.value);
                          return (
                            <label
                              key={opt.value}
                              className={cn(
                                'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs cursor-pointer transition-colors',
                                isChecked
                                  ? opt.value === 'all'
                                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
                                    : `${config?.borderColor} ${config?.bgColor}`
                                  : 'border-border/60 hover:border-border'
                              )}
                              onClick={() => toggleTypeFilter(opt.value)}
                            >
                              <Checkbox
                                checked={isChecked}
                                className={cn(
                                  'size-3.5 shrink-0',
                                  isChecked && 'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                                )}
                                onCheckedChange={() => toggleTypeFilter(opt.value)}
                              />
                              {config ? (
                                <span
                                  className={cn('rounded-sm size-2 shrink-0', opt.value === 'all' ? 'bg-emerald-500' : '')}
                                  style={config ? { backgroundColor: config.barColor } : undefined}
                                />
                              ) : null}
                              <span className={cn(
                                'font-medium truncate',
                                isChecked
                                  ? opt.value === 'all'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : config?.color
                                  : 'text-muted-foreground'
                              )}>
                                {opt.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Year range */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Rentang Tahun: {yearRange[0]} – {yearRange[1]}
                      </label>
                      <Slider
                        value={yearRange}
                        onValueChange={setYearRange}
                        min={2015}
                        max={2025}
                        step={1}
                        className="[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
                      />
                    </div>

                    {/* Search within */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Cari dalam Hasil
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Cari berdasarkan judul, penulis, jurnal..."
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    {/* Search with Criteria button + Filter result count */}
                    <div className='flex items-center justify-between'>
                      <div className="text-xs text-muted-foreground">
                        Menampilkan {filteredReferences.length} dari {totalCount} referensi
                      </div>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={handleSearch}
                        disabled={isSearchingReferences}
                        className='gap-1.5 text-xs h-7'
                      >
                        <Search className='size-3' />
                        Cari dengan Kriteria
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Auto-Generated Boolean Keywords Panel */}
          {generatedBoolean ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <Card className="border-violet-200 dark:border-violet-800">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                      <Brain className="size-3.5 text-violet-600" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">Kueri Boolean Hasil Otomatis</span>
                      <p className="text-[11px] text-muted-foreground">Kueri pencarian yang dioptimalkan AI dengan ekspansi sinonim</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300">
                    Auto
                  </Badge>
                </div>
                <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-3">
                  {/* AND queries */}
                  {generatedBoolean.booleanQueries?.and?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">AND</span>
                        <span className="text-[11px] text-muted-foreground">Semua istilah diperlukan</span>
                      </div>
                      <div className="space-y-1">
                        {generatedBoolean.booleanQueries.and.map((q: string, i: number) => (
                          <div key={i} className="rounded border border-border/40 bg-muted/20 px-2.5 py-1.5 font-mono text-[11px] text-foreground/80 break-all">{q}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* OR queries */}
                  {generatedBoolean.booleanQueries?.or?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">OR</span>
                        <span className="text-[11px] text-muted-foreground">Cocokkan salah satu istilah</span>
                      </div>
                      <div className="space-y-1">
                        {generatedBoolean.booleanQueries.or.map((q: string, i: number) => (
                          <div key={i} className="rounded border border-border/40 bg-muted/20 px-2.5 py-1.5 font-mono text-[11px] text-foreground/80 break-all">{q}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Combined queries */}
                  {generatedBoolean.booleanQueries?.combined?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">COMBINED</span>
                        <span className="text-[11px] text-muted-foreground">Boolean kompleks — paling presisi</span>
                      </div>
                      <div className="space-y-1">
                        {generatedBoolean.booleanQueries.combined.map((q: string, i: number) => (
                          <div key={i} className="rounded border border-violet-200/40 bg-violet-50/40 dark:border-violet-800/40 dark:bg-violet-950/10 px-2.5 py-1.5 font-mono text-[11px] text-foreground/80 break-all">{q}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Expanded keywords */}
                  {generatedBoolean.expandedKeywords?.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">EXPANDED</span>
                        <span className="text-[11px] text-muted-foreground">Istilah terkait yang ditemukan AI</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {generatedBoolean.expandedKeywords.map((k: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ) : null}

          {/* Multi-Language Search Panel */}
          <Card className="border-border/60">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
                  <Languages className="size-3.5 text-teal-600" />
                </div>
                <div>
                  <span className="text-sm font-medium">Pencarian Otomatis 5 Bahasa</span>
                  <p className="text-[11px] text-muted-foreground">Kata kunci dan judul diterjemahkan dan dicari otomatis dalam 5 bahasa</p>
                </div>
              </div>
              <Badge className="bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 gap-1 px-2.5 py-1 text-[10px]">
                <Sparkles className="size-3" /> Auto
              </Badge>
            </div>
            <div className="border-t border-border/40 px-4 pb-4 pt-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { name: 'English', code: 'en', flag: '🇬🇧', desc: 'Standar internasional' },
                  { name: 'Chinese', code: 'zh', flag: '🇨🇳', desc: '#1 Output Scopus' },
                  { name: 'Spanish', code: 'es', flag: '🇪🇸', desc: 'Pertumbuhan Q1-Q4' },
                  { name: 'German', code: 'de', flag: '🇩🇪', desc: 'Top 3 riset' },
                  { name: 'French', code: 'fr', flag: '🇫🇷', desc: 'Output utama' },
                ].map((lang) => {
                  const isActive = searchLanguages.includes(lang.name);
                  return (
                    <div
                      key={lang.code}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-2 transition-colors',
                        isActive
                          ? 'border-teal-200 bg-teal-50/60 dark:border-teal-800 dark:bg-teal-950/20'
                          : 'border-border/40 opacity-50'
                      )}
                    >
                      <span className="text-base leading-none">{lang.flag}</span>
                      <div className="flex flex-col">
                        <span className={cn(
                          'text-xs font-medium',
                          isActive ? 'text-teal-700 dark:text-teal-300' : 'text-muted-foreground'
                        )}>{lang.name}</span>
                        <span className="text-[9px] text-muted-foreground">{lang.desc}</span>
                      </div>
                      {isActive && (
                        <CheckSquare className="size-3 text-teal-600 shrink-0 ml-1" />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                <Globe className="inline size-3 mr-1" />
                Mencari dengan: kata kunci asli + kueri Boolean + varian judul terjemahan di semua bahasa aktif
              </p>
            </div>
          </Card>

          {/* ─── Reference List ─── */}
          <div className="space-y-2">
            {filteredReferences.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                  <Search className="size-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">Tidak ada referensi yang cocok dengan filter</p>
                  <p className="text-xs text-muted-foreground/70">
                    Coba sesuaikan tipe, rentang tahun, atau teks pencarian
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="max-h-[600px] w-full">
                <div className="space-y-2 pr-3">
                  {filteredReferences.map((ref, index) => (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.6) }}
                      className="flex items-center gap-2"
                    >
                      <span className="shrink-0 text-[10px] font-medium text-muted-foreground/50 w-5 text-right tabular-nums">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <ReferenceCard
                          reference={ref}
                          isExpanded={expandedIds.has(ref.id)}
                          onToggleExpand={() => toggleExpand(ref.id)}
                          onToggleSelect={() => toggleReference(ref.id)}
                          onOpenDetail={() => handleOpenDetail(ref)}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* ─── Theory Detection Panel ─── */}
          <Collapsible open={!!theories}>
            <Card className="border-border/60">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Brain className="size-4 text-violet-600" />
                  <span className="text-sm font-medium">Deteksi Teori</span>
                  {theories && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300">
                      {theories.dominantParadigm || 'Terdeteksi'}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (references.length === 0) return;
                    setIsDetectingTheories(true);
                    try {
                      const postRes = await fetch('/api/references/detect-theories', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          references: references.slice(0, 30).map((r) => ({
                            title: r.title,
                            abstract: r.abstract,
                            year: r.year,
                            authors: r.authors,
                          })),
                        }),
                      });
                      if (!postRes.ok) throw new Error('Theory detection failed');
                      const postData = await postRes.json();
                      if (!postData.success) throw new Error(postData.error || 'Theory detection failed');

                      // Synchronous mode: result is directly in the response
                      if (postData.grandTheories || postData.dominantParadigm) {
                        setTheories(postData);
                        toast.success('Deteksi teori selesai');
                      } else if (postData.jobId) {
                        // Legacy job mode: poll for result
                        const pollResult = await new Promise<any>((resolve, reject) => {
                          const pInterval = setInterval(async () => {
                            try {
                              const pRes = await fetch(`/api/references/detect-theories?jobId=${postData.jobId}`);
                              const pData = await pRes.json();
                              if (pData.status === 'done' && pData.result) {
                                clearInterval(pInterval);
                                resolve(pData.result);
                              } else if (pData.status === 'error') {
                                clearInterval(pInterval);
                                reject(new Error(pData.error || 'Theory detection failed'));
                              }
                            } catch { /* continue */ }
                          }, 2000);
                          setTimeout(() => { clearInterval(pInterval); reject(new Error('Theory detection timed out')); }, 90_000);
                        });
                        setTheories(pollResult);
                        toast.success('Deteksi teori selesai');
                      } else {
                        throw new Error('Invalid response from theory detection');
                      }
                    } catch {
                      toast.error('Deteksi teori gagal. Silakan coba lagi.');
                    } finally {
                      setIsDetectingTheories(false);
                    }
                  }}
                  disabled={references.length === 0 || isDetectingTheories}
                  className="gap-1.5 text-xs h-7"
                >
                  {isDetectingTheories ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FlaskConical className="size-3.5" />
                  )}
                  {theories ? 'Deteksi Ulang Teori' : 'Deteksi Teori'}
                </Button>
              </div>

              <CollapsibleContent>
                {isDetectingTheories ? (
                  <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                      <Loader2 className="size-4 animate-spin text-violet-600" />
                      <span className="text-xs text-muted-foreground">Menganalisis kerangka teori dari referensi...</span>
                    </div>
                  </div>
                ) : theories ? (
                  <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-4">
                    {/* Dominant Paradigm + Maturity */}
                    <div className="flex flex-wrap items-center gap-2">
                      {theories.dominantParadigm && (
                        <Badge className="bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800 gap-1 px-2.5 py-1">
                          <BookMarked className="size-3" />
                          Paradigm: {theories.dominantParadigm}
                        </Badge>
                      )}
                      {theories.theoreticalMaturity && (
                        <Badge className="bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 gap-1 px-2.5 py-1">
                          <Eye className="size-3" />
                          Maturity: {theories.theoreticalMaturity}
                        </Badge>
                      )}
                    </div>

                    {/* Grand Theories */}
                    {theories.grandTheories && theories.grandTheories.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            Grand Theories
                          </span>
                          <span className="text-[11px] text-muted-foreground">({theories.grandTheories.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {theories.grandTheories.map((t: any, i: number) => (
                            <div key={i} className="rounded-md border border-border/40 bg-muted/20 p-2.5 space-y-1">
                              <p className="text-xs font-semibold text-foreground">{t.name}</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{t.description}</p>
                              {t.sourceRefs && t.sourceRefs.length > 0 && (
                                <p className="text-[10px] text-muted-foreground/70">Sources: {t.sourceRefs.join(', ')}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Middle-Range Theories */}
                    {theories.middleRangeTheories && theories.middleRangeTheories.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            Middle-Range Theories
                          </span>
                          <span className="text-[11px] text-muted-foreground">({theories.middleRangeTheories.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {theories.middleRangeTheories.map((t: any, i: number) => (
                            <div key={i} className="rounded-md border border-border/40 bg-muted/20 p-2.5 space-y-1">
                              <p className="text-xs font-semibold text-foreground">{t.name}</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{t.description}</p>
                              {t.sourceRefs && t.sourceRefs.length > 0 && (
                                <p className="text-[10px] text-muted-foreground/70">Sources: {t.sourceRefs.join(', ')}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Applied Theories */}
                    {theories.appliedTheories && theories.appliedTheories.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                            Applied Theories
                          </span>
                          <span className="text-[11px] text-muted-foreground">({theories.appliedTheories.length})</span>
                        </div>
                        <div className="space-y-1.5">
                          {theories.appliedTheories.map((t: any, i: number) => (
                            <div key={i} className="rounded-md border border-border/40 bg-muted/20 p-2.5 space-y-1">
                              <p className="text-xs font-semibold text-foreground">{t.name}</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{t.description}</p>
                              {t.sourceRefs && t.sourceRefs.length > 0 && (
                                <p className="text-[10px] text-muted-foreground/70">Sources: {t.sourceRefs.join(', ')}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Theoretical Gaps */}
                    {theories.theoreticalGaps && theories.theoreticalGaps.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5 text-amber-500" />
                          <span className="text-xs font-semibold text-foreground">Celah Teoritis</span>
                        </div>
                        <ul className="space-y-1">
                          {theories.theoreticalGaps.map((gap: string, i: number) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <span className="mt-0.5 size-1 rounded-full bg-amber-400 shrink-0" />
                              {gap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}

      {/* ─── Bottom Bar (sticky) ─── */}
      {hasResults && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-xs font-bold text-white',
                    selectedCount >= 5
                      ? 'bg-emerald-600'
                      : selectedCount > 0
                        ? 'bg-amber-500'
                        : 'bg-muted-foreground/30'
                  )}
                >
                  {selectedCount}
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight">
                    {selectedCount} referensi dipilih
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedCount < 5
                      ? `Pilih setidaknya ${5 - selectedCount} lagi untuk melanjutkan`
                      : 'Siap melanjutkan'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearch}
                disabled={isSearchingReferences}
                className="hidden sm:inline-flex"
              >
                <Search className="size-4" />
                Cari Lagi
              </Button>
              <Button
                size="sm"
                onClick={nextStep}
                disabled={selectedCount < 5}
                className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
              >
                Lanjut ke Pemilihan Metode
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ─── Reference Detail Modal ─── */}
      {detailReference && (
        <ReferenceDetailModal
          reference={detailReference}
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setDetailReference(null);
          }}
          onToggleSelect={() => {
            if (detailReference) {
              toggleReference(detailReference.id);
            }
          }}
        />
      )}
    </div>
  );
}