'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import {
  Wand2,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  Download,
  Copy,
  RefreshCw,
  Star,
  Award,
  FileCheck,
  Loader2,
  GitCompare,
  Layers,
  BookOpen,
  Quote,
  GitBranch,
  Eye,
  Lightbulb,
  SpellCheck,
  AlignLeft,
  ChevronRight,
  Zap,
  PartyPopper,
  FileText,
  Columns,
  Crown,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useArticleStore, type GeneratedArticle, type ArticleSection } from '@/store/article-store';
import { toast } from 'sonner';
import { exportToMarkdown } from '@/lib/export-markdown';
import { exportToPdf } from '@/lib/export-pdf';
import { useArticleSearch } from '@/hooks/use-article-search';
import ArticleSearchBar from '@/components/article-search-bar';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Types ────────────────────────────────────────────────────────────────────

interface PolishOption {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
}

interface ChangeSummary {
  structuralChanges: number;
  toneImprovements: number;
  citationFixes: number;
  coherenceEdits: number;
  clarityEdits: number;
  vocabularyUpgrades: number;
  grammarFixes: number;
  formattingFixes: number;
  totalChanges: number;
  qualityBefore: number;
  qualityAfter: number;
  details: string[];
}

interface PolishStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_POLISH_OPTIONS: PolishOption[] = [
  { id: 'structural', label: 'Polesan Struktural', description: 'Mengoptimalkan struktur paragraf, hierarki heading, dan alur bagian untuk keterbacaan akademik yang lebih baik.', icon: Layers, enabled: true },
  { id: 'tone', label: 'Nada Akademik', description: 'Meningkatkan bahasa ke register akademik formal sambil mempertahankan ketepatan teknis.', icon: BookOpen, enabled: true },
  { id: 'citations', label: 'Peningkatan Sitasi', description: 'Memperbaiki sitasi dalam teks, format referensi, dan konsistensi bibliografi.', icon: Quote, enabled: true },
  { id: 'coherence', label: 'Koherensi & Alur', description: 'Memperkuat koneksi logis antar paragraf dan ide.', icon: GitBranch, enabled: true },
  { id: 'clarity', label: 'Peningkatan Kejelasan', description: 'Menyederhanakan kalimat kompleks dan meningkatkan skor keterbacaan.', icon: Eye, enabled: true },
  { id: 'vocabulary', label: 'Peningkatan Kosakata', description: 'Mengganti kata umum dengan alternatif akademik.', icon: Lightbulb, enabled: true },
  { id: 'grammar', label: 'Tata Bahasa & Sintaksis', description: 'Memperbaiki kesalahan tata bahasa dan meningkatkan konstruksi kalimat.', icon: SpellCheck, enabled: true },
  { id: 'formatting', label: 'Format & Tata Letak', description: 'Menyesuaikan format untuk memenuhi pedoman pengiriman jurnal.', icon: AlignLeft, enabled: true },
];

const SECTION_LABELS: Record<string, string> = {
  abstract: 'Abstract',
  introduction: 'Introduction',
  literature_review: 'Literature Review',
  method: 'Methodology',
  results: 'Results',
  discussion: 'Discussion',
  conclusion: 'Conclusion',
  bibliography: 'References',
};

// Map each section type to relevant ChangeSummary fields for computing per-section change counts
const SECTION_CHANGE_KEYS: Record<string, (keyof ChangeSummary)[]> = {
  abstract: ['coherenceEdits', 'clarityEdits', 'grammarFixes', 'toneImprovements', 'vocabularyUpgrades'],
  introduction: ['structuralChanges', 'coherenceEdits', 'toneImprovements', 'clarityEdits', 'vocabularyUpgrades'],
  literature_review: ['structuralChanges', 'coherenceEdits', 'toneImprovements', 'clarityEdits', 'vocabularyUpgrades', 'citationFixes'],
  method: ['structuralChanges', 'clarityEdits', 'formattingFixes', 'grammarFixes'],
  results: ['clarityEdits', 'vocabularyUpgrades', 'toneImprovements', 'citationFixes'],
  discussion: ['coherenceEdits', 'clarityEdits', 'vocabularyUpgrades', 'toneImprovements', 'citationFixes'],
  conclusion: ['coherenceEdits', 'toneImprovements', 'clarityEdits', 'vocabularyUpgrades'],
  bibliography: ['citationFixes', 'formattingFixes'],
};

/** Compute total change count for a section based on relevant ChangeSummary fields */
function getSectionChangeCount(sectionType: string, summary: ChangeSummary | null): number {
  if (!summary) return 0;
  const keys = SECTION_CHANGE_KEYS[sectionType] ?? [];
  return keys.reduce((sum, key) => sum + (summary[key] as number ?? 0), 0);
}

// ── Polish Option Card ─────────────────────────────────────────────────────────

function PolishOptionCard({
  option,
  isPolishing,
  onToggle,
}: {
  option: PolishOption;
  isPolishing: boolean;
  onToggle: (id: string) => void;
}) {
  const [shimmerKey, setShimmerKey] = useState(0);
  const wasEnabledRef = useRef(option.enabled);

  useEffect(() => {
    if (option.enabled && !wasEnabledRef.current) {
      const id = requestAnimationFrame(() => setShimmerKey((k) => k + 1));
      return () => cancelAnimationFrame(id);
    }
    wasEnabledRef.current = option.enabled;
  }, [option.enabled]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          animate={{ scale: option.enabled ? 1.02 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative"
        >
          {/* Shimmer sweep overlay on first enable */}
          <AnimatePresence>
            {option.enabled && shimmerKey > 0 && (
              <motion.div
                key={`shimmer-${shimmerKey}`}
                className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none z-10"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                <motion.div
                  className="absolute inset-y-0 w-1/2"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(16,185,129,0.1), rgba(20,184,166,0.06), transparent)',
                  }}
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 0.8, ease: 'easeOut' as const }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md relative overflow-hidden ${
              option.enabled
                ? 'border-emerald-500/40 bg-emerald-500/[0.03] shadow-sm'
                : 'opacity-60'
            } ${isPolishing ? 'pointer-events-none' : ''}`}
            onClick={() => onToggle(option.id)}
          >
            {/* Colored left accent bar (3px) */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg transition-colors ${
                option.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/20'
              }`}
            />

            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    option.enabled
                      ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <option.icon className="size-4.5" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium leading-tight truncate">{option.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                    {option.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={option.enabled}
                onCheckedChange={() => onToggle(option.id)}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0"
              />
            </CardContent>
          </Card>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-medium">{option.label}</p>
        <p className="opacity-80">{option.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ── Confetti Particle Component ──────────────────────────────────────────────

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  angle: number;
  distance: number;
}

function ConfettiCelebration({ show }: { show: boolean }) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (show) {
      const colors = [
        'bg-emerald-500',
        'bg-emerald-400',
        'bg-amber-400',
        'bg-teal-500',
        'bg-cyan-400',
        'bg-lime-400',
        'bg-emerald-300',
        'bg-amber-300',
      ];

      const newParticles: ConfettiParticle[] = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
        delay: Math.random() * 0.3,
        duration: Math.random() * 1 + 1.5,
        angle: Math.random() * 360,
        distance: Math.random() * 200 + 100,
      }));

      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setParticles([]);
    }
  }, [show]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.color}`}
          style={{ width: p.size, height: p.size }}
          initial={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            scale: 0,
            opacity: 1,
          }}
          animate={{
            y: [0, -p.distance * 0.6, p.distance],
            x: [0, (Math.random() - 0.5) * p.distance, (Math.random() - 0.5) * p.distance * 0.5],
            scale: [0, 1.2, 0.5],
            opacity: [1, 1, 0],
            rotate: [0, p.angle, p.angle * 2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// ── Animated Counter Hook ────────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration: number = 1000, shouldAnimate: boolean = true) {
  const [count, setCount] = useState(target);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!shouldAnimate || target === 0) {
      // Use rAF to avoid synchronous setState warning
      const id = requestAnimationFrame(() => setCount(target));
      return () => cancelAnimationFrame(id);
    }

    startTimeRef.current = 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration, shouldAnimate]);

  return count;
}

// ── Search Highlight Helpers ─────────────────────────────────────────────

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

/** Render text with optional search highlighting */
function renderTextWithHighlight(text: string, searchQuery?: string) {
  if (!searchQuery?.trim()) return text;
  return <>{highlightTextNode(text, searchQuery)}</>;
}

// ── Helper: Diff Highlight ──────────────────────────────────────────────────

function DiffView({ original, polished }: { original: string; polished: string }) {
  const paragraphs = useMemo(() => {
    const origParts = original.split('\n');
    const poliParts = polished.split('\n');
    const maxLen = Math.max(origParts.length, poliParts.length);
    const result: { type: 'same' | 'added' | 'removed' | 'modified'; original: string; polished: string }[] = [];

    for (let i = 0; i < maxLen; i++) {
      const o = origParts[i] ?? '';
      const p = poliParts[i] ?? '';
      if (o === p) {
        result.push({ type: 'same', original: o, polished: p });
      } else if (!o && p) {
        result.push({ type: 'added', original: '', polished: p });
      } else if (o && !p) {
        result.push({ type: 'removed', original: o, polished: '' });
      } else {
        result.push({ type: 'modified', original: o, polished: p });
      }
    }
    return result;
  }, [original, polished]);

  if (!original && !polished) {
    return <p className="text-muted-foreground text-sm italic">No content to display.</p>;
  }

  return (
    <div className="space-y-1.5">
      {paragraphs.map((para, idx) => (
        <div
          key={idx}
          className={`rounded-md px-3 py-1.5 text-sm leading-relaxed transition-colors ${
            para.type === 'same'
              ? 'bg-transparent'
              : para.type === 'added'
                ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                : para.type === 'removed'
                  ? 'bg-red-500/10 border-l-2 border-red-500 line-through opacity-60'
                  : 'bg-amber-500/10 border-l-2 border-amber-500'
          }`}
        >
          {para.polished || para.original || '\u00A0'}
        </div>
      ))}
    </div>
  );
}

// ── Helper: Animated Quality Score Ring ──────────────────────────────────────

function QualityScoreRing({ score, label, size = 72, animate = false }: { score: number; label: string; size?: number; animate?: boolean }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Number(score) || 0;
  const clampedScore = Math.max(0, Math.min(100, safeScore));
  const offset = circumference - (clampedScore / 100) * circumference;

  const color =
    clampedScore >= 85 ? 'text-emerald-500' : clampedScore >= 70 ? 'text-amber-500' : 'text-red-500';
  const strokeColor =
    clampedScore >= 85 ? 'stroke-emerald-500' : clampedScore >= 70 ? 'stroke-amber-500' : 'stroke-red-500';

  const animatedCount = useAnimatedCounter(clampedScore, 1200, animate);
  const displayScore = animate ? animatedCount : clampedScore;
  const displayOffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-muted" strokeWidth={4} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={strokeColor}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
            animate={{ strokeDashoffset: displayOffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${color}`}>{displayScore}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

// ── Helper: Section comparison panel ────────────────────────────────────────

type ComparisonViewMode = 'split' | 'original' | 'polished';

function SectionComparison({
  sectionType,
  originalSection,
  polishedSection,
  changeCount,
  searchQuery,
  viewMode,
}: {
  sectionType: string;
  originalSection: ArticleSection | undefined;
  polishedSection: ArticleSection | undefined;
  changeCount?: number;
  searchQuery?: string;
  viewMode: ComparisonViewMode;
}) {
  const originalContent = originalSection?.content ?? '';
  const polishedContent = polishedSection?.content ?? '';

  if (!originalContent && !polishedContent) return null;

  const hasChanges = changeCount !== undefined && changeCount > 0;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <ChevronRight className="size-3.5 text-emerald-500" />
        {SECTION_LABELS[sectionType] ?? sectionType}
        {/* Section-level improvement badge */}
        {hasChanges && (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 text-[10px] px-1.5 py-0">
            <Sparkles className="size-2.5 mr-0.5" />
            {changeCount} {changeCount === 1 ? 'perbaikan' : 'perbaikan'}
          </Badge>
        )}
      </h4>

      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 min-h-[200px] overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-muted-foreground/40" />
              Asli
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
              {renderTextWithHighlight(originalContent, searchQuery)}
            </p>
          </div>
          <div className={`rounded-lg border p-3 min-h-[200px] overflow-y-auto ${hasChanges ? 'border-l-[2px] border-l-emerald-500 border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
            <p className="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-1.5">
              <span className={`size-1.5 rounded-full ${hasChanges ? 'bg-emerald-500' : 'bg-emerald-500/40'}`} />
              Hasil Polesan
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {renderTextWithHighlight(polishedContent, searchQuery)}
            </p>
          </div>
        </div>
      ) : viewMode === 'original' ? (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5">Melihat Asli</Badge>
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
            {renderTextWithHighlight(originalContent, searchQuery)}
          </p>
        </div>
      ) : (
        <div className={`rounded-lg border p-3 ${hasChanges ? 'border-l-[2px] border-l-emerald-500 border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
          <p className="text-xs font-medium text-emerald-600 mb-2 flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/30 text-emerald-600">Melihat Hasil Pemolesan</Badge>
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {renderTextWithHighlight(polishedContent, searchQuery)}
          </p>
        </div>
      )}

      <Separator />
    </div>
  );
}

// ── Polish Progress Overlay ─────────────────────────────────────────────────

function PolishProgressOverlay({
  steps,
  currentStepIndex,
  estimatedSeconds,
}: {
  steps: PolishStep[];
  currentStepIndex: number;
  estimatedSeconds: number;
}) {
  const progressPercent = steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Loader2 className="size-8 text-emerald-500 animate-spin" />
          <Sparkles className="size-3 text-amber-400 absolute -top-0.5 -right-0.5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Sedang memperbaiki...</p>
          <p className="text-xs text-muted-foreground">
            Memproses: {steps[currentStepIndex]?.label ?? 'Mempersiapkan...'}
          </p>
        </div>
      </div>

      <Progress value={progressPercent} className="h-2" />

      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
              step.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
                : step.status === 'completed'
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/50'
            }`}
          >
            {step.status === 'completed' ? (
              <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            ) : step.status === 'active' ? (
              <Loader2 className="size-4 text-emerald-500 shrink-0 animate-spin" />
            ) : (
              <div className="size-4 rounded-full border border-muted shrink-0" />
            )}
            <span className="truncate">{step.label}</span>
            {step.status === 'completed' && (
              <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">
                Selesai
              </Badge>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ClockIcon />
        <span>Perkiraan waktu tersisa: ~{estimatedSeconds} detik</span>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Change Summary Panel ────────────────────────────────────────────────────

function ChangeSummaryPanel({ summary, animateScores = false }: { summary: ChangeSummary; animateScores?: boolean }) {
  const categories = [
    { label: 'Struktural', count: summary.structuralChanges, icon: Layers },
    { label: 'Nada', count: summary.toneImprovements, icon: BookOpen },
    { label: 'Sitasi', count: summary.citationFixes, icon: Quote },
    { label: 'Koherensi', count: summary.coherenceEdits, icon: GitBranch },
    { label: 'Kejelasan', count: summary.clarityEdits, icon: Eye },
    { label: 'Kosakata', count: summary.vocabularyUpgrades, icon: Lightbulb },
    { label: 'Tata Bahasa', count: summary.grammarFixes, icon: SpellCheck },
    { label: 'Format', count: summary.formattingFixes, icon: AlignLeft },
  ];

  const safeTotal = Number(summary.totalChanges) || 0;
  const maxCount = Math.max(...categories.map((c) => c.count), 1);
  const animatedTotal = useAnimatedCounter(safeTotal, 1200, animateScores);
  const activeCategories = categories.filter((c) => c.count > 0).length;

  return (
    <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="size-5 text-emerald-500" />
          Ringkasan Perbaikan
        </CardTitle>
        <CardDescription>
          <span className="text-emerald-600 font-semibold">{animatedTotal}</span> perbaikan diterapkan pada{' '}
          {activeCategories} kategori
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quality Score Rings */}
        <div className="flex items-center justify-center gap-4">
          <QualityScoreRing score={summary.qualityBefore} label="Sebelum" size={80} animate={animateScores} />
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-emerald-500">
              <ChevronRight className="size-5" />
            </div>
            <span className="text-xs text-muted-foreground">+{summary.qualityAfter - summary.qualityBefore} poin</span>
          </div>
          <QualityScoreRing score={summary.qualityAfter} label="Sesudah" size={80} animate={animateScores} />
        </div>

        <Separator />

        {/* Mini Bar Chart: changes per category */}
        <div className="space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3" />
            Perubahan per kategori
          </p>
          <div className="space-y-1.5">
            {categories.map((cat) => {
              const barWidth = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
              const barColor =
                cat.count >= 10
                  ? 'bg-emerald-500'
                  : cat.count >= 5
                    ? 'bg-teal-500'
                    : cat.count > 0
                      ? 'bg-muted-foreground/30'
                      : 'bg-muted';

              return (
                <div key={cat.label} className="flex items-center gap-2">
                  <cat.icon className={`size-3 shrink-0 ${cat.count > 0 ? 'text-emerald-500' : 'text-muted-foreground/30'}`} />
                  <span className="text-xs text-muted-foreground w-[70px] shrink-0 truncate">{cat.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${barColor}`}
                      initial={animateScores ? { width: 0 } : { width: `${barWidth}%` }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' as const, delay: 0.2 }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-6 text-right shrink-0 ${cat.count > 0 ? 'text-emerald-600' : 'text-muted-foreground/40'}`}>
                    {cat.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category grid (compact) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {categories.map((cat) => (
            <div key={cat.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <cat.icon className={`size-3.5 shrink-0 ${cat.count > 0 ? 'text-emerald-500' : 'text-muted-foreground/40'}`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{cat.label}</p>
                <p className={`text-xs ${cat.count > 0 ? 'text-emerald-600' : 'text-muted-foreground/50'}`}>
                  {cat.count} perubahan
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Key improvements */}
        {summary.details?.length > 0 && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground">Perbaikan utama:</p>
            {summary.details.map((detail, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                <CheckCircle2 className="size-3 text-emerald-500 mt-0.5 shrink-0" />
                <span>{detail}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function Step5Polish() {
  const {
    generatedArticle,
    setGeneratedArticle,
    isPolishing,
    setIsPolishing,
    polishedArticle,
    setPolishedArticle,
    prevStep,
    setCurrentStep,
  } = useArticleStore();

  const [polishOptions, setPolishOptions] = useState<PolishOption[]>(DEFAULT_POLISH_OPTIONS);
  const [polishSteps, setPolishSteps] = useState<PolishStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [changeSummary, setChangeSummary] = useState<ChangeSummary | null>(null);
  const [activeTab, setActiveTab] = useState('options');

  // ── Reviewer Notes state ──
  const [reviewerNotes, setReviewerNotes] = useState<any>(null);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [reviewStatusMessage, setReviewStatusMessage] = useState('');
  const [showReviewerNotes, setShowReviewerNotes] = useState(false);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Polish history tracking ──
  const [polishCount, setPolishCount] = useState(0);
  const [scoresHaveAnimated, setScoresHaveAnimated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [comparisonViewMode, setComparisonViewMode] = useState<ComparisonViewMode>('split');

  // ── Upgrade (CONSILIUM PROFESSORUM) state ──
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeStepIndex, setUpgradeStepIndex] = useState(0);
  const upgradeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const UPGRADE_SECTION_STEPS = [
    'Upgrading Abstract...',
    'Upgrading Introduction...',
    'Upgrading Literature Review...',
    'Upgrading Methodology...',
    'Upgrading Results...',
    'Upgrading Discussion...',
    'Upgrading Conclusion...',
    'Upgrading References...',
    'Finalising Scopus Q1 quality check...',
  ];

  const article = polishedArticle ?? generatedArticle;
  const hasPolished = !!polishedArticle;
  const isAnyOptionEnabled = polishOptions.some((o) => o.enabled);

  // ── Derived word counts ──
  const originalWordCount = generatedArticle?.totalWordCount ?? 0;
  const polishedWordCount = polishedArticle?.totalWordCount ?? 0;
  const wordCountDelta = polishedWordCount - originalWordCount;

  // ── Trigger score animation on first polish complete ──
  useEffect(() => {
    if (hasPolished && changeSummary && !scoresHaveAnimated) {
      setScoresHaveAnimated(true);
    }
  }, [hasPolished, changeSummary, scoresHaveAnimated]);

  // ── Article Search ──
  const currentArticle = hasPolished ? polishedArticle : generatedArticle;
  const searchSections = currentArticle ? currentArticle.sections.map((s) => s.content) : [];
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
  } = useArticleSearch({ sections: searchSections });

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

  // ── Toggle polish option ──
  const toggleOption = useCallback((id: string) => {
    setPolishOptions((prev) =>
      prev.map((opt) => (opt.id === id ? { ...opt, enabled: !opt.enabled } : opt))
    );
  }, []);

  // ── Toggle all options ──
  const toggleAllOptions = useCallback((enabled: boolean) => {
    setPolishOptions((prev) => prev.map((opt) => ({ ...opt, enabled })));
  }, []);

  // ── Generate Reviewer Notes ──
  const generateReviewerNotes = useCallback(async () => {
    if (!generatedArticle) return;
    setIsGeneratingReview(true);
    setReviewStatusMessage('Menjalankan analisis peer review...');
    setReviewerNotes(null);
    setShowReviewerNotes(true);

    try {
      const postRes = await fetch('/api/article/reviewer-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: generatedArticle }),
      });
      if (!postRes.ok) throw new Error(`Reviewer notes API returned ${postRes.status}`);
      const postData = await postRes.json();
      if (!postData.success) throw new Error(postData.error || 'Failed to generate reviewer notes');

      // Synchronous mode: result is directly in the response
      if (postData.result) {
        setReviewerNotes(postData.result);
        toast.success('Peer review complete! Review notes ready for polish.');
        return;
      }

      // Legacy job mode: poll for result
      if (!postData.jobId) throw new Error('No result or jobId in response');

      const jobId = postData.jobId;
      const MAX_TIME = 5 * 60 * 1000;
      const start = Date.now();

      while (Date.now() - start < MAX_TIME) {
        await new Promise((r) => setTimeout(r, 3000));
        const pollRes = await fetch(`/api/article/reviewer-notes?jobId=${jobId}`);
        if (!pollRes.ok) continue;
        const pollData = await pollRes.json();
        if (pollData.statusMessage) setReviewStatusMessage(pollData.statusMessage);
        if (pollData.status === 'done' && pollData.result) {
          setReviewerNotes(pollData.result);
          toast.success('Peer review complete! Review notes ready for polish.');
          return;
        }
        if (pollData.status === 'error') throw new Error(pollData.error || 'Review failed');
      }
      throw new Error('Review timed out');
    } catch (err: unknown) {
 const msg = err instanceof Error ? err.message : 'Review failed';
      toast.error(`Peer review error: ${msg}`);
    } finally {
      setIsGeneratingReview(false);
    }
  }, [generatedArticle]);

  // ── Polling helper (legacy mode only) ──
  const pollJob = useCallback(async (jobId: string, onStatus: (msg: string) => void): Promise<any> => {
    const MAX_TIME = 10 * 60 * 1000;
    const start = Date.now();
    while (Date.now() - start < MAX_TIME) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`/api/article/polish?jobId=${jobId}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.statusMessage) onStatus(data.statusMessage);
      if (data.status === 'done' && data.result) return data.result;
      if (data.status === 'error') throw new Error(data.error || 'Polish failed on server');
    }
    throw new Error('Polish timed out after 10 minutes');
  }, []);

  // ── Start polish (sync or legacy polling) ──
  const startPolish = useCallback(async () => {
    if (!generatedArticle || !isAnyOptionEnabled) return;

    const enabledOptions = polishOptions.filter((o) => o.enabled);
    const steps: PolishStep[] = enabledOptions.map((o) => ({
      id: o.id,
      label: o.label,
      status: 'pending' as const,
    }));

    setPolishSteps(steps);
    setCurrentStepIndex(0);
    setChangeSummary(null);
    setScoresHaveAnimated(false);
    setIsPolishing(true);
    setActiveTab('preview');

    // Simulate progress through each step
    let stepIdx = 0;
    const totalSteps = steps.length;
    const baseTimePerStep = 5;
    setEstimatedTime(totalSteps * baseTimePerStep);

    const advanceStep = () => {
      if (stepIdx < totalSteps) {
        setPolishSteps((prev) =>
          prev.map((s, i) => {
            if (i < stepIdx) return { ...s, status: 'completed' };
            if (i === stepIdx) return { ...s, status: 'active' };
            return s;
          })
        );
        setCurrentStepIndex(stepIdx);
        setEstimatedTime((totalSteps - stepIdx) * baseTimePerStep);
        stepIdx++;
        progressTimerRef.current = setTimeout(advanceStep, baseTimePerStep * 1000);
      } else {
        setPolishSteps((prev) => prev.map((s) => ({ ...s, status: 'completed' })));
        setEstimatedTime(0);
      }
    };
    advanceStep();

    try {
      // 1. POST to create polish job (returns immediately)
      const body = {
        article: generatedArticle,
        options: Object.fromEntries(enabledOptions.map((o) => [o.id, true])),
        ...(reviewerNotes ? { reviewerNotes } : {}),
      };

      const postRes = await fetch('/api/article/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!postRes.ok) throw new Error(`Polish API returned ${postRes.status}`);
      const postData = await postRes.json();
      if (!postData.success) {
        throw new Error(postData.error || 'Failed to polish article');
      }

      // Synchronous mode: result is directly in the response
      let result: any;
      if (postData.result) {
        result = postData.result;
      } else if (postData.jobId) {
        // Legacy job mode: poll for result
        result = await pollJob(postData.jobId, (_msg) => {});
      } else {
        throw new Error('No result or jobId in response');
      }

      if (result && result.article) {
        setPolishedArticle(result.article);
        setPolishCount((prev) => prev + 1);
        if (result.changes) setChangeSummary(result.changes);
        const failedCount = result.changes?.sectionsFailed ?? 0;
        const polishedCount = result.changes?.sectionsPolished ?? 0;
        if (failedCount > 0) {
          toast.warning('Polish completed with partial results', {
            description: `${polishedCount} section${polishedCount !== 1 ? 's' : ''} polished, ${failedCount} kept original.`,
          });
        } else {
          toast.success('Article polished successfully!', {
            description: `${polishedCount} section${polishedCount !== 1 ? 's' : ''} polished with ${result.changes?.changePercentage ?? 0}% average change.`,
          });
        }
      } else {
        throw new Error('Invalid response from polish API');
      }
    } catch (err) {
      console.error('Polish error:', err);
      const errMessage = err instanceof Error ? err.message : 'Polish request failed';
      toast.error(`Polish failed: ${errMessage}`);
    } finally {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setIsPolishing(false);
    }
  }, [generatedArticle, polishOptions, isAnyOptionEnabled, reviewerNotes, pollJob, setIsPolishing, setPolishedArticle]);

  // ── Auto-polish handler that ensures options are all enabled before starting ──
  const handleAutoPolish = useCallback(() => {
    // Enable all options first
    setPolishOptions((prev) => prev.map((opt) => ({ ...opt, enabled: true })));

    // We need to start polish after state updates. Since startPolish reads
    // polishOptions, we schedule it after a microtask. But React batches, so
    // we use a ref to signal "auto-polish pending" and check in an effect.
    autoPolishPendingRef.current = true;
  }, []);

  const autoPolishPendingRef = useRef(false);

  // Watch for auto-polish pending trigger
  useEffect(() => {
    if (autoPolishPendingRef.current && isAnyOptionEnabled) {
      autoPolishPendingRef.current = false;
      // Slight delay to let React finish the state update for polishOptions
      const timer = setTimeout(() => {
        startPolish();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [polishOptions, isAnyOptionEnabled, startPolish]);

  // ── Cleanup timers ──
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
      if (upgradeTimerRef.current) {
        clearTimeout(upgradeTimerRef.current);
      }
    };
  }, []);

  // ── Handle CONSILIUM PROFESSORUM upgrade (job polling) ──
  const handleUpgrade = useCallback(async () => {
    if (!generatedArticle || isUpgrading) return;
    setUpgradeDialogOpen(false);
    setIsUpgrading(true);
    setUpgradeStepIndex(0);

    // Simulate step-by-step progress
    let stepIdx = 0;
    const totalUpgradeSteps = UPGRADE_SECTION_STEPS.length;
    const timePerStep = 6000; // ~6s per step for a more realistic feel

    const advanceUpgradeStep = () => {
      if (stepIdx < totalUpgradeSteps) {
        setUpgradeStepIndex(stepIdx);
        stepIdx++;
        upgradeTimerRef.current = setTimeout(advanceUpgradeStep, timePerStep);
      }
    };
    advanceUpgradeStep();

    try {
      // POST to upgrade article (synchronous — awaits result directly)
      const postRes = await fetch('/api/article/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: generatedArticle, engineId: 'zai' }),
      });

      if (!postRes.ok) {
        throw new Error(`Upgrade API returned ${postRes.status}`);
      }

      const postData = await postRes.json();
      if (!postData.success || !postData.result) {
        throw new Error(postData.error || 'Failed to upgrade article');
      }

      const { article: upgradedArticle, sectionsUpgraded, sectionsFailed } = postData.result;
      setGeneratedArticle(upgradedArticle);
      setPolishedArticle(null);
      setChangeSummary(null);
      if (sectionsFailed > 0) {
        toast.warning('Upgrade completed with partial results', {
          description: `${sectionsUpgraded} section${sectionsUpgraded !== 1 ? 's' : ''} upgraded, ${sectionsFailed} kept original.`,
        });
      } else {
        toast.success('Article upgraded to CONSILIUM PROFESSORUM Scopus Q1 standard!');
      }
    } catch (err) {
      console.error('Upgrade error:', err);
      const errMsg = err instanceof Error ? err.message : 'Upgrade failed';
      toast.error(`Upgrade failed: ${errMsg}`);
    } finally {
      if (upgradeTimerRef.current) {
        clearTimeout(upgradeTimerRef.current);
        upgradeTimerRef.current = null;
      }
      setIsUpgrading(false);
      setUpgradeStepIndex(UPGRADE_SECTION_STEPS.length); // Show all steps done
      // Jump to Step 4 to show the upgraded article
      setCurrentStep(4);
    }
  }, [generatedArticle, isUpgrading, setGeneratedArticle, setPolishedArticle, setCurrentStep]);

  // ── Copy full article ──
  const copyArticle = useCallback(async () => {
    if (!article) return;

    let text = `${article.title}\n\n`;
    for (const section of article.sections) {
      text += `${SECTION_LABELS[section.type] ?? section.type}\n\n${section.content}\n\n`;
    }

    if (article.references.length > 0) {
      text += 'References\n\n';
      article.references.forEach((ref, idx) => {
        text += `${idx + 1}. ${ref.authors} (${ref.year}). ${ref.title}`;
        if (ref.journal) text += `. ${ref.journal}`;
        if (ref.volume) text += `, ${ref.volume}`;
        if (ref.issue) text += `(${ref.issue})`;
        if (ref.pages) text += `, ${ref.pages}`;
        if (ref.doi) text += `. https://doi.org/${ref.doi}`;
        text += '.\n';
      });
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Article copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [article]);

  // ── Download as text ──
  const downloadArticle = useCallback(() => {
    if (!article) return;

    let text = `${article.title}\n`;
    text += `${'='.repeat(article.title.length)}\n\n`;

    for (const section of article.sections) {
      text += `${SECTION_LABELS[section.type] ?? section.type}\n`;
      text += `${'-'.repeat((SECTION_LABELS[section.type] ?? section.type).length)}\n\n`;
      text += `${section.content}\n\n`;
    }

    if (article.references.length > 0) {
      text += 'References\n';
      text += `${'-'.repeat('References'.length)}\n\n`;
      article.references.forEach((ref, idx) => {
        text += `${idx + 1}. ${ref.authors} (${ref.year}). ${ref.title}`;
        if (ref.journal) text += `. ${ref.journal}`;
        if (ref.volume) text += `, ${ref.volume}`;
        if (ref.issue) text += `(${ref.issue})`;
        if (ref.pages) text += `, ${ref.pages}`;
        if (ref.doi) text += `. https://doi.org/${ref.doi}`;
        text += '.\n';
      });
    }

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_polished.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Article downloaded');
  }, [article]);

  // ── Confetti state ──
  const [showConfetti, setShowConfetti] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // ── Export as PDF ──
  const handleExportPdf = useCallback(async () => {
    if (!article || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportToPdf(article);
      toast.success('Article downloaded as PDF');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPdf(false);
    }
  }, [article, isExportingPdf]);

  // ── Accept & export with confetti ──
  const acceptAndExport = useCallback(() => {
    if (polishedArticle) {
      setShowConfetti(true);
      toast.success('Article accepted and ready for export!', {
        description: 'Your polished article has been finalised.',
        icon: <PartyPopper className="size-4" />,
      });
      // Hide confetti after animation
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [polishedArticle]);

  // ── Regenerate polish ──
  const regeneratePolish = useCallback(() => {
    setPolishedArticle(null);
    setChangeSummary(null);
    setPolishSteps([]);
    setCurrentStepIndex(0);
    setScoresHaveAnimated(false);
    toast.info('Perbaikan direset — Anda dapat menyesuaikan opsi dan menjalankan ulang.');
  }, [setPolishedArticle]);

  // ── No article guard ──
  if (!generatedArticle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
          <FileCheck className="size-8 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Tidak Ada Artikel untuk Diperbaiki</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Buat artikel terlebih dahulu di langkah sebelumnya, lalu kembali ke sini untuk memperbaikinya
            hingga kualitas siap terbit.
          </p>
        </div>
        <Button variant="outline" onClick={prevStep} className="mt-2">
          <ArrowLeft className="size-4" />
          Kembali ke Pembuatan Artikel
        </Button>
      </div>
    );
  }

  // ── Render ──
  return (
    <>
      {/* ── Confetti Celebration ── */}
      <ConfettiCelebration show={showConfetti} />

      <div className="space-y-6 max-w-7xl mx-auto pb-24">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wand2 className="size-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Perbaikan & Tata Letak Artikel</h1>
                <p className="text-sm text-muted-foreground">
                  Perbaiki artikel Anda hingga kualitas siap terbit
                </p>
              </div>
              {/* ── Polish History Badge ── */}
              {polishCount > 0 && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 ml-2">
                  <Wand2 className="size-3 mr-1" />
                  Perbaikan #{polishCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Word count comparison */}
          <div className="flex items-center gap-4">
            {hasPolished && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-muted/30">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Sebelum</p>
                  <p className="text-sm font-semibold">{originalWordCount.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-center">
                  <ArrowLeft className="size-3 text-muted-foreground" />
                  <span
                    className={`text-xs font-medium ${wordCountDelta >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}
                  >
                    {wordCountDelta >= 0 ? '+' : ''}
                    {wordCountDelta}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">Sesudah</p>
                  <p className="text-sm font-bold text-emerald-600">{polishedWordCount.toLocaleString()}</p>
                </div>
              </div>
            )}
            {!hasPolished && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-muted/30">
                <FileCheck className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Jumlah Kata</p>
                  <p className="text-sm font-semibold">{originalWordCount.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Article Search Bar ── */}
        <div className="print:hidden">
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

        {/* ── CONSILIUM PROFESSORUM Upgrade Button ── */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <button
                  onClick={() => setUpgradeDialogOpen(true)}
                  disabled={isUpgrading || isPolishing || !generatedArticle}
                  className="group relative w-full rounded-xl p-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-3 rounded-[10px] bg-background px-5 py-4 transition-all group-hover:bg-transparent group-disabled:hover:bg-background">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20">
                      <Crown className="size-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                        ⚡ Tingkatkan ke CONSILIUM PROFESSORUM
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tulis ulang artikel Anda menggunakan konsorsium 20 profesor top dunia untuk kualitas Scopus Q1
                      </p>
                    </div>
                    <Sparkles className="size-5 text-emerald-500 shrink-0" />
                  </div>
                </button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Tulis ulang seluruh artikel Anda menggunakan konsorsium 20 profesor top dunia untuk kualitas Scopus Q1</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* ── Upgrade Confirmation Dialog ── */}
        <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white">
                  <Crown className="size-4" />
                </div>
                CONSILIUM PROFESSORUM Mode
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-2">
                  <p>
                    Ini akan menulis ulang <strong>SEMUA bagian</strong> artikel Anda ke standar
                    CONSILIUM PROFESSORUM Scopus Q1.
                  </p>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm font-medium">
                      <Zap className="size-4" />
                      Proses ini memakan waktu 3–5 menit. Lanjutkan?
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={handleUpgrade}
                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:opacity-90 shadow-lg"
              >
                <Crown className="size-4" />
                Mulai Peningkatan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Upgrade Full-Page Overlay ── */}
        <AnimatePresence>
          {isUpgrading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl flex items-center justify-center"
            >
              <div className="w-full max-w-lg mx-auto px-6 space-y-8 text-center">
                {/* Animated icon */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="mx-auto"
                >
                  <div className="size-24 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                    <Crown className="size-10 text-white" />
                  </div>
                </motion.div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    CONSILIUM PROFESSORUM
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    20 top-world professors are upgrading your article to Scopus Q1 quality
                  </p>
                </div>

                {/* Progress steps */}
                <div className="space-y-3 text-left bg-card rounded-xl border p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Section Progress</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {Math.min(upgradeStepIndex + 1, UPGRADE_SECTION_STEPS.length)} / {UPGRADE_SECTION_STEPS.length}
                    </span>
                  </div>
                  <Progress
                    value={(upgradeStepIndex / UPGRADE_SECTION_STEPS.length) * 100}
                    className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:via-teal-500 [&>div]:to-cyan-500"
                  />
                  <div className="space-y-2 mt-4">
                    {UPGRADE_SECTION_STEPS.map((step, idx) => (
                      <div
                        key={step}
                        className={`flex items-center gap-2.5 text-sm transition-all duration-300 ${
                          idx < upgradeStepIndex
                            ? 'text-emerald-600'
                            : idx === upgradeStepIndex
                              ? 'text-foreground font-medium'
                              : 'text-muted-foreground/40'
                        }`}
                      >
                        {idx < upgradeStepIndex ? (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        ) : idx === upgradeStepIndex ? (
                          <Loader2 className="size-4 text-emerald-500 shrink-0 animate-spin" />
                        ) : (
                          <div className="size-4 rounded-full border border-muted-foreground/20 shrink-0" />
                        )}
                        <span className="truncate">{step}</span>
                        {idx < upgradeStepIndex && (
                          <span className="ml-auto text-[10px] text-emerald-500">Selesai</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Please do not close this tab while the upgrade is in progress
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="options" className="gap-1.5">
              <Sparkles className="size-3.5" />
              Opsi Perbaikan
            </TabsTrigger>
            {showReviewerNotes && (
              <TabsTrigger value="reviewer-notes" className="gap-1.5">
                <FileCheck className="size-3.5" />
                Catatan Review
                {reviewerNotes && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{reviewerNotes.overallScore}/10</Badge>}
              </TabsTrigger>
            )}
            <TabsTrigger value="preview" className="gap-1.5">
              <GitCompare className="size-3.5" />
              Pratinjau
            </TabsTrigger>
            {changeSummary && (
              <TabsTrigger value="summary" className="gap-1.5">
                <Award className="size-3.5" />
                Ringkasan
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── Options Tab ── */}
          <TabsContent value="options">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Pilih aspek yang ingin diperbaiki ({polishOptions.filter((o) => o.enabled).length} dari{' '}
                  {polishOptions.length} diaktifkan)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAllOptions(true)}
                    className="text-xs h-7"
                  >
                    Aktifkan Semua
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAllOptions(false)}
                    className="text-xs h-7"
                  >
                    Nonaktifkan Semua
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {polishOptions.map((option) => (
                  <PolishOptionCard
                    key={option.id}
                    option={option}
                    isPolishing={isPolishing}
                    onToggle={toggleOption}
                  />
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Siap memperbaiki artikel Anda
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {polishOptions.filter((o) => o.enabled).length} aspek dipilih untuk perbaikan
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* ── Generate Reviewer Notes Button ── */}
                  <Button
                    onClick={generateReviewerNotes}
                    disabled={isGeneratingReview || isPolishing || !generatedArticle}
                    variant="outline"
                    className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20"
                    size="lg"
                  >
                    {isGeneratingReview ? (
                      <><Loader2 className="size-4 animate-spin" /> Mereview...</>
                    ) : (
                      <><FileCheck className="size-4" /> {reviewerNotes ? 'Review Ulang' : 'Peer Review'}</>
                    )}
                  </Button>
                  {/* ── Auto-Polish Quick Button ── */}
                  <Button
                    onClick={handleAutoPolish}
                    disabled={isPolishing}
                    variant="outline"
                    className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20"
                    size="lg"
                  >
                    <Zap className="size-4" />
                    Perbaikan Otomatis
                  </Button>
                  <Button
                    onClick={startPolish}
                    disabled={isPolishing || !isAnyOptionEnabled}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    size="lg"
                  >
                    {isPolishing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Memperbaiki...
                      </>
                    ) : (
                      <>
                        <Wand2 className="size-4" />
                        {reviewerNotes ? 'Perbaiki dengan Catatan Review' : 'Mulai Perbaikan'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Reviewer Notes Panel ── */}
          {showReviewerNotes && (
            <TabsContent value="reviewer-notes">
              <Card className="border-orange-200 dark:border-orange-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30">
                        <FileCheck className="size-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Catatan Peer Review Q1</CardTitle>
                        <CardDescription>
                          {isGeneratingReview ? reviewStatusMessage : reviewerNotes
                            ? `Overall: ${reviewerNotes.overallRecommendation || 'N/A'} (Skor: ${reviewerNotes.overallScore ?? 'N/A'}/10)`
                            : 'Hasilkan umpan balik peer review kritis sebelum memperbaiki'}
                        </CardDescription>
                      </div>
                    </div>
                    {reviewerNotes && (
                      <Badge variant={reviewerNotes.overallScore >= 7 ? 'default' : reviewerNotes.overallScore >= 5 ? 'secondary' : 'destructive'} className="text-sm">
                        {reviewerNotes.overallScore >= 7 ? 'Dapat Diterima' : reviewerNotes.overallScore >= 5 ? 'Perlu Revisi' : 'Masalah Besar'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isGeneratingReview && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Loader2 className="size-8 animate-spin text-orange-500" />
                      <p className="text-sm text-muted-foreground">{reviewStatusMessage || 'Menganalisis artikel Anda...'}</p>
                    </div>
                  )}
                  {reviewerNotes && !isGeneratingReview && (
                    <ScrollArea className="max-h-[500px] pr-4">
                      <div className="space-y-6">
                        {/* Priority Actions */}
                        {reviewerNotes.priorityActions?.length > 0 && (
                          <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-4 border border-red-200 dark:border-red-800">
                            <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                              <AlertTriangle className="size-4" /> Tindakan Prioritas Diperlukan
                            </h4>
                            <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
                              {reviewerNotes.priorityActions.map((action: string, i: number) => (
                                <li key={i} className="flex gap-2"><span className="font-bold">{i + 1}.</span> {action}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Reviewer Cards */}
                        {reviewerNotes.reviewers?.map((reviewer: any, idx: number) => (
                          <Card key={idx} className="border-border">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">{reviewer.name}</p>
                                  <p className="text-xs text-muted-foreground">{reviewer.role}</p>
                                </div>
                                <Badge variant={reviewer.recommendation === 'Accept' ? 'default' : 'secondary'}>{reviewer.recommendation}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                              <p className="italic text-muted-foreground">{reviewer.overallAssessment}</p>
                              {reviewer.majorIssues?.length > 0 && (
                                <div>
                                  <p className="font-medium text-red-600 dark:text-red-400">Masalah Besar ({reviewer.majorIssues.length})</p>
                                  <ul className="mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                                    {reviewer.majorIssues.map((issue: string, i: number) => <li key={i}>{issue}</li>)}
                                  </ul>
                                </div>
                              )}
                              {reviewer.minorIssues?.length > 0 && (
                                <div>
                                  <p className="font-medium text-amber-600 dark:text-amber-400">Masalah Kecil ({reviewer.minorIssues.length})</p>
                                  <ul className="mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                                    {reviewer.minorIssues.map((issue: string, i: number) => <li key={i}>{issue}</li>)}
                                  </ul>
                                </div>
                              )}
                              {reviewer.strengths?.length > 0 && (
                                <div>
                                  <p className="font-medium text-emerald-600 dark:text-emerald-400">Kelebihan</p>
                                  <ul className="mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                                    {reviewer.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                  </ul>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Preview Tab ── */}
          <TabsContent value="preview">
            <div className="space-y-4">
              {isPolishing && polishSteps.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <PolishProgressOverlay
                      steps={polishSteps}
                      currentStepIndex={currentStepIndex}
                      estimatedSeconds={estimatedTime}
                    />
                  </CardContent>
                </Card>
              )}

              {hasPolished && !isPolishing && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <GitCompare className="size-4.5 text-emerald-500" />
                          Perbandingan Sebelum &amp; Sesudah
                        </CardTitle>
                        <CardDescription>
                          Tinjau perubahan bagian per bagian
                        </CardDescription>
                      </div>
                      {/* View mode toggle buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant={comparisonViewMode === 'split' ? 'default' : 'outline'}
                          size="sm"
                          className={`text-xs h-7 gap-1 ${comparisonViewMode === 'split' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                          onClick={() => setComparisonViewMode('split')}
                        >
                          <Columns className="size-3" />
                          Tampilan Terpisah
                        </Button>
                        <Button
                          variant={comparisonViewMode === 'original' ? 'default' : 'outline'}
                          size="sm"
                          className={`text-xs h-7 gap-1 ${comparisonViewMode === 'original' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                          onClick={() => setComparisonViewMode('original')}
                        >
                          Asli
                        </Button>
                        <Button
                          variant={comparisonViewMode === 'polished' ? 'default' : 'outline'}
                          size="sm"
                          className={`text-xs h-7 gap-1 ${comparisonViewMode === 'polished' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                          onClick={() => setComparisonViewMode('polished')}
                        >
                          Hasil Polesan
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-[600px]">
                      <div className="space-y-2 pr-4">
                        {generatedArticle.sections.map((section) => {
                          const polishedSection = polishedArticle?.sections.find(
                            (s) => s.type === section.type
                          );
                          const sectionChangeCount = getSectionChangeCount(section.type, changeSummary);

                          return (
                            <SectionComparison
                              key={section.type}
                              sectionType={section.type}
                              originalSection={section}
                              polishedSection={polishedSection}
                              changeCount={sectionChangeCount}
                              searchQuery={searchQuery}
                              viewMode={comparisonViewMode}
                            />
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {!hasPolished && !isPolishing && (
                <Card>
                  <CardContent className="p-12 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                      <Sparkles className="size-7 text-muted-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-semibold">Siap Memperbaiki</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Beralih ke tab Opsi Perbaikan untuk mengatur preferensi, lalu mulai proses perbaikan untuk melihat perbandingan di sini.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('options')}
                      className="mt-2"
                    >
                      Atur Opsi
                      <ChevronRight className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* ── Change summary (compact) ── */}
              {changeSummary && hasPolished && !isPolishing && (
                <ChangeSummaryPanel summary={changeSummary} animateScores={scoresHaveAnimated} />
              )}
            </div>
          </TabsContent>

          {/* ── Summary Tab ── */}
          {changeSummary && (
            <TabsContent value="summary">
              <div className="space-y-4">
                <ChangeSummaryPanel summary={changeSummary} animateScores={scoresHaveAnimated} />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="size-4.5 text-amber-500" />
                      Pencapaian Kualitas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center">
                      <QualityScoreRing score={changeSummary.qualityAfter} label="Skor Akhir" size={120} animate={scoresHaveAnimated} />
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      {changeSummary.qualityAfter >= 90
                        ? 'Artikel Anda memenuhi standar publikasi tinggi.'
                        : changeSummary.qualityAfter >= 75
                          ? 'Artikel Anda dalam kondisi baik dengan perbaikan kecil yang mungkin dilakukan.'
                          : 'Pertimbangkan penyuntingan tambahan untuk mencapai standar publikasi.'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* ── Final Actions (Sticky with Frosted Glass) ── */}
        <div className="relative -mx-6 px-6 mt-8">
          <Separator />
        </div>

        {/* Spacer to account for sticky bar height — handled by pb-24 on parent */}

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
        >
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={prevStep} size="sm">
                  <ArrowLeft className="size-4" />
                  Kembali
                </Button>
                {polishCount > 0 && (
                  <Badge variant="secondary" className="text-xs bg-muted/50">
                    <Wand2 className="size-3 mr-1" />
                    Perbaikan #{polishCount}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={copyArticle}
                  disabled={!article}
                  className="gap-1.5"
                  size="sm"
                >
                  <Copy className="size-3.5" />
                  <span className="hidden sm:inline">Salin Artikel Lengkap</span>
                  <span className="sm:hidden">Salin</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={downloadArticle}
                  disabled={!article}
                  className="gap-1.5"
                  size="sm"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Unduh sebagai Teks</span>
                  <span className="sm:hidden">Unduh</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (article) {
                      exportToMarkdown(article);
                      toast.success('Artikel diunduh sebagai Markdown');
                    }
                  }}
                  disabled={!article}
                  className="gap-1.5"
                  size="sm"
                >
                  <FileText className="size-3.5" />
                  <span className="hidden sm:inline">MD</span>
                  <span className="sm:hidden">MD</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleExportPdf}
                  disabled={!article || isExportingPdf}
                  className="gap-1.5"
                  size="sm"
                >
                  {isExportingPdf ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FileText className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">{isExportingPdf ? 'Membuat PDF...' : 'PDF'}</span>
                  <span className="sm:hidden">{isExportingPdf ? '...' : 'PDF'}</span>
                </Button>

                {hasPolished && (
                  <Button
                    variant="outline"
                    onClick={regeneratePolish}
                    className="gap-1.5"
                    size="sm"
                  >
                    <RefreshCw className="size-3.5" />
                    <span className="hidden sm:inline">Buat Ulang</span>
                    <span className="sm:hidden">Ulangi</span>
                  </Button>
                )}

                {hasPolished && (
                  <Button
                    onClick={acceptAndExport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-lg shadow-emerald-600/20"
                    size="sm"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Terima &amp; Ekspor
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
