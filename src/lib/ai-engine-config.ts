// ─── AI Engine Configuration (CLIENT-SAFE — no Node.js dependencies) ─────────
// This file can be imported from both server and client code.
// The actual engine execution is in ai-engine.ts (server-only).

export type AIEngineId = 'zai' | 'gemini' | 'grok' | 'cloudflare';

export interface AIEngineConfig {
  id: AIEngineId;
  name: string;
  description: string;
  bestFor: string;
  isDefault: boolean;
  icon: string; // emoji icon for display
}

export const AI_ENGINES: AIEngineConfig[] = [
  {
    id: 'zai',
    name: process.env.NODE_ENV === 'production' ? 'Tim 1 (Z.ai — lokal)' : 'Tim 1 (Default)',
    description: process.env.NODE_ENV === 'production'
      ? 'Hanya tersedia di lingkungan z.ai lokal'
      : 'Tim utama, andal dan terintegrasi penuh',
    bestFor: 'Pembuatan artikel, judul & kata kunci',
    isDefault: process.env.NODE_ENV !== 'production',
    icon: '🟢',
  },
  {
    id: 'gemini',
    name: 'Tim 2',
    description: 'Konteks panjang hingga 1 juta token',
    bestFor: 'Analisis referensi, konten panjang, generasi cadangan',
    isDefault: false,
    icon: '🔵',
  },
  {
    id: 'grok',
    name: process.env.NODE_ENV === 'production' ? 'Tim 3 (Default)' : 'Tim 3',
    description: 'Groq Llama 3.3 70B — inferensi super cepat',
    bestFor: process.env.NODE_ENV === 'production'
      ? 'Pembuatan artikel, judul & kata kunci'
      : 'Draf cepat, generasi ringkas, mesin alternatif',
    isDefault: process.env.NODE_ENV === 'production',
    icon: '🟠',
  },
  {
    id: 'cloudflare',
    name: 'Tim 4 (Llama 3.1)',
    description: 'Meta Llama 3.1 70B — model open-source besar',
    bestFor: 'Generasi cadangan, distribusi beban, fallback andal',
    isDefault: false,
    icon: '🟡',
  },
];