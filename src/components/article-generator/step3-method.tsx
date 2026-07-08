'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, FlaskConical, Beaker, FileText, ArrowRight, ArrowLeft,
  Loader2, CheckCircle2, Check, Clock, Sparkles, Play, ChevronDown,
  ChevronUp, Pencil, Library, BrainCircuit, MessageSquareWarning,
  BarChart3, Search, Settings, Star, Image, Table2, RotateCcw,
  XCircle, AlertCircle, ListOrdered, GraduationCap, type LucideIcon,
  Compass, Filter, ShieldCheck, GitBranch, ClipboardList, Award,
  Target, Calculator, TrendingDown, Database, Code, Ruler, Users, Table,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { AI_ENGINES, type AIEngineId } from '@/lib/ai-engine-config';
import {
  useArticleStore, type ResearchMethod, type StageId,
  type SectionStage, type VisualPlaceholder, STAGE_DEFINITIONS,
} from '@/store/article-store';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Types & Constants ──────────────────────────────────────────────────────────

type ViewMode = 'config' | 'generating' | 'compile';

interface MethodInfo {
  id: ResearchMethod;
  title: string;
  description: string;
  longDescription: string;
  details: string;
  icon: LucideIcon;
  bestFor: string;
  complexity: 'Low' | 'Medium' | 'High';
  outputLength: string;
}

const RESEARCH_METHODS: MethodInfo[] = [
  { id: 'literature-review', title: 'Literature Review', description: 'Traditional qualitative literature review', longDescription: 'A comprehensive overview of existing research, synthesising key findings and identifying themes across selected sources.', details: 'A comprehensive overview of existing research, synthesising key findings and identifying themes across selected sources.', icon: BookOpen, bestFor: 'Broad topic exploration', complexity: 'Low', outputLength: '3,000–5,000 words' },
  { id: 'systematic-review', title: 'Systematic Review', description: 'PRISMA-guided systematic literature review', longDescription: 'A structured, reproducible review following PRISMA guidelines with explicit search strategy and quality assessment.', details: 'A structured, reproducible review following PRISMA guidelines with explicit search strategy and inclusion criteria.', icon: FlaskConical, bestFor: 'Evidence-based research', complexity: 'High', outputLength: '5,000–8,000 words' },
  { id: 'meta-analysis', title: 'Meta-Analysis', description: 'Statistical meta-analysis of findings', longDescription: 'Combines quantitative results from multiple studies using statistical methods to derive pooled effect sizes.', details: 'Combines quantitative results from multiple studies using statistical methods to derive pooled effect sizes.', icon: Beaker, bestFor: 'Quantitative synthesis', complexity: 'High', outputLength: '4,000–7,000 words' },
  { id: 'meta-synthesis', title: 'Meta-Synthesis', description: 'Qualitative meta-synthesis', longDescription: 'Integrates findings from qualitative studies to produce new interpretive insights beyond individual studies.', details: 'Integrates findings from qualitative studies to produce new interpretive insights beyond individual studies.', icon: BrainCircuit, bestFor: 'Qualitative integration', complexity: 'High', outputLength: '4,000–6,000 words' },
  { id: 'narrative-review', title: 'Narrative Review', description: 'Narrative/thematic review', longDescription: 'A thematic narrative approach that organises literature by concepts or topics with critical discussion.', details: 'A thematic narrative approach that organises literature by concepts or topics with critical discussion.', icon: FileText, bestFor: 'Theoretical papers', complexity: 'Low', outputLength: '3,000–5,000 words' },
  { id: 'scoping-review', title: 'Scoping Review', description: 'Scoping review methodology', longDescription: 'Maps the breadth of literature on a topic, identifying key concepts, gaps, and types of available evidence.', details: 'Maps the breadth of literature on a topic, identifying key concepts, gaps, and types of available evidence.', icon: Search, bestFor: 'Emerging fields', complexity: 'Medium', outputLength: '4,000–6,000 words' },
  { id: 'critical-review', title: 'Critical Review', description: 'Critical analysis approach', longDescription: 'Evaluates and critiques existing literature with a focus on methodological rigour, bias, and validity.', details: 'Evaluates and critiques existing literature with a focus on methodological rigour, bias, and validity.', icon: MessageSquareWarning, bestFor: 'Identifying gaps', complexity: 'Medium', outputLength: '3,000–5,000 words' },
];

const STAGE_ICONS: Record<StageId, LucideIcon> = {
  abstract: FileText,
  introduction: BookOpen,
  methodology: FlaskConical,
  results_discussion: BarChart3,
  conclusion: CheckCircle2,
  bibliography: ListOrdered,
};

const STAGE_DESCRIPTIONS: Record<StageId, string> = {
  abstract: 'A concise summary covering background, objectives, method, key findings, and conclusions.',
  introduction: 'Research context, comprehensive literature review, research gaps, and research questions.',
  methodology: 'Research design, search strategy, inclusion/exclusion criteria, and data analysis approach.',
  results_discussion: 'Study selection, thematic findings for each RQ, interpretation, and theoretical contributions.',
  conclusion: 'Synthesis of key findings, contributions, limitations, and future research directions.',
  bibliography: 'APA 7th Edition formatted reference list of all cited sources.',
};

const PLACEHOLDER_REGEX = /\[(FIGURE|TABLE):\s*(.+?)\]/gi;

// ─── Methodology Workflow Data ────────────────────────────────────────────────────

const METHOD_WORKFLOWS: Record<string, { step: string; description: string; icon: string }[]> = {
  'literature-review': [
    { step: 'Research Philosophy', description: 'Define interpretivist/positivist paradigm and justify approach', icon: 'Compass' },
    { step: 'Literature Search', description: 'Search Scopus, WoS, PubMed with Boolean operators and inclusion criteria', icon: 'Search' },
    { step: 'Screening & Selection', description: 'Apply inclusion/exclusion criteria, remove duplicates, screen titles/abstracts/full-text', icon: 'Filter' },
    { step: 'Quality Assessment', description: 'Evaluate study quality using CASP, JBI, or Newcastle-Ottawa scale', icon: 'ShieldCheck' },
    { step: 'Thematic Analysis', description: 'Code data, identify themes, build thematic map, cross-case comparison', icon: 'GitBranch' },
    { step: 'Synthesis & Reporting', description: 'Synthesize findings by RQ, compare with existing literature, report per PRISMA', icon: 'FileText' },
  ],
  'systematic-review': [
    { step: 'Protocol Registration', description: 'Register review protocol on PROSPERO, define PICO/PECO framework', icon: 'ClipboardList' },
    { step: 'Systematic Search', description: 'Comprehensive database search with documented strategy per PRISMA 2020', icon: 'Search' },
    { step: 'PRISMA Screening', description: 'Identification → Screening → Eligibility → Inclusion with exclusion tracking', icon: 'Filter' },
    { step: 'Risk of Bias Assessment', description: 'Apply RoB 2, ROBINS-I, or Newcastle-Ottawa for quality evaluation', icon: 'ShieldCheck' },
    { step: 'Data Extraction', description: 'Standardised extraction form, dual extraction, conflict resolution', icon: 'Table' },
    { step: 'Narrative/Meta-Analysis', description: 'Narrative synthesis or meta-analysis with forest plots, heterogeneity assessment', icon: 'BarChart3' },
    { step: 'GRADE Assessment', description: 'Certainty of evidence using GRADE framework for each outcome', icon: 'Award' },
  ],
  'scoping-review': [
    { step: 'Scoping Framework', description: "Apply JBI scoping review methodology or Arksey & O'Malley framework", icon: 'Compass' },
    { step: 'Search Strategy', description: 'Broad search across multiple databases, grey literature included', icon: 'Search' },
    { step: 'Study Selection', description: 'Iterative selection process based on relevance to research questions', icon: 'Filter' },
    { step: 'Data Charting', description: 'Chart key information from selected sources using standardised form', icon: 'Table' },
    { step: 'Thematic Mapping', description: 'Map concepts, themes, and gaps in the existing literature', icon: 'GitBranch' },
    { step: 'Stakeholder Consultation', description: 'Optional consultation with stakeholders to validate findings', icon: 'Users' },
  ],
  'meta-analysis': [
    { step: 'Research Question (PICO)', description: 'Define Population, Intervention, Comparison, Outcome precisely', icon: 'Target' },
    { step: 'Systematic Search', description: 'Exhaustive search with reproducible strategy across databases', icon: 'Search' },
    { step: 'Study Selection & Coding', description: 'Dual independent screening, quality assessment, data coding', icon: 'Filter' },
    { step: 'Effect Size Calculation', description: "Calculate Cohen's d, odds ratios, risk ratios with 95% CI", icon: 'Calculator' },
    { step: 'Heterogeneity Analysis', description: 'Q-test, I² statistic, subgroup analysis, meta-regression', icon: 'BarChart3' },
    { step: 'Publication Bias', description: "Funnel plots, Egger's test, trim-and-fill analysis", icon: 'TrendingDown' },
    { step: 'Forest Plot & Synthesis', description: 'Generate forest plots, cumulative analysis, sensitivity analysis', icon: 'FileText' },
  ],
  'content-analysis': [
    { step: 'Research Design', description: 'Define qualitative content analysis approach (deductive/inductive)', icon: 'Compass' },
    { step: 'Data Collection', description: 'Collect texts, documents, media for analysis with sampling strategy', icon: 'Database' },
    { step: 'Coding Framework', description: 'Develop initial codebook, pilot test, refine codes', icon: 'Code' },
    { step: 'Unit of Analysis', description: 'Define coding units, manifest vs latent content, recording units', icon: 'Ruler' },
    { step: 'Coding Process', description: "Independent dual coding, inter-coder reliability (Cohen's κ ≥ 0.80)", icon: 'Users' },
    { step: 'Category Development', description: 'Aggregate codes into categories, define category properties', icon: 'GitBranch' },
    { step: 'Reporting', description: 'Report findings with quotations, category descriptions, frequency data', icon: 'FileText' },
  ],
};

const DEFAULT_WORKFLOW = [
  { step: 'Research Design', description: 'Define research paradigm, design, and methodological approach', icon: 'Compass' },
  { step: 'Literature Search', description: 'Systematic search across relevant databases with documented strategy', icon: 'Search' },
  { step: 'Study Selection', description: 'Apply inclusion/exclusion criteria, screen and select sources', icon: 'Filter' },
  { step: 'Quality Assessment', description: 'Evaluate methodological quality and risk of bias', icon: 'ShieldCheck' },
  { step: 'Data Analysis', description: 'Extract, code, and analyse data using appropriate techniques', icon: 'BarChart3' },
  { step: 'Synthesis & Reporting', description: 'Synthesise findings, discuss implications, report per standards', icon: 'FileText' },
];

const WORKFLOW_ICON_MAP: Record<string, LucideIcon> = {
  Compass, Search, Filter, ShieldCheck, GitBranch, FileText,
  ClipboardList, BarChart3, Award, Target, Calculator, TrendingDown,
  Database, Code, Ruler, Users, Table,
};

// ─── ReferencesSummary ──────────────────────────────────────────────────────────

function ReferencesSummary() {
  const { references, prevStep } = useArticleStore();
  const selectedRefs = references.filter((r) => r.isSelected);
  const [isOpen, setIsOpen] = useState(false);
  const yearVals = selectedRefs.map((r) => parseInt(String(r.year))).filter((y) => !isNaN(y));
  const minYear = yearVals.length > 0 ? Math.min(...yearVals) : '—';
  const maxYear = yearVals.length > 0 ? Math.max(...yearVals) : '—';
  const journalCount = new Set(selectedRefs.map((r) => r.journal).filter(Boolean)).size;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Selected References</h3>
            <p className="text-sm text-muted-foreground">Review your selected literature sources</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold text-sm px-3 py-1">
          {selectedRefs.length} reference{selectedRefs.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Card className="overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedRefs.length > 0 ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      Spanning <span className="font-medium text-foreground">{minYear}–{maxYear}</span>
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-sm text-muted-foreground">
                      {journalCount} journal{journalCount !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-amber-600 dark:text-amber-400">No references selected yet</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => prevStep()} className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                  <Pencil className="w-3.5 h-3.5" /> Edit References
                </Button>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </div>
          <AnimatePresence>
            {isOpen && (
              <CollapsibleContent forceMount>
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <Separator />
                  <ScrollArea className="max-h-64">
                    <div className="px-6 py-3 space-y-2">
                      {selectedRefs.length === 0 && (
                        <p className="text-sm text-muted-foreground py-4 text-center">Go back to Step 2 to search and select references.</p>
                      )}
                      {selectedRefs.map((ref, idx) => (
                        <div key={ref.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <span className="text-xs font-mono text-muted-foreground mt-0.5 shrink-0">[{idx + 1}]</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground leading-snug truncate">{ref.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{ref.authors} ({ref.year}){ref.journal && ` — ${ref.journal}`}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wider font-medium">{ref.refType.replace('_', '-')}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </Collapsible>
      </Card>
    </section>
  );
}

// ─── MethodSelection ────────────────────────────────────────────────────────────

function MethodSelectionCard({ method, isSelected, onSelect, isRecommended }: { method: MethodInfo; isSelected: boolean; onSelect: () => void; isRecommended: boolean }) {
  const Icon = method.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button type="button" onClick={onSelect} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
          className={cn('relative w-full text-left rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
            isSelected ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm shadow-emerald-100 dark:shadow-emerald-950/30' : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-muted/30'
          )}>
          {isRecommended && !isSelected && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="absolute -top-2 -right-2">
              <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 text-[10px] font-bold shadow-sm px-1.5 py-0.5 gap-1"><Star className="w-2.5 h-2.5" />Recommended</Badge>
            </motion.div>
          )}
          {isSelected && (
            <motion.div layoutId="method-sel-ind" className="absolute top-3 right-3" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-white" /></div>
            </motion.div>
          )}
          <div className="flex items-start gap-3">
            <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors', isSelected ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
              <Icon className="w-5 h-5" />
            </div>
            <div className={cn('min-w-0 flex-1', isSelected ? 'pr-6' : 'pr-2')}>
              <h4 className={cn('font-semibold text-sm transition-colors', isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground')}>{method.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
            </div>
          </div>
          <AnimatePresence>
            {isSelected && (
              <motion.div initial={{ height: 0, opacity: 0, marginTop: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <p className="text-xs text-muted-foreground leading-relaxed pl-[52px]">{method.details}</p>
                <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pl-[52px]">Estimated output: <span className="font-semibold tabular-nums">{method.outputLength}</span></p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs" sideOffset={8}><p className="text-xs leading-relaxed">{method.longDescription}</p></TooltipContent>
    </Tooltip>
  );
}

function MethodSelection() {
  const { researchMethod, setResearchMethod } = useArticleStore();
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"><FlaskConical className="w-5 h-5" /></div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Research Method</h3>
          <p className="text-sm text-muted-foreground">Select the methodology for your article</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {RESEARCH_METHODS.map((method) => (
          <MethodSelectionCard key={method.id} method={method} isSelected={researchMethod === method.id} onSelect={() => setResearchMethod(method.id)} isRecommended={method.id === 'literature-review'} />
        ))}
      </div>
    </section>
  );
}

// ─── Methodology Workflow Panel ──────────────────────────────────────────────────

function MethodologyWorkflowPanel({ methodId, methodName }: { methodId: string; methodName: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const steps = METHOD_WORKFLOWS[methodId] ?? DEFAULT_WORKFLOW;

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="border-emerald-200/60 dark:border-emerald-800/40 overflow-hidden">
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-lg"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06), transparent 50%, rgba(20,184,166,0.06))' }}
            />
            <CollapsibleTrigger asChild>
              <button className="relative w-full text-left px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <ListOrdered className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Methodology Workflow — <span className="text-emerald-600 dark:text-emerald-400">{methodName}</span></h3>
                    <p className="text-xs text-muted-foreground">{steps.length} steps · Click to {isOpen ? 'collapse' : 'expand'}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-medium tabular-nums text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  {steps.length} steps
                </Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 pb-5">
                <div className="relative ml-4">
                  {/* Vertical connecting line */}
                  <div className="absolute left-[15px] top-3 bottom-3 w-px bg-emerald-200 dark:bg-emerald-800" />
                  <div className="space-y-0">
                    {steps.map((s, i) => {
                      const StepIcon = WORKFLOW_ICON_MAP[s.icon] ?? FileText;
                      const isLast = i === steps.length - 1;
                      return (
                        <motion.div
                          key={s.step}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.06, ease: 'easeOut' }}
                          className="relative flex items-start gap-4 py-3"
                        >
                          {/* Step number circle with icon */}
                          <div className="relative z-10 shrink-0">
                            <div className={cn(
                              'flex items-center justify-center w-[30px] h-[30px] rounded-full border-2',
                              isLast
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-background border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400',
                            )}>
                              <StepIcon className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">STEP {i + 1}</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground mt-0.5 leading-snug">{s.step}</p>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</p>
                          </div>
                          {/* Completion indicator for last step */}
                          {isLast && (
                            <div className="shrink-0 mt-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.section>
    </AnimatePresence>
  );
}

// ─── Visual Placeholder Card ────────────────────────────────────────────────────

function VisualPlaceholderCard({ placeholder, onGenerate, stageId }: { placeholder: VisualPlaceholder; onGenerate: (id: string) => void; stageId: StageId }) {
  const Icon = placeholder.type === 'figure' ? Image : Table2;
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGen = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(placeholder.id);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10 my-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 capitalize">{placeholder.type}</span>
              {placeholder.generated && <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">Generated</Badge>}
              {placeholder.error && <Badge variant="outline" className="text-red-600 border-red-300 text-[10px]">Error</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{placeholder.description}</p>

            {placeholder.generated && placeholder.data && (
              <div className="mt-2">
                {placeholder.type === 'figure' ? (
                  <img src={`data:image/png;base64,${placeholder.data}`} alt={placeholder.description} className="max-w-full rounded-md border border-border" />
                ) : (
                  <div className="rounded-md border border-border bg-background p-3 overflow-x-auto">
                    <ReactMarkdown>{placeholder.data}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {placeholder.error && !placeholder.generated && (
              <p className="text-xs text-red-500 mt-1">{placeholder.error}</p>
            )}

            {!placeholder.generated && (
              <Button size="sm" variant="outline" onClick={handleGen} disabled={isGenerating} className="mt-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30">
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Icon className="w-3.5 h-3.5 mr-1.5" />}
                Generate {placeholder.type === 'figure' ? 'Figure' : 'Table'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Markdown Preview with Visual Placeholders ──────────────────────────────────

function MarkdownPreview({ content, stageId, onGenerateVisual }: { content: string; stageId: StageId; onGenerateVisual: (placeholderId: string) => void }) {
  const { sectionStages } = useArticleStore();
  const stage = sectionStages.find((s) => s.id === stageId);
  const placeholders = stage?.visualPlaceholders || [];

  // Split content by placeholder pattern and interleave with cards
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(PLACEHOLDER_REGEX.source, 'gi');
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Text before placeholder
    if (match.index > lastIndex) {
      parts.push(<div key={`md-${lastIndex}`} className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{content.slice(lastIndex, match.index)}</ReactMarkdown></div>);
    }
    // Find matching placeholder
    const phType = match[1].toLowerCase() as 'figure' | 'table';
    const phDesc = match[2].trim();
    const ph = placeholders.find((p) => p.description === phDesc && p.type === phType);
    if (ph) {
      parts.push(<VisualPlaceholderCard key={ph.id} placeholder={ph} onGenerate={onGenerateVisual} stageId={stageId} />);
    } else {
      parts.push(
        <div key={`placeholder-${match.index}`} className="my-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
          <span className="capitalize">{phType}:</span> {phDesc}
        </div>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push(<div key={`md-end`} className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{content.slice(lastIndex)}</ReactMarkdown></div>);
  }

  return <div className="space-y-1">{parts}</div>;
}

// ─── Stage Navigation Item (Left Column) ─────────────────────────────────────────

function StageNavItem({ stage, index, isActive, onClick }: { stage: SectionStage; index: number; isActive: boolean; onClick: () => void }) {
  const Icon = STAGE_ICONS[stage.id];
  const statusColors = {
    pending: 'text-muted-foreground bg-muted',
    generating: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
    done: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
    error: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  };

  return (
    <button onClick={onClick} className={cn('w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 group', isActive ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' : 'hover:bg-muted/50 border border-transparent')}>
      <div className="flex items-center gap-3">
        <div className={cn('flex items-center justify-center w-8 h-8 rounded-md shrink-0 transition-colors', statusColors[stage.status])}>
          {stage.status === 'generating' ? <Loader2 className="w-4 h-4 animate-spin" /> : stage.status === 'done' ? <Check className="w-4 h-4" /> : stage.status === 'error' ? <XCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-medium truncate', isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground')}>{stage.label}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {stage.targetWords > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {stage.targetWords.toLocaleString()} words
              </Badge>
            )}
            {stage.status === 'done' && stage.wordCount > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700">
                {stage.wordCount.toLocaleString()} actual
              </Badge>
            )}
          </div>
        </div>
        {isActive && stage.status === 'generating' && (
          <motion.div className="w-2 h-2 rounded-full bg-emerald-500" animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
        )}
      </div>
    </button>
  );
}

// ─── Stage Generation Area (Right Column) ────────────────────────────────────────

function StageGenerationArea({
  stage,
  stageIndex,
  onGenerate,
  onRegenerate,
  onCancel,
  onNext,
  isLastStage,
  onGenerateVisual,
  abortRef,
  statusText,
}: {
  stage: SectionStage;
  stageIndex: number;
  onGenerate: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
  onNext: () => void;
  isLastStage: boolean;
  onGenerateVisual: (placeholderId: string) => void;
  abortRef: React.MutableRefObject<AbortController | null>;
  statusText: string;
}) {
  if (stage.status === 'pending') {
    return (
      <motion.div key={`${stage.id}-pending`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-6">
          {React.createElement(STAGE_ICONS[stage.id], { className: 'w-8 h-8' })}
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">{stage.label}</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-2">{STAGE_DESCRIPTIONS[stage.id]}</p>
        {stage.targetWords > 0 && <p className="text-xs text-muted-foreground mb-8">Target: <span className="font-semibold text-foreground">{stage.targetWords.toLocaleString()} words</span></p>}
        <Button size="lg" onClick={onGenerate} className={cn('h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 gap-2')}>
          <Play className="w-5 h-5" /> Generate {stage.label}
        </Button>
      </motion.div>
    );
  }

  if (stage.status === 'generating') {
    return (
      <motion.div key={`${stage.id}-generating`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col items-center justify-center py-16 text-center">
        <motion.div className="relative mb-6" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="w-12 h-12 text-emerald-500" />
        </motion.div>
        <h2 className="text-xl font-bold text-foreground mb-2">Generating {stage.label}...</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{statusText || `AI is writing your ${stage.label.toLowerCase()} section. This may take a moment.`}</p>
        <Button variant="outline" size="sm" onClick={onCancel} className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30 gap-2">
          <XCircle className="w-4 h-4" /> Cancel
        </Button>
      </motion.div>
    );
  }

  if (stage.status === 'error') {
    return (
      <motion.div key={`${stage.id}-error`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-500 mb-6"><AlertCircle className="w-8 h-8" /></div>
        <h2 className="text-xl font-bold text-foreground mb-2">Generation Failed</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-2">{stage.error || 'An unexpected error occurred.'}</p>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => useArticleStore.getState().prevStep()} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
          <Button onClick={onRegenerate} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-2"><RotateCcw className="w-4 h-4" /> Retry</Button>
        </div>
      </motion.div>
    );
  }

  // 'done' status
  return (
    <motion.div key={`${stage.id}-done`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-5 h-5" /></div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{stage.label}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-xs">{stage.wordCount.toLocaleString()} words</Badge>
              {stage.targetWords > 0 && <span className="text-xs text-muted-foreground">/ {stage.targetWords.toLocaleString()} target</span>}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onRegenerate} className="text-muted-foreground hover:text-foreground gap-1.5"><RotateCcw className="w-3.5 h-3.5" /> Regenerate</Button>
      </div>
      <Separator />
      <ScrollArea className="max-h-[60vh]">
        <Card className="bg-background">
          <CardContent className="p-4 sm:p-6">
            <MarkdownPreview content={stage.content} stageId={stage.id} onGenerateVisual={onGenerateVisual} />
          </CardContent>
        </Card>
      </ScrollArea>
      {!isLastStage && (
        <div className="flex justify-end pt-2">
          <Button onClick={onNext} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white gap-2">
            Next: {STAGE_DEFINITIONS[stageIndex + 1]?.label} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Compile View (View 3) ──────────────────────────────────────────────────────

function CompileView({ onRegenerateAll, onCompile }: { onRegenerateAll: () => void; onCompile: () => void }) {
  const { sectionStages } = useArticleStore();
  const totalWords = sectionStages.reduce((sum, s) => sum + s.wordCount, 0);
  const allDone = sectionStages.every((s) => s.status === 'done');

  if (!allDone) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
          <GraduationCap className="w-8 h-8" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">All Sections Complete!</h2>
        <p className="text-muted-foreground">Your article sections have been generated. Review and compile below.</p>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Section Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sectionStages.map((stage) => {
              const Icon = STAGE_ICONS[stage.id];
              return (
                <div key={stage.id} className="flex items-center gap-3 text-sm">
                  <Icon className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="flex-1 text-foreground font-medium">{stage.label}</span>
                  <Badge variant="outline" className="text-xs tabular-nums">{stage.wordCount.toLocaleString()} words</Badge>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              );
            })}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Total</span>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold">{totalWords.toLocaleString()} words</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" onClick={onCompile} className={cn('flex-1 h-12 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 gap-2')}>
          <Sparkles className="w-5 h-5" /> Compile Article <ArrowRight className="w-5 h-5" />
        </Button>
        <Button size="lg" variant="outline" onClick={onRegenerateAll} className="gap-2 h-12">
          <RotateCcw className="w-4 h-4" /> Regenerate All
        </Button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════

export default function Step3Method() {
  const {
    references, selectedTitle, inputTitle, keywords, selectedKeywords, researchMethod, additionalInstructions,
    sectionStages, currentStageIndex, setCurrentStageIndex, updateStage, resetStages,
    compileArticleFromStages, nextStep,
  } = useArticleStore();

  // Effective title: fallback to inputTitle when selectedTitle is empty (Title mode)
  const effectiveTitle = selectedTitle || inputTitle || '';
  // Effective keywords: fallback to manually entered keywords when selectedKeywords is empty (Keywords mode)
  const effectiveKeywords = selectedKeywords.length > 0 ? selectedKeywords : keywords.filter(k => k.trim() !== '');

  const [view, setView] = useState<ViewMode>('config');
  const [selectedEngine, setSelectedEngine] = useState<AIEngineId>('zai');
  const [statusText, setStatusText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const visualAbortRef = useRef<AbortController | null>(null);

  const selectedRefs = useMemo(() => references.filter((r) => r.isSelected), [references]);
  const canGenerate = selectedRefs.length >= 5;
  const currentStage = sectionStages[currentStageIndex];
  const allDone = sectionStages.every((s) => s.status === 'done');
  const completedStages = sectionStages.filter((s) => s.status === 'done' && s.id !== currentStage?.id);
  const isLastStage = currentStageIndex === sectionStages.length - 1;

  // Switch to compile view when all done
  React.useEffect(() => {
    if (allDone && view === 'generating') {
      setView('compile');
    }
  }, [allDone, view]);

  // Auto-advance to next pending stage after completion
  React.useEffect(() => {
    if (currentStage?.status === 'done' && !allDone) {
      const nextIdx = sectionStages.findIndex((s, i) => i > currentStageIndex && s.status === 'pending');
      if (nextIdx !== -1) {
        setCurrentStageIndex(nextIdx);
      } else {
        // Check if any stage before current is pending (regenerate scenario)
        const prevPending = sectionStages.findIndex((s, i) => i < currentStageIndex && s.status === 'pending');
        if (prevPending === -1) {
          // All done or all handled
        }
      }
    }
  }, [currentStage?.status, allDone, currentStageIndex, sectionStages, setCurrentStageIndex]);

  const handleStartGeneration = useCallback(() => {
    if (!canGenerate) {
      toast.error('Please select at least 5 references.');
      return;
    }
    resetStages();
    setCurrentStageIndex(0);
    setView('generating');
    toast.success('Generation started! Generate each section step by step.');
  }, [canGenerate, resetStages, setCurrentStageIndex]);

  const handleGenerateStage = useCallback(async () => {
    if (!currentStage || currentStage.status === 'generating') return;

    const abort = new AbortController();
    abortRef.current = abort;

    updateStage(currentStage.id, {
      status: 'generating',
      error: undefined,
      content: '',
      wordCount: 0,
      visualPlaceholders: [],
      startedAt: new Date().toISOString(),
    });
    setStatusText(`Preparing to generate ${currentStage.label}...`);

    try {
      // 1. POST to create a generation job (returns immediately)
      const postRes = await fetch('/api/article/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageId: currentStage.id,
          title: effectiveTitle,
          keywords: effectiveKeywords,
          references: selectedRefs,
          researchMethod,
          additionalInstructions,
          engineId: selectedEngine,
          previousSections: completedStages.map((s) => ({ id: s.id, label: s.label, content: s.content })),
        }),
        signal: abort.signal,
      });

      const postData = await postRes.json();
      if (!postData.success) {
        throw new Error(postData.error || 'Failed to generate section');
      }

      // Synchronous mode: result is directly in the response
      if (postData.result) {
        updateStage(currentStage.id, {
          status: 'done',
          content: postData.result.content,
          wordCount: postData.result.wordCount || 0,
          visualPlaceholders: (postData.result.visualPlaceholders || []).map((p: { id: string; type: 'figure' | 'table'; description: string }) => ({
            ...p,
            generated: false,
          })),
          completedAt: new Date().toISOString(),
        });
        toast.success(`${currentStage.label} generated successfully!`);
        return;
      }

      // Legacy job mode: poll for result (fallback for older servers)
      if (!postData.jobId) {
        throw new Error('No result or jobId in response');
      }

      const jobId = postData.jobId;
      setStatusText(`Generation job started, waiting for ${currentStage.label}...`);

      const POLL_INTERVAL = 3000;
      const MAX_POLL_TIME = 10 * 60 * 1000;
      const startTime = Date.now();

      while (Date.now() - startTime < MAX_POLL_TIME) {
        if (abort.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        if (abort.signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const pollRes = await fetch(`/api/article/generate-section?jobId=${jobId}`, {
          signal: abort.signal,
        });
        if (!pollRes.ok) throw new Error(`Poll returned HTTP ${pollRes.status}`);
        const pollData = await pollRes.json();

        if (!pollData.success) throw new Error(pollData.error || 'Polling failed');

        if (pollData.status === 'done' && pollData.result) {
          updateStage(currentStage.id, {
            status: 'done',
            content: pollData.result.content,
            wordCount: pollData.result.wordCount || 0,
            visualPlaceholders: (pollData.result.visualPlaceholders || []).map((p: { id: string; type: 'figure' | 'table'; description: string }) => ({
              ...p,
              generated: false,
            })),
            completedAt: new Date().toISOString(),
          });
          toast.success(`${currentStage.label} generated successfully!`);
          return;
        }

        if (pollData.status === 'error') {
          throw new Error(pollData.error || 'Generation failed on server');
        }
      }

      throw new Error('Generation timed out after 10 minutes');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        updateStage(currentStage.id, { status: 'pending', error: undefined });
        toast.info(`${currentStage.label} generation cancelled.`);
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      updateStage(currentStage.id, { status: 'error', error: message });
      toast.error(`Failed to generate ${currentStage.label}: ${message}`);
    } finally {
      abortRef.current = null;
    }
  }, [currentStage, effectiveTitle, effectiveKeywords, selectedRefs, researchMethod, additionalInstructions, selectedEngine, completedStages, updateStage]);

  const handleCancelGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleRegenerate = useCallback(() => {
    if (!currentStage) return;
    updateStage(currentStage.id, { status: 'pending', content: '', wordCount: 0, visualPlaceholders: [], error: undefined });
  }, [currentStage, updateStage]);

  const handleNext = useCallback(() => {
    if (currentStageIndex < sectionStages.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    }
  }, [currentStageIndex, sectionStages.length, setCurrentStageIndex]);

  const handleStageClick = useCallback((index: number) => {
    const stage = sectionStages[index];
    if (stage.status === 'done' || stage.status === 'error' || stage.status === 'pending') {
      setCurrentStageIndex(index);
    }
  }, [sectionStages, setCurrentStageIndex]);

  const handleGenerateVisual = useCallback(async (placeholderId: string) => {
    const stage = sectionStages.find((s) => s.id === currentStage?.id);
    if (!stage) return;
    const placeholder = stage.visualPlaceholders.find((p) => p.id === placeholderId);
    if (!placeholder || placeholder.generated) return;

    const abort = new AbortController();
    visualAbortRef.current = abort;

    const failPlaceholder = (errMsg: string) => {
      const updatedPlaceholders = stage.visualPlaceholders.map((p) =>
        p.id === placeholderId ? { ...p, error: errMsg } : p
      );
      updateStage(stage.id, { visualPlaceholders: updatedPlaceholders });
    };

    try {
      // POST to start visual generation job
      const postRes = await fetch('/api/article/generate-visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: placeholder.type,
          description: placeholder.description,
          context: stage.content.substring(0, 500),
          articleTitle: effectiveTitle,
          engineId: selectedEngine,
        }),
        signal: abort.signal,
      });

      const postData = await postRes.json();
      if (!postData.success) {
        failPlaceholder(postData.error || 'Failed to generate visual');
        toast.error(postData.error || 'Failed to generate visual');
        return;
      }

      // Synchronous mode: result is directly in the response
      if (postData.result) {
        const updatedPlaceholders = stage.visualPlaceholders.map((p) =>
          p.id === placeholderId ? { ...p, generated: true, data: postData.result.data, error: undefined } : p
        );
        updateStage(stage.id, { visualPlaceholders: updatedPlaceholders });
        toast.success(`${placeholder.type === 'figure' ? 'Figure' : 'Table'} generated!`);
        return;
      }

      // Legacy job mode: poll for result
      if (!postData.jobId) {
        failPlaceholder('No result or jobId in response');
        toast.error('No result or jobId in response');
        return;
      }

      const jobId = postData.jobId;
      const POLL_INTERVAL = 3000;
      const MAX_POLL_TIME = 5 * 60 * 1000;
      const startTime = Date.now();

      while (Date.now() - startTime < MAX_POLL_TIME) {
        if (abort.signal.aborted) return;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        if (abort.signal.aborted) return;

        const pollRes = await fetch(`/api/article/generate-visual?jobId=${jobId}`, {
          signal: abort.signal,
        });
        if (!pollRes.ok) {
          failPlaceholder(`Poll returned HTTP ${pollRes.status}`);
          toast.error(`Poll returned HTTP ${pollRes.status}`);
          return;
        }
        const pollData = await pollRes.json();

        if (!pollData.success) {
          failPlaceholder(pollData.error || 'Polling failed');
          toast.error(pollData.error || 'Polling failed');
          return;
        }

        if (pollData.status === 'done' && pollData.result) {
          const updatedPlaceholders = stage.visualPlaceholders.map((p) =>
            p.id === placeholderId ? { ...p, generated: true, data: pollData.result.data, error: undefined } : p
          );
          updateStage(stage.id, { visualPlaceholders: updatedPlaceholders });
          toast.success(`${placeholder.type === 'figure' ? 'Figure' : 'Table'} generated!`);
          return;
        }

        if (pollData.status === 'error') {
          failPlaceholder(pollData.error || 'Generation failed');
          toast.error(pollData.error || 'Generation failed');
          return;
        }
      }

      failPlaceholder('Visual generation timed out');
      toast.error('Visual generation timed out');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      failPlaceholder(message);
      toast.error(message);
    }
  }, [sectionStages, currentStage, effectiveTitle, selectedEngine, updateStage]);

  const handleCompile = useCallback(() => {
    compileArticleFromStages();
    nextStep();
    toast.success('Article compiled! Moving to preview.');
  }, [compileArticleFromStages, nextStep]);

  const handleRegenerateAll = useCallback(() => {
    resetStages();
    setCurrentStageIndex(0);
    setView('generating');
  }, [resetStages, setCurrentStageIndex]);

  // ─── View 1: Configuration ──────────────────────────────────────────────────
  if (view === 'config') {
    return (
      <div className="space-y-6">
        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white"><Check className="size-3.5" /></div>
            <div className="w-12 h-0.5 bg-emerald-500" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white"><Check className="size-3.5" /></div>
            <div className="w-12 h-0.5 bg-emerald-500" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white pulse-dot"><span className="text-[10px] font-bold">3</span></div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-8 text-[10px] font-medium text-muted-foreground -mt-1">
          <span>Define</span><span>References</span><span className="text-emerald-600 dark:text-emerald-400">Generate</span>
        </div>

        <ReferencesSummary />
        <Separator />
        <MethodSelection />
        <AnimatePresence>
          {researchMethod && (
            <div className="mt-4">
              <MethodologyWorkflowPanel
                methodId={researchMethod}
                methodName={RESEARCH_METHODS.find((m) => m.id === researchMethod)?.title ?? researchMethod.replace(/-/g, ' ')}
              />
            </div>
          )}
        </AnimatePresence>
        <Separator />

        {/* Engine Selector */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"><Sparkles className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Pilih Tim Penulis</h3>
              <p className="text-sm text-muted-foreground">Pilih tim yang akan menulis artikel ilmiah Anda</p>
            </div>
          </div>
          <Card className="relative overflow-hidden">
            <motion.div className="absolute inset-0 rounded-lg pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), transparent 40%, transparent 60%, rgba(20,184,166,0.08))', backgroundSize: '200% 200%' }} animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }} />
            <CardContent className="relative py-4">
              <Select value={selectedEngine} onValueChange={(val) => setSelectedEngine(val as AIEngineId)}>
                <SelectTrigger className="w-full sm:w-[320px] bg-background border-emerald-200 dark:border-emerald-800 focus:ring-emerald-500 focus:border-emerald-500">
                  <SelectValue placeholder="Pilih tim penulis" />
                </SelectTrigger>
                <SelectContent>
                  {AI_ENGINES.map((engine) => (
                    <SelectItem key={engine.id} value={engine.id} className="py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">{engine.name}</span>
                        <span className="text-xs text-muted-foreground">{engine.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AnimatePresence mode="wait">
                <motion.p key={selectedEngine} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }} className="mt-2.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> {AI_ENGINES.find((e) => e.id === selectedEngine)?.bestFor}
                </motion.p>
              </AnimatePresence>
            </CardContent>
          </Card>
        </section>
        <Separator />

        {/* Additional Instructions */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"><Settings className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Instruksi Tambahan</h3>
              <p className="text-sm text-muted-foreground">Tambahkan persyaratan khusus (opsional)</p>
            </div>
          </div>
          <Card><CardContent className="pt-0">
            <Textarea value={additionalInstructions} onChange={(e) => useArticleStore.getState().setAdditionalInstructions(e.target.value)} placeholder="Tulis persyaratan tambahan seperti jurnal tujuan, fokus penelitian, kerangka teori, gaya sitasi..." className="min-h-[100px] resize-y text-sm leading-relaxed" />
            <p className="text-xs text-muted-foreground mt-2">{additionalInstructions.length > 0 ? `${additionalInstructions.length} karakter` : 'Opsional — biarkan kosong untuk auto-generasi'}</p>
          </CardContent></Card>
        </section>
        <Separator />

        {/* Start Generation */}
        <section>
          <Card className="bg-gradient-to-br from-muted/50 to-muted/30 border-dashed">
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Method</span><p className="font-medium text-foreground mt-0.5 capitalize">{researchMethod.replace(/-/g, ' ')}</p></div>
                <div><span className="text-muted-foreground">References</span><p className="font-medium text-foreground mt-0.5">{selectedRefs.length} selected</p></div>
                <div><span className="text-muted-foreground">Engine</span><p className="font-medium text-foreground mt-0.5">{AI_ENGINES.find((e) => e.id === selectedEngine)?.name}</p></div>
              </div>
              {!canGenerate && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-400"><MessageSquareWarning className="w-4 h-4 inline mr-1.5 -mt-0.5" />Please select at least <strong>5 references</strong> before generating.</p>
                </div>
              )}
              {canGenerate && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50/60 border border-emerald-200/60 dark:bg-emerald-950/20 dark:border-emerald-800/30 px-3 py-2">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">Sections will be generated one at a time. You can review and regenerate each before proceeding.</span>
                </div>
              )}
              <Button size="lg" disabled={!canGenerate} onClick={handleStartGeneration} className={cn('w-full h-14 text-base font-semibold relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300')}>
                <Play className="w-5 h-5" /> Start Generation <ArrowRight className="w-5 h-5" />
                <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
              </Button>
            </CardContent>
          </Card>
        </section>
        <Separator />

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => useArticleStore.getState().prevStep()} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to References</Button>
          <span className="text-xs text-muted-foreground">Step 3 of 5</span>
        </div>
      </div>
    );
  }

  // ─── View 3: Compile Complete ──────────────────────────────────────────────
  if (view === 'compile') {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <CompileView onRegenerateAll={handleRegenerateAll} onCompile={handleCompile} />
        </div>
        <Separator />
        <div className="flex items-center justify-between py-4">
          <Button variant="outline" onClick={() => setView('generating')} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Sections</Button>
          <span className="text-xs text-muted-foreground">Step 3 of 5</span>
        </div>
      </div>
    );
  }

  // ─── View 2: Step-by-Step Generation ──────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"><GraduationCap className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Section Generation</h2>
              <p className="text-xs text-muted-foreground">Generate your article section by section</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {sectionStages.filter((s) => s.status === 'done').length}/{sectionStages.length} done
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setView('config')} className="text-muted-foreground gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" /> Settings
            </Button>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Left Column: Stage Navigation */}
          <div className="md:w-[300px] shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-3">
                <div className="space-y-1">
                  {sectionStages.map((stage, idx) => (
                    <StageNavItem key={stage.id} stage={stage} index={idx} isActive={idx === currentStageIndex} onClick={() => handleStageClick(idx)} />
                  ))}
                </div>
                {/* Overall progress */}
                <Separator className="my-3" />
                <div className="px-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Overall Progress</span>
                    <span>{sectionStages.filter((s) => s.status === 'done').length}/{sectionStages.length}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${(sectionStages.filter((s) => s.status === 'done').length / sectionStages.length) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Generation Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <StageGenerationArea
                key={currentStage?.id || 'empty'}
                stage={currentStage || sectionStages[0]}
                stageIndex={currentStageIndex}
                onGenerate={handleGenerateStage}
                onRegenerate={handleRegenerate}
                onCancel={handleCancelGeneration}
                onNext={handleNext}
                isLastStage={isLastStage}
                onGenerateVisual={handleGenerateVisual}
                abortRef={abortRef}
                statusText={statusText}
              />
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Separator className="mt-6" />
      <div className="flex items-center justify-between py-4">
        <Button variant="outline" onClick={() => useArticleStore.getState().prevStep()} className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to References</Button>
        <span className="text-xs text-muted-foreground">Step 3 of 5</span>
      </div>
    </div>
  );
}