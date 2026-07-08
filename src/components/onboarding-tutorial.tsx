'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Library,
  FlaskConical,
  FileText,
  Wand2,
  ChevronRight,
  ChevronLeft,
  X,
  GraduationCap,
  Sparkles,
  BookMarked,
  PenTool,
  Download,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// ─── Types ──────────────────────────────────────────────────────────

interface TutorialStep {
  id: number;
  icon: typeof BookOpen;
  title: string;
  description: string;
  highlights: string[];
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const ONBOARDING_KEY = 'scholargen_onboarding_completed';

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    icon: BookOpen,
    title: 'Tentukan Riset Anda',
    description:
      'Mulai dengan menentukan topik riset Anda. Anda bisa memasukkan kata kunci, judul, atau ide riset lengkap — Mamah akan membantu menghasilkan sisanya.',
    highlights: [
      'Mode Kata Kunci: Masukkan 5 kata kunci untuk mendapatkan 5 saran judul',
      'Mode Judul: Tempelkan judul untuk mengekstrak kata kunci yang relevan',
      'Mode Ide: Jelaskan ide Anda untuk mendapatkan kata kunci dan judul',
      'Jelajahi Templat Riset yang sudah tersedia untuk memulai dengan cepat',
    ],
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-500',
  },
  {
    id: 2,
    icon: Library,
    title: 'Temukan Referensi',
    description:
      'Cari dan kurasi hingga 50 referensi akademis. Filter berdasarkan jenis, cari dalam hasil, dan pilih sumber yang paling relevan untuk artikel Anda.',
    highlights: [
      'Pencarian berbasis AI menghasilkan berbagai jenis referensi',
      'Filter berdasarkan sumber Scopus, SINTA, Buku, dan Teori',
      'Pilih semua atau pilih referensi individual',
      'Targetkan campuran seimbang karya terbaru dan fundamental',
    ],
    accentColor: 'text-teal-600 dark:text-teal-400',
    gradientFrom: 'from-teal-500',
    gradientTo: 'to-cyan-500',
  },
  {
    id: 3,
    icon: FlaskConical,
    title: 'Hasilkan Artikel',
    description:
      'Pilih metode riset Anda dan hasilkan artikel berstruktur IMRAD lengkap. AI menulis setiap bagian berdasarkan referensi dan instruksi Anda.',
    highlights: [
      '7 metode riset termasuk Tinjauan Pustaka dan Meta-Analisis',
      'Tambahkan instruksi kustom untuk output yang lebih tepat sasaran',
      'Pelacakan progres animasi saat penghasilan berlangsung',
      'Artikel hingga 7.750 kata dengan struktur IMRAD yang tepat',
    ],
    accentColor: 'text-cyan-600 dark:text-cyan-400',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-emerald-500',
  },
  {
    id: 4,
    icon: FileText,
    title: 'Tinjau & Ekspor',
    description:
      'Tinjau artikel yang dihasilkan bagian per bagian. Periksa jumlah kata, cari dalam konten, dan ekspor dalam format pilihan Anda.',
    highlights: [
      'Daftar Isi dengan indikator penyelesaian',
      'Cari dalam konten artikel dengan Ctrl+F',
      'Jumlah kata per bagian dengan bilah progres',
      'Ekspor ke DOCX, PDF, Markdown, atau teks biasa',
    ],
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-green-500',
  },
  {
    id: 5,
    icon: Wand2,
    title: 'Poles & Terbitkan',
    description:
      'Sempurnakan artikel Anda hingga kualitas publikasi. Konfigurasi 8 opsi polesan, bandingkan sebelum/sesudah, dan ekspor versi akhir.',
    highlights: [
      '8 opsi polesan yang dapat dikonfigurasi untuk penyempurnaan tertarget',
      'Perbandingan sebelum/sesudah dengan sorotan perubahan',
      'Poles Otomatis untuk penyempurnaan lengkap satu klik',
      'Cincin skor kualitas dan metrik kesiapan publikasi',
    ],
    accentColor: 'text-teal-600 dark:text-teal-400',
    gradientFrom: 'from-teal-500',
    gradientTo: 'to-emerald-600',
  },
];

// ─── Slide Animation Variants ──────────────────────────────────────

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.95,
  }),
};

// ─── Icon Illustration Component ────────────────────────────────────

function StepIllustration({ step }: { step: TutorialStep }) {
  const Icon = step.icon;

  return (
    <motion.div
      key={step.id}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' as const }}
      className="relative flex items-center justify-center mx-auto"
    >
      {/* Outer gradient ring */}
      <div
        className={`absolute size-28 sm:size-32 rounded-full bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} opacity-15 blur-xl`}
      />
      {/* Middle circle */}
      <motion.div
        className={`absolute size-24 sm:size-28 rounded-full bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} opacity-20`}
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(16, 185, 129, 0.2)',
            '0 0 30px 10px rgba(16, 185, 129, 0.08)',
            '0 0 0 0 rgba(16, 185, 129, 0.2)',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
      />
      {/* Inner circle with icon */}
      <div
        className={`relative size-20 sm:size-24 rounded-2xl bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} flex items-center justify-center shadow-lg`}
      >
        <div className="absolute inset-1 rounded-xl bg-white/20 backdrop-blur-sm" />
        <Icon className="size-10 sm:size-12 text-white relative z-10" />
      </div>
      {/* Floating decorative sparkles */}
      {[Sparkles, Lightbulb, PenTool].map((SparkleIcon, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: `${15 + i * 28}%`,
            left: i === 0 ? '-5%' : i === 1 ? '105%' : `${50 + (i % 2 === 0 ? -15 : 15)}%`,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          }}
        >
          <SparkleIcon className="size-3.5 text-emerald-400 dark:text-emerald-500" />
        </motion.div>
      ))}
      {/* Step number badge */}
      <div className="absolute -bottom-2 -right-2 flex items-center justify-center size-8 rounded-full bg-white dark:bg-slate-800 border-2 border-emerald-500 shadow-sm">
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          {step.id}/5
        </span>
      </div>
    </motion.div>
  );
}

// ─── Progress Dots Component ────────────────────────────────────────

function ProgressDots({ current, total, onDotClick }: { current: number; total: number; onDotClick: (index: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <motion.button
            onClick={() => onDotClick(i)}
            className={`relative rounded-full transition-all duration-300 ${
              i === current
                ? 'w-8 h-3'
                : 'size-3'
            }`}
            animate={{
              backgroundColor:
                i === current
                  ? 'rgb(16, 185, 129)'
                  : i < current
                    ? 'rgb(16, 185, 129)'
                    : 'rgb(203, 213, 225)',
            }}
            whileHover={{ scale: 1.2 }}
            aria-label={`Ke langkah ${i + 1}`}
          >
            {i === current && (
              <motion.div
                className="absolute inset-0 rounded-full"
                layoutId="progress-dot"
                style={{ backgroundColor: 'rgb(16, 185, 129)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {i < current && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <svg
                  className="size-2 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
            )}
          </motion.button>
          {i < total - 1 && (
            <div className="w-4 sm:w-6 h-0.5 bg-border rounded-full" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main OnboardingTutorial Component ──────────────────────────────

interface OnboardingTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingTutorial({ open, onOpenChange }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const totalSteps = TUTORIAL_STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const step = TUTORIAL_STEPS[currentStep];

  const handleComplete = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
    onOpenChange(false);
    // Reset step for next time
    requestAnimationFrame(() => setCurrentStep(0));
  }, [dontShowAgain, onOpenChange]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete();
    } else {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, handleComplete]);

  const handlePrev = useCallback(() => {
    if (!isFirstStep) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const handleDotClick = useCallback((index: number) => {
    if (index !== currentStep) {
      setDirection(index > currentStep ? 1 : -1);
      setCurrentStep(index);
    }
  }, [currentStep]);

  // Reset to first step when dialog opens
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setCurrentStep(0));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg p-0 overflow-hidden border-0 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Gradient top bar */}
        <div
          className={`h-1.5 bg-gradient-to-r ${step.gradientFrom} ${step.gradientTo}`}
        />

        {/* Screen reader accessible title */}
        <DialogTitle className="sr-only">
          Tutorial Mamah — Langkah {currentStep + 1} dari {totalSteps}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {step.title}: {step.description}
        </DialogDescription>

        <div className="px-5 sm:px-6 pt-5 pb-0">
          {/* Close button (top-right) */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 size-7 flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
            aria-label="Tutup tutorial"
          >
            <X className="size-4" />
          </button>

          {/* Illustration */}
          <div className="flex justify-center mb-5 mt-2">
            <StepIllustration step={step} />
          </div>
        </div>

        {/* Step content with animated transitions */}
        <div className="px-5 sm:px-6 overflow-hidden relative" style={{ minHeight: '220px' }}>
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="space-y-4"
            >
              {/* Step label */}
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <GraduationCap className="size-3.5" />
                  Tutorial — Langkah {currentStep + 1} dari {totalSteps}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-center tracking-tight">
                <span
                  className={`bg-gradient-to-r ${step.gradientFrom} ${step.gradientTo} bg-clip-text text-transparent`}
                >
                  {step.title}
                </span>
              </h2>

              {/* Description */}
              <p className="text-sm text-center text-muted-foreground leading-relaxed max-w-md mx-auto">
                {step.description}
              </p>

              {/* Highlight cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {step.highlights.map((highlight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/30"
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-xs text-foreground/80 leading-relaxed">
                      {highlight}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer area */}
        <div className="px-5 sm:px-6 pt-4 pb-5 sm:pb-6 space-y-4 mt-2">
          {/* Progress dots */}
          <ProgressDots current={currentStep} total={totalSteps} onDotClick={handleDotClick} />

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Previous / Skip */}
            <div className="flex items-center gap-2">
              {isFirstStep ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Lewati Tutorial
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                  Kembali
                </Button>
              )}
            </div>

            {/* Right: Next / Got it */}
            <Button
              onClick={handleNext}
              className={`bg-gradient-to-r ${step.gradientFrom} ${step.gradientTo} hover:opacity-90 text-white shadow-md transition-all`}
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="size-4" />
                  Mengerti!
                </>
              ) : (
                <>
                  Selanjutnya
                  <ChevronRight className="size-4" />
                </>
              )}
            </Button>
          </div>

          {/* Don't show again checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none justify-center">
            <Checkbox
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="size-3.5"
            />
            <span className="text-xs text-muted-foreground">
              Jangan tampilkan tutorial ini lagi
            </span>
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Hook for checking onboarding status ────────────────────────────

export function useOnboardingStatus() {
  const [hasCompleted, setHasCompleted] = useState(true); // default true to prevent flash

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY) === 'true';
    const id = requestAnimationFrame(() => setHasCompleted(completed));
    return () => cancelAnimationFrame(id);
  }, []);

  const markCompleted = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setHasCompleted(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setHasCompleted(false);
  }, []);

  return { hasCompleted, markCompleted, resetOnboarding };
}
