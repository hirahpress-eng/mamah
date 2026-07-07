-- ═══════════════════════════════════════════════════════════════════════════
-- ScholarGen AI — Supabase PostgreSQL Schema
-- Arsitektur: GitHub + Vercel + Supabase + Telegram (14 Bot)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. EXTENSIONS ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── 2. PROFILES (extends Supabase Auth) ──────────────────────────────────────
create table public.profiles (
  id            uuid        references auth.users on delete cascade not null primary key,
  full_name     text,
  avatar_url    text,
  email         text        unique not null,
  institution   text,
  subscription_tier text    default 'free' check (subscription_tier in ('free', 'pro', 'enterprise')),
  total_articles     int    default 0,
  total_downloads    int    default 0,
  monthly_usage       jsonb  default '{}'::jsonb, -- { "2025-01": 15, "2025-02": 32 }
  preferences         jsonb  default '{}'::jsonb, -- { "default_method": "...", "theme": "dark" }
  is_onboarded        boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update timestamp on profile update
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

-- ─── 3. RESEARCH SESSIONS ─────────────────────────────────────────────────────
create table public.research_sessions (
  id              uuid        default uuid_generate_v4() primary key,
  user_id         uuid        references public.profiles(id) on delete cascade not null,
  topic           text        not null,
  input_mode      text        not null check (input_mode in ('keywords', 'title', 'idea')),
  input_text      text,
  selected_title  text,
  selected_keywords  jsonb    default '[]'::jsonb,
  research_method text,
  status          text        default 'draft' check (status in ('draft', 'searching', 'generating', 'completed', 'failed')),
  progress        int        default 0, -- 0-100 percentage
  metadata        jsonb       default '{}'::jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger research_sessions_updated_at
  before update on public.research_sessions
  for each row execute procedure public.update_updated_at();

-- ─── 4. REFERENCES (metadata artikel dari pencarian) ──────────────────────────
create table public.references (
  id                  uuid        default uuid_generate_v4() primary key,
  session_id          uuid        references public.research_sessions(id) on delete cascade not null,
  title               text        not null,
  authors             text,
  year                int,
  doi                 text        unique,
  journal             text,
  volume              text,
  issue               text,
  pages               text,
  abstract            text,
  ref_type            text        not null check (ref_type in (
    'book', 'grand_theory', 'middle_theory', 'applied_theory',
    'journal_scopus', 'journal_sinta', 'conference', 'thesis', 'preprint'
  )),
  openalex_id         text,        -- OpenAlex Work ID
  consensus_score     text,        -- "Yes" / "No" / "Maybe" from Consensus API
  is_open_access      boolean     default false,
  pdf_url             text,        -- Original PDF URL (Unpaywall/arXiv)
  -- Telegram Storage (Cold Storage Strategy)
  telegram_file_id    text,        -- Telegram unique file identifier (KEY)
  telegram_channel_id text,        -- Which of 14 channels stores this file
  telegram_bot_index  int,         -- Bot index (0-13) used for upload
  telegram_uploaded   boolean     default false,
  -- Selection & ordering
  is_selected         boolean     default false,
  relevance_score     float,
  sort_order          int         default 0,
  keywords            jsonb       default '[]'::jsonb,
  -- Citation data
  citation_count      int         default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create trigger references_updated_at
  before update on public.references
  for each row execute procedure public.update_updated_at();

-- Index for fast DOI lookup
create index idx_references_doi on public.references(doi);
create index idx_references_session on public.references(session_id);
create index idx_references_telegram on public.references(telegram_file_id) where telegram_file_id is not null;

-- ─── 5. ARTICLES (hasil akhir generate) ───────────────────────────────────────
create table public.articles (
  id              uuid        default uuid_generate_v4() primary key,
  user_id         uuid        references public.profiles(id) on delete cascade not null,
  session_id      uuid        references public.research_sessions(id) on delete set null,
  title           text        not null,
  keywords        jsonb       default '[]'::jsonb,
  content_md      text,        -- Full article in Markdown
  content_json    jsonb,       -- Sections as structured JSON
  word_count      int         default 0,
  section_counts  jsonb       default '{}'::jsonb, -- { "abstract": 350, "intro": 2000, ... }
  is_polished     boolean     default false,
  polish_options  jsonb       default '{}'::jsonb,
  quality_score   int,         -- 0-100
  research_method text,
  status          text        default 'generating' check (status in ('generating', 'done', 'failed')),
  -- Export files stored on Telegram
  pdf_telegram_file_id      text,
  pdf_telegram_channel_id   text,
  docx_telegram_file_id     text,
  docx_telegram_channel_id  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger articles_updated_at
  before update on public.articles
  for each row execute procedure public.update_updated_at();

create index idx_articles_user on public.articles(user_id);
create index idx_articles_status on public.articles(status);

-- ─── 6. GENERATION_LOGS (tracking & analytics) ────────────────────────────────
create table public.generation_logs (
  id              uuid        default uuid_generate_v4() primary key,
  user_id         uuid        references public.profiles(id) on delete set null,
  session_id      uuid        references public.research_sessions(id) on delete set null,
  article_id      uuid        references public.articles(id) on delete set null,
  step            text        not null, -- 'generate_titles', 'search_refs', 'generate_article', 'polish', 'export'
  input_summary   text,
  output_summary  text,
  model_used      text,        -- z-ai model name
  tokens_used     int,
  duration_ms     int,
  status          text        default 'success' check (status in ('success', 'failed', 'timeout')),
  error_message   text,
  created_at      timestamptz default now()
);

create index idx_gen_logs_user on public.generation_logs(user_id);
create index idx_gen_logs_step on public.generation_logs(step);

-- ─── 7. TELEGRAM_BOTS (manage 14 bot health) ─────────────────────────────────
create table public.telegram_bots (
  id              int         primary key, -- 0-13
  bot_token       text        not null, -- encrypted at rest
  channel_id      text        not null,
  bot_username    text,
  is_active       boolean     default true,
  total_uploads   int         default 0,
  total_bytes     bigint      default 0, -- total storage used in bytes
  last_used_at    timestamptz,
  rate_limit_remaining int    default 30, -- Telegram API rate limit
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger telegram_bots_updated_at
  before update on public.telegram_bots
  for each row execute procedure public.update_updated_at();

-- ─── 8. USAGE_LIMITS (subscription-based rate limiting) ────────────────────────
create table public.usage_limits (
  tier            text        primary key check (tier in ('free', 'pro', 'enterprise')),
  max_articles_per_month  int,
  max_references_per_search int,
  max_polish_per_article   int,
  max_export_per_article   int,
  max_storage_gb           float,
  features                 jsonb  default '{}'::jsonb
);

-- Seed usage limits
insert into public.usage_limits (tier, max_articles_per_month, max_references_per_search, max_polish_per_article, max_export_per_article, max_storage_gb, features) values
('free',       5,   20,  1,  2, 0.5, '{"priority_generation": false, "advanced_ai": false, "telegram_storage": false}'),
('pro',        50,  50,  10, 10, 5.0, '{"priority_generation": true, "advanced_ai": true, "telegram_storage": true}'),
('enterprise', -1,  100, -1, -1, 50,  '{"priority_generation": true, "advanced_ai": true, "telegram_storage": true, "api_access": true}');

-- ─── 9. ROW LEVEL SECURITY (RLS) ──────────────────────────────────────────────
-- Profiles: users can read all profiles but only update their own
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Research sessions: users can only CRUD their own
alter table public.research_sessions enable row level security;
create policy "Users can view own sessions" on public.research_sessions for select using (auth.uid() = user_id);
create policy "Users can create own sessions" on public.research_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on public.research_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own sessions" on public.research_sessions for delete using (auth.uid() = user_id);

-- References: access via session ownership
alter table public.references enable row level security;
create policy "Users can view refs in own sessions" on public.references for select
  using (session_id in (select id from public.research_sessions where user_id = auth.uid()));
create policy "Users can create refs in own sessions" on public.references for insert
  with check (session_id in (select id from public.research_sessions where user_id = auth.uid()));
create policy "Users can update refs in own sessions" on public.references for update
  using (session_id in (select id from public.research_sessions where user_id = auth.uid()));
create policy "Users can delete refs in own sessions" on public.references for delete
  using (session_id in (select id from public.research_sessions where user_id = auth.uid()));

-- Articles: users can only CRUD their own
alter table public.articles enable row level security;
create policy "Users can view own articles" on public.articles for select using (auth.uid() = user_id);
create policy "Users can create own articles" on public.articles for insert with check (auth.uid() = user_id);
create policy "Users can update own articles" on public.articles for update using (auth.uid() = user_id);
create policy "Users can delete own articles" on public.articles for delete using (auth.uid() = user_id);

-- Generation logs: users can only view their own
alter table public.generation_logs enable row level security;
create policy "Users can view own logs" on public.generation_logs for select
  using (user_id = auth.uid());

-- ─── 10. HELPER FUNCTIONS ─────────────────────────────────────────────────────

-- Get current month usage count for a user
create or replace function public.get_monthly_usage(p_user_id uuid)
returns int
language sql
security definer
as $$
  select count(*)
  from public.articles
  where user_id = p_user_id
    and created_at >= date_trunc('month', now())
    and status = 'done';
$$;

-- Check if user can perform an action based on subscription tier
create or replace function public.check_user_limit(p_user_id uuid, p_action text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_tier text;
  v_limit jsonb;
  v_monthly_usage int;
begin
  select subscription_tier into v_tier from public.profiles where id = p_user_id;
  if v_tier is null then return false; end if;

  select features into v_limit from public.usage_limits where tier = v_tier;
  if v_limit is null then return false; end if;

  if p_action = 'generate_article' then
    v_monthly_usage := public.get_monthly_usage(p_user_id);
    return v_monthly_usage < coalesce((v_limit->>'max_articles_per_month')::int, 0)
           or (v_limit->>'max_articles_per_month')::int = -1;
  end if;

  return true;
end;
$$;

-- Pick the best Telegram bot for upload (round-robin with health check)
create or replace function public.pick_telegram_bot()
returns int
language plpgsql
security definer
as $$
declare
  v_bot_id int;
begin
  select id into v_bot_id
  from public.telegram_bots
  where is_active = true
    and (rate_limit_remaining > 0 or rate_limit_remaining is null)
  order by total_uploads asc, random()
  limit 1;

  if v_bot_id is null then
    -- All bots at limit, pick the least recently used
    select id into v_bot_id
    from public.telegram_bots
    where is_active = true
    order by last_used_at asc nulls first
    limit 1;
  end if;

  return v_bot_id;
end;
$$;

-- Update bot stats after upload
create or replace function public.record_telegram_upload(
  p_bot_id int,
  p_file_size bigint
)
returns void
language plpgsql
security definer
as $$
begin
  update public.telegram_bots
  set
    total_uploads = total_uploads + 1,
    total_bytes = total_bytes + p_file_size,
    last_used_at = now(),
    rate_limit_remaining = greatest(rate_limit_remaining - 1, 0)
  where id = p_bot_id;
end;
$$;
