'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  PenLine,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ─────────────────────────────────────────────────────────

interface WritingModeSelectorProps {
  onSelect: (mode: string) => void;
}

interface WritingMode {
  id: string;
  title: string;
  description: string;
  shortDesc: string;
  icon: React.ElementType;
  badge?: { label: string; variant: 'popular' | 'new' };
  gradient: string;
  iconBg: string;
  iconColor: string;
  borderHover: string;
  featured?: boolean;
  category?: string;
}

interface CategoryConfig {
  key: string;
  label: string;
  icon: React.ElementType;
  description: string;
  badgeGradient: string;
}

// ─── Category Definitions ──────────────────────────────────────────

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'Artikel',
    label: 'Artikel',
    icon: PenLine,
    description: 'Artikel ilmiah & jurnal',
    badgeGradient: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-500/15',
  },
];

// ─── Mode Definitions ──────────────────────────────────────────────

const WRITING_MODES: WritingMode[] = [
  // ── ARTIKEL ILMIAH (only mode shown for now) ──
  {
    id: 'article',
    title: 'Artikel Ilmiah',
    description:
      'Artikel ilmiah dengan struktur IMRAD lengkap, referensi Scopus, siap publikasi. Mencicil: Abstrak → Pendahuluan → Metode → Hasil & Diskusi → Kesimpulan → Bibliografi',
    shortDesc: 'Artikel ilmiah IMRAD, siap publikasi jurnal',
    icon: FileText,
    badge: { label: 'Utama', variant: 'popular' },
    gradient:
      'from-emerald-50 via-emerald-50/50 to-teal-50/40 dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-teal-950/20',
    iconBg:
      'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/25',
    iconColor: 'text-white',
    borderHover: 'hover:border-emerald-400/60 dark:hover:border-emerald-600/60',
    featured: true,
    category: 'Artikel',
  },
];

// ── HIDDEN MODES (preserved for future use, not shown in UI) ──
// skripsi, tesis, disertasi, buku-id, buku-en, buku-arab, buku-eksakta,
// buku-keislaman, proposal, scholarship, paper — will be re-enabled later

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

// ─── Category Header Component ─────────────────────────────────────

function CategoryHeader({
  category,
  index,
}: {
  category: CategoryConfig;
  index: number;
}) {
  const CatIcon = category.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.12,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="flex items-center gap-3 pt-4 sm:pt-6 first:pt-0"
    >
      <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/15 dark:to-teal-500/15 border border-emerald-500/15 dark:border-emerald-500/10">
        <CatIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {category.label}
          </h3>
          <span className="text-[11px] text-muted-foreground/60 font-normal">
            {category.description}
          </span>
        </div>
        <div className="h-px flex-1 mt-1.5 bg-gradient-to-r from-border via-border/50 to-transparent" />
      </div>
    </motion.div>
  );
}

// ─── Mode Card ─────────────────────────────────────────────────────

function ModeCard({
  mode,
  index,
  isSelected,
  onSelect,
}: {
  mode: WritingMode;
  index: number;
  isSelected: boolean;
  onSelect: (mode: string) => void;
}) {
  const Icon = mode.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.055,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <Card
        onClick={() => onSelect(mode.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(mode.id); }}}
        role="button"
        tabIndex={0}
        aria-describedby={`mode-desc-${mode.id}`}
        className={[
          'group relative cursor-pointer overflow-hidden',
          'border transition-all duration-300',
          'card-hover-lift card-glow',
          'glass-card',
          // Selected state: prominent emerald glow
          isSelected
            ? [
                'border-emerald-500/60 dark:border-emerald-400/50',
                'ring-2 ring-emerald-500/25 dark:ring-emerald-400/20',
                'shadow-[0_0_20px_rgba(16,185,129,0.15),0_0_40px_rgba(16,185,129,0.05)]',
                'dark:shadow-[0_0_20px_rgba(52,211,153,0.12),0_0_40px_rgba(52,211,153,0.04)]',
                'scale-[1.02]',
              ].join(' ')
            : 'border-border/40',
          mode.borderHover,
          mode.featured ? 'col-span-2 md:col-span-1 lg:col-span-2' : '',
        ].join(' ')}
      >
        {/* Subtle animated shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </div>

        {/* Selected indicator bar */}
        {isSelected && (
          <motion.div
            layoutId="selected-indicator"
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-emerald-500 via-teal-500 to-emerald-600 rounded-r-full"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' as const }}
          />
        )}

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
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 font-medium border bg-gradient-to-r ${CATEGORIES.find((c) => c.key === mode.category)?.badgeGradient ?? ''}`}
                >
                  {mode.category}
                </Badge>
              )}
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1 tracking-tight">
            {mode.title}
          </h3>
          <p id={`mode-desc-${mode.id}`} className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed line-clamp-1">
            {mode.shortDesc}
          </p>

          {/* Arrow indicator on hover / selected */}
          <div className={`mt-3 flex items-center text-xs font-medium transition-colors duration-200 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
            <span>{isSelected ? 'Dipilih' : 'Mulai menulis'}</span>
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
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const handleSelect = (mode: string) => {
    setSelectedMode(mode);
    onSelect(mode);
  };

  // Group modes by category in order
  const groupedModes = CATEGORIES.map((cat) => ({
    category: cat,
    modes: WRITING_MODES.filter((m) => m.category === cat.key),
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' as const }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Buat Artikel Ilmiah
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Artikel ilmiah dengan struktur IMRAD lengkap, referensi akademik,
          dan sistem{' '}
          <span className="font-semibold text-gradient-emerald">
            penulisan mencicil
          </span>{' '}
          per tahapan oleh tim penulis profesional.
        </p>
      </motion.div>

      {/* Mode Cards grouped by category */}
      <div className="space-y-6 sm:space-y-8">
        {groupedModes.map((group, catIdx) => {
          const startIndex = groupedModes
            .slice(0, catIdx)
            .reduce((sum, g) => sum + g.modes.length, 0);

          return (
            <div key={group.category.key} className="space-y-3 sm:space-y-4">
              <CategoryHeader
                category={group.category}
                index={catIdx}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {group.modes.map((mode, i) => (
                  <ModeCard
                    key={mode.id}
                    mode={mode}
                    index={startIndex + i}
                    isSelected={selectedMode === mode.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skeleton Component ────────────────────────────────────────────

export function WritingModeSelectorSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header skeleton */}
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-4 w-80 mx-auto" />
      </div>
      {/* Category groups skeleton */}
      <div className="space-y-6 sm:space-y-8">
        {Array.from({ length: 1 }).map((_, catIdx) => (
          <div key={catIdx} className="space-y-3 sm:space-y-4">
            {/* Category header */}
            <div className="flex items-center gap-3 pt-4 sm:pt-6">
              <Skeleton className="size-8 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-px w-full" />
              </div>
            </div>
            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 1 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="size-10 rounded-xl" />
                    <div className="flex flex-col items-end gap-1">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}