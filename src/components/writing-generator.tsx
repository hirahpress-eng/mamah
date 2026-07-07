'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Copy,
  Download,
  FileText,
  BookOpen,
  Target,
  GraduationCap,
  Award,
  ScrollText,
  Sparkles,
  Loader2,
  Check,
  PenLine,
  Settings2,
  FileOutput,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────

interface WritingGeneratorProps {
  mode: string;
  onBack: () => void;
}

type WritingMode = 'book' | 'proposal' | 'thesis' | 'scholarship' | 'paper';
type Step = 1 | 2 | 3;

// ─── Mode Config ───────────────────────────────────────────────────

const MODE_CONFIG: Record<
  WritingMode,
  {
    title: string;
    description: string;
    placeholder: string;
    descPlaceholder: string;
    icon: React.ElementType;
  }
> = {
  book: {
    title: 'Buku / Bab Buku',
    description: 'Tulis buku atau bab buku akademik',
    placeholder: 'Contoh: Pembangunan Berkelanjutan di Indonesia',
    descPlaceholder:
      'Jelaskan tema buku/bab, target pembaca, dan poin-poin utama yang ingin dibahas...',
    icon: BookOpen,
  },
  proposal: {
    title: 'Proposal Penelitian',
    description: 'Buat proposal riset yang komprehensif',
    placeholder: 'Contoh: Efektivitas Pembelajaran Berbasis AI',
    descPlaceholder:
      'Jelaskan latar belakang masalah, tujuan penelitian, dan variabel yang diteliti...',
    icon: Target,
  },
  thesis: {
    title: 'Skripsi / Tesis',
    description: 'Tulis skripsi atau tesis akademik',
    placeholder: 'Contoh: Analisis Sentimen Media Sosial Terhadap Kebijakan Pendidikan',
    descPlaceholder:
      'Jelaskan topik penelitian, metodologi yang diinginkan, dan batasan penelitian...',
    icon: GraduationCap,
  },
  scholarship: {
    title: 'Esai Beasiswa',
    description: 'Buat esai motivasi dan personal statement',
    placeholder: 'Contoh: Beasiswa Pendidikan Pascasarjana',
    descPlaceholder:
      'Ceritakan latar belakang, prestasi, motivasi, dan rencana studi Anda...',
    icon: Award,
  },
  paper: {
    title: 'Makalah',
    description: 'Tulis makalah kuliah yang terstruktur',
    placeholder: 'Contoh: Dampak Transformasi Digital Pada UMKM',
    descPlaceholder:
      'Jelaskan tema makalah, perspektif yang ingin dibahas, dan referensi yang tersedia...',
    icon: ScrollText,
  },
};

// ─── Step Definitions ──────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Input', icon: PenLine },
  { id: 2, label: 'Generate', icon: Settings2 },
  { id: 3, label: 'Output', icon: FileOutput },
] as const;

// ─── Engine Definitions ────────────────────────────────────────────

const ENGINES = [
  {
    id: 'alfa',
    label: 'Alfa',
    description: 'Kualitas tertinggi, kecepatan standar. Cocok untuk publikasi.',
  },
  {
    id: 'beta',
    label: 'Beta',
    description: 'Keseimbangan kualitas dan kecepatan. Untuk penggunaan umum.',
  },
  {
    id: 'caca',
    label: 'Caca',
    description: 'Kecepatan prioritas. Hasil cepat untuk draft awal.',
  },
];

// ─── Step Navigation ───────────────────────────────────────────────

function StepNav({
  currentStep,
  modeConfig,
}: {
  currentStep: Step;
  modeConfig: (typeof MODE_CONFIG)[WritingMode];
}) {
  return (
    <nav className="w-full" aria-label="Writing generation steps">
      <div className="flex items-center justify-between w-full">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`relative flex items-center justify-center size-10 rounded-xl transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                      : isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                        : 'bg-muted/60 text-muted-foreground/50'
                  }`}
                >
                  <Icon className="size-4" />
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 size-4 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                    >
                      <Check className="size-2.5" />
                    </motion.div>
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground/50'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4">
                  <div className="h-[2px] bg-border/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={false}
                      animate={{
                        width: isCompleted ? '100%' : isActive ? '50%' : '0%',
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Step 1: Input ─────────────────────────────────────────────────

function StepInput({
  config,
  title,
  description,
  keyPoints,
  onTitleChange,
  onDescriptionChange,
  onKeyPointsChange,
  onNext,
}: {
  config: (typeof MODE_CONFIG)[WritingMode];
  title: string;
  description: string;
  keyPoints: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onKeyPointsChange: (v: string) => void;
  onNext: () => void;
}) {
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {config.title}
          </h3>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>

      <Separator className="opacity-40" />

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="writing-title" className="text-sm font-medium">
          Judul / Topik <span className="text-destructive">*</span>
        </Label>
        <Input
          id="writing-title"
          placeholder={config.placeholder}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="bg-background/80"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="writing-desc" className="text-sm font-medium">
          Deskripsi / Ide Utama
        </Label>
        <Textarea
          id="writing-desc"
          placeholder={config.descPlaceholder}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
          className="bg-background/80 resize-none"
        />
      </div>

      {/* Key Points */}
      <div className="space-y-2">
        <Label htmlFor="writing-keypoints" className="text-sm font-medium">
          Poin Utama
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">
            (pisahkan dengan koma)
          </span>
        </Label>
        <Input
          id="writing-keypoints"
          placeholder="Contoh: analisis data, literatur review, metodologi kualitatif"
          value={keyPoints}
          onChange={(e) => onKeyPointsChange(e.target.value)}
          className="bg-background/80"
        />
      </div>

      {/* Next Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onNext}
          disabled={!title.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm shadow-emerald-500/20"
        >
          Lanjut
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Step 2: Generate ──────────────────────────────────────────────

function StepGenerate({
  engine,
  targetWords,
  onEngineChange,
  onTargetWordsChange,
  onGenerate,
  onBack,
  isGenerating,
  progress,
  title,
}: {
  engine: string;
  targetWords: number;
  onEngineChange: (v: string) => void;
  onTargetWordsChange: (v: number) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
  progress: number;
  title: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
          <Settings2 className="size-4" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Pengaturan Generate
          </h3>
          <p className="text-xs text-muted-foreground">
            Siap menghasilkan: &quot;{title}&quot;
          </p>
        </div>
      </div>

      <Separator className="opacity-40" />

      {/* AI Engine Selector */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Pilih AI Engine</Label>
        <RadioGroup
          value={engine}
          onValueChange={onEngineChange}
          className="grid gap-3 sm:grid-cols-3"
        >
          {ENGINES.map((eng) => (
            <label
              key={eng.id}
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                engine === eng.id
                  ? 'border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/20 shadow-sm'
                  : 'border-border/60 hover:border-border bg-background/50'
              }`}
            >
              <RadioGroupItem
                value={eng.id}
                className="mt-0.5"
                disabled={isGenerating}
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {eng.label}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {eng.description}
                </p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Word Count Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Target Jumlah Kata</Label>
          <Badge
            variant="outline"
            className="font-mono text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
          >
            {targetWords.toLocaleString('id-ID')} kata
          </Badge>
        </div>
        <Slider
          value={[targetWords]}
          onValueChange={(v) => onTargetWordsChange(v[0])}
          min={1000}
          max={15000}
          step={500}
          className="py-2"
          disabled={isGenerating}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
          <span>1.000</span>
          <span>5.000</span>
          <span>10.000</span>
          <span>15.000</span>
        </div>
      </div>

      {/* Generating Progress */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20 p-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-emerald-600 dark:text-emerald-400"
              >
                <Loader2 className="size-5" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Sedang menghasilkan tulisan...
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI Engine {engine.charAt(0).toUpperCase() + engine.slice(1)}{' '}
                  sedang memproses permintaan Anda
                </p>
                <Progress value={progress} className="mt-2 h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  {Math.round(progress)}%
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isGenerating}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </Button>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm shadow-emerald-500/20"
        >
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generate
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Step 3: Output ────────────────────────────────────────────────

function StepOutput({
  content,
  title,
  onCopy,
  onDownload,
  onBack,
}: {
  content: string;
  title: string;
  onCopy: () => void;
  onDownload: () => void;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <FileOutput className="size-4" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Hasil Tulisan</h3>
            <p className="text-xs text-muted-foreground">
              {wordCount.toLocaleString('id-ID')} kata — {title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? 'Tersalin!' : 'Salin'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="gap-1.5"
          >
            <Download className="size-3.5" />
            Unduh
          </Button>
        </div>
      </div>

      <Separator className="opacity-40" />

      {/* Content Display */}
      <div className="rounded-xl border border-border/60 bg-background/80 p-5 sm:p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {content.split('\n').map((paragraph, i) => {
            if (!paragraph.trim()) return <br key={i} />;
            // Detect headings (lines starting with #)
            if (paragraph.startsWith('# ')) {
              return (
                <h1
                  key={i}
                  className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0"
                >
                  {paragraph.replace('# ', '')}
                </h1>
              );
            }
            if (paragraph.startsWith('## ')) {
              return (
                <h2
                  key={i}
                  className="text-lg font-semibold text-foreground mt-5 mb-2"
                >
                  {paragraph.replace('## ', '')}
                </h2>
              );
            }
            if (paragraph.startsWith('### ')) {
              return (
                <h3
                  key={i}
                  className="text-base font-semibold text-foreground mt-4 mb-1.5"
                >
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            return (
              <p
                key={i}
                className="text-sm text-foreground/85 leading-relaxed mb-3"
              >
                {paragraph}
              </p>
            );
          })}
        </div>
      </div>

      {/* Back Button */}
      <div className="flex justify-start pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Pengaturan
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export default function WritingGenerator({
  mode,
  onBack,
}: WritingGeneratorProps) {
  const writingMode = mode as WritingMode;
  const config = MODE_CONFIG[writingMode];

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [engine, setEngine] = useState('alfa');
  const [targetWords, setTargetWords] = useState(5000);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedContent, setGeneratedContent] = useState('');

  // ── Generate handler ────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setProgress(0);

    // Simulate progress while waiting
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15 + 5;
      });
    }, 800);

    try {
      const res = await fetch('/api/writing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: writingMode,
          title,
          description,
          keyPoints,
          engine,
          targetWords,
        }),
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        throw new Error('API request failed');
      }

      const data = await res.json();
      setProgress(100);

      setTimeout(() => {
        setGeneratedContent(data.content || data.text || '');
        setCurrentStep(3);
        setIsGenerating(false);
        toast.success('Tulisan berhasil dihasilkan!');
      }, 500);
    } catch {
      clearInterval(progressInterval);
      setProgress(0);
      setIsGenerating(false);
      toast.error(
        'Gagal menghasilkan tulisan. Silakan coba lagi atau hubungi support.'
      );
      // Fallback demo content
      setGeneratedContent(
        generateFallbackContent(writingMode, title, description, keyPoints)
      );
      setCurrentStep(3);
      toast.info('Menampilkan contoh hasil sebagai demo.');
    }
  }, [writingMode, title, description, keyPoints, engine, targetWords]);

  // ── Copy handler ────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('Berhasil disalin ke clipboard!');
  }, [generatedContent]);

  // ── Download handler ────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || config.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File berhasil diunduh!');
  }, [generatedContent, title, config.title]);

  // ── Direction for animation ─────────────────────────────────
  const [prevStep, setPrevStep] = useState<Step>(1);
  const direction = currentStep > prevStep ? 1 : -1;
  const goToStep = (step: Step) => {
    setPrevStep(currentStep);
    setCurrentStep(step);
  };

  return (
    <div className="space-y-6">
      {/* Step Navigation */}
      <StepNav currentStep={currentStep} modeConfig={config} />

      {/* Content Area */}
      <Card className="border-border/40 shadow-sm bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 30 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {currentStep === 1 && (
                <StepInput
                  config={config}
                  title={title}
                  description={description}
                  keyPoints={keyPoints}
                  onTitleChange={setTitle}
                  onDescriptionChange={setDescription}
                  onKeyPointsChange={setKeyPoints}
                  onNext={() => goToStep(2)}
                />
              )}
              {currentStep === 2 && (
                <StepGenerate
                  engine={engine}
                  targetWords={targetWords}
                  onEngineChange={setEngine}
                  onTargetWordsChange={setTargetWords}
                  onGenerate={handleGenerate}
                  onBack={() => goToStep(1)}
                  isGenerating={isGenerating}
                  progress={progress}
                  title={title}
                />
              )}
              {currentStep === 3 && (
                <StepOutput
                  content={generatedContent}
                  title={title}
                  onCopy={handleCopy}
                  onDownload={handleDownload}
                  onBack={() => goToStep(2)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Fallback Content Generator ────────────────────────────────────

function generateFallbackContent(
  mode: WritingMode,
  title: string,
  description: string,
  keyPoints: string
): string {
  const points = keyPoints
    ? keyPoints.split(',').map((p) => p.trim()).filter(Boolean)
    : [];

  switch (mode) {
    case 'book':
      return `# ${title || 'Buku Akademik'}

## Pendahuluan

${description || 'Buku ini membahas topik penting dalam bidang akademik.'} Buku ini disusun untuk memberikan pemahaman yang komprehensif dan mendalam tentang topik yang diangkat, dengan pendekatan yang sistematis dan berbasis bukti ilmiah.

## Latar Belakang

Dalam perkembangan ilmu pengetahuan dan teknologi yang semakin pesat, kebutuhan akan literatur yang berkualitas tinggi menjadi semakin penting. Buku ini hadir untuk menjawab kebutuhan tersebut dengan menyajikan analisis yang mendalam dan pembahasan yang komprehensif.

${points.length > 0 ? `## Poin-Poin Pembahasan\n\n${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n` : ''}## Metode Penulisan

Buku ini disusun menggunakan metode penulisan akademik yang ketat, dengan mempertimbangkan berbagai sumber referensi yang relevan dan terpercaya.

## Kesimpulan

Buku ini diharapkan dapat memberikan kontribusi yang signifikan bagi pengembangan ilmu pengetahuan dan menjadi referensi yang berharga bagi para akademisi dan praktisi.`;

    case 'proposal':
      return `# ${title || 'Proposal Penelitian'}

## I. Pendahuluan

### 1.1 Latar Belakang

${description || 'Penelitian ini dilatarbelakangi oleh kebutuhan akan pemahaman yang lebih mendalam terhadap fenomena yang terjadi.'} Permasalahan ini menjadi semakin relevan seiring dengan perkembangan zaman dan kebutuhan akan solusi yang berbasis bukti ilmiah.

### 1.2 Rumusan Masalah

Berdasarkan latar belakang di atas, rumusan masalah dalam penelitian ini adalah:
1. Bagaimana kondisi terkini terkait topik yang diteliti?
2. Faktor-faktor apa yang mempengaruhi permasalahan tersebut?
3. Solusi apa yang dapat direkomendasikan?

${points.length > 0 ? `### 1.3 Poin Utama Penelitian\n\n${points.map((p) => `- ${p}`).join('\n')}\n\n` : ''}## II. Tinjauan Pustaka

Bagian ini membahas teori-teori dan penelitian terdahulu yang menjadi dasar penyusunan proposal penelitian ini.

## III. Metodologi Penelitian

Penelitian ini menggunakan pendekatan campuran (mixed methods) untuk memperoleh data yang komprehensif dan valid.

## IV. Timeline Penelitian

- Bulan 1-2: Persiapan dan pengumpulan literatur
- Bulan 3-4: Pengumpulan data lapangan
- Bulan 5-6: Analisis data
- Bulan 7: Penyusunan laporan`;

    case 'thesis':
      return `# ${title || 'Skripsi / Tesis'}

## BAB I: PENDAHULUAN

### 1.1 Latar Belakang Masalah

${description || 'Penelitian ini dilakukan untuk menjawab kebutuhan akademik dalam bidang yang dipilih.'} Permasalahan yang diangkat dalam penelitian ini memiliki signifikansi yang penting bagi perkembangan ilmu pengetahuan.

### 1.2 Rumusan Masalah

1. Apa saja faktor yang mempengaruhi fenomena yang diteliti?
2. Bagaimana hubungan antar variabel dalam penelitian ini?
3. Apa implikasi dari temuan penelitian ini?

### 1.3 Tujuan Penelitian

Penelitian ini bertujuan untuk:
- Menganalisis fenomena yang terkait dengan topik penelitian
- Mengidentifikasi faktor-faktor yang berpengaruh signifikan
- Memberikan rekomendasi berdasarkan temuan penelitian

${points.length > 0 ? `### 1.4 Poin Kunci\n\n${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\n` : ''}## BAB II: TINJAUAN PUSTAKA

### 2.1 Landasan Teori

Bagian ini menyajikan teori-teori yang menjadi dasar penelitian.

### 2.2 Penelitian Terdahulu

Review terhadap penelitian-penelitian sebelumnya yang relevan dengan topik penelitian ini.

## BAB III: METODOLOGI PENELITIAN

### 3.1 Desain Penelitian

Penelitian ini menggunakan desain kuantitatif dengan pendekatan survei.

### 3.2 Populasi dan Sampel

### 3.3 Teknik Pengumpulan Data

### 3.4 Teknik Analisis Data`;

    case 'scholarship':
      return `# ${title || 'Esai Beasiswa'}

## Personal Statement

${description || 'Saya percaya bahwa pendidikan adalah kunci untuk membuka potensi terbaik dalam diri setiap individu.'} Perjalanan akademik saya telah membentuk fondasi yang kuat dan motivasi yang mendalam untuk terus berkembang.

## Latar Belakang Akademik

Saya telah menempuh pendidikan dengan penuh dedikasi dan komitmen tinggi. Prestasi-prestasi yang telah diraih menjadi bukti nyata dari kemampuan dan ketekunan saya dalam mengejar keunggulan akademik.

${points.length > 0 ? `## Poin-Poin Keunggulan\n\n${points.map((p) => `- ${p}`).join('\n')}\n\n` : ''}## Motivasi dan Visi

Saya memiliki visi yang jelas untuk berkontribusi secara nyata bagi masyarakat dan bidang ilmu yang saya tekuni. Beasiswa ini akan menjadi jembatan yang menghubungkan aspirasi saya dengan kesempatan untuk mewujudkannya.

## Rencana Studi dan Kontribusi

Setelah menyelesaikan pendidikan, saya berencana untuk mengaplikasikan ilmu yang diperoleh guna memberikan dampak positif bagi lingkungan sekitar dan masyarakat luas.

## Penutup

Saya berharap esai ini dapat merepresentasikan semangat dan dedikasi saya. Terima kasih atas kesempatan yang diberikan.`;

    case 'paper':
      return `# ${title || 'Makalah Akademik'}

## I. Pendahuluan

### A. Latar Belakang

${description || 'Makalah ini disusun untuk membahas topik yang relevan dengan perkembangan terkini.'} Dalam konteks akademik, pemahaman yang mendalam terhadap topik ini menjadi sangat penting.

### B. Rumusan Masalah

1. Apa yang dimaksud dengan topik yang dibahas?
2. Bagaimana perkembangan dan tantangan yang dihadapi?
3. Apa solusi yang dapat direkomendasikan?

${points.length > 0 ? `### C. Poin Pembahasan\n\n${points.map((p) => `- ${p}`).join('\n')}\n\n` : ''}## II. Pembahasan

### A. Tinjauan Umum

Bagian ini membahas teori dan konsep dasar yang terkait dengan topik makalah.

### B. Analisis

Analisis mendalam terhadap permasalahan yang diangkat, didukung oleh data dan argumen yang logis.

### C. Temuan

Hasil dari analisis yang telah dilakukan, beserta implikasinya.

## III. Kesimpulan dan Saran

### A. Kesimpulan

Berdasarkan pembahasan yang telah dipaparkan, dapat disimpulkan beberapa hal penting terkait topik makalah ini.

### B. Saran

Rekomendasi untuk penelitian selanjutnya dan pihak-pihak terkait.

## Daftar Pustaka

- Referensi akademik yang relevan dengan topik pembahasan`;

    default:
      return `# ${title || 'Hasil Generate'}\n\n${description || 'Konten akan dihasilkan oleh AI Engine.'}`;
  }
}