'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Play, Square, RotateCcw, Download, ExternalLink,
  CheckCircle2, XCircle, AlertCircle, Loader2, Search,
  Filter, ChevronDown, ChevronUp, Database, Globe, BookOpen,
  GraduationCap, Unlock, HeartPulse, Cpu, Users, Landmark,
  FileText, Zap, ArrowRight, BarChart3, Clock, Target,
  Brain, LayoutGrid, Link, Library,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useArticleStore, type Reference } from '@/store/article-store';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// §1. LOCAL TYPES (matching super-bot-engine, since this is a client component)
// ═══════════════════════════════════════════════════════════════════════════════

type BotPhase =
  | 'init'
  | 'strategy'
  | 'searching'
  | 'scoring'
  | 'downloading'
  | 'uploading'
  | 'complete'
  | 'error';

interface BotProgress {
  phase: BotPhase;
  currentDatabase: string;
  databasesSearched: string[];
  totalDatabases: number;
  resultsFound: number;
  currentPercent: number;
  message: string;
  startTime: number;
}

interface BotResult {
  id: string;
  databaseId: string;
  databaseName: string;
  title: string;
  authors: string;
  year: number | null;
  abstract: string | null;
  journal: string | null;
  doi: string | null;
  pdfUrl: string | null;
  citations: number | null;
  isOpenAccess: boolean;
  score: number;
  source: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §2. CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DATABASE_LIST = [
  { id: 'google_scholar', name: 'Google Scholar', category: 'General', icon: 'GraduationCap' },
  { id: 'doaj', name: 'DOAJ', category: 'Open Access', icon: 'Unlock' },
  { id: 'garuda', name: 'Garuda', category: 'Indonesian', icon: 'Landmark' },
  { id: 'researchgate', name: 'ResearchGate', category: 'General', icon: 'Users' },
  { id: 'scienceopen', name: 'ScienceOpen', category: 'Open Access', icon: 'BookOpen' },
  { id: 'pubmed', name: 'PubMed', category: 'Specialized', icon: 'HeartPulse' },
  { id: 'ieee_xplore', name: 'IEEE Xplore', category: 'Specialized', icon: 'Cpu' },
  { id: 'scopus', name: 'Scopus', category: 'General', icon: 'Search' },
  { id: 'dimensions', name: 'Dimensions', category: 'General', icon: 'LayoutGrid' },
  { id: 'semanticscholar', name: 'Semantic Scholar', category: 'General', icon: 'Brain' },
  { id: 'core', name: 'CORE', category: 'Open Access', icon: 'Database' },
  { id: 'base', name: 'BASE', category: 'Open Access', icon: 'Globe' },
  { id: 'perpusnas', name: 'Perpusnas', category: 'Indonesian', icon: 'Library' },
  { id: 'crossref', name: 'CrossRef', category: 'General', icon: 'Link' },
] as const;

const CATEGORIES = ['General', 'Open Access', 'Specialized', 'Indonesian'] as const;

const ICON_MAP: Record<string, React.ElementType> = {
  GraduationCap,
  Unlock,
  Landmark,
  Users,
  BookOpen,
  HeartPulse,
  Cpu,
  Search,
  LayoutGrid,
  Brain,
  Database,
  Globe,
  Library,
  Link,
};

const PHASES: Array<{
  key: BotPhase;
  label: string;
  icon: React.ElementType;
  description: string;
}> = [
  { key: 'init', label: 'Inisialisasi', icon: Zap, description: 'Menyiapkan mesin' },
  { key: 'strategy', label: 'Strategi', icon: Brain, description: 'Perencanaan AI' },
  { key: 'searching', label: 'Mencari', icon: Search, description: 'Menelusuri database' },
  { key: 'scoring', label: 'Menilai', icon: Target, description: 'Mengurutkan hasil' },
  { key: 'downloading', label: 'Mengunduh', icon: Download, description: 'Mengambil PDF' },
  { key: 'uploading', label: 'Mengunggah', icon: UploadIcon, description: 'Penyimpanan awan' },
  { key: 'complete', label: 'Selesai', icon: CheckCircle2, description: 'Selesai!' },
];

// Placeholder for the Upload icon (not in lucide default, using a div)
function UploadIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  General: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
  'Open Access': 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800',
  Specialized: 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/40 border-violet-200 dark:border-violet-800',
  Indonesian: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800',
};

// ═══════════════════════════════════════════════════════════════════════════════
// §3. UTILITY: Convert BotResult → Reference (for import to article store)
// ═══════════════════════════════════════════════════════════════════════════════

function convertBotResultsToReferences(
  results: BotResult[],
  selectedIds: Set<string>,
): Reference[] {
  return results
    .filter((r) => selectedIds.has(r.id))
    .map((r, index) => ({
      id: r.id,
      authors: r.authors || 'Penulis Tidak Diketahui',
      title: r.title || 'Tanpa Judul',
      year: r.year ?? new Date().getFullYear(),
      journal: r.journal ?? undefined,
      doi: r.doi ?? undefined,
      abstract: r.abstract ?? undefined,
      refType: 'journal_scopus' as const,
      isSelected: true,
      is_open_access: r.isOpenAccess,
      pdf_url: r.pdfUrl ?? undefined,
      citation_count: r.citations ?? undefined,
      relevanceScore: r.score / 100,
      sort_order: index,
    }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// §4. SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Animated elapsed timer ──────────────────────────────────────────

function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <span className="tabular-nums font-mono text-sm text-muted-foreground">
      {minutes > 0 && `${minutes}m `}{seconds}s
    </span>
  );
}

// ─── Animated counter ────────────────────────────────────────────────

function AnimatedCounter({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;

    const duration = 400;
    const start = performance.now();
    const from = displayed;

    function animate(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (value - from) * eased);
      setDisplayed(next);
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [value, displayed]);

  return <span className="tabular-nums font-mono">{displayed}</span>;
}

// ─── Score badge ─────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const colorClass =
    score >= 80
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-emerald-500/20'
      : score >= 60
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 ring-amber-500/20'
        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 ring-red-500/20';

  return (
    <div
      className={cn(
        'flex items-center justify-center size-10 rounded-full text-sm font-bold ring-2 shrink-0',
        colorClass,
      )}
    >
      {score}
    </div>
  );
}

// ─── Keyword chip ────────────────────────────────────────────────────

function KeywordChip({
  keyword,
  onRemove,
}: {
  keyword: string;
  onRemove: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-medium dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
    >
      {keyword}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:text-emerald-900 dark:hover:text-emerald-100 transition-colors"
        aria-label={`Hapus kata kunci "${keyword}"`}
      >
        <XCircle className="size-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Phase indicator ─────────────────────────────────────────────────

function PhaseIndicator({ progress }: { progress: BotProgress }) {
  const currentPhaseIndex = PHASES.findIndex((p) => p.key === progress.phase);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {PHASES.map((phase, index) => {
          const PhaseIcon = phase.icon;
          const isCompleted = index < currentPhaseIndex;
          const isActive = index === currentPhaseIndex;
          const isPending = index > currentPhaseIndex;

          return (
            <React.Fragment key={phase.key}>
              <motion.div
                className="flex flex-col items-center gap-1"
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <div
                  className={cn(
                    'flex items-center justify-center size-9 rounded-xl transition-all duration-300',
                    isActive &&
                      'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',
                    isCompleted &&
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                    isPending && 'bg-muted text-muted-foreground/40',
                  )}
                >
                  {isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 className="size-4" />
                    </motion.div>
                  ) : (
                    <PhaseIcon className="size-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium text-center leading-tight max-w-[56px]',
                    isActive && 'text-emerald-700 dark:text-emerald-300',
                    isCompleted && 'text-foreground/60',
                    isPending && 'text-muted-foreground/40',
                  )}
                >
                  {phase.label}
                </span>
              </motion.div>
              {index < PHASES.length - 1 && (
                <div className="flex-1 min-w-[12px] max-w-[40px] h-0.5 rounded-full mt-[-1rem]">
                  <div className="h-full rounded-full bg-border overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={false}
                      animate={{
                        width: isCompleted || (index + 1 === currentPhaseIndex) ? '100%' : '0%',
                      }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Database search status ──────────────────────────────────────────

function DatabaseSearchStatus({
  progress,
  databaseList,
}: {
  progress: BotProgress;
  databaseList: typeof DATABASE_LIST;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Progres Pencarian Database
      </p>
      <div className="flex flex-wrap gap-1.5">
        {databaseList.map((db) => {
          const isSearched = progress.databasesSearched.includes(db.name);
          const isCurrentlySearching = progress.currentDatabase === db.name;
          const DbIcon = ICON_MAP[db.icon] || Database;

          return (
            <motion.div
              key={db.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: isSearched || isCurrentlySearching ? 1 : 0.4,
                scale: 1,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-300',
                isCurrentlySearching &&
                  'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 shadow-sm',
                isSearched && !isCurrentlySearching &&
                  'border-emerald-200 bg-emerald-50/50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400',
                !isSearched && !isCurrentlySearching &&
                  'border-border bg-muted/30 text-muted-foreground/50',
              )}
            >
              <DbIcon className="size-3" />
              {isCurrentlySearching ? (
                <Loader2 className="size-3 animate-spin" />
              ) : isSearched ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <div className="size-3 rounded-full border border-current opacity-30" />
              )}
              <span className="max-w-[80px] truncate">{db.name}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Result card ─────────────────────────────────────────────────────

function ResultCard({
  result,
  isSelected,
  onToggle,
  index,
}: {
  result: BotResult;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}) {
  const scoreColor =
    result.score >= 80
      ? 'border-emerald-300 dark:border-emerald-700'
      : result.score >= 60
        ? 'border-amber-200 dark:border-amber-800'
        : 'border-border';

  const scoreBg =
    result.score >= 80
      ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
      : result.score >= 60
        ? 'bg-amber-50/20 dark:bg-amber-950/10'
        : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.8) }}
    >
      <Card
        className={cn(
          'group transition-all duration-200 hover:shadow-md cursor-pointer',
          isSelected
            ? 'border-emerald-400 bg-emerald-50/40 dark:border-emerald-600 dark:bg-emerald-950/20'
            : `${scoreBorder} ${scoreBg}`,
        )}
        onClick={onToggle}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex gap-3">
            {/* Checkbox */}
            <div className="pt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle()}
                className={cn(
                  'size-4 cursor-pointer',
                  isSelected &&
                    'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600',
                )}
              />
            </div>

            {/* Score badge */}
            <ScoreBadge score={result.score} />

            {/* Content */}
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Title row */}
              <div className="flex items-start gap-2">
                <h4 className="text-sm font-semibold leading-snug text-foreground line-clamp-2 flex-1">
                  {result.doi ? (
                    <a
                      href={`https://doi.org/${result.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {result.title}
                    </a>
                  ) : (
                    result.title
                  )}
                </h4>
                {result.doi && (
                  <a
                    href={`https://doi.org/${result.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mt-0.5"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Buka DOI"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>

              {/* Authors */}
              {result.authors && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {result.authors.length > 80
                    ? `${result.authors.substring(0, 80)}...`
                    : result.authors}
                </p>
              )}

              {/* Meta badges row */}
              <div className="flex flex-wrap items-center gap-1.5">
                {result.year && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 font-mono"
                  >
                    {result.year}
                  </Badge>
                )}
                {result.journal && (
                  <span className="text-[10px] text-muted-foreground/70 italic line-clamp-1 max-w-[200px]">
                    {result.journal}
                  </span>
                )}
                {(result.citations ?? 0) > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 gap-0.5 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                  >
                    <BarChart3 className="size-2.5" />
                    {result.citations} sitasi
                  </Badge>
                )}
                {result.isOpenAccess && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 gap-0.5 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                  >
                    <Unlock className="size-2.5" />
                    Open Access
                  </Badge>
                )}
                {result.pdfUrl && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 gap-0.5 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300"
                  >
                    <FileText className="size-2.5" />
                    PDF
                  </Badge>
                )}
                {result.databaseName && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {result.databaseName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Fix: use the correct variable name
const scoreBorder = 'border-border/60';

// ═══════════════════════════════════════════════════════════════════════════════
// §5. BOT CONTROL PANEL (Idle / Setup)
// ═══════════════════════════════════════════════════════════════════════════════

function BotControlPanel({
  topic,
  setTopic,
  keywords,
  setKeywords,
  selectedDatabases,
  setSelectedDatabases,
  maxResults,
  setMaxResults,
  minScore,
  setMinScore,
  autoDownload,
  setAutoDownload,
  downloadLimit,
  setDownloadLimit,
  onLaunch,
}: {
  topic: string;
  setTopic: (v: string) => void;
  keywords: string[];
  setKeywords: (v: string[]) => void;
  selectedDatabases: string[];
  setSelectedDatabases: (v: string[]) => void;
  maxResults: number;
  setMaxResults: (v: number) => void;
  minScore: number;
  setMinScore: (v: number) => void;
  autoDownload: boolean;
  setAutoDownload: (v: boolean) => void;
  downloadLimit: number;
  setDownloadLimit: (v: number) => void;
  onLaunch: () => void;
}) {
  const [newKeyword, setNewKeyword] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const addKeyword = useCallback(() => {
    const trimmed = newKeyword.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setNewKeyword('');
    }
  }, [newKeyword, keywords, setKeywords]);

  const removeKeyword = useCallback(
    (kw: string) => {
      setKeywords(keywords.filter((k) => k !== kw));
    },
    [keywords, setKeywords],
  );

  const selectAllDatabases = useCallback(() => {
    setSelectedDatabases(DATABASE_LIST.map((d) => d.id));
  }, [setSelectedDatabases]);

  const deselectAllDatabases = useCallback(() => {
    setSelectedDatabases([]);
  }, [setSelectedDatabases]);

  const toggleDatabase = useCallback(
    (id: string) => {
      setSelectedDatabases(
        selectedDatabases.includes(id)
          ? selectedDatabases.filter((d) => d !== id)
          : [...selectedDatabases, id],
      );
    },
    [selectedDatabases, setSelectedDatabases],
  );

  const groupedDbs = useMemo(() => {
    const grouped: Record<string, (typeof DATABASE_LIST)[number][]> = {};
    for (const cat of CATEGORIES) {
      grouped[cat] = DATABASE_LIST.filter((d) => d.category === cat);
    }
    return grouped;
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Topic Input ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bot className="size-4 text-emerald-600" />
          Topik Penelitian
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Contoh: Dampak kecerdasan buatan terhadap hasil belajar pendidikan tinggi di Asia Tenggara"
          className="w-full min-h-[100px] rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 resize-y transition-all"
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Jelaskan topik penelitian Anda. Bot akan menggunakan AI untuk menghasilkan strategi pencarian yang optimal.
        </p>
      </div>

      <Separator className="opacity-50" />

      {/* ── Keywords ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Search className="size-4 text-emerald-600" />
          Kata Kunci
        </label>
        <div className="flex gap-2">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder="Tambahkan kata kunci dan tekan Enter"
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addKeyword}
            disabled={!newKeyword.trim()}
          >
            Tambah
          </Button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <AnimatePresence>
              {keywords.map((kw) => (
                <KeywordChip
                  key={kw}
                  keyword={kw}
                  onRemove={() => removeKeyword(kw)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Tambahkan kata kunci spesifik. Strategi AI akan memperluasnya dengan istilah terkait.
        </p>
      </div>

      <Separator className="opacity-50" />

      {/* ── Database Selector ────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Database className="size-4 text-emerald-600" />
            Database
            <Badge variant="secondary" className="text-[10px] font-mono">
              {selectedDatabases.length}/{DATABASE_LIST.length}
            </Badge>
          </label>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAllDatabases}>
              Pilih Semua
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={deselectAllDatabases}>
              Batalkan Semua
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {CATEGORIES.map((category) => (
            <div key={category} className="space-y-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
                  CATEGORY_COLORS[category],
                )}
              >
                {category}
                <span className="text-[10px] opacity-60">
                  ({groupedDbs[category].length})
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                {groupedDbs[category].map((db) => {
                  const isSelected = selectedDatabases.includes(db.id);
                  const DbIcon = ICON_MAP[db.icon] || Database;

                  return (
                    <motion.button
                      key={db.id}
                      type="button"
                      onClick={() => toggleDatabase(db.id)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200',
                        isSelected
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300 shadow-sm shadow-emerald-500/10'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50',
                      )}
                    >
                      <DbIcon className="size-3.5" />
                      <span>{db.name}</span>
                      <div
                        className={cn(
                          'size-2 rounded-full transition-colors',
                          isSelected
                            ? 'bg-emerald-500'
                            : 'bg-muted-foreground/20',
                        )}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="opacity-50" />

      {/* ── Advanced Settings (Collapsible) ──────────────────────── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors w-full"
        >
          <Filter className="size-4 text-emerald-600" />
          Pengaturan Lanjutan
          <motion.div
            animate={{ rotate: advancedOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {advancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <Card className="border-border/60 bg-muted/20">
                <CardContent className="space-y-6 p-4 sm:p-5">
                  {/* Max Results Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">
                        Maks. Hasil per Database
                      </label>
                      <span className="text-xs font-bold text-foreground tabular-nums font-mono">
                        {maxResults}
                      </span>
                    </div>
                    <Slider
                      value={[maxResults]}
                      onValueChange={([v]) => setMaxResults(v)}
                      min={10}
                      max={100}
                      step={5}
                      className="[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/60">
                      <span>10</span>
                      <span>100</span>
                    </div>
                  </div>

                  {/* Min Score Threshold */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">
                        Batas Skor Minimum
                      </label>
                      <span className="text-xs font-bold text-foreground tabular-nums font-mono">
                        {minScore}
                      </span>
                    </div>
                    <Slider
                      value={[minScore]}
                      onValueChange={([v]) => setMinScore(v)}
                      min={0}
                      max={100}
                      step={5}
                      className="[&_[data-slot=slider-range]]:bg-teal-500 [&_[data-slot=slider-thumb]]:border-teal-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/60">
                      <span>0 (semua)</span>
                      <span>100 (terbaik saja)</span>
                    </div>
                  </div>

                  {/* Auto Download Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Unduh Otomatis PDF
                      </label>
                      <p className="text-[10px] text-muted-foreground/60">
                        Otomatis mengunduh PDF teratas setelah penilaian
                      </p>
                    </div>
                    <Switch
                      checked={autoDownload}
                      onCheckedChange={setAutoDownload}
                    />
                  </div>

                  {/* Download Limit Slider */}
                  <AnimatePresence>
                    {autoDownload && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-muted-foreground">
                            Batas Unduhan
                          </label>
                          <span className="text-xs font-bold text-foreground tabular-nums font-mono">
                            {downloadLimit}
                          </span>
                        </div>
                        <Slider
                          value={[downloadLimit]}
                          onValueChange={([v]) => setDownloadLimit(v)}
                          min={5}
                          max={50}
                          step={5}
                          className="[&_[data-slot=slider-range]]:bg-sky-500 [&_[data-slot=slider-thumb]]:border-sky-500"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground/60">
                          <span>5</span>
                          <span>50</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="opacity-50" />

      {/* ── Launch Button ────────────────────────────────────────── */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Button
          size="lg"
          onClick={onLaunch}
          disabled={!topic.trim() || selectedDatabases.length === 0}
          className="w-full h-14 text-base font-bold shadow-xl shadow-emerald-600/25 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-700 text-white transition-all disabled:opacity-40 disabled:shadow-none"
        >
          <Bot className="size-5 mr-2" />
          Jalankan Super Bot
          <ArrowRight className="size-5 ml-2" />
        </Button>
      </motion.div>

      {!topic.trim() && (
        <p className="text-xs text-center text-amber-600 dark:text-amber-400">
          Silakan masukkan topik penelitian untuk menjalankan bot
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §6. PROGRESS DASHBOARD (Running)
// ═══════════════════════════════════════════════════════════════════════════════

function ProgressDashboard({
  progress,
  onCancel,
  databaseList,
}: {
  progress: BotProgress;
  onCancel: () => void;
  databaseList: typeof DATABASE_LIST;
}) {
  return (
    <div className="space-y-6">
      {/* Phase Indicator */}
      <PhaseIndicator progress={progress} />

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {progress.phase === 'searching'
              ? `Mencari: ${progress.databasesSearched.length}/${progress.totalDatabases} database`
              : progress.phase === 'scoring'
                ? 'Menilai & mengurutkan hasil...'
                : progress.phase === 'downloading'
                  ? 'Mengunduh PDF...'
                  : progress.phase === 'strategy'
                    ? 'Menghasilkan strategi pencarian AI...'
                    : progress.phase === 'uploading'
                      ? 'Mengunggah ke penyimpanan awan...'
                      : progress.phase === 'init'
                        ? 'Menginisialisasi...'
                        : 'Memproses...'}
          </span>
          <span className="tabular-nums font-mono text-muted-foreground font-semibold">
            {Math.round(progress.currentPercent)}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"
            initial={false}
            animate={{ width: `${progress.currentPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Activity Message */}
      <motion.div
        key={progress.message}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-950/20 px-4 py-3"
      >
        {progress.phase === 'error' ? (
          <AlertCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
        ) : (
          <Loader2 className="size-4 text-emerald-600 animate-spin mt-0.5 shrink-0" />
        )}
        <p className="text-sm text-foreground/80">{progress.message}</p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <Database className="size-3" />
            Ditelusuri
          </div>
          <p className="text-lg font-bold text-foreground tabular-nums font-mono">
            <AnimatedCounter value={progress.databasesSearched.length} />
            <span className="text-xs text-muted-foreground font-normal">
              /{progress.totalDatabases}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <FileText className="size-3" />
            Hasil
          </div>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
            <AnimatedCounter value={progress.resultsFound} />
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <Clock className="size-3" />
            Waktu
          </div>
          <p className="text-lg font-bold text-foreground tabular-nums font-mono">
            <ElapsedTimer startTime={progress.startTime} />
          </p>
        </div>
      </div>

      {/* Database Search Status */}
      <DatabaseSearchStatus progress={progress} databaseList={databaseList} />

      {/* Cancel Button */}
      <div className="flex justify-center">
        <Button
          variant="destructive"
          size="lg"
          onClick={onCancel}
          className="gap-2"
        >
          <Square className="size-4" />
          Batalkan Pencarian
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §7. RESULTS DASHBOARD (Complete)
// ═══════════════════════════════════════════════════════════════════════════════

function ResultsDashboard({
  results,
  onImport,
  onRunAgain,
}: {
  results: BotResult[];
  onImport: (selectedIds: Set<string>) => void;
  onRunAgain: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scoreFilter, setScoreFilter] = useState<[number, number]>([0, 100]);
  const [databaseFilter, setDatabaseFilter] = useState<string>('all');
  const [oaFilter, setOaFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'year' | 'citations'>('score');
  const [showFilters, setShowFilters] = useState(false);

  // Unique databases from results
  const uniqueDatabases = useMemo(
    () => Array.from(new Set(results.map((r) => r.databaseName))),
    [results],
  );

  // Toggle selection
  const toggleResult = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectTop20 = useCallback(() => {
    const sorted = [...results].sort((a, b) => b.score - a.score);
    const top = new Set(sorted.slice(0, 20).map((r) => r.id));
    setSelectedIds(top);
    toast.info('20 hasil teratas dipilih berdasarkan skor');
  }, [results]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(results.map((r) => r.id)));
    toast.info('Semua hasil dipilih');
  }, [results]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Filter + sort
  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // Score range
    filtered = filtered.filter((r) => r.score >= scoreFilter[0] && r.score <= scoreFilter[1]);

    // Database filter
    if (databaseFilter !== 'all') {
      filtered = filtered.filter((r) => r.databaseName === databaseFilter);
    }

    // Open access filter
    if (oaFilter === 'yes') filtered = filtered.filter((r) => r.isOpenAccess);
    if (oaFilter === 'no') filtered = filtered.filter((r) => !r.isOpenAccess);

    // Sort
    switch (sortBy) {
      case 'year':
        filtered.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        break;
      case 'citations':
        filtered.sort((a, b) => (b.citations ?? 0) - (a.citations ?? 0));
        break;
      case 'score':
      default:
        filtered.sort((a, b) => b.score - a.score);
        break;
    }

    return filtered;
  }, [results, scoreFilter, databaseFilter, oaFilter, sortBy]);

  // Summary stats
  const stats = useMemo(() => {
    if (results.length === 0) return { total: 0, avgScore: 0, oaPercent: 0, avgCitations: 0 };
    const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
    const oaCount = results.filter((r) => r.isOpenAccess).length;
    const oaPercent = Math.round((oaCount / results.length) * 100);
    const avgCitations = Math.round(
      results.reduce((s, r) => s + (r.citations ?? 0), 0) / results.length,
    );
    return { total: results.length, avgScore, oaPercent, avgCitations };
  }, [results]);

  const handleImport = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error('Tidak ada hasil yang dipilih. Silakan pilih setidaknya satu hasil.');
      return;
    }
    onImport(selectedIds);
  }, [selectedIds, onImport]);

  return (
    <div className="space-y-6">
      {/* ── Summary Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Hasil',
            value: stats.total,
            icon: BarChart3,
            color: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Rata-rata Skor',
            value: stats.avgScore,
            icon: Target,
            color: 'text-teal-600 dark:text-teal-400',
          },
          {
            label: 'Persentase Open Access',
            value: `${stats.oaPercent}%`,
            icon: Unlock,
            color: 'text-violet-600 dark:text-violet-400',
          },
          {
            label: 'Rata-rata Sitasi',
            value: stats.avgCitations,
            icon: BookOpen,
            color: 'text-amber-600 dark:text-amber-400',
          },
        ].map((stat) => {
          const StatIcon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center"
            >
              <StatIcon className={cn('size-4 mx-auto mb-1', stat.color)} />
              <p className="text-lg font-bold text-foreground tabular-nums font-mono">
                {stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ── Selection actions ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={selectTop20} className="text-xs gap-1">
          <Target className="size-3.5" />
          Pilih 20 Teratas
        </Button>
        <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs gap-1">
          Pilih Semua
        </Button>
        <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs gap-1">
          Batalkan Semua
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-mono gap-1">
            <CheckCircle2 className="size-3" />
            {selectedIds.size} terpilih
          </Badge>
          <Badge variant="secondary" className="text-xs font-mono gap-1">
            <Filter className="size-3" />
            {filteredResults.length} ditampilkan
          </Badge>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'gap-1.5 text-xs',
            showFilters && 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-700',
          )}
        >
          <Filter className="size-3.5" />
          Filter
          <ChevronDown className={cn('size-3 transition-transform', showFilters && 'rotate-180')} />
        </Button>
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <Card className="mt-3 border-border/60 bg-muted/10">
                <CardContent className="p-4 space-y-4">
                  {/* Score range */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">
                        Rentang Skor
                      </label>
                      <span className="text-xs font-mono text-foreground">
                        {scoreFilter[0]} – {scoreFilter[1]}
                      </span>
                    </div>
                    <Slider
                      value={scoreFilter}
                      onValueChange={(v) => setScoreFilter(v as [number, number])}
                      min={0}
                      max={100}
                      step={5}
                      className="[&_[data-slot=slider-range]]:bg-emerald-500 [&_[data-slot=slider-thumb]]:border-emerald-500"
                    />
                  </div>

                  {/* Database & OA filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Database Sumber
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDatabaseFilter('all')}
                          className={cn(
                            'rounded-md px-2.5 py-1 text-[11px] font-medium border transition-colors',
                            databaseFilter === 'all'
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'border-border text-muted-foreground hover:bg-muted/50',
                          )}
                        >
                          Semua ({results.length})
                        </button>
                        {uniqueDatabases.map((dbName) => {
                          const count = results.filter((r) => r.databaseName === dbName).length;
                          return (
                            <button
                              key={dbName}
                              type="button"
                              onClick={() => setDatabaseFilter(dbName)}
                              className={cn(
                                'rounded-md px-2.5 py-1 text-[11px] font-medium border transition-colors',
                                databaseFilter === dbName
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  : 'border-border text-muted-foreground hover:bg-muted/50',
                              )}
                            >
                              {dbName} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Open Access
                      </label>
                      <div className="flex gap-1.5">
                        {(['all', 'yes', 'no'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setOaFilter(opt)}
                            className={cn(
                              'rounded-md px-3 py-1.5 text-[11px] font-medium border transition-colors',
                              oaFilter === opt
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'border-border text-muted-foreground hover:bg-muted/50',
                            )}
                          >
                            {opt === 'all' ? 'Semua' : opt === 'yes' ? 'Open Access' : 'Terbatas'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Urutkan Berdasarkan
                    </label>
                    <div className="flex gap-1.5">
                      {([
                        { key: 'score' as const, label: 'Skor (Tinggi → Rendah)' },
                        { key: 'year' as const, label: 'Tahun (Terbaru)' },
                        { key: 'citations' as const, label: 'Sitasi (Tinggi → Rendah)' },
                      ]).map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setSortBy(opt.key)}
                          className={cn(
                            'rounded-md px-3 py-1.5 text-[11px] font-medium border transition-colors',
                            sortBy === opt.key
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'border-border text-muted-foreground hover:bg-muted/50',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator className="opacity-50" />

      {/* ── Results List ────────────────────────────────────────── */}
      <div className="space-y-2">
        {filteredResults.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Search className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                Tidak ada hasil yang cocok dengan filter
              </p>
              <p className="text-xs text-muted-foreground/70">
                Coba sesuaikan rentang skor, database, atau filter Open Access
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[520px] w-full">
            <div className="space-y-2 pr-3">
              {filteredResults.map((result, index) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  isSelected={selectedIds.has(result.id)}
                  onToggle={() => toggleResult(result.id)}
                  index={index}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* ── Bottom Action Bar ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-background via-background to-transparent">
        <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="flex-1">
          <Button
            size="lg"
            onClick={handleImport}
            disabled={selectedIds.size === 0}
            className="w-full h-12 text-sm font-bold shadow-lg shadow-emerald-600/20 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-700 text-white disabled:opacity-40 disabled:shadow-none gap-2"
          >
            <ArrowRight className="size-4" />
            Impor {selectedIds.size} Terpilih ke Artikel
          </Button>
        </motion.div>
        <Button
          variant="outline"
          size="lg"
          onClick={onRunAgain}
          className="h-12 gap-2"
        >
          <RotateCcw className="size-4" />
          Jalankan Ulang
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §8. ERROR STATE
// ═══════════════════════════════════════════════════════════════════════════════

function ErrorState({
  message,
  onTryAgain,
}: {
  message: string;
  onTryAgain: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 py-12 text-center"
    >
      {/* Error illustration */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-red-200/50 blur-2xl dark:bg-red-900/20" />
        <div className="relative flex items-center justify-center size-20 rounded-full bg-red-100 dark:bg-red-900/30 ring-4 ring-white dark:ring-gray-900">
          <div className="flex items-center justify-center size-12 rounded-full bg-red-500 shadow-lg shadow-red-500/25">
            <AlertCircle className="size-6 text-white" />
          </div>
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-bold text-foreground">Terjadi Kesalahan</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onTryAgain} variant="default" className="gap-2">
          <RotateCcw className="size-4" />
          Coba Lagi
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            const subject = encodeURIComponent('Laporan Masalah Super Bot');
            const body = encodeURIComponent(`Topik: ${topic}\nDatabase: ${selectedDatabases.join(', ')}\nError: ${errorState?.message || 'Tidak ada detail'}\n\nDeskripsi masalah:\n`);
            window.open(`mailto:support@mamah.app?subject=${subject}&body=${body}`, '_blank');
          }}
        >
          <AlertCircle className="size-4" />
          Laporkan Masalah
        </Button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// §9. MAIN COMPONENT — SuperBotPanel
// ═══════════════════════════════════════════════════════════════════════════════

type PanelState = 'idle' | 'running' | 'complete' | 'error';

export default function SuperBotPanel() {
  const { setReferences, setCurrentStep } = useArticleStore();

  // ── Panel state ──────────────────────────────────────────────────
  const [panelState, setPanelState] = useState<PanelState>('idle');

  // ── Control panel fields ─────────────────────────────────────────
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedDatabases, setSelectedDatabases] = useState<string[]>(
    DATABASE_LIST.map((d) => d.id),
  );
  const [maxResults, setMaxResults] = useState(50);
  const [minScore, setMinScore] = useState(60);
  const [autoDownload, setAutoDownload] = useState(false);
  const [downloadLimit, setDownloadLimit] = useState(20);

  // ── Progress & results ───────────────────────────────────────────
  const [botProgress, setBotProgress] = useState<BotProgress | null>(null);
  const [botResults, setBotResults] = useState<BotResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // ── Abort ref for cancelling SSE stream ──────────────────────────
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Clean up on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // ── Launch bot search ────────────────────────────────────────────
  const handleLaunch = useCallback(async () => {
    if (!topic.trim() || selectedDatabases.length === 0) {
      toast.error('Silakan berikan topik dan pilih setidaknya satu database.');
      return;
    }

    // Reset state
    setBotResults([]);
    setBotProgress(null);
    setErrorMessage('');
    setPanelState('running');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const initialProgress: BotProgress = {
      phase: 'init',
      currentDatabase: '',
      databasesSearched: [],
      totalDatabases: selectedDatabases.length,
      resultsFound: 0,
      currentPercent: 0,
      message: 'Menghubungkan ke mesin Super Bot...',
      startTime: Date.now(),
    };
    setBotProgress(initialProgress);

    try {
      const response = await fetch('/api/bot/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          keywords,
          maxResults,
          databases: selectedDatabases,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream available');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'progress' && data.progress) {
                setBotProgress(data.progress);
              } else if (data.type === 'result' && data.references) {
                const refs: BotResult[] = data.references.map(
                  (r: Record<string, unknown>, idx: number) => ({
                    id: (r.id as string) || `bot-${idx}`,
                    databaseId: (r.databaseId as string) || '',
                    databaseName: (r.databaseName as string) || (r.source as string) || '',
                    title: (r.title as string) || 'Tanpa Judul',
                    authors: (r.authors as string) || '',
                    year: (r.year as number) ?? null,
                    abstract: (r.abstract as string) ?? null,
                    journal: (r.journal as string) ?? null,
                    doi: (r.doi as string) ?? null,
                    pdfUrl: (r.pdfUrl as string) ?? null,
                    citations: (r.citations as number) ?? null,
                    isOpenAccess: (r.isOpenAccess as boolean) ?? false,
                    score: (r.score as number) ?? 0,
                    source: (r.source as string) || (r.databaseName as string) || '',
                  }),
                );
                setBotResults(refs);
                setBotProgress((prev) =>
                  prev
                    ? { ...prev, phase: 'complete', currentPercent: 100 }
                    : null,
                );
                setPanelState('complete');
                toast.success(
                  `Super Bot menemukan ${refs.length} referensi dari ${selectedDatabases.length} database!`,
                );
              }
            } catch {
              // Ignore malformed SSE data lines
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // User cancelled — do not show error state
        toast.info('Pencarian dibatalkan');
        setPanelState('idle');
        return;
      }
      const msg = error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak terduga';
      setErrorMessage(msg);
      setPanelState('error');
      toast.error(`Bot error: ${msg}`);
    } finally {
      abortControllerRef.current = null;
    }
  }, [topic, keywords, selectedDatabases, maxResults]);

  // ── Cancel search ────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setPanelState('idle');
  }, []);

  // ── Import results to article store ──────────────────────────────
  const handleImport = useCallback(
    (selectedIds: Set<string>) => {
      const refs = convertBotResultsToReferences(botResults, selectedIds);
      setReferences(refs);
      setCurrentStep(3);
      toast.success(
        `${refs.length} referensi diimpor! Melanjutkan ke pemilihan metode.`,
      );
    },
    [botResults, setReferences, setCurrentStep],
  );

  // ── Run again ────────────────────────────────────────────────────
  const handleRunAgain = useCallback(() => {
    setPanelState('idle');
    setBotResults([]);
    setBotProgress(null);
    setErrorMessage('');
  }, []);

  // ── Try again (from error) ───────────────────────────────────────
  const handleTryAgain = useCallback(() => {
    setPanelState('idle');
    setErrorMessage('');
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Panel header */}
      <div className="flex items-center gap-3">
        <motion.div
          className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-600/20"
          animate={
            panelState === 'running'
              ? {
                  boxShadow: [
                    '0 0 0 0 rgba(16, 185, 129, 0.4)',
                    '0 0 0 12px rgba(16, 185, 129, 0)',
                    '0 0 0 0 rgba(16, 185, 129, 0)',
                  ],
                }
              : {}
          }
          transition={{ duration: 2, repeat: panelState === 'running' ? Infinity : 0 }}
        >
          <Bot className="size-5" />
        </motion.div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Super Bot
          </h2>
          <p className="text-xs text-muted-foreground">
            Pencarian referensi akademik berbasis AI di 14 database
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'ml-auto text-[10px] font-medium px-2 py-0.5',
            panelState === 'idle' && 'border-border text-muted-foreground',
            panelState === 'running' && 'border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300',
            panelState === 'complete' && 'border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300',
            panelState === 'error' && 'border-red-400 text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300',
          )}
        >
          {panelState === 'idle' && 'Siap'}
          {panelState === 'running' && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="size-2.5 animate-spin" />
              Berjalan
            </span>
          )}
          {panelState === 'complete' && (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="size-2.5" />
              Selesai
            </span>
          )}
          {panelState === 'error' && (
            <span className="inline-flex items-center gap-1">
              <XCircle className="size-2.5" />
              Gagal
            </span>
          )}
        </Badge>
      </div>

      <Separator className="opacity-50" />

      {/* Animated content transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={panelState}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {panelState === 'idle' && (
            <BotControlPanel
              topic={topic}
              setTopic={setTopic}
              keywords={keywords}
              setKeywords={setKeywords}
              selectedDatabases={selectedDatabases}
              setSelectedDatabases={setSelectedDatabases}
              maxResults={maxResults}
              setMaxResults={setMaxResults}
              minScore={minScore}
              setMinScore={setMinScore}
              autoDownload={autoDownload}
              setAutoDownload={setAutoDownload}
              downloadLimit={downloadLimit}
              setDownloadLimit={setDownloadLimit}
              onLaunch={handleLaunch}
            />
          )}

          {panelState === 'running' && botProgress && (
            <ProgressDashboard
              progress={botProgress}
              onCancel={handleCancel}
              databaseList={DATABASE_LIST}
            />
          )}

          {panelState === 'complete' && (
            <ResultsDashboard
              results={botResults}
              onImport={handleImport}
              onRunAgain={handleRunAgain}
            />
          )}

          {panelState === 'error' && (
            <ErrorState message={errorMessage} onTryAgain={handleTryAgain} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
