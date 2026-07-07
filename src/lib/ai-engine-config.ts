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
    name: 'Tim 1 (Default)',
    description: 'Tim utama, andal dan terintegrasi penuh',
    bestFor: 'Pembuatan artikel, judul & kata kunci',
    isDefault: true,
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
    name: 'Tim 3',
    description: 'Grok 3 — penalaran cepat dari xAI',
    bestFor: 'Draf cepat, generasi ringkas, mesin alternatif',
    isDefault: false,
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