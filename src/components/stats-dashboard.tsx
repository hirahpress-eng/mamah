'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  FileText,
  Quote,
  Target,
  TrendingUp,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { computeArticleStats, type ArticleStats } from '@/lib/article-stats';
import { useArticleStore, type GeneratedArticle } from '@/store/article-store';

// ─── Animated Counter Hook ──────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 1200, enabled = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      // Reset via rAF to avoid synchronous setState in effect (lint rule)
      const id = requestAnimationFrame(() => setValue(0));
      return () => cancelAnimationFrame(id);
    }

    let start = 0;
    let rafId: number;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * target);
      setValue(start);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, enabled]);

  return value;
}

// ─── Circular Progress Ring ─────────────────────────────────────────────

function CircularProgressRing({
  value,
  size = 100,
  strokeWidth = 8,
  color = '#10b981',
  label,
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-emerald-100 dark:text-emerald-900/40"
          />
          {/* Animated progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (
            <span className="text-xl font-bold text-foreground">{value}</span>
          )}
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Stagger Animation Variants ─────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.1 + i * 0.1,
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

// ─── Stat Card Wrapper ─────────────────────────────────────────────────

function StatCard({
  index,
  icon: Icon,
  iconColor,
  label,
  children,
  className,
}: {
  index: number;
  icon: React.ElementType;
  iconColor: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`rounded-xl border border-border/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-300 ${className || ''}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="flex items-center justify-center size-8 rounded-lg"
          style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
        >
          <Icon className="size-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Section Breakdown Chart ────────────────────────────────────────────

function SectionBreakdownChart({ stats }: { stats: ArticleStats }) {
  const maxWords = Math.max(...stats.sectionBreakdown.map((s) => s.words), 1);

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="flex h-4 rounded-full overflow-hidden bg-muted/50">
        {stats.sectionBreakdown.map((section) => (
          <motion.div
            key={section.type}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: section.color }}
            initial={{ width: 0 }}
            animate={{
              width: `${stats.totalWords > 0 ? (section.words / stats.totalWords) * 100 : 0}%`,
            }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            title={`${section.label}: ${section.words} words`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {stats.sectionBreakdown.map((section) => (
          <div key={section.type} className="flex items-center gap-1">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: section.color }}
            />
            <span className="text-[10px] text-muted-foreground">
              {section.label} ({section.words})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Reference Type Breakdown ───────────────────────────────────────────

function ReferenceBreakdownBars({ stats }: { stats: ArticleStats }) {
  const maxCount = Math.max(...stats.referenceBreakdown.map((r) => r.count), 1);

  return (
    <div className="space-y-2">
      {stats.referenceBreakdown.map((ref, i) => (
        <div key={ref.type} className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground w-24 shrink-0 truncate">
            {ref.label}
          </span>
          <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: ref.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(ref.count / maxCount) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 + i * 0.08 }}
            />
          </div>
          <span className="text-[11px] font-semibold text-foreground tabular-nums w-6 text-right">
            {ref.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────

interface StatsDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: GeneratedArticle;
}

export default function StatsDashboard({
  open,
  onOpenChange,
  article,
}: StatsDashboardProps) {
  const stats = useMemo(() => computeArticleStats(article), [article]);

  const generatedAt = useArticleStore((s) => s.generatedAt);

  const animatedWords = useAnimatedCounter(stats.totalWords, 1200, open);
  const animatedRefs = useAnimatedCounter(stats.referenceCount, 1000, open);
  const animatedDensity = useAnimatedCounter(
    Math.round(stats.citationDensity * 10),
    1000,
    open
  );

  // Format the generation timestamp nicely
  let generatedDateLabel: string;
  if (generatedAt) {
    const date = new Date(generatedAt);
    generatedDateLabel = `Generated on ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else {
    generatedDateLabel = 'Current session';
  }

  const wordPercent = Math.min(100, Math.round((stats.totalWords / 7750) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[85vh] overflow-y-auto"
        showCloseButton
      >
        <DialogHeader>
          {/* Header section with title + word count badge + date */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="size-5 text-emerald-600" />
                Article Statistics
              </DialogTitle>
              <DialogDescription className="max-w-md line-clamp-2">
                {article.title}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 font-semibold tabular-nums"
              >
                {animatedWords.toLocaleString()} words
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            {generatedDateLabel}
          </div>
        </DialogHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {/* 1. Total Words */}
          <StatCard
            index={0}
            icon={BookOpen}
            iconColor="#059669"
            label="Total Words"
            className="sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {animatedWords.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">/ 7,750 target</span>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold tabular-nums">{wordPercent}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      wordPercent >= 80
                        ? 'linear-gradient(90deg, #059669, #10b981)'
                        : wordPercent >= 50
                          ? 'linear-gradient(90deg, #d97706, #f59e0b)'
                          : 'linear-gradient(90deg, #dc2626, #ef4444)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${wordPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
            </div>
          </StatCard>

          {/* 2. Section Breakdown */}
          <StatCard
            index={1}
            icon={Layers}
            iconColor="#10b981"
            label="Section Breakdown"
            className="sm:col-span-2 lg:col-span-2"
          >
            <SectionBreakdownChart stats={stats} />
          </StatCard>

          {/* 3. References */}
          <StatCard
            index={2}
            icon={FileText}
            iconColor="#14b8a6"
            label="References"
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {animatedRefs}
              </span>
              <span className="text-xs text-muted-foreground">sources</span>
            </div>
            <div className="mt-3">
              <ReferenceBreakdownBars stats={stats} />
            </div>
          </StatCard>

          {/* 4. Readability Score */}
          <StatCard
            index={3}
            icon={Target}
            iconColor="#059669"
            label="Readability Score"
          >
            <div className="flex justify-center py-1">
              <CircularProgressRing
                value={stats.readabilityScore}
                size={96}
                strokeWidth={7}
                color={
                  stats.readabilityScore >= 70
                    ? '#059669'
                    : stats.readabilityScore >= 40
                      ? '#d97706'
                      : '#dc2626'
                }
                label=""
              >
                <div className="text-center">
                  <span className="text-xl font-bold tabular-nums text-foreground">
                    {stats.readabilityScore}
                  </span>
                  <span className="block text-[9px] text-muted-foreground -mt-0.5">
                    / 100
                  </span>
                </div>
              </CircularProgressRing>
            </div>
            <p className="text-center text-[10px] text-muted-foreground -mt-1">
              {stats.readabilityScore >= 70
                ? 'Excellent quality'
                : stats.readabilityScore >= 40
                  ? 'Good — room to improve'
                  : 'Needs more work'}
            </p>
          </StatCard>

          {/* 5. Citation Density */}
          <StatCard
            index={4}
            icon={Quote}
            iconColor="#34d399"
            label="Citation Density"
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums text-foreground">
                {(animatedDensity / 10).toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                per 1,000 words
              </span>
            </div>
            <div className="mt-3">
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-emerald-400"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, (stats.citationDensity / 10) * 100)}%`,
                  }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {stats.citationDensity >= 8
                  ? 'Well-cited article'
                  : stats.citationDensity >= 4
                    ? 'Moderate citation density'
                    : 'Consider adding more citations'}
              </p>
            </div>
          </StatCard>

          {/* 6. Publication Readiness */}
          <StatCard
            index={5}
            icon={TrendingUp}
            iconColor="#0d9488"
            label="Publication Readiness"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {stats.publicationReadiness}
                  </span>
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <Progress
                  value={stats.publicationReadiness}
                  className="h-2.5"
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {stats.publicationReadiness >= 80
                    ? 'Ready for submission'
                    : stats.publicationReadiness >= 50
                      ? 'Almost there — review suggestions'
                      : 'Keep refining your article'}
                </p>
              </div>
            </div>
          </StatCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}
