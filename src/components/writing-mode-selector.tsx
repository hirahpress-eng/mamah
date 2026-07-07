'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  BookOpen,
  Target,
  GraduationCap,
  Award,
  ScrollText,
  Sparkles,
  Globe,
  Calculator,
  Library,
  Languages,
  BookMarked,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ─── Types ─────────────────────────────────────────────────────────

interface WritingModeSelectorProps {
  onSelect: (mode: string) => void;
}

interface WritingMode {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: { label: string; variant: 'popular' | 'new' };
  gradient: string;
  iconBg: string;
  iconColor: string;
  borderHover: string;
  featured?: boolean;
  category?: string;
}

// ─── Mode Definitions ──────────────────────────────────────────────

const WRITING_MODES: WritingMode[] = [
  // ── ARTIKEL (Preserved — uses 5-step article flow) ──
  {
    id: 'article',
    title: 'Artikel Jurnal',
    description:
      'Artikel ilmiah dengan struktur IMRAD lengkap, referensi Scopus, siap publikasi. Mencicil: Abstrak → Pendahuluan → Metode → Hasil & Diskusi → Kesimpulan → Bibliografi',
    icon: FileText,
    badge: { label: 'Popular', variant: 'popular' },
    gradient:
      'from-emerald-50 via-emerald-50/50 to-teal-50/40 dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-teal-950/20',
    iconBg:
      'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25',
    iconColor: 'text-white',
    borderHover: 'hover:border-emerald-400/60 dark:hover:border-emerald-600/60',
    featured: true,
    category: 'Artikel',
  },
  // ── SKRIPSI / TESIS / DISERTASI ──
  {
    id: 'skripsi',
    title: 'Skripsi (S1)',
    description:
      'BAB 1-5 + Referensi, 5-7 sub-tahapan per BAB. Latar belakang, tinjauan pustaka, metodologi, hasil, kesimpulan.',
    icon: GraduationCap,
    badge: { label: 'Baru', variant: 'new' },
    gradient:
      'from-amber-50 via-amber-50/50 to-orange-50/40 dark:from-amber-950/30 dark:via-amber-950/15 dark:to-orange-950/20',
    iconBg:
      'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/25',
    iconColor: 'text-white',
    borderHover:
      'hover:border-amber-400/60 dark:hover:border-amber-600/60',
    category: 'Akademik',
  },
  {
    id: 'tesis',
    title: 'Tesis (S2)',
    description:
      'BAB 1-5 + Referensi, 5-8 sub-tahapan per BAB. Lebih mendalam dari skripsi dengan analisis model dan studi literatur sistematis.',
    icon: GraduationCap,
    gradient:
      'from-orange-50 via-orange-50/50 to-red-50/40 dark:from-orange-950/30 dark:via-orange-950/15 dark:to-red-950/20',
    iconBg:
      'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/25',
    iconColor: 'text-white',
    borderHover:
      'hover:border-orange-400/60 dark:hover:border-orange-600/60',
    category: 'Akademik',
  },
  {
    id: 'disertasi',
    title: 'Disertasi (S3)',
    description:
      'BAB 1-5 + Referensi, 8-11 sub-tahapan per BAB. Penelitian orisinal paling komprehensif dengan analisis mediasi/moderasi.',
    icon: BookMarked,
    gradient:
      'from-red-50 via-red-50/50 to-rose-50/40 dark:from-red-950/30 dark:via-red-950/15 dark:to-rose-950/20',
    iconBg:
      'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/25',
    iconColor: 'text-white',
    borderHover:
      'hover:border-red-400/60 dark:hover:border-red-600/60',
    category: 'Akademik',
  },
  // ── BUKU ──
  {
    id: 'buku-id',
    title: 'Buku Ilmiah Indonesia',
    description:
      'Buku akademik berbahasa Indonesia. Kata pengantar, BAB 1-5, daftar pustaka. Mencicil per sub-bab maks 1500 kata.',
    icon: BookOpen,
    gradient:
      'from-blue-50 via-blue-50/50 to-sky-50/40 dark:from-blue-950/30 dark:via-blue-950/15 dark:to-sky-950/20',
    iconBg:
      'bg-gradient-to-br from-blue-500 to-sky-600 shadow-blue-500/25',
    iconColor: 'text-white',
    borderHover: 'hover:border-blue-400/60 dark:hover:border-blue-600/60',
    category: 'Buku',
  },
  {
    id: 'buku-en',
    title: 'Buku Ilmiah English',
    description:
      'Academic book in English. Preface, Chapters 1-5, References. Professional English academic writing.',
    icon: Globe,
    gradient:
      'from-sky-50 via-sky-50/50 to-cyan-50/40 dark:from-sky-950/30 dark:via-sky-950/15 dark:to-cyan-950/20',
    iconBg:
      'bg-gradient-to-br from-sky-500 to-cyan-600 shadow-sky-500/25',
    iconColor: 'text-white',
    borderHover: 'hover:border-sky-400/60 dark:hover:border-sky-600/60',
    category: 'Buku',
  },
  {
    id: 'buku-arab',
    title: 'Buku Bahasa Arab',
    description:
      'كتاب باللغة العربية — Arabic academic book. Pendahuluan, al-Fashl, al-Khatimah.',
    icon: Languages,
    gradient:
      'from-teal-50 via-teal-50/50 to-emerald-50/40 dark:from-teal-950/30 dark:via-teal-950/15 dark:to-emerald-950/20',
    iconBg:
      'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25',
    iconColor: 'text-white',
    borderHover: 'hover:border-teal-400/60 dark:hover:border-teal-600/60',
    category: 'Buku',
  },
  {
    id: 'buku-eksakta',
    title: 'Buku Eksakta/Matematika',
    description:
      'Buku sains, matematika, bidang eksakta. Definisi, teorema, proof, contoh numerik. Notasi matematika formal.',
    icon: Calculator,
    gradient:
      'from-violet-50 via-violet-50/50 to-purple-50/40 dark:from-violet-950/30 dark:via-violet-950/15 dark:to-purple-950/20',
    iconBg:
      'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/25',
    iconColor: 'text-white',
    borderHover:
      'hover:border-violet-400/60 dark:hover:border-violet-600/60',
    category: 'Buku',
  },
  {
    id: 'buku-keislaman',
    title: 'Buku Keislaman',
    description:
      'Kajian keislaman: Al-Quran, Hadits, Fiqih, perspektif ulama & mazhab. Tafsir tematik dan analisis komparatif.',
    icon: Library,
    gradient:
      'from-emerald-50 via-emerald-50/50 to-green-50/40 dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-green-950/20',
    iconBg:
      'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/25',
    iconColor: 'text-white',
    borderHover:
      'hover:border-green-400/60 dark:hover:border-green-600/60',
    category: 'Buku',
  },
  // ── LAINNYA ──
  {
    id: 'proposal',
    title: 'Proposal Penelitian',
    description:
      'BAB I-III + Referensi. Latar belakang, tinjauan pustaka, metodologi, jadwal Gantt chart, anggaran biaya.',
    icon: Target,
    gradient:
      'from-rose-50 via-rose-50/50 to-pink-50/40 dark:from-rose-950/30 dark:via-rose-950/15 dark:to-pink-950/20',
    iconBg: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25',
    iconColor: 'text-white',
    borderHover: 'hover:border-rose-400/60 dark:hover:border-rose-600/60',
    category: 'Lainnya',
  },
  {
    id: 'scholarship',
    title: 'Esai Beasiswa',
    description:
      'Personal statement, motivasi, visi, kontribusi masa depan. Persuasif dan memikat untuk pengajuan beasiswa.',
    icon: Award,
    gradient:
      'from-pink-50 via-pink-50/50 to-fuchsia-50/40 dark:from-pink-950/30 dark:via-pink-950/15 dark:to-fuchsia-950/20',
    iconBg:
      'bg-gradient-to-br from-pink-500 to-fuchsia-600 shadow-pink-500/25',
    iconColor: 'text-white',
    borderHover:
      'hover:border-pink-400/60 dark:hover:border-pink-600/60',
    category: 'Lainnya',
  },
  {
    id: 'paper',
    title: 'Makalah',
    description:
      'BAB I-III + Referensi. Pendahuluan, pembahasan, kesimpulan. Format rapi untuk tugas akademik.',
    icon: ScrollText,
    gradient:
      'from-cyan-50 via-cyan-50/50 to-teal-50/40 dark:from-cyan-950/30 dark:via-cyan-950/15 dark:to-teal-950/20',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-600 shadow-cyan-500/25',
    iconColor: 'text-white',
    borderHover: 'hover:border-cyan-400/60 dark:hover:border-cyan-600/60',
    category: 'Lainnya',
  },
];

// ─── Badge Component ───────────────────────────────────────────────

function ModeBadge({
  badge,
}: {
  badge: { label: string; variant: 'popular' | 'new' };
}) {
  if (badge.variant === 'popular') {
    return (
      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-2 py-0 border-0 shadow-sm">
        <Sparkles className="size-2.5 mr-1" />
        {badge.label}
      </Badge>
    );
  }
  return (
    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] px-2 py-0 border-0 shadow-sm">
      {badge.label}
    </Badge>
  );
}

// ─── Mode Card ─────────────────────────────────────────────────────

function ModeCard({
  mode,
  index,
  onSelect,
}: {
  mode: WritingMode;
  index: number;
  onSelect: (mode: string) => void;
}) {
  const Icon = mode.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={mode.featured ? 'col-span-2 md:col-span-1 lg:col-span-2' : ''}
    >
      <Card
        onClick={() => onSelect(mode.id)}
        className={`group relative cursor-pointer border-border/40 bg-gradient-to-br ${mode.gradient} ${mode.borderHover} transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.99] overflow-hidden`}
      >
        {/* Subtle animated shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </div>
        <CardContent className="relative p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div
              className={`flex items-center justify-center size-10 rounded-xl ${mode.iconBg} shadow-md transition-transform duration-300 group-hover:scale-110`}
            >
              <Icon className={`size-4.5 ${mode.iconColor}`} />
            </div>
            <div className="flex flex-col items-end gap-1">
              {mode.badge && <ModeBadge badge={mode.badge} />}
              {mode.category && (
                <span className="text-[10px] text-muted-foreground/70 font-medium">
                  {mode.category}
                </span>
              )}
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1 tracking-tight">
            {mode.title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {mode.description}
          </p>

          {/* Arrow indicator on hover */}
          <div className="mt-3 flex items-center text-xs font-medium text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200">
            <span>Mulai menulis</span>
            <svg
              className="ml-1.5 size-3.5 transform group-hover:translate-x-1 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export default function WritingModeSelector({
  onSelect,
}: WritingModeSelectorProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Pilih Jenis Penulisan
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Pilih format tulisan akademik yang sesuai dengan kebutuhan Anda.
          Semua mode menggunakan sistem <span className="font-semibold text-emerald-600 dark:text-emerald-400">penulisan mencicil</span> per tahapan.
        </p>
      </motion.div>

      {/* Category Labels */}
      <div className="flex flex-wrap gap-2 justify-center">
        {['Artikel', 'Akademik', 'Buku', 'Lainnya'].map((cat) => (
          <Badge key={cat} variant="outline" className="text-xs font-medium">
            {cat === 'Artikel' ? '✨ ' : cat === 'Akademik' ? '🎓 ' : cat === 'Buku' ? '📚 ' : '📝 '}{cat}
          </Badge>
        ))}
      </div>

      {/* Mode Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {WRITING_MODES.map((mode, index) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}