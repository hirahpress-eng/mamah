/**
 * Cicil Writing Store — Zustand store for incremental (section-by-section) writing generation.
 *
 * Manages the state for all non-article writing modes (Skripsi, Tesis, Disertasi, Buku, etc.)
 * Separate from article-store to avoid conflicts with the preserved article flow.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CicilWritingMode, CicilSubStep } from '@/lib/writing-flows';
import { getFlatSteps, getTotalSteps } from '@/lib/writing-flows';
import type { Reference } from '@/store/article-store';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CicilStepStatus = 'pending' | 'generating' | 'done' | 'error';

export interface CicilStepState {
  stepId: string;
  chapterId: string;
  chapterLabel: string;
  label: string;
  labelId: string;
  targetWords: number;
  promptFocus: string;
  status: CicilStepStatus;
  content: string;
  wordCount: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  jobId?: string;
}

export type CicilPhase = 'input' | 'references' | 'writing' | 'output';

export interface CicilStoreState {
  // Mode
  mode: CicilWritingMode | null;
  setMode: (mode: CicilWritingMode | null) => void;
  phase: CicilPhase;
  setPhase: (phase: CicilPhase) => void;

  // Step 1: Input
  keywords: string[];
  setKeywords: (kw: string[]) => void;
  title: string;
  setTitle: (t: string) => void;
  idea: string;
  setIdea: (i: string) => void;

  // Step 2: References (reuse Reference type from article-store)
  references: Reference[];
  setReferences: (refs: Reference[]) => void;
  toggleReference: (id: string) => void;
  selectAllReferences: () => void;
  deselectAllReferences: () => void;
  isSearchingRefs: boolean;
  setIsSearchingRefs: (v: boolean) => void;
  refSearchProgress: number;
  setRefSearchProgress: (v: number) => void;
  refSearchMessage: string;
  setRefSearchMessage: (m: string) => void;

  // Step 3: Cicil Writing
  steps: CicilStepState[];
  currentStepIndex: number;
  setCurrentStepIndex: (i: number) => void;
  initSteps: (mode: CicilWritingMode) => void;
  updateStep: (stepId: string, updates: Partial<CicilStepState>) => void;
  isAutoGenerating: boolean;
  setIsAutoGenerating: (v: boolean) => void;
  generationEngine: 'zai' | 'gemini' | 'grok' | 'cloudflare';
  setGenerationEngine: (e: 'zai' | 'gemini' | 'grok' | 'cloudflare') => void;

  // Step 4: Output
  fullOutput: string;
  setFullOutput: (o: string) => void;
  totalWordsWritten: number;

  // Computed helpers
  getCompletedSteps: () => CicilStepState[];
  getProgressPercent: () => number;
  compileFullOutput: () => void;

  // Reset
  resetAll: () => void;
}

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState = {
  mode: null as CicilWritingMode | null,
  phase: 'input' as CicilPhase,
  keywords: [] as string[],
  title: '',
  idea: '',
  references: [] as Reference[],
  isSearchingRefs: false,
  refSearchProgress: 0,
  refSearchMessage: '',
  steps: [] as CicilStepState[],
  currentStepIndex: 0,
  isAutoGenerating: false,
  generationEngine: 'zai' as const,
  fullOutput: '',
  totalWordsWritten: 0,
};

// ─── Store ──────────────────────────────────────────────────────────────────

export const useCicilStore = create<CicilStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setMode: (mode) => set({ mode, phase: 'input' }),
      setPhase: (phase) => set({ phase }),

      // Input
      setKeywords: (kw) => set({ keywords: kw }),
      setTitle: (t) => set({ title: t }),
      setIdea: (i) => set({ idea: i }),

      // References
      setReferences: (refs) => set({ references: refs }),
      toggleReference: (id) =>
        set((state) => ({
          references: state.references.map((r) =>
            r.id === id ? { ...r, isSelected: !r.isSelected } : r
          ),
        })),
      selectAllReferences: () =>
        set((state) => ({
          references: state.references.map((r) => ({ ...r, isSelected: true })),
        })),
      deselectAllReferences: () =>
        set((state) => ({
          references: state.references.map((r) => ({ ...r, isSelected: false })),
        })),
      setIsSearchingRefs: (v) => set({ isSearchingRefs: v }),
      setRefSearchProgress: (v) => set({ refSearchProgress: v }),
      setRefSearchMessage: (m) => set({ refSearchMessage: m }),

      // Steps
      setCurrentStepIndex: (i) => set({ currentStepIndex: i }),
      initSteps: (mode) => {
        const flat = getFlatSteps(mode);
        const steps: CicilStepState[] = flat.map((f) => ({
          stepId: f.step.id,
          chapterId: f.chapterId,
          chapterLabel: f.chapterLabel,
          label: f.step.label,
          labelId: f.step.labelId,
          targetWords: f.step.targetWords,
          promptFocus: f.step.promptFocus,
          status: 'pending' as CicilStepStatus,
          content: '',
          wordCount: 0,
        }));
        set({ steps, currentStepIndex: 0, phase: 'writing' });
      },
      updateStep: (stepId, updates) =>
        set((state) => ({
          steps: state.steps.map((s) =>
            s.stepId === stepId ? { ...s, ...updates } : s
          ),
        })),
      setIsAutoGenerating: (v) => set({ isAutoGenerating: v }),
      setGenerationEngine: (e) => set({ generationEngine: e }),

      // Output
      setFullOutput: (o) => set({ fullOutput: o }),
      totalWordsWritten: 0,

      // Helpers
      getCompletedSteps: () => get().steps.filter((s) => s.status === 'done'),
      getProgressPercent: () => {
        const { steps } = get();
        if (steps.length === 0) return 0;
        const done = steps.filter((s) => s.status === 'done').length;
        return Math.round((done / steps.length) * 100);
      },
      compileFullOutput: () => {
        const { steps, title, mode } = get();
        const flowTitle = mode
          ? `=== ${mode.toUpperCase()} ===\nJudul: ${title}\n\n`
          : '';
        const content = steps
          .filter((s) => s.status === 'done' && s.content)
          .map((s) => `## ${s.labelId}\n\n${s.content}`)
          .join('\n\n---\n\n');
        const totalWords = steps.reduce((sum, s) => sum + s.wordCount, 0);
        set({ fullOutput: flowTitle + content, totalWordsWritten: totalWords, phase: 'output' });
      },

      // Reset
      resetAll: () => set({ ...initialState }),
    }),
    {
      name: 'cicil-store-v1',
      version: 1,
      partialize: (state) => ({
        mode: state.mode,
        phase: state.phase,
        keywords: state.keywords,
        title: state.title,
        idea: state.idea,
        references: state.references,
        steps: state.steps,
        currentStepIndex: state.currentStepIndex,
        fullOutput: state.fullOutput,
        totalWordsWritten: state.totalWordsWritten,
        generationEngine: state.generationEngine,
      }),
    }
  )
);