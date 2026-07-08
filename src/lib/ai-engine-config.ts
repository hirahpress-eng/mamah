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
    name: IS_PROD ? 'Tim 1' : 'Tim 1',
    description: IS_PROD
      ? 'Tidak tersedia di server publik'
      : 'Tim penulis utama, andal dan terintegrasi penuh',
    bestFor: IS_PROD ? '—' : 'Pembuatan artikel, judul & kata kunci',
    isDefault: !IS_PROD,
    icon: '🟢',
  },
  {
    id: 'gemini',
    name: 'Tim 2',
    description: IS_PROD
      ? 'Tim penulis default, konteks panjang & akurat'
      : 'Tim penulis cadangan, konteks panjang & akurat',
    bestFor: 'Pembuatan artikel, judul, kata kunci, konten panjang',
    isDefault: IS_PROD,
    icon: '🔵',
  },
  {
    id: 'grok',
    name: 'Tim 3',
    description: IS_PROD
      ? 'Tidak tersedia di server publik'
      : 'Tim penulis cepat, inferensi super cepat',
    bestFor: IS_PROD ? '—' : 'Draf cepat, generasi ringkas, mesin alternatif',
    isDefault: false,
    icon: '🟠',
  },
  {
    id: 'cloudflare',
    name: 'Tim 4',
    description: IS_PROD
      ? 'Tidak tersedia di server publik'
      : 'Tim penulis besar, model open-source',
    bestFor: IS_PROD ? '—' : 'Generasi cadangan, distribusi beban',
    isDefault: false,
    icon: '🟡',
  },
];