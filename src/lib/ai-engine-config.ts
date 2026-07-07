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

const IS_PROD = typeof process !== 'undefined' && process.env.NODE_ENV === 'production';

export const AI_ENGINES: AIEngineConfig[] = [
  {
    id: 'zai',
    name: 'Tim 1 (Z.ai)',
    description: IS_PROD
      ? 'Tidak tersedia di server publik'
      : 'Tim utama, andal dan terintegrasi penuh',
    bestFor: IS_PROD ? '—' : 'Pembuatan artikel, judul & kata kunci',
    isDefault: !IS_PROD,
    icon: '🟢',
  },
  {
    id: 'gemini',
    name: IS_PROD ? 'Tim 1 (Default)' : 'Tim 2 (Gemini)',
    description: 'Google Gemini 2.5 Flash — konteks panjang, akurat',
    bestFor: 'Pembuatan artikel, judul, kata kunci, konten panjang',
    isDefault: IS_PROD,
    icon: '🔵',
  },
  {
    id: 'grok',
    name: IS_PROD ? 'Tim 2 (Groq) — Tidak tersedia' : 'Tim 2 (Groq)',
    description: IS_PROD
      ? 'Tidak tersedia di server publik'
      : 'Groq Llama 3.3 70B — inferensi super cepat',
    bestFor: IS_PROD ? '—' : 'Draf cepat, generasi ringkas, mesin alternatif',
    isDefault: false,
    icon: '🟠',
  },
  {
    id: 'cloudflare',
    name: 'Tim 3 (Llama)',
    description: IS_PROD
      ? 'Tidak tersedia di server publik'
      : 'Meta Llama 3.1 70B — model open-source besar',
    bestFor: IS_PROD ? '—' : 'Generasi cadangan, distribusi beban',
    isDefault: false,
    icon: '🟡',
  },
];