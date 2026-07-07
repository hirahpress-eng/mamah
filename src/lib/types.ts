/**
 * Shared types used across API routes and stores.
 */

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