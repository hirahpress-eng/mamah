'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Sparkles,
  BookOpen,
  Lightbulb,
  ArrowRight,
  Tags,
  Type,
  Brain,
  Loader2,
  FileText,
  CheckCircle2,
  X,
  Wand2,
  Layers,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useArticleStore } from '@/store/article-store';
import type { InputMode } from '@/store/article-store';
import ResearchTemplatesDialog from '@/components/research-templates-dialog';
import type { ResearchTemplate } from '@/lib/research-templates';

// ─── Animation Variants ─────────────────────────────────────────────

const fadeSlideUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

// ─── Constants ──────────────────────────────────────────────────────

const POPULAR_SUGGESTIONS = [
  'Pembelajaran Mesin',
  'Perubahan Iklim',
  'Kesehatan Masyarakat',
  'Transformasi Digital',
  'Pembangunan Berkelanjutan',
  'Media Sosial',
  'Neurosains',
  'Energi Terbarukan',
];

const GENERATION_STEPS = [
  'Menganalisis kata kunci...',
  'Menyarankan judul...',
  'Memilih opsi terbaik...',
];

const MAX_TITLE_CHARS = 300;
const MAX_IDEA_CHARS = 2000;

const KEYWORD_TOOLTIP_EXAMPLES: Record<number, string> = {
  1: 'cth., Pembelajaran Mesin, Pembelajaran Mendalam, Jaringan Saraf Tiruan',
  2: 'cth., Perubahan Iklim, Pemanasan Global, Emisi Karbon',
  3: 'cth., Kesehatan Digital, Telemedisin, Perangkat Wearable',
  4: 'cth., Big Data, Pertambangan Data, Analitik',
  5: 'cth., Energi Terbarukan, Energi Surya, Energi Angin',
};

/** Animated counter hook using requestAnimationFrame */
function useAnimatedCount(target: number, duration = 600) {
  const [displayCount, setDisplayCount] = useState(0);
  const rafRef = useRef<number>(0);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    prevTargetRef.current = target;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
    // Cubic ease-out
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    setDisplayCount(current);
    if (progress < 1) {
      rafRef.current = requestAnimationFrame(animate);
    }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return displayCount;
}

// ─── Sub-components ──────────────────────────────────────────────────

/** Radio-selectable title card */
function TitleCard({
  title,
  index,
  isSelected,
  onSelect,
}: {
  title: string;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeSlideUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <Card
        className={`group relative cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${
          isSelected
            ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/30 dark:bg-emerald-950/30'
            : 'hover:border-emerald-300 dark:hover:border-emerald-700'
        }`}
        onClick={onSelect}
      >
        <CardContent className="flex items-start gap-3 p-4">
          <RadioGroupItem
            value={title}
            checked={isSelected}
            className="mt-0.5 border-emerald-400 text-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="size-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Judul {index + 1}
              </span>
            </div>
            <p
              className={`text-sm leading-relaxed ${
                isSelected
                  ? 'text-emerald-900 dark:text-emerald-100 font-medium'
                  : 'text-foreground/80'
              }`}
            >
              {title}
            </p>
          </div>
          <AnimatePresence>
            {isSelected && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Checkbox keyword badge */
function KeywordBadge({
  keyword,
  isChecked,
  onToggle,
}: {
  keyword: string;
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.div variants={fadeSlideUp} initial="hidden" animate="visible" exit="exit" layout>
      <label className="inline-flex cursor-pointer items-center gap-1.5 select-none">
        <Checkbox
          checked={isChecked}
          onCheckedChange={onToggle}
          className="border-emerald-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
        />
        <Badge
          variant={isChecked ? 'default' : 'outline'}
          className={`text-sm px-3 py-1 rounded-full transition-all duration-200 ${
            isChecked
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
          }`}
        >
          {keyword}
        </Badge>
      </label>
    </motion.div>
  );
}

/** Skeleton grid for title cards */
function TitleCardsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="flex items-start gap-3 p-4">
            <Skeleton className="size-4 rounded-full mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Skeleton row for keyword badges */
function KeywordBadgesSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-24 rounded-full" />
      ))}
    </div>
  );
}

/** Keyword input field with clear button */
function KeywordInput({
  index,
  value,
  onChange,
  onClear,
  disabled,
  total,
}: {
  index: number;
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  disabled: boolean;
  total: number;
}) {
  const hasValue = value.trim().length > 0;
  const labelNum = index + 1;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="space-y-1.5 group/field">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
          >
            <Label
              htmlFor={`keyword-${labelNum}`}
              className="text-xs text-muted-foreground transition-colors duration-200 group-focus-within/field:text-emerald-600 dark:group-focus-within/field:text-emerald-400"
            >
              Keyword {labelNum}
            </Label>
          </motion.div>
          <div className="relative">
            <Input
              id={`keyword-${labelNum}`}
              placeholder={labelNum <= 3 ? `cth., ${['Pembelajaran Mesin', 'Kecerdasan Buatan', 'Analisis Data', 'Pendidikan Digital', 'Kesehatan'][labelNum - 1]}` : 'Topik opsional'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`border-border/60 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 pr-8 transition-all duration-200 ${
                hasValue ? 'border-emerald-300 dark:border-emerald-700' : ''
              }`}
              disabled={disabled}
            />
            <AnimatePresence>
              {hasValue && !disabled && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  type="button"
                  onClick={onClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center size-5 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors duration-150"
                  aria-label={`Clear keyword ${labelNum}`}
                >
                  <X className="size-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="text-xs">{KEYWORD_TOOLTIP_EXAMPLES[labelNum] || 'Enter a research keyword'}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** Generating overlay with pulsing border and step-by-step status */
function GeneratingOverlay({ steps }: { steps: string[] }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step >= steps.length) {
        clearInterval(interval);
        return;
      }
      setCurrentStep(step);
    }, 1200);

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl p-6"
    >
      {/* Pulsing gradient border */}
      <div className="absolute inset-0 rounded-xl animate-pulse-slow">
        <div className="absolute inset-0 rounded-xl border-2 border-transparent bg-gradient-to-r from-emerald-400/60 via-teal-400/60 to-emerald-400/60 bg-clip-padding" />
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background:
              'linear-gradient(90deg, rgba(16,185,129,0.06) 0%, rgba(20,184,166,0.12) 50%, rgba(16,185,129,0.06) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmerBg 2s ease-in-out infinite',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 py-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
          <div className="relative size-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center">
            <Wand2 className="size-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          </div>
        </div>

        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold text-foreground">Membuat judul Anda...</p>

          <div className="space-y-2">
            {steps.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0.3, x: -8 }}
                animate={{
                  opacity: i <= currentStep ? 1 : 0.3,
                  x: 0,
                }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 justify-center text-xs"
              >
                {i < currentStep ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : i === currentStep ? (
                  <Loader2 className="size-3.5 text-emerald-500 animate-spin" />
                ) : (
                  <div className="size-3.5 rounded-full border border-muted-foreground/30" />
                )}
                <span
                  className={
                    i <= currentStep
                      ? 'text-emerald-700 dark:text-emerald-300 font-medium'
                      : 'text-muted-foreground'
                  }
                >
                  {step}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <motion.div
              key={i}
              className="h-1 rounded-full bg-emerald-500"
              animate={{
                width: i <= currentStep ? 24 : 8,
                opacity: i <= currentStep ? 1 : 0.3,
              }}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/** Character counter */
function CharCounter({ current, max }: { current: number; max: number }) {
  const isNearLimit = current > max * 0.9;
  const isOver = current > max;

  return (
    <p
      className={`text-xs mt-1.5 text-right transition-colors duration-200 ${
        isOver
          ? 'text-red-500 font-medium'
          : isNearLimit
            ? 'text-amber-500'
            : 'text-muted-foreground/60'
      }`}
    >
      {current.toLocaleString()} / {max.toLocaleString()} characters
    </p>
  );
}

/** Shimmer button wrapper */
function ShimmerButton({
  children,
  className,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      disabled={disabled}
      className={`relative overflow-hidden bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-300 gap-2 px-8 group ${className || ''}`}
    >
      {/* Shimmer layer */}
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
    </Button>
  );
}

// ─── API Helpers ─────────────────────────────────────────────────────

interface GenerateResponse {
  success: boolean;
  titles?: string[];
  keywords?: string[];
  error?: string;
}

async function generateFromKeywords(keywords: string[], engineId?: string): Promise<GenerateResponse> {
  const res = await fetch('/api/generate/titles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, engineId }),
  });
  if (!res.ok) {
    toast.error(`Kesalahan server (${res.status}). Silakan coba lagi.`);
    return { success: false, error: `HTTP ${res.status}` };
  }
  return res.json();
}

async function generateFromTitle(title: string, engineId?: string): Promise<GenerateResponse> {
  const res = await fetch('/api/generate/keywords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, engineId }),
  });
  if (!res.ok) {
    toast.error(`Kesalahan server (${res.status}). Silakan coba lagi.`);
    return { success: false, error: `HTTP ${res.status}` };
  }
  return res.json();
}

async function generateFromIdea(idea: string, engineId?: string): Promise<GenerateResponse> {
  const res = await fetch('/api/generate/idea', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea, engineId }),
  });
  if (!res.ok) {
    toast.error(`Kesalahan server (${res.status}). Silakan coba lagi.`);
    return { success: false, error: `HTTP ${res.status}` };
  }
  return res.json();
}

// ─── Main Component ──────────────────────────────────────────────────

export default function Step1Input() {
  const {
    inputMode,
    setInputMode,
    keywords,
    setKeywords,
    inputTitle,
    setInputTitle,
    inputIdea,
    setInputIdea,
    generatedTitles,
    setGeneratedTitles,
    generatedKeywords,
    setGeneratedKeywords,
    isGeneratingStep1,
    setIsGeneratingStep1,
    selectedTitle,
    setSelectedTitle,
    selectedKeywords,
    setSelectedKeywords,
    nextStep,
  } = useArticleStore();

  const [templatesOpen, setTemplatesOpen] = useState(false);

  // ── Handlers ───────────────────────────────────────────────────

  const handleKeywordChange = useCallback(
    (index: number, value: string) => {
      const next = [...keywords];
      next[index] = value;
      // Ensure array is exactly 5 elements
      while (next.length < 5) next.push('');
      setKeywords(next.slice(0, 5));
    },
    [keywords, setKeywords],
  );

  const handleKeywordClear = useCallback(
    (index: number) => {
      const next = [...keywords];
      next[index] = '';
      setKeywords(next);
    },
    [keywords, setKeywords],
  );

  const handleQuickFill = useCallback(
    (suggestion: string) => {
      // Find the first empty keyword slot
      const emptyIndex = keywords.findIndex((k) => k.trim() === '');
      if (emptyIndex !== -1) {
        const next = [...keywords];
        next[emptyIndex] = suggestion;
        setKeywords(next);
      } else {
        toast.info('Semua slot kata kunci terisi. Hapus salah satu untuk menggunakan saran ini.', {
          description: `"${suggestion}" not added.`,
        });
      }
    },
    [keywords, setKeywords],
  );

  const handleGenerateTitles = useCallback(async () => {
    const validKeywords = keywords.filter((k) => k.trim() !== '');
    if (validKeywords.length === 0) return;
    setIsGeneratingStep1(true);
    setGeneratedTitles([]);
    setSelectedTitle('');
    try {
      const res = await generateFromKeywords(validKeywords);
      if (res.success && res.titles) {
        setGeneratedTitles(res.titles);
      } else {
        toast.error('Gagal menghasilkan judul', {
          description: res.error || 'The server returned an unexpected response. Please try again.',
        });
      }
    } catch {
      toast.error('Kesalahan jaringan', {
        description: 'Could not reach the generation server. Please check your connection and try again.',
      });
    } finally {
      setIsGeneratingStep1(false);
    }
  }, [keywords, setIsGeneratingStep1, setGeneratedTitles, setSelectedTitle]);

  const handleGenerateKeywords = useCallback(async () => {
    if (!inputTitle.trim()) return;
    setIsGeneratingStep1(true);
    setGeneratedKeywords([]);
    setSelectedKeywords([]);
    try {
      const res = await generateFromTitle(inputTitle.trim());
      if (res.success && res.keywords) {
        setGeneratedKeywords(res.keywords);
      } else {
        toast.error('Gagal mengekstrak kata kunci', {
          description: res.error || 'The server returned an unexpected response. Please try again.',
        });
      }
    } catch {
      toast.error('Kesalahan jaringan', {
        description: 'Could not reach the generation server. Please check your connection and try again.',
      });
    } finally {
      setIsGeneratingStep1(false);
    }
  }, [inputTitle, setIsGeneratingStep1, setGeneratedKeywords, setSelectedKeywords]);

  const handleAnalyzeIdea = useCallback(async () => {
    if (!inputIdea.trim()) return;
    setIsGeneratingStep1(true);
    setGeneratedTitles([]);
    setGeneratedKeywords([]);
    setSelectedTitle('');
    setSelectedKeywords([]);
    try {
      const res = await generateFromIdea(inputIdea.trim());
      if (res.success) {
        if (res.titles) setGeneratedTitles(res.titles);
        if (res.keywords) setGeneratedKeywords(res.keywords);
      } else {
        toast.error('Gagal menganalisis ide penelitian', {
          description: res.error || 'The server returned an unexpected response. Please try again.',
        });
      }
    } catch {
      toast.error('Kesalahan jaringan', {
        description: 'Could not reach the generation server. Please check your connection and try again.',
      });
    } finally {
      setIsGeneratingStep1(false);
    }
  }, [
    inputIdea,
    setIsGeneratingStep1,
    setGeneratedTitles,
    setGeneratedKeywords,
    setSelectedTitle,
    setSelectedKeywords,
  ]);

  const handleToggleKeyword = useCallback(
    (keyword: string) => {
      if (selectedKeywords.includes(keyword)) {
        setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword));
      } else {
        setSelectedKeywords([...selectedKeywords, keyword]);
      }
    },
    [selectedKeywords, setSelectedKeywords],
  );

  const handleModeChange = useCallback(
    (mode: string) => {
      setInputMode(mode as InputMode);
    },
    [setInputMode],
  );

  // ── Derived State ──────────────────────────────────────────────

  const hasKeywords = keywords.some((k) => k.trim() !== '');
  const hasTitle = inputTitle.trim().length > 0;
  const hasIdea = inputIdea.trim().length > 0;

  const showNextButton =
    (inputMode === 'keywords' && selectedTitle) ||
    (inputMode === 'title' && selectedKeywords.length > 0) ||
    (inputMode === 'idea' && selectedTitle && selectedKeywords.length > 0);

  // ── Template selection handler ──────────────────────────────
  const handleSelectTemplate = useCallback(
    (template: ResearchTemplate) => {
      // Switch to keywords mode
      setInputMode('keywords');
      // Fill in the 5 keyword slots (pad with empty strings if needed)
      const filled = [...template.suggestedKeywords];
      while (filled.length < 5) filled.push('');
      setKeywords(filled.slice(0, 5));
      // Clear previous results
      setGeneratedTitles([]);
      setSelectedTitle('');
      setGeneratedKeywords([]);
      setSelectedKeywords([]);
      // Auto-trigger title generation after a brief delay to let state settle
      const validKeywords = template.suggestedKeywords;
      setTimeout(async () => {
        setIsGeneratingStep1(true);
        setGeneratedTitles([]);
        setSelectedTitle('');
        try {
          const res = await fetch('/api/generate/titles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: validKeywords }),
          });
          const data = await res.json();
          if (data.success && data.titles) {
            setGeneratedTitles(data.titles);
          } else {
            toast.error('Gagal menghasilkan judul dari template', {
              description: data.error || 'Please try generating manually.',
            });
          }
        } catch {
          toast.error('Kesalahan jaringan', {
            description: 'Could not reach the generation server. Please try again.',
          });
        } finally {
          setIsGeneratingStep1(false);
        }
      }, 100);
    },
    [setInputMode, setKeywords, setGeneratedTitles, setSelectedTitle, setGeneratedKeywords, setSelectedKeywords, setIsGeneratingStep1],
  );

  // ── Tab Config ─────────────────────────────────────────────────

  const tabConfig: {
    value: InputMode;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      value: 'keywords',
      label: 'Kata Kunci',
      icon: <Tags className="size-4" />,
      description: 'Masukkan kata kunci untuk menghasilkan judul artikel ilmiah',
    },
    {
      value: 'title',
      label: 'Judul',
      icon: <Type className="size-4" />,
      description: 'Masukkan judul untuk mengekstrak kata kunci penelitian',
    },
    {
      value: 'idea',
      label: 'Ide Penelitian',
      icon: <Lightbulb className="size-4" />,
      description: 'Deskripsikan ide penelitian Anda untuk dianalisis',
    },
  ];

  // ── Render ─────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto w-full max-w-3xl space-y-6 relative"
    >
      {/* Subtle gradient background */}
      <div
        className="absolute -inset-6 -z-10 rounded-3xl opacity-60 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(16,185,129,0.04) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(20,184,166,0.03) 0%, transparent 50%)',
        }}
      />

      {/* ── Header ───────────────────────────────────────────── */}
      <motion.div variants={fadeSlideUp} custom={0} className="space-y-2 text-center">
        <div className="inline-flex items-center justify-center size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 mb-3">
          <BookOpen className="size-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Tentukan Topik Penelitian
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
          Mulai dengan kata kunci, judul, atau ide penelitian. Sistem akan membantu menyempurnakan topik dan menghasilkan konten artikel ilmiah yang terstruktur.
        </p>
      </motion.div>

      {/* ── Mode Tabs ─────────────────────────────────────────── */}
      <motion.div variants={fadeSlideUp} custom={1}>
        <Tabs
          value={inputMode}
          onValueChange={handleModeChange}
          className="w-full"
        >
          <div className="flex justify-center">
            <TabsList className="bg-emerald-50/80 dark:bg-emerald-950/30 p-1 h-auto grid grid-cols-3 w-full max-w-lg" aria-label="Pilih metode input">
              {tabConfig.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 py-2.5 px-3 text-sm rounded-md data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── Keywords Tab ─────────────────────────────────── */}
          <TabsContent value="keywords" className="mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="keywords-panel"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Tags className="size-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Masukkan Kata Kunci Anda
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-5">
                      Masukkan hingga 5 kata kunci terkait topik penelitian Anda. Minimal satu kata kunci diperlukan
                      untuk menghasilkan judul.
                    </p>

                    {/* Responsive grid: single col mobile, 2 col desktop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <KeywordInput
                          key={i}
                          index={i}
                          value={keywords[i] || ''}
                          onChange={(val) => handleKeywordChange(i, val)}
                          onClear={() => handleKeywordClear(i)}
                          disabled={isGeneratingStep1}
                          total={5}
                        />
                      ))}
                    </div>

                    {/* Quick-Fill Suggestions */}
                    <div className="mt-5 pt-4 border-t border-border/40">
                      <p className="text-xs text-muted-foreground mb-2.5 flex items-center gap-1.5">
                        <Sparkles className="size-3 text-emerald-500" />
                        Bidang riset populer:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SUGGESTIONS.map((suggestion) => {
                          const isUsed = keywords.some(
                            (k) => k.trim().toLowerCase() === suggestion.toLowerCase(),
                          );
                          return (
                            <motion.button
                              key={suggestion}
                              type="button"
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.97 }}
                              disabled={isUsed || isGeneratingStep1}
                              onClick={() => handleQuickFill(suggestion)}
                              className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border transition-all duration-200 ${
                                isUsed
                                  ? 'bg-emerald-100/60 border-emerald-300/50 text-emerald-600/50 dark:bg-emerald-900/20 dark:border-emerald-700/30 dark:text-emerald-400/50 cursor-default line-through'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:border-emerald-600 cursor-pointer'
                              }`}
                            >
                              {isUsed && <CheckCircle2 className="size-3 mr-1 opacity-50" />}
                              {suggestion}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <Button
                        onClick={handleGenerateTitles}
                        disabled={!hasKeywords || isGeneratingStep1}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      >
                        {isGeneratingStep1 ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Menghasilkan...
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-4" />
                            Hasilkan Judul
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setTemplatesOpen(true)}
                        disabled={isGeneratingStep1}
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50 dark:hover:border-emerald-600"
                      >
                        <Layers className="size-4" />
                        Jelajahi Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Generated Titles / Generating Overlay */}
                <AnimatePresence>
                  {isGeneratingStep1 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <GeneratingOverlay steps={GENERATION_STEPS} />
                    </motion.div>
                  ) : generatedTitles.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="size-4 text-emerald-500" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Judul yang Dihasilkan
                        </h3>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        >
                          {generatedTitles.length} hasil
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Pilih satu judul untuk melanjutkan ke langkah berikutnya.
                      </p>
                      <RadioGroup
                        value={selectedTitle}
                        onValueChange={(val) => setSelectedTitle(val)}
                        className="space-y-3"
                      >
                        {generatedTitles.map((title, i) => (
                          <TitleCard
                            key={i}
                            title={title}
                            index={i}
                            isSelected={selectedTitle === title}
                            onSelect={() => setSelectedTitle(title)}
                          />
                        ))}
                      </RadioGroup>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── Title Tab ─────────────────────────────────────── */}
          <TabsContent value="title" className="mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="title-panel"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Type className="size-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Masukkan Judul Artikel Anda
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-5">
                      Masukkan judul artikel ilmiah dan kami akan mengekstrak kata kunci
                      yang relevan untuk riset Anda.
                    </p>
                    <Textarea
                      placeholder="Contoh: Dampak Kecerdasan Buatan terhadap Sistem Kesehatan Modern: Tinjauan Pustaka Komprehensif"
                      value={inputTitle}
                      onChange={(e) =>
                        setInputTitle(e.target.value.slice(0, MAX_TITLE_CHARS))
                      }
                      className="min-h-[120px] border-border/60 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 resize-none transition-all duration-200"
                      disabled={isGeneratingStep1}
                    />
                    <CharCounter current={inputTitle.length} max={MAX_TITLE_CHARS} />
                    <Button
                      onClick={handleGenerateKeywords}
                      disabled={!hasTitle || isGeneratingStep1}
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm w-full sm:w-auto"
                    >
                      {isGeneratingStep1 ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Menghasilkan...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4" />
                          Hasilkan Kata Kunci
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Generated Keywords */}
                <AnimatePresence>
                  {isGeneratingStep1 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="size-4 text-emerald-500 animate-pulse" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Generating keywords...
                        </h3>
                      </div>
                      <KeywordBadgesSkeleton />
                    </motion.div>
                  ) : generatedKeywords.length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="size-4 text-emerald-500" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Extracted Keywords
                        </h3>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        >
                          {generatedKeywords.length} keywords
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Select the keywords that best represent your research.
                      </p>
                      <motion.div
                        className="flex flex-wrap gap-3"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {generatedKeywords.map((kw) => (
                          <KeywordBadge
                            key={kw}
                            keyword={kw}
                            isChecked={selectedKeywords.includes(kw)}
                            onToggle={() => handleToggleKeyword(kw)}
                          />
                        ))}
                      </motion.div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── Idea Tab ──────────────────────────────────────── */}
          <TabsContent value="idea" className="mt-6">
            <AnimatePresence mode="wait">
              <motion.div
                key="idea-panel"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <Card className="border-border/60 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className="size-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Describe Your Research Idea
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-5">
                      Describe your research idea, hypothesis, or topic in detail. We&apos;ll analyze
                      it and generate both keywords and potential titles.
                    </p>
                    <Textarea
                      placeholder="e.g., I want to explore how machine learning algorithms can improve early diagnosis of neurodegenerative diseases using MRI scan data. The study should compare different deep learning architectures..."
                      value={inputIdea}
                      onChange={(e) =>
                        setInputIdea(e.target.value.slice(0, MAX_IDEA_CHARS))
                      }
                      className="min-h-[160px] border-border/60 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 resize-none transition-all duration-200"
                      disabled={isGeneratingStep1}
                    />
                    <CharCounter current={inputIdea.length} max={MAX_IDEA_CHARS} />
                    <Button
                      onClick={handleAnalyzeIdea}
                      disabled={!hasIdea || isGeneratingStep1}
                      className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm w-full sm:w-auto"
                    >
                      {isGeneratingStep1 ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4" />
                          Analisis Ide
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Generated Keywords */}
                <AnimatePresence>
                  {isGeneratingStep1 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="size-4 text-emerald-500 animate-pulse" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Analyzing your idea...
                        </h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Skeleton className="h-4 w-28 mb-2" />
                          <KeywordBadgesSkeleton />
                        </div>
                        <div>
                          <Skeleton className="h-4 w-32 mb-2" />
                          <TitleCardsSkeleton />
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      {/* Keywords section */}
                      {generatedKeywords.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Tags className="size-4 text-emerald-500" />
                            <h3 className="text-sm font-semibold text-foreground">
                              Extracted Keywords
                            </h3>
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            >
                              {generatedKeywords.length}
                            </Badge>
                          </div>
                          <motion.div
                            className="flex flex-wrap gap-3"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            {generatedKeywords.map((kw) => (
                              <KeywordBadge
                                key={kw}
                                keyword={kw}
                                isChecked={selectedKeywords.includes(kw)}
                                onToggle={() => handleToggleKeyword(kw)}
                              />
                            ))}
                          </motion.div>
                        </motion.div>
                      )}

                      {/* Titles section */}
                      {generatedTitles.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Type className="size-4 text-emerald-500" />
                            <h3 className="text-sm font-semibold text-foreground">
                              Judul yang Disarankan
                            </h3>
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            >
                              {generatedTitles.length} hasil
                            </Badge>
                          </div>
                          <RadioGroup
                            value={selectedTitle}
                            onValueChange={(val) => setSelectedTitle(val)}
                            className="space-y-3"
                          >
                            {generatedTitles.map((title, i) => (
                              <TitleCard
                                key={i}
                                title={title}
                                index={i}
                                isSelected={selectedTitle === title}
                                onSelect={() => setSelectedTitle(title)}
                              />
                            ))}
                          </RadioGroup>
                        </motion.div>
                      )}
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Next Step Button with Shimmer ─────────────────────── */}
      <AnimatePresence>
        {showNextButton && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="flex justify-center pt-2"
          >
            <ShimmerButton onClick={nextStep}>
              Next Step
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </ShimmerButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Research Templates Dialog ────────────────────────── */}
      <ResearchTemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelectTemplate={handleSelectTemplate}
      />
    </motion.div>
  );
}
