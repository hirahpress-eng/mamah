'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useCicilStore, type CicilStepState } from '@/store/cicil-writing-store';
import {
  WRITING_FLOWS,
  getTotalSteps,
  getTotalTargetWords,
  type CicilWritingMode,
} from '@/lib/writing-flows';
import { AI_ENGINES } from '@/lib/ai-engine-config';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import {
  ArrowLeft,
  Play,
  Check,
  Loader2,
  Copy,
  BookOpen,
  ChevronRight,
  Sparkles,
  RotateCcw,
  FileText,
  Library,
  Search,
  Globe,
  Download,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  XCircle,
  Eye,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CicilGeneratorProps {
  mode: CicilWritingMode;
  onBack: () => void;
}

interface ReferenceSearchResult {
  id: string;
  authors: string;
  title: string;
  year: number | string;
  journal?: string;
  doi?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  refType: string;
  isSelected: boolean;
  abstract?: string;
  keywords?: string[];
  relevanceScore?: number;
  source?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(n);
}

/** Poll a job-based API until done or error */
async function pollJobApi(
  baseUrl: string,
  jobId: string,
  maxAttempts = 200,
  intervalMs = 3000,
): Promise<Record<string, unknown> | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${baseUrl}?jobId=${encodeURIComponent(jobId)}`);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }
      const data = await res.json();
      if (data.status === 'done') return data.result ?? data;
      if (data.status === 'error') return null;
      // still running
      await new Promise((r) => setTimeout(r, intervalMs));
    } catch {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return null;
}

const fadeSlideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CicilGenerator({ mode, onBack }: CicilGeneratorProps) {
  const store = useCicilStore();
  const flowConfig = WRITING_FLOWS[mode];

  // Local UI state
  const [inputTab, setInputTab] = useState<string>('keywords');
  const [keywordsInput, setKeywordsInput] = useState(store.keywords.join(', '));
  const [titleInput, setTitleInput] = useState(store.title);
  const [ideaInput, setIdeaInput] = useState(store.idea);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [translatedKeywords, setTranslatedKeywords] = useState<
    Record<string, string[]>
  >({});
  const [booleanQueries, setBooleanQueries] = useState<string[]>([]);
  const [searchStats, setSearchStats] = useState<{
    totalRaw: number;
    duplicates: number;
    afterDedupe: number;
    included: number;
    excluded: number;
    include: string[];
    exclude: string[];
    criteriaReasoning: string;
  } | null>(null);
  const [refPipelineStep, setRefPipelineStep] = useState(0);
  // 0=idle, 1=translating, 2=boolean, 3=searching, 4=reporting, 5=analyzing criteria, 6=applying filter, 7=done
  const [activeChapter, setActiveChapter] = useState<string>(
    flowConfig.chapters[0]?.id ?? ''
  );
  const abortRef = useRef<AbortController | null>(null);
  const autoGenRef = useRef(false);

  // Sync local state from store on mount
  useEffect(() => {
    setKeywordsInput(store.keywords.join(', '));
    setTitleInput(store.title);
    setIdeaInput(store.idea);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // ─── Phase 1: INPUT ─────────────────────────────────────────────────────

  const handleGenerateKeywords = useCallback(async () => {
    const idea = ideaInput.trim();
    if (!idea) {
      toast.error('Masukkan ide penelitian terlebih dahulu');
      return;
    }
    setIsGeneratingKeywords(true);
    try {
      const res = await fetch('/api/generate/idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });
      if (!res.ok) throw new Error('Gagal menghasilkan kata kunci');
      const data = await res.json();
      const kws: string[] = data.keywords ?? [];
      if (kws.length > 0) {
        setKeywordsInput(kws.join(', '));
        store.setKeywords(kws);
        toast.success(`${kws.length} kata kunci berhasil dihasilkan`);
      } else {
        toast.warning('Tidak ada kata kunci yang dihasilkan');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      toast.error(msg);
    } finally {
      setIsGeneratingKeywords(false);
    }
  }, [ideaInput, mode, store]);

  const handleGenerateTitles = useCallback(async () => {
    const kws = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (kws.length === 0) {
      toast.error('Masukkan kata kunci terlebih dahulu');
      return;
    }
    setIsGeneratingTitles(true);
    try {
      const res = await fetch('/api/generate/titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: kws, mode }),
      });
      if (!res.ok) throw new Error('Gagal menghasilkan judul');
      const data = await res.json();
      const titles: string[] = data.titles ?? [];
      setGeneratedTitles(titles);
      if (titles.length > 0) {
        toast.success(`${titles.length} judul berhasil dihasilkan`);
      } else {
        toast.warning('Tidak ada judul yang dihasilkan');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      toast.error(msg);
    } finally {
      setIsGeneratingTitles(false);
    }
  }, [keywordsInput, mode]);

  const handleProceedToReferences = useCallback(() => {
    const kws = keywordsInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const title = titleInput.trim();

    if (!title && kws.length === 0) {
      toast.error('Masukkan judul atau kata kunci terlebih dahulu');
      return;
    }

    store.setKeywords(kws);
    store.setTitle(title);
    store.setIdea(ideaInput.trim());
    store.setPhase('references');
  }, [keywordsInput, titleInput, ideaInput, store]);

  // ─── Phase 2: REFERENCES ───────────────────────────────────────────────

  const handleSearchReferences = useCallback(async () => {
    let title = store.title.trim();
    let keywords = [...store.keywords];
    if (!title && keywords.length === 0) {
      toast.error('Judul dan kata kunci diperlukan untuk pencarian');
      return;
    }

    // Auto-generate keywords from title if keywords is empty
    if (keywords.length === 0 && title) {
      store.setIsSearchingRefs(true);
      store.setRefSearchProgress(2);
      store.setRefSearchMessage('Mengekstrak kata kunci dari judul...');
      try {
        const kwRes = await fetch('/api/generate/keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        if (kwRes.ok) {
          const kwData = await kwRes.json();
          const generated: string[] = kwData.keywords ?? [];
          if (generated.length > 0) {
            keywords = generated;
            store.setKeywords(keywords);
            setKeywordsInput(keywords.join(', '));
            toast.success(`${keywords.length} kata kunci diekstrak dari judul`);
          }
        }
      } catch {
        // Fallback: split title into meaningful words as keywords
        keywords = title
          .split(/[\s:;\-,.]+/)
          .filter((w) => w.length > 3)
          .slice(0, 5);
        if (keywords.length > 0) {
          store.setKeywords(keywords);
          setKeywordsInput(keywords.join(', '));
        }
      }
      if (keywords.length === 0) {
        store.setIsSearchingRefs(false);
        toast.error('Gagal mengekstrak kata kunci dari judul. Coba masukkan kata kunci manual.');
        return;
      }
    }

    store.setIsSearchingRefs(true);
    store.setRefSearchProgress(0);
    store.setRefSearchMessage('Memulai pipeline pencarian referensi...');

    // Collect all translated queries to pass to search
    let allTranslatedQueries: string[][] = [];

    try {
      // ═══ PIPELINE STEP 1: Translate keywords to 5 languages ═══
      setRefPipelineStep(1);
      store.setRefSearchProgress(5);
      store.setRefSearchMessage('Langkah 1/6: Menerjemahkan kata kunci ke 5 bahasa populer...');
      try {
        const translateRes = await fetch('/api/references/translate-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords, title }),
        });
        if (translateRes.ok) {
          const translateData = await translateRes.json();
          let translateResult: Record<string, unknown> | null = null;

          // Synchronous mode: result is directly in the response
          if (translateData.languages && typeof translateData.languages === 'object') {
            translateResult = translateData;
          }
          // Legacy job mode: poll for result
          else if (translateData.jobId) {
            store.setRefSearchMessage('Langkah 1/6: Menunggu terjemahan kata kunci...');
            translateResult = await pollJobApi('/api/references/translate-keywords', translateData.jobId, 60, 3000);
          }

          if (translateResult?.languages && typeof translateResult.languages === 'object') {
            const langs = translateResult.languages as Record<string, Record<string, unknown>>;
            const mapped: Record<string, string[]> = {};
            for (const [code, langData] of Object.entries(langs)) {
              const name = (langData.name as string) || code;
              const queries = (langData.keywordQueries as string[]) || [];
              mapped[name] = queries;
              if (queries.length > 0) allTranslatedQueries.push(queries);
            }
            setTranslatedKeywords(mapped);
          }
        }
      } catch {
        // Non-critical, continue pipeline
      }

      // ═══ PIPELINE STEP 2: Generate boolean queries ═══
      setRefPipelineStep(2);
      store.setRefSearchProgress(15);
      store.setRefSearchMessage('Langkah 2/6: Membuat boolean query untuk pencarian paling relevan...');
      try {
        const boolRes = await fetch('/api/references/generate-boolean', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keywords, title }),
        });
        if (boolRes.ok) {
          const boolData = await boolRes.json();
          let boolResult: Record<string, unknown> | null = null;

          // Synchronous mode: result is directly in the response
          if (boolData.booleanQueries && typeof boolData.booleanQueries === 'object') {
            boolResult = boolData;
          }
          // Legacy job mode: poll for result
          else if (boolData.jobId) {
            store.setRefSearchMessage('Langkah 2/6: Menunggu boolean query...');
            boolResult = await pollJobApi('/api/references/generate-boolean', boolData.jobId, 60, 3000);
          }

          if (boolResult?.booleanQueries && typeof boolResult.booleanQueries === 'object') {
            const bq = boolResult.booleanQueries as Record<string, string[]>;
            const allQueries: string[] = [];
            for (const [, queries] of Object.entries(bq)) {
              if (Array.isArray(queries)) allQueries.push(...queries);
            }
            setBooleanQueries(allQueries);
          }
        }
      } catch {
        // Non-critical, continue pipeline
      }

      // ═══ PIPELINE STEP 3: Search references (with translated queries) ═══
      setRefPipelineStep(3);
      store.setRefSearchProgress(25);
      store.setRefSearchMessage('Langkah 3/6: Mencari referensi di 11 database akademik...');

      const searchPayload: Record<string, unknown> = { title, keywords, maxResults: 80 };
      if (allTranslatedQueries.length > 0) {
        searchPayload.translatedQueries = allTranslatedQueries;
      }

      const searchRes = await fetch('/api/references/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchPayload),
      });

      if (!searchRes.ok) throw new Error('Gagal mencari referensi');
      const searchData = await searchRes.json();

      store.setRefSearchMessage('Langkah 3/6: Mencari di 11 database akademik (ini membutuhkan waktu)...');

      // Synchronous mode: result is directly in the POST response
      const searchResult = searchData.success ? searchData.result : null;
      if (!searchResult) throw new Error('Pencarian referensi gagal atau timeout');

      const rawRefs = (searchResult.references ?? []) as Record<string, unknown>[];
      const meta = (searchResult.meta ?? {}) as Record<string, unknown>;
      const totalRaw = Number(meta.totalRaw ?? rawRefs.length);
      const afterDedupe = Number(meta.afterDedupe ?? rawRefs.length);
      const duplicates = totalRaw - afterDedupe;

      const refs: ReferenceSearchResult[] = rawRefs.map(
        (r, i) => ({
          id: (r.id as string) ?? `ref-${i}`,
          authors: (r.authors as string) ?? '',
          title: (r.title as string) ?? '',
          year: (r.year as number | string) ?? '',
          journal: r.journal as string | undefined,
          doi: r.doi as string | undefined,
          volume: r.volume as string | undefined,
          issue: r.issue as string | undefined,
          pages: r.pages as string | undefined,
          refType: (r.refType as string) ?? 'article',
          isSelected: false,
          abstract: r.abstract as string | undefined,
          keywords: r.keywords as string[] | undefined,
          relevanceScore: r.relevanceScore as number | undefined,
          source: r.source as string | undefined,
        })
      );

      store.setReferences(refs);

      // ═══ PIPELINE STEP 4: Report total & duplicates ═══
      setRefPipelineStep(4);
      store.setRefSearchProgress(55);
      store.setRefSearchMessage(`Langkah 4/6: Mencatat hasil — ${totalRaw} ditemukan, ${duplicates} duplikat dihapus, ${afterDedupe} unik tersisa.`);

      // Show interim stats
      setSearchStats({
        totalRaw,
        duplicates,
        afterDedupe,
        included: 0,
        excluded: 0,
        include: [],
        exclude: [],
        criteriaReasoning: '',
      });

      toast.info(`${totalRaw} referensi ditemukan, ${duplicates} duplikat dihapus`);

      // ═══ PIPELINE STEP 5: AI Generate include/exclude criteria ═══
      setRefPipelineStep(5);
      store.setRefSearchProgress(60);
      store.setRefSearchMessage('Langkah 5/6: AI menganalisis referensi & menghasilkan kriteria include/exclude...');

      let includeCriteria: string[] = [];
      let excludeCriteria: string[] = [];
      let criteriaReasoning = '';

      try {
        const analyzeRes = await fetch('/api/references/analyze-criteria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            keywords,
            references: refs.slice(0, 80).map((r) => ({
              id: r.id,
              title: r.title,
              abstract: r.abstract?.slice(0, 200),
              year: r.year,
              journal: r.journal,
              source: r.source,
            })),
          }),
        });

        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json();
          // Synchronous mode: result is directly in the response
          if (analyzeData.success && (analyzeData.include || analyzeData.exclude)) {
            includeCriteria = analyzeData.include ?? [];
            excludeCriteria = analyzeData.exclude ?? [];
            criteriaReasoning = analyzeData.reasoning ?? '';
          }
          // Legacy job mode: poll for result
          else if (analyzeData.jobId) {
            store.setRefSearchMessage('Langkah 5/6: Menunggu analisis kriteria...');
            const analyzeResult = await pollJobApi('/api/references/analyze-criteria', analyzeData.jobId, 90, 3000);
            if (analyzeResult?.result) {
              const result = analyzeResult.result as { include?: string[]; exclude?: string[]; reasoning?: string };
              includeCriteria = result.include ?? [];
              excludeCriteria = result.exclude ?? [];
              criteriaReasoning = result.reasoning ?? '';
            }
          }
        }
      } catch {
        // Non-critical, continue with empty criteria
      }

      // ═══ PIPELINE STEP 6: Apply include/exclude filtering ═══
      setRefPipelineStep(6);
      store.setRefSearchProgress(80);
      store.setRefSearchMessage('Langkah 6/6: Menerapkan filter include/exclude pada referensi...');

      // Build lowercase keyword sets for matching
      const includeLower = includeCriteria.map((c) => c.toLowerCase());
      const excludeLower = excludeCriteria.map((c) => c.toLowerCase());
      const kwLower = keywords.map((k) => k.toLowerCase());

      // Score each reference: check title, abstract, journal against criteria
      const scoredRefs = refs.map((ref) => {
        const refText = [
          ref.title,
          ref.abstract ?? '',
          ref.journal ?? '',
          ref.authors,
        ].join(' ').toLowerCase();

        let includeScore = 0;
        let excludeScore = 0;

        // Check against AI-generated criteria
        for (const criterion of includeLower) {
          if (criterion.length > 3 && refText.includes(criterion)) includeScore++;
        }
        for (const criterion of excludeLower) {
          if (criterion.length > 3 && refText.includes(criterion)) excludeScore++;
        }

        // Also boost by keyword overlap in title
        for (const kw of kwLower) {
          if (kw.length > 2 && ref.title.toLowerCase().includes(kw)) includeScore += 2;
        }

        // Relevance score boost
        if (ref.relevanceScore != null) includeScore += ref.relevanceScore * 3;

        return { ref, includeScore, excludeScore };
      });

      // Sort by includeScore desc, excludeScore asc
      scoredRefs.sort((a, b) => {
        if (b.includeScore !== a.includeScore) return b.includeScore - a.includeScore;
        return a.excludeScore - b.excludeScore;
      });

      // Apply selection: top 60% get auto-selected, or those with includeScore > 0
      const autoSelectCount = Math.max(Math.ceil(scoredRefs.length * 0.6), 5);
      const finalRefs = scoredRefs.map((s, i) => ({
        ...s.ref,
        isSelected: i < autoSelectCount && s.excludeScore === 0,
      }));

      const includedCount = finalRefs.filter((r) => r.isSelected).length;
      const excludedCount = finalRefs.length - includedCount;

      store.setReferences(finalRefs);

      // Final stats
      setSearchStats({
        totalRaw,
        duplicates,
        afterDedupe,
        included: includedCount,
        excluded: excludedCount,
        include: includeCriteria,
        exclude: excludeCriteria,
        criteriaReasoning,
      });

      setRefPipelineStep(7);
      store.setRefSearchProgress(100);
      store.setRefSearchMessage(
        `Pipeline selesai! ${includedCount} referensi relevan terpilih dari ${afterDedupe} unik.`
      );
      toast.success(`Pipeline selesai: ${totalRaw} ditemukan → ${afterDedupe} unik → ${includedCount} terpilih`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      toast.error(msg);
      store.setRefSearchMessage(msg);
    } finally {
      store.setIsSearchingRefs(false);
    }
  }, [store, setKeywordsInput]);

  const handleStartWriting = useCallback(() => {
    const selectedRefs = store.references.filter((r) => r.isSelected);
    if (selectedRefs.length === 0) {
      toast.error('Pilih minimal satu referensi');
      return;
    }
    store.initSteps(mode);
  }, [store, mode]);

  // ─── Phase 3: WRITING ──────────────────────────────────────────────────

  const generateSingleStep = useCallback(
    async (step: CicilStepState): Promise<string | null> => {
      store.updateStep(step.stepId, {
        status: 'generating',
        startedAt: new Date().toISOString(),
        jobId: undefined,
        error: undefined,
      });

      try {
        const selectedRefs = store.references.filter((r) => r.isSelected);

        const res = await fetch('/api/writing/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stepId: step.stepId,
            label: step.label,
            labelId: step.labelId,
            targetWords: step.targetWords,
            promptFocus: step.promptFocus,
            engineId: store.generationEngine,
            title: store.title || 'Untitled Document',
            keywords: store.keywords,
            references: selectedRefs.map((r) => ({
              authors: r.authors,
              title: r.title,
              year: r.year,
              journal: r.journal,
              doi: r.doi,
              refType: r.refType,
              isSelected: r.isSelected,
            })),
            systemPrompt: flowConfig.systemPrompt,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as Record<string, string>).error ??
              `HTTP ${res.status}: Gagal memulai generasi`
          );
        }

        const data = await res.json();

        // Synchronous mode: result is directly in the POST response
        if (!data.success || !data.result) {
          throw new Error(data.error || 'Gagal menghasilkan bagian ini');
        }

        const { content, wordCount } = data.result;
        const wc = wordCount || countWords(content);
        store.updateStep(step.stepId, {
          status: 'done',
          content,
          wordCount: wc,
          completedAt: new Date().toISOString(),
        });
        return content;
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Gagal memulai generasi';
        store.updateStep(step.stepId, {
          status: 'error',
          error: msg,
        });
        toast.error(`${step.label}: ${msg}`);
        return null;
      }
    },
    [store, mode, flowConfig]
  );

  const handleGenerateStep = useCallback(
    async (step: CicilStepState) => {
      if (step.status === 'generating' || step.status === 'done') return;

      await generateSingleStep(step);
    },
    [generateSingleStep]
  );

  const handleAutoGenerateAll = useCallback(async () => {
    if (store.isAutoGenerating) return;

    autoGenRef.current = true;
    store.setIsAutoGenerating(true);

    try {
      const pendingSteps = store.steps.filter(
        (s) => s.status === 'pending' || s.status === 'error'
      );

      if (pendingSteps.length === 0) {
        toast.info('Semua bagian sudah selesai');
        store.setIsAutoGenerating(false);
        autoGenRef.current = false;
        return;
      }

      toast.info(
        `Memulai auto-generate ${pendingSteps.length} bagian...`
      );

      for (const step of pendingSteps) {
        if (!autoGenRef.current) {
          toast.info('Auto-generate dihentikan');
          break;
        }

        // Set current step index
        const idx = store.steps.findIndex((s) => s.stepId === step.stepId);
        if (idx >= 0) store.setCurrentStepIndex(idx);

        const content = await generateSingleStep(step);
        if (content === null) continue;

        toast.success(`✅ ${step.labelId} selesai`);
      }

      // Check if all done
      const allDone = store.steps.every(
        (s) => s.status === 'done' || s.status === 'error'
      );
      if (allDone && autoGenRef.current) {
        const doneCount = store.steps.filter((s) => s.status === 'done').length;
        toast.success(`🎉 Semua ${doneCount} bagian selesai digenerasi!`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Terjadi kesalahan saat auto-generate';
      toast.error(msg);
    } finally {
      store.setIsAutoGenerating(false);
      autoGenRef.current = false;
    }
  }, [store, generateSingleStep]);

  const handleStopAutoGenerate = useCallback(() => {
    autoGenRef.current = false;
    store.setIsAutoGenerating(false);
    toast.info('Auto-generate dihentikan');
  }, [store]);

  const handleViewResult = useCallback(() => {
    store.compileFullOutput();
  }, [store]);

  // ─── Phase 4: OUTPUT ───────────────────────────────────────────────────

  const handleCopyOutput = useCallback(async () => {
    if (!store.fullOutput) return;
    try {
      await navigator.clipboard.writeText(store.fullOutput);
      toast.success('Berhasil disalin ke clipboard');
    } catch {
      toast.error('Gagal menyalin ke clipboard');
    }
  }, [store.fullOutput]);

  // ─── Render Helpers ─────────────────────────────────────────────────────

  const progressPercent = store.getProgressPercent();
  const totalSteps = getTotalSteps(mode);
  const totalTargetWords = getTotalTargetWords(mode);
  const completedSteps = store.steps.filter((s) => s.status === 'done').length;
  const totalWordsWritten = store.steps.reduce(
    (sum, s) => sum + s.wordCount,
    0
  );
  const allDone =
    store.steps.length > 0 &&
    store.steps.every((s) => s.status === 'done' || s.status === 'error');

  // Group steps by chapter
  const chapters = flowConfig.chapters.map((ch) => ({
    ...ch,
    steps: store.steps.filter((s) => s.chapterId === ch.id),
  }));

  // ─── Phase Renderers ───────────────────────────────────────────────────

  const renderInputPhase = () => (
    <motion.div
      key="input"
      {...fadeSlideUp}
      className="flex flex-1 flex-col gap-6"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Mulai Menulis {flowConfig.title}
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          {flowConfig.description} • {formatNumber(totalTargetWords)} kata
          target • {totalSteps} bagian
        </p>
      </div>

      {/* Input Tabs */}
      <Tabs value={inputTab} onValueChange={setInputTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keywords" className="text-xs sm:text-sm">
            <Sparkles className="mr-1.5 hidden size-4 sm:inline-block" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="judul" className="text-xs sm:text-sm">
            <FileText className="mr-1.5 hidden size-4 sm:inline-block" />
            Judul
          </TabsTrigger>
          <TabsTrigger value="ide" className="text-xs sm:text-sm">
            <BookOpen className="mr-1.5 hidden size-4 sm:inline-block" />
            Ide
          </TabsTrigger>
        </TabsList>

        {/* Keywords Tab */}
        <TabsContent value="keywords" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Kata Kunci (pisahkan dengan koma)
                </label>
                <Input
                  placeholder="contoh: pembelajaran, matematika, media digital, motivasi siswa"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-400">
                  Minimal 3 kata kunci untuk hasil optimal
                </p>
              </div>
              <Button
                onClick={handleGenerateKeywords}
                disabled={isGeneratingKeywords || !ideaInput.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isGeneratingKeywords ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                Generate Kata Kunci dari Ide
              </Button>
              {store.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {store.keywords.map((kw, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Judul Tab */}
        <TabsContent value="judul" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Judul Penelitian
                </label>
                <Input
                  placeholder="Masukkan judul penelitian Anda..."
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleGenerateTitles}
                disabled={isGeneratingTitles || store.keywords.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isGeneratingTitles ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                Generate Judul
              </Button>
              {generatedTitles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">
                    Pilih salah satu judul atau tulis sendiri:
                  </p>
                  <ScrollArea className="max-h-48 w-full">
                    <div className="space-y-2 pr-2">
                      {generatedTitles.map((t, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setTitleInput(t);
                            toast.success('Judul dipilih');
                          }}
                          className="w-full rounded-lg border border-gray-200 p-3 text-left text-sm text-gray-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
                        >
                          <span className="mr-2 font-medium text-emerald-600">
                            {i + 1}.
                          </span>
                          {t}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ide Tab */}
        <TabsContent value="ide" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Ide / Topik Penelitian
                </label>
                <Textarea
                  placeholder="Jelaskan ide atau topik penelitian Anda secara detail. Semakin detail, semakin baik hasilnya..."
                  value={ideaInput}
                  onChange={(e) => setIdeaInput(e.target.value)}
                  className="min-h-[150px] w-full resize-y"
                />
                <p className="text-xs text-gray-400">
                  Deskripsi yang detail membantu AI menghasilkan konten yang lebih
                  relevan
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-auto pt-4">
        <Button
          onClick={handleProceedToReferences}
          disabled={!titleInput.trim() && store.keywords.length === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
        >
          Lanjut ke Referensi
          <ChevronRight className="ml-2 size-5" />
        </Button>
      </div>
    </motion.div>
  );

  const renderReferencesPhase = () => (
    <motion.div
      key="references"
      {...fadeSlideUp}
      className="flex flex-1 flex-col gap-5"
    >
      {/* Header */}
      <div>
        <button
          onClick={() => store.setPhase('input')}
          className="mb-3 flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-emerald-600"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Input
        </button>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
          <Library className="mr-2 inline-block size-6 text-emerald-600" />
          Cari Referensi
        </h2>
      </div>

      {/* Title & Keywords Summary */}
      <Card className="border-emerald-100 bg-emerald-50/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                Judul
              </span>
              <p className="text-sm font-semibold text-gray-800">
                {store.title || '(belum ada judul)'}
              </p>
            </div>
            {store.keywords.length > 0 && (
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                  Kata Kunci
                </span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {store.keywords.map((kw, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 text-xs"
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Button */}
      {!store.isSearchingRefs && store.references.length === 0 && (
        <Button
          onClick={handleSearchReferences}
          className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Search className="mr-2 size-5" />
          Cari Referensi
        </Button>
      )}

      {/* Search Progress — Pipeline Steps */}
      {store.isSearchingRefs && (
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 animate-spin text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">
                {store.refSearchMessage}
              </span>
            </div>
            <Progress
              value={store.refSearchProgress}
              className="h-2.5 bg-emerald-100"
            />
            {/* Pipeline Step Indicator */}
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
              {[
                { label: 'Terjemah', step: 1 },
                { label: 'Boolean', step: 2 },
                { label: 'Search', step: 3 },
                { label: 'Laporan', step: 4 },
                { label: 'Analisis', step: 5 },
                { label: 'Filter', step: 6 },
              ].map((s) => {
                const isDone = refPipelineStep > s.step;
                const isActive = refPipelineStep === s.step;
                return (
                  <div
                    key={s.step}
                    className={`flex items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-colors ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isDone ? (
                      <Check className="mr-1 size-3" />
                    ) : isActive ? (
                      <Loader2 className="mr-1 size-3 animate-spin" />
                    ) : null}
                    {s.label}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Pipeline Referensi</span>
              <span>{store.refSearchProgress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Stats — Pipeline Report */}
      {searchStats && !store.isSearchingRefs && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                <FileText className="mr-1.5 inline-block size-4 text-emerald-600" />
                Hasil Pipeline Pencarian
              </h3>
              <Badge className="bg-emerald-600 text-white">
                {searchStats.included} terpilih
              </Badge>
            </div>

            {/* Pipeline flow visualization */}
            <div className="flex items-center justify-center gap-1 text-xs sm:gap-2">
              <div className="rounded-lg bg-blue-50 px-2.5 py-2 text-center">
                <p className="text-base font-bold text-blue-700">{searchStats.totalRaw}</p>
                <p className="text-blue-500">Ditemukan</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-gray-300" />
              <div className="rounded-lg bg-amber-50 px-2.5 py-2 text-center">
                <p className="text-base font-bold text-amber-600">{searchStats.duplicates}</p>
                <p className="text-amber-500/70">Duplikat</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-gray-300" />
              <div className="rounded-lg bg-gray-50 px-2.5 py-2 text-center">
                <p className="text-base font-bold text-gray-700">{searchStats.afterDedupe}</p>
                <p className="text-gray-500">Unik</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-gray-300" />
              <div className="rounded-lg bg-emerald-50 px-2.5 py-2 text-center">
                <p className="text-base font-bold text-emerald-600">{searchStats.included}</p>
                <p className="text-emerald-600/70">Terpilih</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-gray-300" />
              <div className="rounded-lg bg-red-50 px-2.5 py-2 text-center">
                <p className="text-base font-bold text-red-500">{searchStats.excluded}</p>
                <p className="text-red-400">Dikecualikan</p>
              </div>
            </div>

            {/* Criteria Reasoning */}
            {searchStats.criteriaReasoning && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
                <p className="text-xs font-medium text-emerald-700 mb-1">
                  <Sparkles className="mr-1 inline-block size-3" />
                  Analisis AI
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {searchStats.criteriaReasoning}
                </p>
              </div>
            )}

            {/* Include Criteria */}
            {searchStats.include.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="mr-1 inline-block size-3" />
                  Kriteria Include ({searchStats.include.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {searchStats.include.map((c, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs border-emerald-200 text-emerald-700"
                    >
                      + {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {/* Exclude Criteria */}
            {searchStats.exclude.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-red-500">
                  <XCircle className="mr-1 inline-block size-3" />
                  Kriteria Exclude ({searchStats.exclude.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {searchStats.exclude.map((c, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs border-red-200 text-red-600"
                    >
                      - {c}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Boolean Queries */}
      {booleanQueries.length > 0 && !store.isSearchingRefs && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-800">
                Boolean Queries (Multi-bahasa)
              </h3>
            </div>
            <ScrollArea className="max-h-32">
              <div className="space-y-1.5 pr-2">
                {booleanQueries.map((q, i) => (
                  <div
                    key={i}
                    className="rounded bg-gray-50 px-3 py-1.5 text-xs font-mono text-gray-600 break-all"
                  >
                    {q}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Translated Keywords */}
      {Object.keys(translatedKeywords).length > 0 && !store.isSearchingRefs && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-800">
                Terjemahan Kata Kunci
              </h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(translatedKeywords).map(([lang, words]) => (
                <div
                  key={lang}
                  className="rounded-lg border border-gray-100 bg-gray-50/50 p-2.5"
                >
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {lang}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {words.map((w, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {w}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reference List */}
      {store.references.length > 0 && !store.isSearchingRefs && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Daftar Referensi
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={store.selectAllReferences}
                  className="text-xs h-7"
                >
                  Pilih Semua
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={store.deselectAllReferences}
                  className="text-xs h-7"
                >
                  Batal Semua
                </Button>
              </div>
            </div>
            <ScrollArea className="max-h-96 w-full">
              <div className="space-y-2 pr-2">
                {store.references.map((ref) => (
                  <div
                    key={ref.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      ref.isSelected
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    <Checkbox
                      checked={ref.isSelected}
                      onCheckedChange={() => store.toggleReference(ref.id)}
                      className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-snug">
                        {ref.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {ref.authors}
                        {ref.year ? ` (${ref.year})` : ''}
                        {ref.journal ? ` — ${ref.journal}` : ''}
                      </p>
                      {ref.refType && (
                        <Badge
                          variant="outline"
                          className="mt-1.5 text-xs"
                        >
                          {ref.refType}
                        </Badge>
                      )}
                      {ref.relevanceScore != null && (
                        <Badge
                          variant="secondary"
                          className="ml-1.5 mt-1.5 text-xs"
                        >
                          Relevansi: {Math.round(ref.relevanceScore * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4">
        {store.references.length > 0 && !store.isSearchingRefs && (
          <Button
            onClick={handleStartWriting}
            disabled={
              store.references.filter((r) => r.isSelected).length === 0
            }
            className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="mr-2 size-5" />
            Mulai Menulis Cicil
            <ChevronRight className="ml-2 size-5" />
          </Button>
        )}
        {store.references.length > 0 && !store.isSearchingRefs && (
          <Button
            variant="outline"
            onClick={handleSearchReferences}
            className="mt-2 w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <RotateCcw className="mr-2 size-4" />
            Cari Ulang Referensi
          </Button>
        )}
      </div>
    </motion.div>
  );

  const renderStepStatusIcon = (status: CicilStepState['status']) => {
    switch (status) {
      case 'pending':
        return <CircleDot className="size-4 text-gray-300" />;
      case 'generating':
        return <Loader2 className="size-4 animate-spin text-emerald-500" />;
      case 'done':
        return <CheckCircle2 className="size-4 text-emerald-500" />;
      case 'error':
        return <XCircle className="size-4 text-red-500" />;
      default:
        return <CircleDot className="size-4 text-gray-300" />;
    }
  };

  const renderStepStatusLabel = (status: CicilStepState['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="text-xs">
            Menunggu
          </Badge>
        );
      case 'generating':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 text-xs border-emerald-200">
            <Loader2 className="mr-1 size-3 animate-spin" />
            Generating
          </Badge>
        );
      case 'done':
        return (
          <Badge className="bg-emerald-600 text-white text-xs">
            <Check className="mr-1 size-3" />
            Selesai
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="mr-1 size-3" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderWritingPhase = () => (
    <motion.div
      key="writing"
      {...fadeSlideUp}
      className="flex flex-1 flex-col gap-4"
    >
      {/* Top Bar: Progress & Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => store.setPhase('references')}
            className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-emerald-600"
          >
            <ArrowLeft className="size-4" />
            Referensi
          </button>
          <div className="flex items-center gap-3">
            {/* Engine Selector */}
            <Select
              value={store.generationEngine}
              onValueChange={(v) =>
                store.setGenerationEngine(v as 'zai' | 'gemini' | 'grok' | 'cloudflare')
              }
              disabled={store.isAutoGenerating}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_ENGINES.map((engine) => (
                  <SelectItem key={engine.id} value={engine.id}>
                    <span className="mr-1.5">{engine.icon}</span>
                    {engine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Progres Menulis</span>
              <span className="font-bold text-emerald-600">
                {completedSteps}/{store.steps.length} bagian • {progressPercent}%
              </span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2.5 bg-emerald-100"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>
                {formatNumber(totalWordsWritten)} / {formatNumber(totalTargetWords)}{' '}
                kata
              </span>
              <span>{flowConfig.title}</span>
            </div>
          </CardContent>
        </Card>

        {/* Auto Generate Controls */}
        <div className="flex gap-2">
          {!store.isAutoGenerating && !allDone && (
            <>
              <Button
                onClick={handleAutoGenerateAll}
                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Play className="mr-2 size-4" />
                Auto Generate Semua
              </Button>
              {/* Generate Next Step */}
              {(() => {
                const nextPending = store.steps.find(
                  (s) => s.status === 'pending' || s.status === 'error'
                );
                return nextPending ? (
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateStep(nextPending)}
                    className="h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    <ChevronRight className="mr-1.5 size-4" />
                    Generate Berikutnya
                  </Button>
                ) : null;
              })()}
            </>
          )}
          {store.isAutoGenerating && (
            <Button
              onClick={handleStopAutoGenerate}
              variant="destructive"
              className="flex-1 h-11"
            >
              <RotateCcw className="mr-2 size-4" />
              Hentikan
            </Button>
          )}
          {allDone && (
            <Button
              onClick={handleViewResult}
              className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Eye className="mr-2 size-4" />
              Lihat Hasil
            </Button>
          )}
        </div>
      </div>

      {/* Chapters Accordion */}
      <ScrollArea className="flex-1">
        <Accordion
          type="multiple"
          defaultValue={[activeChapter]}
          onValueChange={(vals) => {
            if (vals.length > 0) setActiveChapter(vals[0]);
          }}
          className="w-full"
        >
          {chapters.map((chapter) => {
            const chapterDone = chapter.steps.filter(
              (s) => s.status === 'done'
            ).length;
            const chapterTotal = chapter.steps.length;
            const chapterWords = chapter.steps.reduce(
              (sum, s) => sum + s.wordCount,
              0
            );
            const chapterTargetWords = chapter.steps.reduce(
              (sum, s) => sum + s.targetWords,
              0
            );

            return (
              <AccordionItem key={chapter.id} value={chapter.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-1 items-center gap-3 pr-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <BookOpen className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-800">
                          {chapter.label}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0"
                        >
                          {chapterDone}/{chapterTotal}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatNumber(chapterWords)}/
                        {formatNumber(chapterTargetWords)} kata
                      </p>
                    </div>
                    {/* Mini progress */}
                    <div className="hidden w-20 sm:block">
                      <Progress
                        value={
                          chapterTotal > 0
                            ? (chapterDone / chapterTotal) * 100
                            : 0
                        }
                        className="h-1.5 bg-gray-100"
                      />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-2 pt-1">
                    {chapter.steps.map((step) => (
                      <Card
                        key={step.stepId}
                        className={`transition-colors ${
                          step.status === 'generating'
                            ? 'border-emerald-300 bg-emerald-50/30'
                            : step.status === 'done'
                              ? 'border-emerald-100'
                              : step.status === 'error'
                                ? 'border-red-100 bg-red-50/30'
                                : ''
                        }`}
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              {renderStepStatusIcon(step.status)}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-medium leading-snug ${
                                    step.status === 'done'
                                      ? 'text-gray-900'
                                      : step.status === 'error'
                                        ? 'text-red-700'
                                        : 'text-gray-700'
                                  }`}
                                >
                                  {step.label}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                  Target: {formatNumber(step.targetWords)} kata
                                  {step.wordCount > 0 &&
                                    ` • Tertulis: ${formatNumber(step.wordCount)} kata`}
                                </p>
                                {step.error && (
                                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="size-3 shrink-0" />
                                    {step.error}
                                  </p>
                                )}
                                {step.status === 'generating' && (
                                  <Skeleton className="mt-2 h-3 w-3/4" />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {renderStepStatusLabel(step.status)}
                              {(step.status === 'pending' ||
                                step.status === 'error') &&
                                !store.isAutoGenerating && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleGenerateStep(step)}
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                                  >
                                    <Play className="mr-1 size-3" />
                                    Generate
                                  </Button>
                                )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </motion.div>
  );

  const renderOutputPhase = () => {
    // Compute word/char/page stats from compiled output
    const outputText = store.fullOutput || '';
    const wordCount = outputText.trim()
      ? outputText.trim().split(/\s+/).filter(Boolean).length
      : 0;
    const charCount = outputText.length;
    const estimatedPages = wordCount > 0 ? Math.ceil(wordCount / 250) : 0;
    const totalSteps = store.steps.length;
    const stepsProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    return (
    <motion.div
      key="output"
      {...fadeSlideUp}
      className="flex flex-1 flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => store.setPhase('writing')}
          className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-emerald-600"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Menulis
        </button>
        <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
          <FileText className="mr-2 inline-block size-5 text-emerald-600" />
          Hasil Akhir
        </h2>
        <div className="w-20" /> {/* Spacer for centering */}
      </div>

      {/* Word Counter Glass Card */}
      <div className="glass-card rounded-xl p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Word Count */}
          <div className="text-center">
            <p className="text-2xl font-bold text-gradient-emerald">
              {formatNumber(wordCount)}
            </p>
            <p className="text-xs font-medium text-gray-500">Kata</p>
          </div>
          {/* Character Count */}
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">
              {formatNumber(charCount)}
            </p>
            <p className="text-xs font-medium text-gray-500">Karakter</p>
          </div>
          {/* Estimated Pages */}
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">
              ~{estimatedPages}
            </p>
            <p className="text-xs font-medium text-gray-500">Halaman</p>
          </div>
          {/* Steps Progress */}
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {completedSteps}/{totalSteps}
            </p>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Bagian Selesai</p>
            <Progress value={stepsProgress} className="h-1.5 bg-emerald-100" />
          </div>
        </div>
      </div>

      {/* Output Content */}
      <Card className="flex-1">
        <CardContent className="p-4 sm:p-6">
          <ScrollArea className="max-h-[60vh] w-full">
            <div className="prose prose-sm max-w-none pr-2">
              {store.fullOutput ? (
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">
                  {store.fullOutput.split('\n').map((line, i) => {
                    // Simple markdown rendering for headings
                    if (line.startsWith('=== ')) {
                      return (
                        <h1
                          key={i}
                          className="mb-4 text-center text-lg font-bold text-emerald-700 sm:text-xl"
                        >
                          {line.replace('=== ', '').replace(' ===', '')}
                        </h1>
                      );
                    }
                    if (line.startsWith('## ')) {
                      return (
                        <h2
                          key={i}
                          className="mb-2 mt-6 text-base font-bold text-gray-900"
                        >
                          {line.replace('## ', '')}
                        </h2>
                      );
                    }
                    if (line.startsWith('---')) {
                      return <Separator key={i} className="my-4" />;
                    }
                    if (line.startsWith('# ')) {
                      return (
                        <h2
                          key={i}
                          className="mb-2 mt-4 text-base font-bold text-gray-900"
                        >
                          {line.replace('# ', '')}
                        </h2>
                      );
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return (
                        <p
                          key={i}
                          className="mb-1 font-semibold text-gray-800"
                        >
                          {line.replace(/\*\*/g, '')}
                        </p>
                      );
                    }
                    if (line.trim() === '') {
                      return <br key={i} />;
                    }
                    return (
                      <p key={i} className="mb-1">
                        {line}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <p>Tidak ada output yang dihasilkan</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-auto space-y-2 pt-4">
        <Button
          onClick={handleCopyOutput}
          disabled={!store.fullOutput}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
        >
          <Copy className="mr-2 size-4" />
          Salin ke Clipboard
        </Button>
        <Button
          variant="outline"
          onClick={onBack}
          className="w-full h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
        >
          <ArrowLeft className="mr-2 size-4" />
          Kembali ke Menu
        </Button>
      </div>
    </motion.div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/50">
      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence mode="wait">
          {store.phase === 'input' && renderInputPhase()}
          {store.phase === 'references' && renderReferencesPhase()}
          {store.phase === 'writing' && renderWritingPhase()}
          {store.phase === 'output' && renderOutputPhase()}
        </AnimatePresence>
      </main>
    </div>
  );
}