'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  BookOpen,
  Library,
  FlaskConical,
  FileText,
  Wand2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  GraduationCap,
  Sun,
  Moon,
  Sparkles,
  BookMarked,
  PenTool,
  Heart,
  Shield,
  FileCheck,
  BarChart3,
  Info,
  Keyboard,
  Search,
  Plus,
  History,
  Target,
  HelpCircle,
  LogIn,
  LogOut,
  UserCircle,
  Crown,
  Bot,
  Zap,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useArticleStore, type GeneratedArticle } from '@/store/article-store';
import { toast } from 'sonner';
import AuthModal from '@/components/auth-modal';
import Step1Input from '@/components/article-generator/step1-input';
import Step2References from '@/components/article-generator/step2-references';
import Step3Method from '@/components/article-generator/step3-method';
import Step4Output from '@/components/article-generator/step4-output';
import Step5Polish from '@/components/article-generator/step5-polish';
import ArticleHistorySidebar from '@/components/article-history-sidebar';
import StatsDashboard from '@/components/stats-dashboard';
import CitationCounter from '@/components/citation-counter';
import {
  OnboardingTutorial,
  useOnboardingStatus,
} from '@/components/onboarding-tutorial';
import SuperBotPanel from '@/components/super-bot-panel';
import WritingModeSelector from '@/components/writing-mode-selector';
import CicilGenerator from '@/components/cicil-generator';
import type { CicilWritingMode } from '@/lib/writing-flows';

// ─── Constants ────────────────────────────────────────────────────────

const APP_VERSION = 'v2.1.0';

const MODE_TITLES: Record<string, string> = {
  article: 'Artikel Jurnal',
  skripsi: 'Skripsi (S1)',
  tesis: 'Tesis (S2)',
  disertasi: 'Disertasi (S3)',
  'buku-id': 'Buku Ilmiah Indonesia',
  'buku-en': 'Buku Ilmiah English',
  'buku-arab': 'Buku Bahasa Arab',
  'buku-eksakta': 'Buku Eksakta/Matematika',
  'buku-keislaman': 'Buku Keislaman',
  proposal: 'Proposal Penelitian',
  scholarship: 'Esai Beasiswa',
  paper: 'Makalah',
};

const STEPS = [
  { id: 1, label: 'Define Research', icon: BookOpen, shortLabel: 'Research' },
  { id: 2, label: 'References', icon: Library, shortLabel: 'References' },
  { id: 3, label: 'Method & Generate', icon: FlaskConical, shortLabel: 'Generate' },
  { id: 4, label: 'Article Output', icon: FileText, shortLabel: 'Output' },
  { id: 5, label: 'Polish & Layout', icon: Wand2, shortLabel: 'Polish' },
] as const;

// ─── Step Navigation Component ─────────────────────────────────────

function StepNavigation({ currentStep }: { currentStep: number }) {
  const { setCurrentStep } = useArticleStore();

  return (
    <nav className="w-full" aria-label="Article generation steps">
      {/* Desktop horizontal stepper */}
      <div className="hidden md:flex items-center justify-between w-full">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => {
                  if (isCompleted || isActive) setCurrentStep(step.id);
                }}
                className={`flex flex-col items-center gap-1.5 group transition-all duration-300 ${
                  isCompleted || isActive ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`relative flex items-center justify-center size-11 rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-110'
                      : isCompleted
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="size-5" />
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 size-4 bg-emerald-500 rounded-full flex items-center justify-center"
                    >
                      <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  )}
                </div>
                <span
                  className={`text-xs font-medium text-center leading-tight transition-colors ${
                    isActive
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : isCompleted
                        ? 'text-foreground/70'
                        : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 mt-[-1.25rem] relative">
                  {/* Base connector line */}
                  <div className="absolute inset-0 h-0.5 rounded-full bg-border" />
                  {/* Animated fill connector */}
                  <motion.div
                    className="h-0.5 rounded-full bg-emerald-500 absolute inset-y-0 left-0"
                    initial={false}
                    animate={{
                      width: currentStep > step.id ? '100%' : '0%',
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  />
                  {/* Animated numbered dot at midpoint */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <motion.div
                      className={`flex items-center justify-center size-5 rounded-full text-[10px] font-bold transition-colors duration-300 ${
                        currentStep > step.id
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/40'
                          : 'bg-background border-2 border-border text-muted-foreground'
                      }`}
                      animate={{
                        scale: currentStep > step.id ? [1, 1.15, 1] : 1,
                      }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                      {currentStep > step.id ? (
                        <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.id + 1
                      )}
                    </motion.div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile compact stepper (sticky) */}
      <div className="flex md:hidden items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => {
                if (isCompleted || isActive) setCurrentStep(step.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isCompleted
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              <Icon className="size-3.5" />
              {step.shortLabel}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Progress Indicator Component ───────────────────────────────────

function GlobalProgressIndicator({ currentStep }: { currentStep: number }) {
  const progressPercent = Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100);

  return (
    <div className="w-full h-1 bg-border/50 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{
          background: 'linear-gradient(90deg, #10b981, #14b8a6, #059669)',
        }}
        initial={false}
        animate={{ width: `${progressPercent}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </div>
  );
}

// ─── Step Header Component ─────────────────────────────────────────

function StepHeader({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
    >
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
          >
            Step {step} of 5
          </Badge>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

// ─── Welcome Banner Component ──────────────────────────────────────

function WelcomeBanner() {
  const features = [
    {
      icon: Sparkles,
      title: 'Generate Titles',
      description: 'AI-powered academic title suggestions from keywords or ideas',
    },
    {
      icon: BookMarked,
      title: 'Find References',
      description: 'Search and curate up to 50 scholarly references',
    },
    {
      icon: PenTool,
      title: 'Create Articles',
      description: 'Full IMRAD articles polished to publication quality',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="mb-6"
    >
      <Card className="overflow-hidden border-0 shadow-lg card-glow bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/60 dark:from-slate-900 dark:via-emerald-950/20 dark:to-teal-950/30">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row items-center gap-6 p-6 sm:p-8">
            {/* Decorative illustration area */}
            <div className="flex-shrink-0">
              <motion.div
                className="relative flex items-center justify-center size-24 sm:size-28 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #0d9488, #059669)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(16, 185, 129, 0.3)',
                    '0 0 20px 8px rgba(16, 185, 129, 0.15)',
                    '0 0 0 0 rgba(16, 185, 129, 0.3)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="absolute inset-1 rounded-full bg-white/20 backdrop-blur-sm" />
                <GraduationCap className="size-10 sm:size-12 text-white relative z-10" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="flex-1 text-center lg:text-left">
              <motion.h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-emerald"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                Welcome to Mamah
              </motion.h2>
              <motion.p
                className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                Your AI-powered academic writing assistant. Generate publication-ready research
                articles with proper IMRAD structure, curated references, and professional academic
                language in minutes.
              </motion.p>

              {/* Feature highlights */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {features.map((feature, i) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <motion.div
                      key={feature.title}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-border/40 backdrop-blur-sm card-hover-lift transition-smooth"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.35 }}
                    >
                      <div className="flex-shrink-0 flex items-center justify-center size-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                        <FeatureIcon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Step Tips Component ──────────────────────────────────────────

const STEP_TIPS: Record<number, { icon: typeof Info; title: string; tips: string[] }> = {
  1: {
    icon: BookOpen,
    title: 'Research Definition Tips',
    tips: [
      'Use specific keywords for better title suggestions',
      'Try the Idea tab for more creative, exploratory inputs',
      'Browse Templates for popular research topics to get started quickly',
      'Select at least 3 keywords for optimal results',
    ],
  },
  2: {
    icon: Library,
    title: 'Reference Selection Tips',
    tips: [
      'Aim for a mix of journal articles, books, and theoretical sources',
      'Prioritise recent publications (last 5 years) for current relevance',
      'Use filters to narrow down by type, year, or topic',
      'Select at least 5 references to proceed to generation',
    ],
  },
  3: {
    icon: FlaskConical,
    title: 'Generation Tips',
    tips: [
      'Literature Review is recommended for most academic articles',
      'Add specific instructions for targeted, customised output',
      'Article generation typically takes 1–3 minutes',
      'Review your references before generating for best results',
    ],
  },
  4: {
    icon: FileText,
    title: 'Article Review Tips',
    tips: [
      'Use Ctrl+F to search within the article content',
      'Check the Table of Contents for section completion status',
      'Expand each section to review in detail',
      'Export to DOCX, PDF, or Markdown for offline editing',
    ],
  },
  5: {
    icon: Wand2,
    title: 'Polish Tips',
    tips: [
      'Use Auto-Polish to enable all refinements at once',
      'Compare before/after to see the quality improvements',
      'Each polish pass builds on the previous version',
      'Export the final polished article in your preferred format',
    ],
  },
};

function StepTipsBar({ step }: { step: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const tipData = STEP_TIPS[step];
  if (!tipData || dismissed) return null;
  const TipIcon = tipData.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20 px-4 py-3">
        <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 shrink-0 mt-0.5">
          <TipIcon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-foreground">{tipData.title}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                {isExpanded ? 'Show Less' : 'Show Tips'}
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="ml-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                aria-label="Dismiss tips"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <AnimatePresence>
            {isExpanded && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                {tipData.tips.map((tip, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-2 text-xs text-muted-foreground mt-1.5 leading-relaxed"
                  >
                    <span className="shrink-0 mt-0.5 size-1.5 rounded-full bg-emerald-400 dark:bg-emerald-500" />
                    {tip}
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Word Count Goal Progress Bar ──────────────────────────────────

const WORD_COUNT_TARGET = 7750;

function WordCountGoalBar({ article }: { article: GeneratedArticle }) {
  const totalWords =
    article.totalWordCount > 0
      ? article.totalWordCount
      : article.sections.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const percent = Math.min(100, Math.round((totalWords / WORD_COUNT_TARGET) * 100));

  return (
    <div className="border-t border-border/30 bg-white/40 dark:bg-slate-900/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2">
        <div className="flex items-center gap-3">
          <Target className="size-3.5 text-emerald-500 shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #059669, #10b981, #14b8a6)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground whitespace-nowrap">
              {totalWords.toLocaleString()} / {WORD_COUNT_TARGET.toLocaleString()} target
              <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                ({percent}%)
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Keyboard Shortcuts Section ────────────────────────────────────

const KEYBOARD_SHORTCUTS = [
  {
    keys: ['Ctrl', '→'],
    label: 'Next step',
    available: true,
  },
  {
    keys: ['Ctrl', '←'],
    label: 'Previous step',
    available: true,
  },
  {
    keys: ['Esc'],
    label: 'Go back',
    available: true,
  },
  {
    keys: ['Ctrl', 'F'],
    label: 'Search in article',
    available: 'Step 4–5',
  },
];

function KeyboardShortcutsSection({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  // Default collapsed on mobile, expanded on desktop (tracked via CSS + state)
  // We default to false and let the initial media query effect handle it
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // On desktop default to expanded; on mobile default to collapsed
  const effectiveOpen = isDesktop ? (isOpen !== false) : isOpen;

  return (
    <div className="mb-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group w-full sm:w-auto"
      >
        <Keyboard className="size-3.5 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
        <span>Keyboard Shortcuts</span>
        <motion.div
          animate={{ rotate: effectiveOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <ChevronDown className="size-3" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {effectiveOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 bg-muted/40 border border-border/30"
                >
                  <div className="flex items-center gap-0.5">
                    {shortcut.keys.map((key, i) => (
                      <React.Fragment key={key}>
                        <kbd className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1 rounded border border-border/60 bg-background text-[10px] font-mono text-foreground/80 shadow-[0_1px_0_0_hsl(var(--border))]">
                          {key}
                        </kbd>
                        {i < shortcut.keys.length - 1 && (
                          <span className="text-[10px] text-muted-foreground mx-0.5">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {shortcut.label}
                    {shortcut.available !== true && (
                      <span className="text-emerald-500 ml-1 font-medium text-[10px]">
                        ({shortcut.available})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile Quick Actions ──────────────────────────────────────────

function MobileQuickActions() {
  const { resetAll, setCurrentStep } = useArticleStore();
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <div className="flex md:hidden items-center justify-center gap-2 mt-3 pt-3 border-t border-border/30">
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          resetAll();
          toast.success('Starting a new article');
        }}
        className="size-9 text-muted-foreground hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700"
        aria-label="New Article"
      >
        <Plus className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          setCurrentStep(4);
          toast.info('View article history from the sidebar');
        }}
        className="size-9 text-muted-foreground hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700"
        aria-label="View History"
      >
        <History className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        }}
        className="size-9 text-muted-foreground hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700"
        aria-label="Toggle Theme"
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="size-4 hidden dark:block" />
      </Button>
    </div>
  );
}

// ─── Main Application Component ────────────────────────────────────

export default function ArticleGeneratorApp() {
  const { currentStep, prevStep, nextStep, resetAll, generatedArticle, generatedTitles, articleHistory, authUser, setAuthUser, authModalOpen, setAuthModalOpen } =
    useArticleStore();
  const { setTheme, resolvedTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [showSuperBot, setShowSuperBot] = useState(false);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const { hasCompleted, resetOnboarding } = useOnboardingStatus();
  const tutorialTriggeredRef = useRef(false);
  // Direction tracking: transitionPrevStep lags behind currentStep by one render via useEffect,
  // so direction is correctly computed during the render where the key changes.
  const [transitionPrevStep, setTransitionPrevStep] = useState(currentStep);
  const direction = currentStep > transitionPrevStep ? 1 : currentStep < transitionPrevStep ? -1 : 1;
  useEffect(() => {
    setTransitionPrevStep(currentStep);
  }, [currentStep]);
  // mounted: tracks hydration state for SSR-safe theme icon rendering

  const stepInfo = STEPS.find((s) => s.id === currentStep);
  const showWelcomeBanner = currentStep === 1 && generatedTitles.length === 0;

  // ── Auto-show tutorial for first-time users ───────────────────
  useEffect(() => {
    if (mounted && !tutorialTriggeredRef.current && !hasCompleted && articleHistory.length === 0) {
      tutorialTriggeredRef.current = true;
      const timer = setTimeout(() => setTutorialOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [mounted, hasCompleted, articleHistory.length]);

  // ── Logo pulse on initial load ──────────────────────────────────
  // Note: mounted state avoids hydration mismatch for theme icon
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Auto-check session on mount ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success && data.user) {
          setAuthUser({
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.name || undefined,
            avatarUrl: data.user.avatarUrl || undefined,
            subscriptionTier: data.user.subscriptionTier || 'free',
          });
        }
      } catch {
        // Ignore — user is not logged in
      }
    })();
  }, [setAuthUser]);

  // ── Scroll listener for header gradient border ──────────────────
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Mode handlers (must be before keyboard handler) ─────────────────
  const handleSelectMode = (mode: string) => {
    setSelectedMode(mode);
  };

  const handleBackToModes = useCallback(() => {
    setSelectedMode(null);
    resetAll();
  }, [resetAll]);

  // ── Keyboard navigation ─────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowRight' && selectedMode === 'article') {
          e.preventDefault();
          nextStep();
        } else if (e.key === 'ArrowLeft' && selectedMode === 'article') {
          e.preventDefault();
          prevStep();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedMode !== null) {
          handleBackToModes();
        } else {
          prevStep();
        }
      }
    },
    [nextStep, prevStep, selectedMode, handleBackToModes]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Theme toggle handler ────────────────────────────────────────
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const currentSubtitle = selectedMode
    ? MODE_TITLES[selectedMode] || 'Academic Literature Generator'
    : 'Academic Literature Generator';

  // Avoid hydration mismatch for theme icon
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50/50 via-white to-emerald-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/10">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl relative">
        {/* Animated gradient bottom border on scroll */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: isScrolled
              ? 'linear-gradient(90deg, transparent, #10b981, #14b8a6, #059669, transparent)'
              : 'none',
          }}
          initial={false}
          animate={{
            opacity: isScrolled ? 1 : 0,
          }}
          transition={{ duration: 0.4 }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <motion.div
                className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm btn-glow"
                animate={
                  mounted
                    ? {
                        scale: [1, 1.1, 1],
                      }
                    : {}
                }
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              >
                <GraduationCap className="size-4.5" />
              </motion.div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">
                  Mamah
                </h1>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {currentSubtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Back to Mode Selector */}
              {selectedMode !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToModes}
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline text-xs">Modes</span>
                </Button>
              )}
              {/* Help / Tutorial Button (Step 1 only, article mode) */}
              {selectedMode === 'article' && currentStep === 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTutorialOpen(true)}
                  className="size-9 text-muted-foreground hover:text-emerald-600"
                  aria-label="Open tutorial"
                >
                  <HelpCircle className="size-4" />
                </Button>
              )}

              {/* Auth Button / User Avatar */}
              {authUser ? (
                <div className="flex items-center gap-1.5">
                  {authUser.subscriptionTier === 'pro' && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5 py-0">
                      <Crown className="size-2.5 mr-0.5" />PRO
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/logout', { method: 'POST' });
                      } catch { /* ignore */ }
                      setAuthUser(null);
                      toast.success('Berhasil logout');
                    }}
                    className="size-9"
                    aria-label="Sign out"
                  >
                    <LogOut className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="text-muted-foreground hover:text-emerald-600 gap-1.5"
                >
                  <LogIn className="size-3.5" />
                  <span className="hidden sm:inline text-xs">Sign In</span>
                </Button>
              )}

              {/* History Sidebar */}
              <ArticleHistorySidebar />

              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="size-9 text-muted-foreground hover:text-foreground"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDark ? (
                    <motion.div
                      key="sun"
                      initial={{ rotate: -90, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      exit={{ rotate: 90, scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="size-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ rotate: 90, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      exit={{ rotate: -90, scale: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="size-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>

              {/* Citation Counter Pill (article mode only) */}
              {selectedMode === 'article' && generatedArticle && (
                <CitationCounter article={generatedArticle} />
              )}

              {/* Stats Dashboard Button (article mode only) */}
              {selectedMode === 'article' && generatedArticle && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStatsOpen(true)}
                  className="size-9 text-muted-foreground hover:text-emerald-600"
                  aria-label="Open article statistics"
                >
                  <BarChart3 className="size-4" />
                </Button>
              )}

              {selectedMode === 'article' && currentStep > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-4 sm:mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              )}
              {selectedMode === 'article' && (generatedArticle || currentStep > 1) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAll}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <RotateCcw className="size-4 sm:mr-1" />
                  <span className="hidden sm:inline">New Article</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Step Navigation (sticky mobile) — article mode only ── */}
      {selectedMode === 'article' && (
        <div className="sticky top-14 md:static z-40 border-b border-border/40 bg-white/80 dark:bg-slate-900/80 md:bg-white/50 md:dark:bg-slate-900/50 backdrop-blur-sm md:backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
            <StepNavigation currentStep={currentStep} />
          </div>
          {/* Global Progress Indicator */}
          <GlobalProgressIndicator currentStep={currentStep} />
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <AnimatePresence mode="wait">
            {/* ── Mode: null → Show Mode Selector ── */}
            {selectedMode === null && (
              <motion.div
                key="mode-selector"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="max-w-4xl mx-auto"
              >
                <WritingModeSelector onSelect={handleSelectMode} />
              </motion.div>
            )}

            {/* ── Mode: article → Show 5-Step Article Generator ── */}
            {selectedMode === 'article' && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: direction * 40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -direction * 40, scale: 0.98 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="space-y-6"
              >
                {/* Step Header — stagger: enters 50ms before content */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0 }}
                >
                  <StepHeader
                    step={currentStep}
                    title={stepInfo?.label || 'Getting Started'}
                    description={
                      currentStep === 1
                        ? 'Define your research topic through keywords, a title, or a research idea.'
                        : currentStep === 2
                          ? 'Search and select up to 50 academic references for your article.'
                          : currentStep === 3
                            ? 'Choose your research method and generate the full article.'
                            : currentStep === 4
                              ? 'Review your generated article in IMRAD format.'
                              : 'Polish and refine your article to publication-ready quality.'
                    }
                  />
                </motion.div>

                {/* Content — stagger: enters 50ms after header */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="space-y-6"
                >
                  <Separator className="opacity-50" />

                  {/* Welcome Banner (fresh state on Step 1) */}
                  {showWelcomeBanner && <WelcomeBanner />}

                  {/* Contextual Step Tips */}
                  <StepTipsBar step={currentStep} />

                {/* Step Content */}
                <Card className="border-border/40 shadow-sm bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden card-hover-lift transition-smooth">
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    {currentStep === 1 && <Step1Input />}
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        {/* Super Bot Toggle */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant={showSuperBot ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowSuperBot(true)}
                            className={!showSuperBot ? 'gap-1.5 text-muted-foreground hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700' : 'gap-1.5 bg-emerald-600 text-white'}
                          >
                            <Bot className="size-4" />
                            <span className="hidden sm:inline">Super Bot</span>
                          </Button>
                          <Button
                            variant={!showSuperBot ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowSuperBot(false)}
                            className={!showSuperBot ? 'gap-1.5 bg-emerald-600 text-white' : 'gap-1.5 text-muted-foreground hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700'}
                          >
                            <Library className="size-4" />
                            <span className="hidden sm:inline">AI Search</span>
                          </Button>
                          {showSuperBot && (
                            <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                              <Zap className="size-3 mr-1" />
                              Custom Engine — No AI per click
                            </Badge>
                          )}
                        </div>

                        {showSuperBot ? (
                          <SuperBotPanel />
                        ) : (
                          <Step2References />
                        )}
                      </div>
                    )}
                    {currentStep === 3 && <Step3Method />}
                    {currentStep === 4 && <Step4Output />}
                    {currentStep === 5 && <Step5Polish />}
                  </CardContent>
                </Card>
              </motion.div>
              </motion.div>
            )}

            {/* ── Mode: All non-article → Cicil Generator ── */}
            {selectedMode !== null && selectedMode !== 'article' && (
              <motion.div
                key={`cicil-${selectedMode}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="max-w-5xl mx-auto"
              >
                <CicilGenerator
                  mode={selectedMode as CicilWritingMode}
                  onBack={handleBackToModes}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keyboard navigation hint — article mode only */}
          {selectedMode === 'article' && (
            <div className="hidden lg:flex items-center justify-center gap-4 mt-6 text-[11px] text-muted-foreground/50">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/50 text-[10px] font-mono">
                  Ctrl
                </kbd>
                +
                <kbd className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/50 text-[10px] font-mono">
                  ←
                </kbd>
                /
                <kbd className="px-1.5 py-0.5 rounded border border-border/60 bg-muted/50 text-[10px] font-mono">
                  →
                </kbd>
                <span className="ml-0.5">Navigate steps</span>
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded border border-border/60 bg-muted/50 text-[10px] font-mono">
                  Esc
                </kbd>
                <span className="ml-0.5">Go back</span>
              </span>
            </div>
          )}
        </div>
      </main>

      {/* ── Auth Modal ──────────────────────────────────────────── */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setAuthUser({
            id: user.id,
            email: user.email,
            fullName: user.name || undefined,
            avatarUrl: user.avatarUrl || undefined,
            subscriptionTier: (user.subscriptionTier as 'free' | 'pro' | 'enterprise') || 'free',
          });
        }}
      />

      {/* ── Onboarding Tutorial ─────────────────────────────────── */}
      <OnboardingTutorial open={tutorialOpen} onOpenChange={setTutorialOpen} />

      {/* ── Stats Dashboard Dialog (article mode only) ── */}
      {selectedMode === 'article' && generatedArticle && (
        <StatsDashboard
          open={statsOpen}
          onOpenChange={setStatsOpen}
          article={generatedArticle}
        />
      )}

      {/* ── Word Count Goal Progress (footer, when article exists, article mode only) ── */}
      {selectedMode === 'article' && generatedArticle && (
        <WordCountGoalBar article={generatedArticle} />
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border/40 bg-white/50 dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          {/* Keyboard Shortcuts Collapsible (desktop: expanded, mobile: collapsed) */}
          <KeyboardShortcutsSection
            isOpen={shortcutsOpen}
            onToggle={() => setShortcutsOpen((v) => !v)}
          />

          <Separator className="opacity-40 mb-4" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            {/* Left: copyright & version */}
            <div className="flex items-center gap-2">
              <p>© 2025 Mamah</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                {APP_VERSION}
              </Badge>
            </div>

            {/* Center: made with love */}
            <p className="flex items-center gap-1">
              Made with{' '}
              <Heart className="size-3 text-red-400 fill-red-400" /> using{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Asisten Penulis</span>
            </p>

            {/* Right: links with hover effects */}
            <div className="flex items-center gap-3">
              <button
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
                onClick={() => {
                  resetOnboarding();
                  setTutorialOpen(true);
                }}
              >
                <HelpCircle className="size-3" />
                Tutorial
              </button>
              <button
                className="hover:text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 flex items-center gap-1 group"
                onClick={() => toast.info('This page is coming soon!')}
              >
                <Shield className="size-3 group-hover:scale-110 transition-transform duration-200" />
                <span className="group-hover:underline underline-offset-2">Privacy</span>
              </button>
              <button
                className="hover:text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 flex items-center gap-1 group"
                onClick={() => toast.info('This page is coming soon!')}
              >
                <FileCheck className="size-3 group-hover:scale-110 transition-transform duration-200" />
                <span className="group-hover:underline underline-offset-2">Terms</span>
              </button>
            </div>
          </div>

          {/* Quick Actions — mobile only */}
          <MobileQuickActions />
        </div>
      </footer>
    </div>
  );
}
