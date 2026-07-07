'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookTemplate,
  Microscope,
  Globe,
  Building2,
  Layers,
  Search,
  X,
  ArrowRight,
  Sparkles,
  Cpu,
  Link,
  Wifi,
  Heart,
  Laptop,
  GraduationCap,
  CloudRain,
  Sun,
  Dna,
  ShoppingCart,
  Leaf,
  TrendingUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RESEARCH_TEMPLATES,
  RESEARCH_FIELDS,
  FIELD_COLORS,
  type ResearchTemplate,
  type ResearchField,
} from '@/lib/research-templates';

// ─── Icon Map ────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Cpu,
  Link,
  Wifi,
  Heart,
  Laptop,
  GraduationCap,
  CloudRain,
  Sun,
  Dna,
  ShoppingCart,
  Leaf,
  TrendingUp,
  BookTemplate,
  Microscope,
  Globe,
  Building2,
  Layers,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Layers;
}

// ─── Animation Variants ──────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' as const },
  }),
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.2 } },
};

// ─── Field Icon Map for Tabs ────────────────────────────────────────

const FIELD_TAB_ICONS: Record<ResearchField, React.ElementType> = {
  Technology: Cpu,
  'Social Sciences': Globe,
  Sciences: Microscope,
  Business: Building2,
};

// ─── Main Component ──────────────────────────────────────────────────

interface ResearchTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: ResearchTemplate) => void;
}

export default function ResearchTemplatesDialog({
  open,
  onOpenChange,
  onSelectTemplate,
}: ResearchTemplatesDialogProps) {
  const [activeField, setActiveField] = useState<ResearchField | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Filtered templates ──────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    return RESEARCH_TEMPLATES.filter((t) => {
      const matchesField = activeField === 'All' || t.field === activeField;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.field.toLowerCase().includes(query) ||
        t.suggestedKeywords.some((k) => k.toLowerCase().includes(query));
      return matchesField && matchesSearch;
    });
  }, [activeField, searchQuery]);

  // ── Handle template selection ───────────────────────────────────
  const handleSelect = (template: ResearchTemplate) => {
    onSelectTemplate(template);
    toast.success('Template applied!', {
      description: `"${template.title}" — keywords filled, generating titles...`,
    });
    onOpenChange(false);
  };

  // ── Handle field filter change ──────────────────────────────────
  const handleFieldChange = (field: ResearchField | 'All') => {
    setActiveField(field);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* ── Gradient Header Bar ────────────────────────────────── */}
        <div
          className="h-1.5 w-full"
          style={{
            background: 'linear-gradient(90deg, #10b981, #14b8a6, #059669, #10b981)',
          }}
        />

        <div className="p-6 pb-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <BookTemplate className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Research Templates
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Choose a pre-built template to quickly start your research article
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* ── Search Input ──────────────────────────────────────── */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <Input
              placeholder="Search templates by title, field, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-border/60 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 size-5 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors"
                aria-label="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* ── Field Filter Tabs ─────────────────────────────────── */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleFieldChange('All')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                activeField === 'All'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-background text-muted-foreground border-border hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-700 dark:hover:text-emerald-300'
              }`}
            >
              <Layers className="size-3" />
              All ({RESEARCH_TEMPLATES.length})
            </motion.button>
            {RESEARCH_FIELDS.map((f) => {
              const Icon = getIcon(f.icon);
              const count = RESEARCH_TEMPLATES.filter((t) => t.field === f.label).length;
              return (
                <motion.button
                  key={f.label}
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleFieldChange(f.label)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                    activeField === f.label
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-background text-muted-foreground border-border hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-700 dark:hover:text-emerald-300'
                  }`}
                >
                  <Icon className="size-3" />
                  {f.label} ({count})
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Templates Grid ──────────────────────────────────────── */}
        <ScrollArea className="max-h-[50vh] px-6 py-4">
          <AnimatePresence mode="wait">
            {filteredTemplates.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="size-12 rounded-full bg-muted/80 flex items-center justify-center mb-3">
                  <Search className="size-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No templates found</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Try adjusting your search or filter criteria
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={activeField + searchQuery}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {filteredTemplates.map((template, i) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    index={i}
                    onClick={() => handleSelect(template)}
                    icon={getIcon(template.icon)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="border-t border-border/40 px-6 py-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
          </p>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-emerald-500" />
            <span className="text-[11px] text-muted-foreground/60">
              Click a template to auto-fill keywords
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Card Sub-component ─────────────────────────────────────

function TemplateCard({
  template,
  index,
  onClick,
  icon: Icon,
}: {
  template: ResearchTemplate;
  index: number;
  onClick: () => void;
  icon: React.ElementType;
}) {
  const fieldColorClass = FIELD_COLORS[template.field];

  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible" exit="exit">
      <Card
        className="group cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.01] border-border/60 hover:border-emerald-300 dark:hover:border-emerald-700 overflow-hidden"
        onClick={onClick}
      >
        {/* Gradient top accent */}
        <div className={`h-1 w-full bg-gradient-to-r ${template.gradient}`} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`flex-shrink-0 flex items-center justify-center size-10 rounded-lg bg-gradient-to-br ${template.gradient} text-white shadow-sm`}
            >
              <Icon className="size-4.5" />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              {/* Title + Field badge */}
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-foreground leading-snug">
                  {template.title}
                </h4>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 rounded-full flex-shrink-0 border ${fieldColorClass}`}
                >
                  {template.field}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {template.description}
              </p>

              {/* Keywords preview */}
              <div className="flex flex-wrap gap-1">
                {template.suggestedKeywords.slice(0, 3).map((kw) => (
                  <span
                    key={kw}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground"
                  >
                    {kw}
                  </span>
                ))}
                {template.suggestedKeywords.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground">
                    +{template.suggestedKeywords.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Use template action */}
          <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/60">5 keywords · Auto-generate titles</span>
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
              Use Template
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
