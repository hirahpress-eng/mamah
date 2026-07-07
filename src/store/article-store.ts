import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type InputMode = 'keywords' | 'title' | 'idea';
export type ResearchMethod = 'literature-review' | 'systematic-review' | 'meta-analysis' | 'meta-synthesis' | 'narrative-review' | 'scoping-review' | 'critical-review';

export interface Reference {
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
  pdfUrl?: string;
  openalex_id?: string;
  consensus_score?: string;
  is_open_access?: boolean;
  telegram_file_id?: string;
  telegram_channel_id?: string;
  telegram_bot_index?: number;
  telegram_uploaded?: boolean;
  citation_count?: number;
  sort_order?: number;
}

export interface ArticleSection {
  type: 'abstract' | 'introduction' | 'literature_review' | 'method' | 'results' | 'discussion' | 'conclusion' | 'bibliography';
  content: string;
  wordCount: number;
}

export interface GeneratedArticle {
  title: string;
  keywords: string[];
  sections: ArticleSection[];
  references: Reference[];
  totalWordCount: number;
  isPolished: boolean;
}

// ─── Per-Stage Generation State ──────────────────────────────────────────────────

export type StageId = 'abstract' | 'introduction' | 'methodology' | 'results_discussion' | 'conclusion' | 'bibliography';

export type StageStatus = 'pending' | 'generating' | 'done' | 'error';

export interface VisualPlaceholder {
  id: string;
  type: 'figure' | 'table';
  description: string;
  generated?: boolean;
  data?: string; // base64 image for figures, markdown table for tables
  error?: string;
}

export interface SectionStage {
  id: StageId;
  label: string;
  labelId: string; // Indonesian label
  targetWords: number;
  status: StageStatus;
  content: string;
  wordCount: number;
  visualPlaceholders: VisualPlaceholder[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export const STAGE_DEFINITIONS: Omit<SectionStage, 'status' | 'content' | 'wordCount' | 'visualPlaceholders'>[] = [
  { id: 'abstract', label: 'Abstract', labelId: 'Abstrak', targetWords: 400 },
  { id: 'introduction', label: 'Introduction', labelId: 'Pendahuluan', targetWords: 5250 },
  { id: 'methodology', label: 'Methodology', labelId: 'Metodologi', targetWords: 2000 },
  { id: 'results_discussion', label: 'Results & Discussion', labelId: 'Hasil & Diskusi', targetWords: 7250 },
  { id: 'conclusion', label: 'Conclusion', labelId: 'Kesimpulan', targetWords: 800 },
  { id: 'bibliography', label: 'Bibliography', labelId: 'Bibliografi', targetWords: 0 },
];

export function createEmptyStages(): SectionStage[] {
  return STAGE_DEFINITIONS.map((def) => ({
    ...def,
    status: 'pending' as StageStatus,
    content: '',
    wordCount: 0,
    visualPlaceholders: [],
  }));
}

export interface ArticleHistoryEntry {
  id: string;
  title: string;
  keywords: string[];
  totalWordCount: number;
  savedAt: string;
  article: GeneratedArticle;
  selectedKeywords?: string[];
  selectedTitle?: string;
  selectedReferences?: Reference[];
  researchMethod?: ResearchMethod;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  totalArticles?: number;
  totalDownloads?: number;
}

export interface BotProgress {
  phase: 'idle' | 'init' | 'strategy' | 'searching' | 'scoring' | 'downloading' | 'uploading' | 'complete' | 'error';
  currentDatabase: string;
  databasesSearched: string[];
  totalDatabases: number;
  resultsFound: number;
  currentPercent: number;
  message: string;
  startTime: number;
}

export interface BotResult {
  id: string;
  databaseId: string;
  databaseName: string;
  title: string;
  authors: string;
  year: number | null;
  abstract: string | null;
  journal: string | null;
  doi: string | null;
  pdfUrl: string | null;
  citations: number | null;
  isOpenAccess: boolean;
  score: number;
  source: string;
  isSelected: boolean;
}

export interface BotSearchConfig {
  topic: string;
  keywords: string[];
  maxResults: number;
  autoDownload: boolean;
  downloadLimit: number;
  minScoreThreshold: number;
  databases: string[];
}

export interface AppState {
  // Auth
  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;
  authLoading: boolean;
  setAuthLoading: (val: boolean) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;

  // Research search source
  searchSource: 'ai' | 'real';
  setSearchSource: (source: 'ai' | 'real') => void;

  // Navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Step 1: Input
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  keywords: string[];
  setKeywords: (keywords: string[]) => void;
  inputTitle: string;
  setInputTitle: (title: string) => void;
  inputIdea: string;
  setInputIdea: (idea: string) => void;
  generatedTitles: string[];
  setGeneratedTitles: (titles: string[]) => void;
  generatedKeywords: string[];
  setGeneratedKeywords: (keywords: string[]) => void;
  isGeneratingStep1: boolean;
  setIsGeneratingStep1: (val: boolean) => void;

  // Step 2: Selection & References
  selectedTitle: string;
  setSelectedTitle: (title: string) => void;
  selectedKeywords: string[];
  setSelectedKeywords: (keywords: string[]) => void;
  references: Reference[];
  setReferences: (refs: Reference[]) => void;
  toggleReference: (id: string) => void;
  selectAllReferences: () => void;
  deselectAllReferences: () => void;
  isSearchingReferences: boolean;
  setIsSearchingReferences: (val: boolean) => void;
  referenceSearchProgress: number;
  setReferenceSearchProgress: (val: number) => void;

  // Step 3: Method & Generate
  researchMethod: ResearchMethod;
  setResearchMethod: (method: ResearchMethod) => void;
  additionalInstructions: string;
  setAdditionalInstructions: (instructions: string) => void;
  isGeneratingArticle: boolean;
  setIsGeneratingArticle: (val: boolean) => void;
  generationProgress: number;
  setGenerationProgress: (val: number) => void;
  generationStatus: string;
  setGenerationStatus: (status: string) => void;

  // Step 3: Per-Stage Generation
  sectionStages: SectionStage[];
  currentStageIndex: number;
  setCurrentStageIndex: (idx: number) => void;
  updateStage: (stageId: StageId, updates: Partial<SectionStage>) => void;
  resetStages: () => void;
  compileArticleFromStages: () => void;

  // Step 4: Article Output
  generatedArticle: GeneratedArticle | null;
  generatedAt: string | null;
  setGeneratedArticle: (article: GeneratedArticle | null) => void;

  // Step 5: Polish
  isPolishing: boolean;
  setIsPolishing: (val: boolean) => void;
  polishedArticle: GeneratedArticle | null;
  setPolishedArticle: (article: GeneratedArticle | null) => void;

  // History
  articleHistory: ArticleHistoryEntry[];
  saveToHistory: (article: GeneratedArticle) => void;
  deleteFromHistory: (id: string) => void;
  loadFromHistory: (id: string) => void;
  clearHistory: () => void;

  // Super Bot
  botProgress: BotProgress | null;
  setBotProgress: (progress: BotProgress | null) => void;
  botResults: BotResult[];
  setBotResults: (results: BotResult[]) => void;
  botIsRunning: boolean;
  setBotIsRunning: (val: boolean) => void;
  botConfig: BotSearchConfig;
  setBotConfig: (config: Partial<BotSearchConfig>) => void;
  toggleBotResult: (id: string) => void;
  selectAllBotResults: () => void;
  deselectAllBotResults: () => void;
  getSelectedBotResults: () => BotResult[];
  convertBotResultsToReferences: () => Reference[];
  clearBotResults: () => void;

  // Reset
  resetAll: () => void;
  resetFromStep: (step: number) => void;

  // Research session
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
}

const initialState = {
  authUser: null,
  authLoading: false,
  authModalOpen: false,
  searchSource: 'ai' as const,
  currentSessionId: null,
  currentStep: 1,
  inputMode: 'keywords' as InputMode,
  keywords: [] as string[],
  inputTitle: '',
  inputIdea: '',
  generatedTitles: [] as string[],
  generatedKeywords: [] as string[],
  isGeneratingStep1: false,
  selectedTitle: '',
  selectedKeywords: [] as string[],
  references: [] as Reference[],
  isSearchingReferences: false,
  referenceSearchProgress: 0,
  researchMethod: 'literature-review' as ResearchMethod,
  additionalInstructions: '',
  isGeneratingArticle: false,
  generationProgress: 0,
  generationStatus: '',
  sectionStages: createEmptyStages(),
  currentStageIndex: 0,
  generatedArticle: null as GeneratedArticle | null,
  generatedAt: null as string | null,
  isPolishing: false,
  polishedArticle: null as GeneratedArticle | null,
  articleHistory: [] as ArticleHistoryEntry[],
  botProgress: null as BotProgress | null,
  botResults: [] as BotResult[],
  botIsRunning: false,
  botConfig: {
    topic: '',
    keywords: [] as string[],
    maxResults: 50,
    autoDownload: false,
    downloadLimit: 20,
    minScoreThreshold: 60,
    databases: [] as string[],
  },
};

export const useArticleStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Auth actions
      setAuthUser: (user) => set({ authUser: user }),
      setAuthLoading: (val) => set({ authLoading: val }),
      setAuthModalOpen: (open) => set({ authModalOpen: open }),
      setSearchSource: (source) => set({ searchSource: source }),
      setCurrentSessionId: (id) => set({ currentSessionId: id }),

      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 5) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

      setInputMode: (mode) => set({ inputMode: mode, generatedTitles: [], generatedKeywords: [] }),
      setKeywords: (keywords) => set({ keywords }),
      setInputTitle: (title) => set({ inputTitle: title }),
      setInputIdea: (idea) => set({ inputIdea: idea }),
      setGeneratedTitles: (titles) => set({ generatedTitles: titles }),
      setGeneratedKeywords: (keywords) => set({ generatedKeywords: keywords }),
      setIsGeneratingStep1: (val) => set({ isGeneratingStep1: val }),

      setSelectedTitle: (title) => set({ selectedTitle: title }),
      setSelectedKeywords: (keywords) => set({ selectedKeywords: keywords }),

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
      setIsSearchingReferences: (val) => set({ isSearchingReferences: val }),
      setReferenceSearchProgress: (val) => set({ referenceSearchProgress: val }),

      setResearchMethod: (method) => set({ researchMethod: method }),
      setAdditionalInstructions: (instructions) => set({ additionalInstructions: instructions }),
      setIsGeneratingArticle: (val) => set({ isGeneratingArticle: val }),
      setGenerationProgress: (val) => set({ generationProgress: val }),
      setGenerationStatus: (status) => set({ generationStatus: status }),

      // Per-Stage Generation actions
      setCurrentStageIndex: (idx) => set({ currentStageIndex: idx }),
      updateStage: (stageId, updates) =>
        set((state) => ({
          sectionStages: state.sectionStages.map((s) =>
            s.id === stageId ? { ...s, ...updates } : s
          ),
        })),
      resetStages: () => set({
        sectionStages: createEmptyStages(),
        currentStageIndex: 0,
      }),
      compileArticleFromStages: () => {
        const state = get();
        const stages = state.sectionStages;
        const completedStages = stages.filter((s) => s.status === 'done');

        // Map new stage format to legacy ArticleSection format
        const sections: ArticleSection[] = [];
        let totalWords = 0;

        for (const stage of completedStages) {
          if (stage.id === 'bibliography') {
            sections.push({
              type: 'bibliography',
              content: stage.content,
              wordCount: stage.wordCount,
            });
          } else if (stage.id === 'introduction') {
            // Introduction stage includes literature review content
            sections.push({
              type: 'introduction',
              content: stage.content,
              wordCount: stage.wordCount,
            });
          } else if (stage.id === 'results_discussion') {
            // Results & Discussion combined
            sections.push({
              type: 'results',
              content: stage.content,
              wordCount: stage.wordCount,
            });
          } else if (stage.id === 'abstract') {
            sections.push({
              type: 'abstract',
              content: stage.content,
              wordCount: stage.wordCount,
            });
          } else if (stage.id === 'methodology') {
            sections.push({
              type: 'method',
              content: stage.content,
              wordCount: stage.wordCount,
            });
          } else if (stage.id === 'conclusion') {
            sections.push({
              type: 'conclusion',
              content: stage.content,
              wordCount: stage.wordCount,
            });
          }
          totalWords += stage.wordCount;
        }

        const article: GeneratedArticle = {
          title: state.selectedTitle || state.inputTitle || 'Generated Academic Article',
          keywords: state.selectedKeywords.length > 0 ? state.selectedKeywords : state.keywords,
          sections,
          references: state.references.filter((r) => r.isSelected),
          totalWordCount: totalWords,
          isPolished: false,
        };

        set({
          generatedArticle: article,
          generatedAt: new Date().toISOString(),
        });
        state.saveToHistory(article);
      },

      setGeneratedArticle: (article) => set({
        generatedArticle: article,
        generatedAt: article ? new Date().toISOString() : null,
      }),

      setIsPolishing: (val) => set({ isPolishing: val }),
      setPolishedArticle: (article) => set({ polishedArticle: article }),

      saveToHistory: (article) => {
        const state = get();
        const entry: ArticleHistoryEntry = {
          id: Date.now().toString(36),
          title: article.title,
          keywords: article.keywords,
          totalWordCount: article.totalWordCount,
          savedAt: new Date().toISOString(),
          article: JSON.parse(JSON.stringify(article)),
          selectedKeywords: state.selectedKeywords,
          selectedTitle: state.selectedTitle,
          selectedReferences: JSON.parse(JSON.stringify(state.references.filter((r) => r.isSelected))),
          researchMethod: state.researchMethod,
        };
        set((state) => ({
          articleHistory: [entry, ...state.articleHistory].slice(0, 20),
        }));
      },
      deleteFromHistory: (id) =>
        set((state) => ({
          articleHistory: state.articleHistory.filter((e) => e.id !== id),
        })),
      loadFromHistory: (id) => {
        const entry = get().articleHistory.find((e) => e.id === id);
        if (entry) {
          const updates: Record<string, unknown> = {
            generatedArticle: entry.article,
            currentStep: 4,
          };
          if (entry.selectedKeywords) updates.selectedKeywords = entry.selectedKeywords;
          if (entry.selectedTitle) updates.selectedTitle = entry.selectedTitle;
          if (entry.selectedReferences) updates.references = entry.selectedReferences;
          if (entry.researchMethod) updates.researchMethod = entry.researchMethod;
          set(updates);
        }
      },
      clearHistory: () => set({ articleHistory: [] }),

      resetAll: () => set({
        ...initialState,
        authUser: get().authUser,
        authModalOpen: false,
        sectionStages: createEmptyStages(),
      }),
      resetFromStep: (step) => {
        const state = get();
        if (step <= 1) {
          set({
            ...initialState,
            inputMode: state.inputMode,
            sectionStages: createEmptyStages(),
          });
        } else if (step <= 2) {
          set({
            ...initialState,
            inputMode: state.inputMode,
            keywords: state.keywords,
            inputTitle: state.inputTitle,
            inputIdea: state.inputIdea,
            generatedTitles: state.generatedTitles,
            generatedKeywords: state.generatedKeywords,
            selectedTitle: state.selectedTitle,
            selectedKeywords: state.selectedKeywords,
            sectionStages: createEmptyStages(),
          });
        } else if (step <= 3) {
          set({
            ...initialState,
            inputMode: state.inputMode,
            keywords: state.keywords,
            inputTitle: state.inputTitle,
            inputIdea: state.inputIdea,
            generatedTitles: state.generatedTitles,
            generatedKeywords: state.generatedKeywords,
            selectedTitle: state.selectedTitle,
            selectedKeywords: state.selectedKeywords,
            references: state.references,
            sectionStages: createEmptyStages(),
          });
        }
      },

      // Super Bot actions
      setBotProgress: (progress) => set({ botProgress: progress }),
      setBotResults: (results) => set({ botResults: results }),
      setBotIsRunning: (val) => set({ botIsRunning: val }),
      setBotConfig: (config) => set((state) => ({
        botConfig: { ...state.botConfig, ...config },
      })),
      toggleBotResult: (id) =>
        set((state) => ({
          botResults: state.botResults.map((r) =>
            r.id === id ? { ...r, isSelected: !r.isSelected } : r
          ),
        })),
      selectAllBotResults: () =>
        set((state) => ({
          botResults: state.botResults.map((r) => ({ ...r, isSelected: true })),
        })),
      deselectAllBotResults: () =>
        set((state) => ({
          botResults: state.botResults.map((r) => ({ ...r, isSelected: false })),
        })),
      getSelectedBotResults: () => {
        return get().botResults.filter((r) => r.isSelected);
      },
      convertBotResultsToReferences: () => {
        const selected = get().botResults.filter((r) => r.isSelected);
        return selected.map((r, i) => ({
          id: r.id,
          authors: r.authors || 'Unknown',
          title: r.title,
          year: r.year || new Date().getFullYear(),
          journal: r.journal || undefined,
          doi: r.doi || undefined,
          refType: 'Journal Article',
          isSelected: true,
          abstract: r.abstract || undefined,
          keywords: [],
          relevanceScore: r.score / 100,
          citation_count: r.citations || 0,
          pdfUrl: r.pdfUrl || undefined,
          is_open_access: r.isOpenAccess,
          sort_order: i,
        })) as Reference[];
      },
      clearBotResults: () => set({ botResults: [], botProgress: null, botIsRunning: false }),
    }),
    {
      name: 'mamah-store-v2',
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        // Version 0 or 1: old schema before auth shape changes — reset
        if (version === 0 || version === 1) {
          return { ...initialState } as AppState;
        }
        return persisted as AppState;
      },
      partialize: (state) => ({
        currentStep: state.currentStep,
        inputMode: state.inputMode,
        keywords: state.keywords,
        inputTitle: state.inputTitle,
        inputIdea: state.inputIdea,
        generatedTitles: state.generatedTitles,
        generatedKeywords: state.generatedKeywords,
        selectedTitle: state.selectedTitle,
        selectedKeywords: state.selectedKeywords,
        references: state.references,
        researchMethod: state.researchMethod,
        additionalInstructions: state.additionalInstructions,
        generatedArticle: state.generatedArticle,
        generatedAt: state.generatedAt,
        polishedArticle: state.polishedArticle,
        articleHistory: state.articleHistory,
        botResults: state.botResults,
        botConfig: state.botConfig,
        sectionStages: state.sectionStages,
        currentStageIndex: state.currentStageIndex,
      }),
    }
  )
);
