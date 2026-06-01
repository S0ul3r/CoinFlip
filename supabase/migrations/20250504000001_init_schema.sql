-- CoinFlip MVP schema (Supabase)
-- Run with: supabase db push (or paste in SQL editor)

create extension if not exists "pgcrypto";

-- Catalog (read-only for authenticated users)
create table if not exists public.coins (
  id text primary key,
  owner_user_id uuid references auth.users (id) on delete cascade,
  is_custom boolean not null default false,
  name text not null,
  series text,
  denomination double precision,
  year integer,
  mint text,
  mintage integer,
  material text,
  weight_g double precision,
  diameter_mm double precision,
  quality text,
  description text,
  image_obverse text,
  image_reverse text,
  issue_price double precision,
  category text,
  source_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.coin_prices (
  id bigserial primary key,
  coin_id text not null references public.coins (id) on delete cascade,
  price double precision not null,
  source text not null,
  source_url text,
  scraped_at timestamptz not null default now()
);

create table if not exists public.my_collection (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  coin_id text not null references public.coins (id),
  purchase_price double precision,
  current_value double precision,
  purchase_date date,
  condition text,
  notes text,
  my_photo_obverse text,
  my_photo_reverse text,
  is_for_sale integer not null default 0,
  added_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_coin_prices_coin on public.coin_prices (coin_id);
create index if not exists idx_my_collection_user on public.my_collection (user_id);

alter table public.coins enable row level security;
alter table public.coin_prices enable row level security;
alter table public.my_collection enable row level security;

drop policy if exists "coins_select_auth" on public.coins;
create policy "coins_select_auth" on public.coins for select to authenticated using (true);

drop policy if exists "coins_insert_own_custom" on public.coins;
create policy "coins_insert_own_custom" on public.coins for insert to authenticated with check (is_custom = true and owner_user_id = auth.uid ());

drop policy if exists "coins_update_own_custom" on public.coins;
create policy "coins_update_own_custom" on public.coins for update to authenticated using (is_custom = true and owner_user_id = auth.uid ()) with check (is_custom = true and owner_user_id = auth.uid ());

drop policy if exists "coin_prices_select_auth" on public.coin_prices;
create policy "coin_prices_select_auth" on public.coin_prices for select to authenticated using (true);

drop policy if exists "collection_crud_own" on public.my_collection;
create policy "collection_crud_own" on public.my_collection for all to authenticated using (auth.uid () = user_id) with check (auth.uid () = user_id);
