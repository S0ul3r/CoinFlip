-- Manual collection workflow support.
-- Run this if you already applied the first two migrations before this file existed.

alter table public.coins
  add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;

alter table public.coins
  add column if not exists is_custom boolean not null default false;

alter table public.my_collection
  add column if not exists current_value double precision;

drop policy if exists "coins_insert_own_custom" on public.coins;
create policy "coins_insert_own_custom" on public.coins
  for insert to authenticated
  with check (is_custom = true and owner_user_id = auth.uid ());

drop policy if exists "coins_update_own_custom" on public.coins;
create policy "coins_update_own_custom" on public.coins
  for update to authenticated
  using (is_custom = true and owner_user_id = auth.uid ())
  with check (is_custom = true and owner_user_id = auth.uid ());
