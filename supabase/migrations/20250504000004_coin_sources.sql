-- Provenance for scraped catalog rows (NBP / Mennica / merge tooling)
create table if not exists public.coin_sources (
  id uuid primary key default gen_random_uuid (),
  coin_id text references public.coins (id) on delete cascade,
  source text not null,
  source_id text,
  source_url text,
  source_payload jsonb not null default '{}'::jsonb,
  scraped_at timestamptz not null default now(),
  match_status text not null default 'unknown'
);

create index if not exists idx_coin_sources_coin on public.coin_sources (coin_id);
create index if not exists idx_coin_sources_source on public.coin_sources (source);

create unique index if not exists uq_coin_sources_source_id on public.coin_sources (source, source_id) where source_id is not null;

comment on table public.coin_sources is 'Raw scrape payloads and merge status; populated by offline import scripts (service role).';

alter table public.coin_sources enable row level security;

drop policy if exists "coin_sources_select_auth" on public.coin_sources;
create policy "coin_sources_select_auth" on public.coin_sources for select to authenticated using (true);
