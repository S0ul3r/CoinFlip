-- Sample Polish commemorative coins for local MVP testing
delete from public.coin_prices
where coin_id like 'demo-%';

delete from public.coins
where id like 'demo-%';

insert into public.coins (
  id,
  name,
  series,
  denomination,
  year,
  mint,
  mintage,
  material,
  weight_g,
  diameter_mm,
  quality,
  description,
  image_obverse,
  image_reverse,
  issue_price,
  category,
  source_url
)
values
  (
    'demo-2024-bielik-1oz',
    'Orzeł Bielik 1 oz',
    'Orzeł Bielik',
    500,
    2024,
    'Mennica Polska',
    5000,
    'złoto 999,9',
    31.1,
    32,
    'proof',
    'Złota moneta kolekcjonerska z motywem Orła Bielika.',
    null,
    null,
    3500,
    'złote',
    'https://nbp.pl/'
  ),
  (
    'demo-2023-chopin-10',
    'Fryderyk Chopin 10 zł',
    'Wielcy polscy kompozytorzy',
    10,
    2023,
    'Mennica Polska',
    50000,
    'srebro 925',
    14.14,
    32,
    'proof',
    'Srebrna moneta okolicznościowa NBP.',
    null,
    null,
    250,
    'srebrne',
    'https://nbp.pl/'
  ),
  (
    'demo-2022-wisla-5',
    'Rzeka Wisła 5 zł',
    'Polskie rzeki',
    5,
    2022,
    'Mennica Polska',
    38000,
    'stop Nordic Gold',
    8.5,
    27,
    'brilliant uncirculated',
    'Moneta obiegowa okolicznościowa.',
    null,
    null,
    5,
    'obiegowe',
    'https://nbp.pl/'
  )
on conflict (id) do nothing;

insert into public.coin_prices (coin_id, price, source, scraped_at)
values
  ('demo-2024-bielik-1oz', 4200, 'seed', now()),
  ('demo-2023-chopin-10', 320, 'seed', now()),
  ('demo-2022-wisla-5', 28, 'seed', now());
