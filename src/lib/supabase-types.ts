// Placeholder types — replace with `supabase gen types` output when connected
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          email: string
          institution: string | null
          subscription_tier: string
          total_articles: number
          total_downloads: number
          monthly_usage: Json
          preferences: Json
          is_onboarded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          email: string
          institution?: string | null
          subscription_tier?: string
          total_articles?: number
          total_downloads?: number
          monthly_usage?: Json
          preferences?: Json
          is_onboarded?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string
          institution?: string | null
          subscription_tier?: string
          total_articles?: number
          total_downloads?: number
          monthly_usage?: Json
          preferences?: Json
          is_onboarded?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      research_sessions: {
        Row: {
          id: string
          user_id: string
          topic: string
          input_mode: string
          input_text: string | null
          selected_title: string | null
          selected_keywords: Json
          research_method: string | null
          status: string
          progress: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: { [key: string]: unknown }
        Update: { [key: string]: unknown }
      }
      references: {
        Row: {
          id: string
          session_id: string
          title: string
          authors: string | null
          year: number | null
          doi: string | null
          journal: string | null
          volume: string | null
          issue: string | null
          pages: string | null
          abstract: string | null
          ref_type: string
          openalex_id: string | null
          consensus_score: string | null
          is_open_access: boolean
          pdf_url: string | null
          telegram_file_id: string | null
          telegram_channel_id: string | null
          telegram_bot_index: number | null
          telegram_uploaded: boolean
          is_selected: boolean
          relevance_score: number | null
          sort_order: number
          keywords: Json
          citation_count: number
          created_at: string
          updated_at: string
        }
        Insert: { [key: string]: unknown }
        Update: { [key: string]: unknown }
      }
      articles: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          title: string
          keywords: Json
          content_md: string | null
          content_json: Json | null
          word_count: number
          section_counts: Json
          is_polished: boolean
          polish_options: Json
          quality_score: number | null
          research_method: string | null
          status: string
          pdf_telegram_file_id: string | null
          pdf_telegram_channel_id: string | null
          docx_telegram_file_id: string | null
          docx_telegram_channel_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: { [key: string]: unknown }
        Update: { [key: string]: unknown }
      }
      generation_logs: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          article_id: string | null
          step: string
          input_summary: string | null
          output_summary: string | null
          model_used: string | null
          tokens_used: number | null
          duration_ms: number | null
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: { [key: string]: unknown }
        Update: { [key: string]: unknown }
      }
      telegram_bots: {
        Row: {
          id: number
          bot_token: string
          channel_id: string
          bot_username: string | null
          is_active: boolean
          total_uploads: number
          total_bytes: number
          last_used_at: string | null
          rate_limit_remaining: number
          created_at: string
          updated_at: string
        }
        Insert: { [key: string]: unknown }
        Update: { [key: string]: unknown }
      }
      usage_limits: {
        Row: {
          tier: string
          max_articles_per_month: number
          max_references_per_search: number
          max_polish_per_article: number
          max_export_per_article: number
          max_storage_gb: number
          features: Json
        }
        Insert: { [key: string]: unknown }
        Update: { [key: string]: unknown }
      }
    }
  }
}
