import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase-types';

// ── Server-side Supabase Client ────────────────────────────────────────────────
export function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ── Client-side Supabase (for middleware / SSR) ────────────────────────────────
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

// ── Singleton for server-side (lazy — won't throw until actually called) ─────────
const globalForSupabase = globalThis as unknown as {
  supabaseServer: ReturnType<typeof createSupabaseServerClient> | undefined;
};

export function getSupabaseServer() {
  if (!globalForSupabase.supabaseServer) {
    globalForSupabase.supabaseServer = createSupabaseServerClient();
  }
  return globalForSupabase.supabaseServer;
}

/** @deprecated Use getSupabaseServer() instead */
export const supabaseServer = new Proxy({} as ReturnType<typeof createSupabaseServerClient>, {
  get(_target, prop) {
    return (getSupabaseServer() as any)[prop];
  },
});

// ── Database Types (inline to avoid codegen dependency) ────────────────────────
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  institution: string | null;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  total_articles: number;
  total_downloads: number;
  monthly_usage: Record<string, number>;
  preferences: Record<string, unknown>;
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResearchSession {
  id: string;
  user_id: string;
  topic: string;
  input_mode: 'keywords' | 'title' | 'idea';
  input_text: string | null;
  selected_title: string | null;
  selected_keywords: string[];
  research_method: string | null;
  status: 'draft' | 'searching' | 'generating' | 'completed' | 'failed';
  progress: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Reference {
  id: string;
  session_id: string;
  title: string;
  authors: string | null;
  year: number | null;
  doi: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  abstract: string | null;
  ref_type: string;
  openalex_id: string | null;
  consensus_score: string | null;
  is_open_access: boolean;
  pdf_url: string | null;
  telegram_file_id: string | null;
  telegram_channel_id: string | null;
  telegram_bot_index: number | null;
  telegram_uploaded: boolean;
  is_selected: boolean;
  relevance_score: number | null;
  sort_order: number;
  keywords: string[];
  citation_count: number;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  user_id: string;
  session_id: string | null;
  title: string;
  keywords: string[];
  content_md: string | null;
  content_json: Record<string, unknown> | null;
  word_count: number;
  section_counts: Record<string, number>;
  is_polished: boolean;
  polish_options: Record<string, unknown>;
  quality_score: number | null;
  research_method: string | null;
  status: 'generating' | 'done' | 'failed';
  pdf_telegram_file_id: string | null;
  pdf_telegram_channel_id: string | null;
  docx_telegram_file_id: string | null;
  docx_telegram_channel_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelegramBot {
  id: number;
  bot_token: string;
  channel_id: string;
  bot_username: string | null;
  is_active: boolean;
  total_uploads: number;
  total_bytes: number;
  last_used_at: string | null;
  rate_limit_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface GenerationLog {
  id: string;
  user_id: string | null;
  session_id: string | null;
  article_id: string | null;
  step: string;
  input_summary: string | null;
  output_summary: string | null;
  model_used: string | null;
  tokens_used: number | null;
  duration_ms: number | null;
  status: 'success' | 'failed' | 'timeout';
  error_message: string | null;
  created_at: string;
}

export interface UsageLimit {
  tier: 'free' | 'pro' | 'enterprise';
  max_articles_per_month: number;
  max_references_per_search: number;
  max_polish_per_article: number;
  max_export_per_article: number;
  max_storage_gb: number;
  features: Record<string, unknown>;
}
