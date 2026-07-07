'use client';

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  BookOpen,
  Library,
  FlaskConical,
  FileText,
  Wand2,
  ChevronLeft,
  ChevronDown,
  RotateCcw,
  GraduationCap,
  Sun,
  Moon,
  Sparkles,
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
  Crown,
  Bot,
  Zap,
  Globe,
  ArrowLeft,
  Quote,
  Star,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useArticleStore, type GeneratedArticle } from '@/store/article-store';
import { toast } from 'sonner';
import AuthModal from '@/components/auth-modal';
import PromoBanner from '@/components/promo-banner';
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
import ErrorBoundary from '@/components/error-boundary';
import MobileBottomNav from '@/components/mobile-bottom-nav';
import type { CicilWritingMode } from '@/lib/writing-flows';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// ─── Constants ────────────────────────────────────────────────────────

const APP_VERSION = 'v2.4.0';

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
  const progressPercent = Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100);

  return (
    <nav className="w-full" aria-label="Article generation steps">
      {/* Desktop horizontal stepper */}
      <div className="hidden md:flex items-center justify-between w-full">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isUpcoming = !isCompleted && !isActive;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => {
                  if (isCompleted || isActive) setCurrentStep(step.id);
                }}
                className={`flex flex-col items-center gap-2 group transition-all duration-300 ${
                  isCompleted || isActive
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {/* Step circle */}
                <div className="relative">
                  {/* Pulse ring for active step */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400/30" />
                  )}
                  <motion.div
                    className={`relative flex items-center justify-center size-11 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-white dark:bg-gray-900 ring-[2.5px] ring-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/25 scale-110'
                        : isCompleted
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-muted text-muted-foreground group-hover:ring-2 group-hover:ring-emerald-400/30 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    }`}
                    whileHover={isUpcoming ? { scale: 1.05 } : { scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {isCompleted ? (
                      <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isActive ? (
                      <Icon className="size-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </motion.div>
                </div>
                {/* Step label */}
                <span
                  className={`text-xs text-center leading-tight transition-colors duration-300 ${
                    isActive
                      ? 'font-bold text-emerald-700 dark:text-emerald-300'
                      : isCompleted
                        ? 'font-normal text-emerald-600 dark:text-emerald-400'
                        : 'font-medium text-muted-foreground group-hover:text-foreground/60'
                  }`}
                >
                  {step.label}
                </span>
              </button>
              {/* Connector line between steps */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-3 mt-[-1.5rem] relative">
                  {currentStep > step.id ? (
                    /* Completed connector: emerald gradient */
                    <motion.div
                      className="absolute inset-y-0 left-0 h-[2.5px] rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      initial={{ scaleX: 0, transformOrigin: 'left' }}
                      animate={{ scaleX: 1, transformOrigin: 'left' }}
                      transition={{ duration: 0.5, ease: 'easeInOut' }}
                    />
                  ) : (
                    /* Upcoming connector: dashed gray */
                    <div className="absolute inset-y-0 left-0 right-0 h-[2px] border-t-[2.5px] border-dashed border-muted-foreground/25" />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile compact stepper */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Langkah {currentStep}/5
          </span>
          <span className="text-xs text-muted-foreground">
            {STEPS[currentStep - 1]?.label}
          </span>
        </div>
        {/* Mini progress bar with emerald gradient */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </div>
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

// ─── Social Proof Section (Stats + Testimonials) ───────────────────

function SocialProofSection() {
  const stats = [
    { value: 11, suffix: '+', label: 'Mode Penulisan', display: '11+' },
    { value: 8, suffix: '+', label: 'Database Akademik', display: '8+' },
    { value: 7, suffix: 'th', label: 'Edition', display: 'APA 7th', prefix: 'Format ' },
    { value: 3, suffix: '', label: 'Export Format', display: 'PDF, DOCX, MD' },
  ];

  const testimonials = [
    {
      text: 'Mamah sangat membantu saya menyelesaikan skripsi dalam 2 minggu. Referensi yang dihasilkan sangat relevan dan artikelnya sudah siap publikasi.',
      author: 'Dr. Siti Nurhaliza',
      title: 'Dosen Universitas Indonesia',
      stars: 5,
    },
    {
      text: 'Sebagai peneliti, saya bisa menghemat waktu hingga 80% untuk menulis artikel jurnal. Kualitas tulisan sangat akademis dan terstruktur.',
      author: 'Ahmad Fauzi',
      title: 'Peneliti SINTA',
      stars: 5,
    },
    {
      text: 'Fitur penulisan cicil untuk buku sangat luar biasa. Setiap bab ditulis dengan konsisten dan sesuai standar penerbitan.',
      author: 'Prof. Budi Santoso',
      title: 'Penerbit Buku Akademik',
      stars: 5,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
      className="max-w-4xl mx-auto mt-12 sm:mt-16 space-y-10 sm:space-y-14"
    >
      {/* ── Stats Counter Row ── */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="glass-card rounded-xl p-4 sm:p-5 text-center"
            >
              <motion.p
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gradient-emerald"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
              >
                {stat.prefix && <span className="text-base sm:text-lg font-bold text-muted-foreground">{stat.prefix}</span>}
                {stat.display}
              </motion.p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Testimonial Cards ── */}
      <motion.div variants={fadeUp}>
        <h2 className="text-center text-lg sm:text-xl font-bold text-foreground mb-6 sm:mb-8">
          Dipercaya oleh Ribuan Penulis Akademik
        </h2>
        <p className="text-xs text-muted-foreground text-center -mt-1 mb-6 sm:mb-8">
          * Testimoni di bawah merupakan contoh ilustrasi
        </p>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              variants={fadeUp}
              custom={i}
              className="glass-card rounded-xl p-5 sm:p-6 flex flex-col gap-4"
            >
              {/* Quote Icon */}
              <Quote className="size-6 text-emerald-500/40 shrink-0" />

              {/* Testimonial Text */}
              <p className="text-sm leading-relaxed text-foreground/80 flex-1">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Author */}
              <div className="pt-2 border-t border-border/40">
                <p className="text-sm font-bold text-foreground">{t.author}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.title}</p>
              </div>

              {/* Star Rating */}
              <div className="flex gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    className={`size-3.5 ${si < t.stars ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}

// ─── How It Works Section ─────────────────────────────────────────

function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: FileText,
      title: 'Pilih Mode & Masukkan Topik',
      description: 'Pilih dari 12 mode penulisan akademik — skripsi, tesis, buku, artikel jurnal, dan lainnya. Masukkan judul atau kata kunci penelitian Anda.',
    },
    {
      number: '02',
      icon: Search,
      title: 'AI Cari & Analisis Referensi',
      description: 'Sistem AI menemukan hingga 50 referensi ilmiah relevan, menerjemahkan kata kunci, dan menyusun daftar pustaka APA 7th edition.',
    },
    {
      number: '03',
      icon: Wand2,
      title: 'Generate & Export Karya',
      description: 'AI menulis konten akademik berkualitas tinggi — Bab per Bab untuk karya panjang, atau full artikel IMRAD. Export ke PDF atau DOCX.',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto mt-12 sm:mt-16"
    >
      <div className="text-center mb-10">
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 mb-3">
          Cara Kerja
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          3 Langkah Mudah
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          Dari ide penelitian hingga karya akademik siap publikasi — semudah 1-2-3
        </p>
      </div>

      <div className="relative">
        {/* Vertical connector line (desktop only) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 via-teal-500/30 to-transparent -translate-x-1/2" />

        <div className="space-y-8 md:space-y-12">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isLeft = index % 2 === 0;

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                {/* Center dot on desktop */}
                <div className="hidden md:flex absolute left-1/2 top-6 -translate-x-1/2 size-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 items-center justify-center shadow-lg shadow-emerald-500/25 z-10">
                  <span className="text-white text-xs font-bold">{step.number}</span>
                </div>

                <div className={`md:w-[calc(50%-2.5rem)] ${isLeft ? 'md:mr-auto md:pr-0 md:text-right' : 'md:ml-auto md:pl-0 md:text-left'}`}>
                  <div className="glass-card rounded-2xl p-5 sm:p-6 group hover:shadow-lg hover:shadow-emerald-500/10 transition-shadow duration-300">
                    <div className={`flex items-center gap-3 mb-3 ${isLeft ? 'md:flex-row-reverse md:text-right' : ''}`}>
                      {/* Mobile number badge */}
                      <div className="md:hidden flex items-center justify-center size-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <StepIcon className="size-4" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────

function FAQSection() {
  const faqs = [
    {
      question: 'Apakah Mamah gratis digunakan?',
      answer: 'Ya! Mamah menyediakan paket gratis dengan batas generate per hari. Untuk kebutuhan lebih intensif, tersedia paket Pro dengan unlimited generation, prioritas AI engine, dan fitur eksklusif lainnya.',
    },
    {
      question: 'Berapa lama waktu yang dibutuhkan untuk generate satu artikel?',
      answer: 'Artikel jurnal IMRAD biasanya selesai dalam 1-3 menit, tergantung panjang dan kompleksitas topik. Untuk karya lebih panjang seperti skripsi atau buku, mode penulisan cicil memungkinkan Anda menulis Bab per Bab dengan kontrol penuh.',
    },
    {
      question: 'Apakah referensi yang dihasilkan valid dan bisa dipertanggungjawabkan?',
      answer: 'Mamah mencari referensi dari sumber ilmiah terpercaya. Namun, kami sangat menyarankan untuk selalu memverifikasi setiap referensi yang digunakan. Hasil generate sebaiknya ditinjau dan disesuaikan oleh penulis sebelum dipublikasikan.',
    },
    {
      question: 'Format apa saja yang didukung untuk export?',
      answer: 'Saat ini Mamah mendukung export ke PDF (dengan layout publikasi siap cetak) dan DOCX (format Microsoft Word yang mudah diedit lebih lanjut). Format APA 7th edition digunakan untuk sitasi dan daftar pustaka.',
    },
    {
      question: 'Apa perbedaan mode Artikel Jurnal dan mode Cicil (Skripsi/Tesis/Buku)?',
      answer: 'Mode Artikel Jurnal menggunakan alur 5 langkah (definisi riset → referensi → generate → review → polish) yang cocok untuk artikel IMRAD singkat. Mode Cicil dirancang untuk karya panjang — Anda menulis Bab per Bab secara berurutan dengan referensi yang konsisten di setiap bagian.',
    },
    {
      question: 'Apakah data dan konten saya aman?',
      answer: 'Keamanan data pengguna adalah prioritas kami. Semua data dienkripsi dan disimpan dengan aman. Konten yang Anda buat sepenuhnya milik Anda. Baca kebijakan privasi kami untuk informasi lengkap.',
    },
    {
      question: 'Bisakah saya menggunakan Mamah untuk bahasa selain Indonesia?',
      answer: 'Tentu! Mamah mendukung mode penulisan dalam Bahasa Indonesia, Bahasa Inggris, dan Bahasa Arab. Anda bisa memilih mode Buku Ilmiah English atau Buku Bahasa Arab untuk karya dalam bahasa tersebut.',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto mt-12 sm:mt-16"
    >
      <div className="text-center mb-8">
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 mb-3">
          FAQ
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Pertanyaan yang Sering Diajukan
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Temukan jawaban untuk pertanyaan umum tentang Mamah
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-0">
        {faqs.map((faq, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: index * 0.06 }}
          >
            <AccordionItem value={`faq-${index}`} className="border-border/50">
              <AccordionTrigger className="text-left text-sm sm:text-base font-semibold text-foreground hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-4 sm:py-5 gap-3">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        ))}
      </Accordion>
    </motion.section>
  );
}

// ─── Pricing Section ─────────────────────────────────────────────

function PricingSection() {
  const plans = [
    {
      name: 'Gratis',
      price: 'Rp 0',
      period: 'selamanya',
      description: 'Coba dulu, rasakan kualitasnya',
      icon: FileText,
      popular: false,
      features: [
        '3 generate per hari',
        'Mode Artikel Jurnal',
        'Pencarian referensi dasar',
        'Export PDF',
        'Format APA 7th Edition',
      ],
      cta: 'Mulai Gratis',
      ctaVariant: 'outline' as const,
    },
    {
      name: 'Pro',
      price: 'Rp 99K',
      period: '/bulan',
      description: 'Untuk mahasiswa & peneliti serius',
      icon: Crown,
      popular: true,
      features: [
        'Generate unlimited',
        'Semua 11 mode penulisan',
        '50 referensi per pencarian',
        'Export PDF, DOCX & Markdown',
        'Mode Cicil (Bab per Bab)',
        'Prioritas processing',
        'Fitur Reviewer Notes',
        'Export CSV referensi (SLR)',
      ],
      cta: 'Segera Hadir',
      ctaVariant: 'default' as const,
    },
    {
      name: 'Institusi',
      price: 'Custom',
      period: '',
      description: 'Untuk universitas & lembaga riset',
      icon: GraduationCap,
      popular: false,
      features: [
        'Semua fitur Pro',
        'Multi-user (10-100+)',
        'Dedicated support',
        'Template kustom',
        'Lisensi bulk discount',
        'Pelatihan penggunaan',
      ],
      cta: 'Hubungi Kami',
      ctaVariant: 'outline' as const,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6 }}
      className="max-w-5xl mx-auto mt-12 sm:mt-16"
    >
      {/* Section Header */}
      <div className="text-center mb-8 sm:mb-10">
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 mb-3">
          <Crown className="size-3.5 mr-1.5" />
          Harga
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Pilih Paket yang Tepat untuk Anda
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
          Mulai gratis, upgrade kapan saja. Tanpa biaya tersembunyi.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
        {plans.map((plan, index) => {
          const IconComponent = plan.icon;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.1 }}
              className={`relative rounded-2xl p-5 sm:p-6 flex flex-col ${
                plan.popular
                  ? 'glass-card ring-2 ring-emerald-500/50 dark:ring-emerald-400/40 shadow-lg shadow-emerald-500/10'
                  : 'glass-card'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                    Paling Populer
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`rounded-xl p-2.5 ${
                  plan.popular
                    ? 'bg-emerald-100 dark:bg-emerald-900/40'
                    : 'bg-muted/60'
                }`}>
                  <IconComponent className={`size-5 ${
                    plan.popular
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  plan.popular ? 'text-gradient-emerald' : 'text-foreground'
                }`}>
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                )}
              </div>

              {/* CTA Button */}
              <Button
                variant={plan.ctaVariant}
                className={`w-full mb-6 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20'
                    : ''
                }`}
                onClick={() => {
                  toast.info('Fitur pembayaran akan segera tersedia!');
                }}
              >
                {plan.cta}
              </Button>

              {/* Features List */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className={`size-4 shrink-0 mt-0.5 ${
                      plan.popular
                        ? 'text-emerald-500'
                        : 'text-emerald-500/70'
                    }`} />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Note */}
      <p className="text-center text-xs text-muted-foreground/70 mt-6 sm:mt-8">
        Pembayaran aman & terenkripsi. Bisa berhenti berlangganan kapan saja.
      </p>
    </motion.section>
  );
}

// ─── Welcome Banner Component (Premium Hero Section) ───────────────

function WelcomeBanner() {
  const features = [
    {
      icon: Sparkles,
      title: 'Generate Judul Penelitian',
      description: 'Dapatkan saran judul akademik berkualitas dari kata kunci atau ide Anda',
    },
    {
      icon: Search,
      title: 'Temukan Referensi Ilmiah',
      description: 'Cari dan kurasi hingga 50 referensi ilmiah dari database terpercaya',
    },
    {
      icon: FileText,
      title: 'Buat Artikel Jurnal',
      description: 'Artikel IMRAD lengkap yang disiapkan hingga siap publikasi',
    },
  ];

  const trustBadges = [
    { label: '12+ Mode Penulisan', icon: BookOpen },
    { label: 'Format APA 7th', icon: Shield },
    { label: 'Export DOCX & PDF', icon: FileCheck },
    { label: 'AI Multi-Engine', icon: Zap },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' as const },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative mb-6"
    >
      {/* Subtle radial gradient background */}
      <div
        className="absolute -inset-4 rounded-3xl opacity-60 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(16,185,129,0.08) 0%, rgba(13,148,136,0.04) 40%, transparent 70%)',
        }}
      />

      {/* Floating decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Floating book icon — top left */}
        <motion.div
          className="absolute top-2 left-[8%] sm:left-[12%]"
          animate={{ y: [0, -10, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' as const }}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/20 flex items-center justify-center">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400/50" />
          </div>
        </motion.div>

        {/* Floating graduation cap — top right */}
        <motion.div
          className="absolute top-6 right-[6%] sm:right-[10%]"
          animate={{ y: [0, -8, 0], rotate: [0, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' as const, delay: 1 }}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-100/50 dark:bg-teal-900/20 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400/50" />
          </div>
        </motion.div>

        {/* Floating pen — mid left */}
        <motion.div
          className="absolute top-1/2 left-[3%] sm:left-[5%] -translate-y-1/2"
          animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' as const, delay: 2 }}
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-amber-100/40 dark:bg-amber-900/15 flex items-center justify-center">
            <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400/40" />
          </div>
        </motion.div>

        {/* Floating sparkle — mid right */}
        <motion.div
          className="absolute top-[45%] right-[4%] sm:right-[7%]"
          animate={{ y: [0, -6, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.5 }}
        >
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-emerald-100/40 dark:bg-emerald-900/15 flex items-center justify-center">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400/40" />
          </div>
        </motion.div>

        {/* Floating globe — bottom left */}
        <motion.div
          className="absolute bottom-3 left-[10%] sm:left-[15%]"
          animate={{ y: [0, -9, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' as const, delay: 3 }}
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-blue-100/30 dark:bg-blue-900/15 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400/40" />
          </div>
        </motion.div>

        {/* Floating shield — bottom right */}
        <motion.div
          className="absolute bottom-5 right-[8%] sm:right-[14%]"
          animate={{ y: [0, -7, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' as const, delay: 1.5 }}
        >
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-purple-100/30 dark:bg-purple-900/15 flex items-center justify-center">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400/40" />
          </div>
        </motion.div>

        {/* Subtle particle dots */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`dot-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/25 dark:bg-emerald-500/15"
            style={{
              top: `${20 + i * 15}%`,
              left: `${15 + (i % 3) * 30}%`,
            }}
            animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.3, 1] }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut' as const,
              delay: i * 0.7,
            }}
          />
        ))}
      </div>

      <div className="relative text-center px-2 sm:px-4 py-8 sm:py-12">
        {/* Hero heading */}
        <motion.h2
          variants={fadeUp}
          className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gradient-emerald leading-tight"
        >
          Tulis Karya Akademik dengan AI
        </motion.h2>

        {/* Subheading */}
        <motion.p
          variants={fadeUp}
          className="mt-3 sm:mt-4 text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Dari ide hingga publikasi — 12 mode penulisan akademik yang didukung kecerdasan buatan
        </motion.p>

        {/* Feature cards */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-4xl mx-auto">
          {features.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="glass-card rounded-2xl p-5 sm:p-6 text-left group cursor-default"
              >
                {/* Icon in emerald circle */}
                <div className="flex items-center justify-center size-11 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 mb-3.5 transition-transform duration-300 group-hover:scale-110">
                  <FeatureIcon className="size-5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{feature.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Trust indicators row */}
        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
        >
          {trustBadges.map((badge) => {
            const BadgeIcon = badge.icon;
            return (
              <span
                key={badge.label}
                className="badge-gradient inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              >
                <BadgeIcon className="size-3.5" />
                {badge.label}
              </span>
            );
          })}
        </motion.div>

        {/* CTA button */}
        <motion.div variants={fadeUp} className="mt-8">
          <button
            className="btn-gradient btn-shine px-8 py-3 rounded-xl text-sm font-semibold shadow-lg"
            onClick={() => {
              // Scroll to writing mode selector below
              const el = document.getElementById('writing-modes');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="size-4" />
              Mulai Menulis Sekarang
            </span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Step Tips Component ──────────────────────────────────────────

const STEP_TIPS: Record<number, { icon: typeof Info; title: string; tips: string[] }> = {
  1: {
    icon: BookOpen,
    title: 'Tips Definisi Riset',
    tips: [
      'Gunakan kata kunci spesifik untuk saran judul yang lebih baik',
      'Coba tab Ide untuk masukan yang lebih kreatif dan eksploratif',
      'Jelajahi Template untuk topik riset populer agar cepat mulai',
      'Pilih minimal 3 kata kunci untuk hasil optimal',
    ],
  },
  2: {
    icon: Library,
    title: 'Tips Pemilihan Referensi',
    tips: [
      'Campurkan sumber: artikel jurnal, buku, dan sumber teori',
      'Prioritaskan publikasi terbaru (5 tahun terakhir) untuk relevansi',
      'Gunakan filter untuk mempersempit berdasarkan jenis, tahun, atau topik',
      'Pilih minimal 5 referensi untuk melanjutkan ke tahap generate',
    ],
  },
  3: {
    icon: FlaskConical,
    title: 'Tips Generate Artikel',
    tips: [
      'Literature Review direkomendasikan untuk sebagian besar artikel akademik',
      'Tambahkan instruksi khusus untuk output yang lebih terarah',
      'Generate artikel biasanya memakan waktu 1-3 menit',
      'Periksa referensi Anda sebelum generate untuk hasil terbaik',
    ],
  },
  4: {
    icon: FileText,
    title: 'Tips Review Artikel',
    tips: [
      'Gunakan Ctrl+F untuk mencari dalam konten artikel',
      'Periksa Daftar Isi untuk status kelengkapan setiap bagian',
      'Buka setiap bagian untuk review detail',
      'Export ke DOCX, PDF, atau Markdown untuk pengeditan offline',
    ],
  },
  5: {
    icon: Wand2,
    title: 'Tips Polish',
    tips: [
      'Gunakan Auto-Polish untuk mengaktifkan semua perbaikan sekaligus',
      'Bandingkan sebelum/sesudah untuk melihat peningkatan kualitas',
      'Setiap proses polish membangun versi sebelumnya',
      'Export artikel polish akhir ke format yang Anda inginkan',
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
                {isExpanded ? 'Sembunyikan' : 'Tampilkan Tips'}
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
    label: 'Langkah berikutnya',
    available: true,
  },
  {
    keys: ['Ctrl', '←'],
    label: 'Langkah sebelumnya',
    available: true,
  },
  {
    keys: ['Esc'],
    label: 'Kembali',
    available: true,
  },
  {
    keys: ['Ctrl', 'F'],
    label: 'Cari dalam artikel',
    available: 'Langkah 4-5',
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
          toast.success('Artikel baru dimulai');
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
          toast.info('Lihat riwayat artikel di sidebar');
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
      <ErrorBoundary>
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="glass-card sticky top-0 z-50 w-full relative rounded-none">
        {/* Emerald gradient bottom border — always visible, intensifies on scroll */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] transition-opacity duration-400"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #10b981 20%, #14b8a6 50%, #059669 80%, transparent 100%)',
            opacity: isScrolled ? 0.9 : 0.35,
          }}
        />
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14">
            {/* Logo + App Name */}
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Mamah"
                width={32}
                height={32}
                className="rounded-lg shadow-sm"
                priority
              />
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold tracking-tight leading-none text-gradient-emerald">
                  Mamah
                </h1>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {currentSubtitle}
                </p>
              </div>
            </div>
            {/* Action buttons — grouped by role */}
            <div className="flex items-center gap-1">
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
                  <span className="hidden sm:inline text-xs text-muted-foreground max-w-[120px] truncate" title={authUser.email}>
                    {authUser.fullName || authUser.email}
                  </span>
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
                  <span className="hidden sm:inline">Kembali</span>
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

      {/* ── Promo Banner ─────────────────────────────────────────── */}
      <PromoBanner onCtaClick={() => setAuthModalOpen(true)} />

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
      <main className="flex-1 pb-20 lg:pb-0">
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
                <div id="writing-modes">
                  <WritingModeSelector onSelect={handleSelectMode} />
                </div>
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
                    title={stepInfo?.label || 'Memulai'}
                    description={
                      currentStep === 1
                        ? 'Tentukan topik riset Anda melalui kata kunci, judul, atau ide penelitian.'
                        : currentStep === 2
                          ? 'Cari dan pilih hingga 50 referensi akademik untuk artikel Anda.'
                          : currentStep === 3
                            ? 'Pilih metode riset dan generate artikel lengkap.'
                            : currentStep === 4
                              ? 'Tinjau artikel yang dihasilkan dalam format IMRAD.'
                              : 'Polish dan sempurnakan artikel Anda hingga siap publikasi.'
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
                              Mesin Kustom — Tanpa AI per klik
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
                <span className="ml-0.5">Kembali</span>
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

      {/* ── Social Proof Section (landing page only) ── */}
      {selectedMode === null && <SocialProofSection />}

      {/* ── How It Works Section (landing page only) ── */}
      {selectedMode === null && <HowItWorksSection />}

      {/* ── Pricing Section (landing page only) ── */}
      {selectedMode === null && <PricingSection />}

      {/* ── FAQ Section (landing page only) ── */}
      {selectedMode === null && <FAQSection />}

      {/* ── Word Count Goal Progress (footer, when article exists, article mode only) ── */}
      {selectedMode === 'article' && generatedArticle && (
        <WordCountGoalBar article={generatedArticle} />
      )}

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="mt-auto glass-card rounded-none border-t-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          {/* Keyboard Shortcuts Collapsible (desktop: expanded, mobile: collapsed) */}
          <KeyboardShortcutsSection
            isOpen={shortcutsOpen}
            onToggle={() => setShortcutsOpen((v) => !v)}
          />

          <div className="divider-gradient" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            {/* Left: copyright & version */}
            <div className="flex items-center gap-2">
              <p>© {new Date().getFullYear()} <span className="font-semibold text-foreground">HirahPress</span>. Hak cipta dilindungi.</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                {APP_VERSION}
              </Badge>
            </div>

            {/* Center: branding */}
            <p className="flex items-center gap-1">
              Dibuat dengan{' '}
              <Heart className="size-3 text-red-400 fill-red-400" /> oleh{' '}
              <span className="font-semibold text-gradient-emerald">Mamah</span>
            </p>

            {/* Right: links */}
            <div className="flex items-center gap-4">
              <button
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
                onClick={() => setTutorialOpen(true)}
              >
                <HelpCircle className="size-3" />
                Bantuan
              </button>
              <Link
                href="/privasi"
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                <Shield className="size-3" />
                Kebijakan Privasi
              </Link>
              <Link
                href="/ketentuan"
                className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
              >
                <FileCheck className="size-3" />
                Ketentuan Layanan
              </Link>
            </div>
          </div>

          {/* Quick Actions — mobile only */}
          <MobileQuickActions />
        </div>
      </footer>

      {/* ── Mobile Bottom Navigation ──────────────────────────────── */}
      <MobileBottomNav
        onHome={selectedMode !== null ? handleBackToModes : () => {}}
        onHistory={() => {
          const historyBtn = document.querySelector('[aria-label="Article history"]') as HTMLButtonElement | null;
          if (historyBtn) historyBtn.click();
        }}
        onThemeToggle={toggleTheme}
        isDark={isDark}
        isLoggedIn={!!authUser}
        onAuth={() => setAuthModalOpen(true)}
      />

      </ErrorBoundary>
    </div>
  );
}
