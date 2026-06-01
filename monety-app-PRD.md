# 🪙 Coinflip — Aplikacja do identyfikacji i kolekcjonowania polskich monet

## Dokument: PRD + Plan Projektu (dla agenta Cursor)

---

## 📌 Cel projektu

Mobilna aplikacja na Android i iOS skupiona wyłącznie na **polskich monetach** (kolekcjonerskich i obiegowych). Użytkownik może robić zdjęcia monet telefonem, a aplikacja identyfikuje monetę za pomocą AI, wyświetla szczegółowe informacje, pozwala budować własną kolekcję i śledzić wartość rynkową monet w czasie rzeczywistym.

Benchmark / inspiracja: [Coin Identifier AI](https://play.google.com/store/apps/details?id=com.coinidentifyer.ai) — ale nasza wersja jest dedykowana wyłącznie polskim monetom.

---

## 🛠️ Stack technologiczny — DECYZJA

### ✅ Wybór: React Native + Expo (rekomendowane)

**Dlaczego React Native + Expo, a nie Flutter:**

| Kryterium | React Native + Expo | Flutter |
|---|---|---|
| Język | TypeScript (znany ekosystem JS) | Dart (niszowy język) |
| Integracja aparatu | `expo-camera` + `expo-image-picker` — bardzo dojrzałe | `camera` plugin — działa, ale mniej dokumentacji |
| AI / Vision API | Łatwa integracja z Anthropic Claude Vision przez fetch | Identycznie |
| Publikacja w sklepach | Expo EAS Build — jeden komend do Google Play + App Store | Flutter build — wymaga więcej konfiguracji |
| Community & biblioteki | Ogromne, dojrzałe | Rośnie, ale mniejsze |
| Czas do MVP | Szybszy (bogaty ekosystem gotowych komponentów) | Wolniejszy |
| Performance | Wystarczający dla tej aplikacji | Nieco lepszy, ale bez znaczenia tutaj |

### Tech Stack szczegółowo:

```
Frontend:        React Native + Expo SDK 52+
Język:           TypeScript
Nawigacja:       Expo Router (file-based routing)
State:           Zustand + React Query (TanStack Query)
UI Components:   NativeWind (Tailwind dla RN) + React Native Paper
Baza danych:     SQLite lokalnie (expo-sqlite) + Supabase (backend/sync)
AI Identyfikacja: Anthropic Claude Vision API (claude-opus-4-5 z vision)
Zdjęcia:         expo-camera + expo-image-picker + expo-image-manipulator
Scraping cen:    Backend serverless (Supabase Edge Functions) do pobierania cen
Animacje:        React Native Reanimated 3
Ikony:           Expo Vector Icons
Build & Deploy:  Expo EAS Build + EAS Submit
```

---

## 🗂️ Źródła danych o monetach polskich

### Bazy danych / Scraping (do zbudowania własnej bazy):

| Źródło | Typ | Co oferuje | Priorytet |
|---|---|---|---|
| [NBP — Monety Okolicznościowe](https://nbp.pl/banknoty-i-monety/monety-okolicznosciowe/katalog/) | Oficjalny | Pełen katalog, zdjęcia, opisy, nakład, rok | ⭐⭐⭐ Główne |
| [Mennica Polska](https://inwestycje.mennica.com.pl/produkty-kolekcjonerskie/) | Oficjalny | Monety kolekcjonerskie, ceny emisyjne, zdjęcia | ⭐⭐⭐ Główne |
| [Świat Monet](https://swiat-monet.pl/pl/249-monety-kolekcjonerskie) | Sklep | Ceny rynkowe, zdjęcia, opisy | ⭐⭐ Uzupełnienie |
| [Allegro](https://allegro.pl/) | Marketplace | Ceny transakcyjne (realne) | ⭐⭐⭐ Ceny rynkowe |
| [Amazon.pl](https://www.amazon.pl/) | Marketplace | Ceny sprzedaży | ⭐⭐ Uzupełnienie |

### Strategia budowania bazy danych monet:

```
Faza 1 — Seed data:
  - Scraper NBP (Python/Node) → pobiera katalog NBP → JSON
  - Scraper Mennicy → uzupełnienie danych
  - Wynik: ~500-2000 monet z opisami, zdjęciami, parametrami

Faza 2 — Enrichment:
  - Claude Vision analizuje zdjęcia z NBP → generuje szczegółowe opisy
  - Matching ze Świat-Monet → ceny rynkowe

Faza 3 — Live pricing:
  - Supabase Edge Function → cron co 24h → scraping Allegro
  - Cache wyników w bazie
```

---

## 🎯 Features — Pełna lista

### MVP (v1.0) — Must Have

#### 📷 Identyfikacja monet przez aparat
- [ ] Uruchomienie aparatu bezpośrednio z aplikacji
- [ ] Tryb "live scan" — aparat z nakładką pomocniczą (jak skanery kodów)
- [ ] Przesyłanie zdjęcia do Claude Vision API
- [ ] Zwrócenie: nazwa monety, rok, nominał, mennica, stan zachowania (szacunkowy)
- [ ] Jeśli moneta istnieje w bazie → pokaż pełny profil
- [ ] Jeśli nie istnieje → pokaż wynik AI z opcją ręcznego uzupełnienia
- [ ] Galeria — możliwość wgrania zdjęcia z biblioteki telefonu

#### 🗄️ Baza danych monet
- [ ] Lokalna baza SQLite z katalogiem polskich monet
- [ ] Schemat: `id, nazwa, rok, nominał, seria, mennica, nakład, opis, materiał, średnica, waga, zdjęcie_awers, zdjęcie_rewers, cena_emisyjna, cena_rynkowa, data_emisji, kategoria`
- [ ] Wyszukiwarka tekstowa po nazwie, roku, nominale
- [ ] Filtry: rok, seria, nominał, materiał, dostępność
- [ ] Szczegółowy profil monety ze wszystkimi parametrami

#### 📚 Moja kolekcja
- [ ] Dodawanie monety do kolekcji (z identyfikacji lub z katalogu)
- [ ] Dla każdego egzemplarza: `cena_zakupu, data_zakupu, stan (G/VG/F/VF/EF/UNC), notatki, własne zdjęcia`
- [ ] Lista kolekcji z miniaturkami zdjęć
- [ ] Edycja opisu i danych każdej monety w kolekcji
- [ ] Usuwanie z kolekcji

#### 💰 Wartość kolekcji
- [ ] Dla każdej monety: `cena zakupu` vs `cena aktualna` (pobierana z sieci)
- [ ] Dashboard kolekcji: łączna wartość zakupu vs łączna wartość rynkowa
- [ ] Zysk/strata na każdej monecie i całej kolekcji

### V1.1 — Should Have

#### 🌐 Ceny rynkowe online
- [ ] Pobieranie aktualnych cen z Allegro (przez backend)
- [ ] Pobieranie cen z Świat-Monet
- [ ] Wykres historyczny ceny monety (ostatnie 30/90/365 dni)
- [ ] Powiadomienie push gdy cena ulubionej monety spadnie poniżej progu

#### 🔍 Zaawansowana identyfikacja
- [ ] Rozpoznawanie stanu monety (G/VG/F/VF/EF/UNC) ze zdjęcia
- [ ] Sugestia podobnych monet jeśli identyfikacja niepewna
- [ ] Tryb porównania: zdjęcie użytkownika vs. wzorcowe zdjęcie z bazy
- [ ] Historia skanów (ostatnie 20 identyfikacji)

#### 📊 Statystyki i raporty
- [ ] Statystyki kolekcji: ilość monet, łączna wartość, podział wg serii/roku
- [ ] Wykres wartości kolekcji w czasie
- [ ] Eksport kolekcji do CSV/PDF

### V2.0 — Nice to Have

#### 👥 Społeczność
- [ ] Profil publiczny kolekcjonera
- [ ] Udostępnianie kolekcji
- [ ] Forum / komentarze przy monetach
- [ ] Giełda — oferty kupna/sprzedaży między użytkownikami

#### 🌍 Rozszerzenie na inne kraje
- [ ] Dodanie monet europejskich
- [ ] Dodanie monet światowych
- [ ] Wielojęzyczność (PL/EN/DE)

---

## 🏗️ Architektura aplikacji

```
┌─────────────────────────────────────────────┐
│              REACT NATIVE APP                │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Camera  │  │Catalogue │  │Collection│  │
│  │  Screen  │  │  Screen  │  │  Screen  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │              │              │        │
│  ┌────▼──────────────▼──────────────▼─────┐ │
│  │           State Layer (Zustand)         │ │
│  └────────────────────┬───────────────────┘ │
│                        │                    │
│  ┌─────────────────────▼──────────────────┐ │
│  │         Services Layer                  │ │
│  │  CoinService | PriceService | AIService │ │
│  └───────┬──────────────┬─────────────────┘ │
│          │              │                   │
│  ┌───────▼───┐  ┌───────▼──────────────┐   │
│  │SQLite     │  │  Supabase Client     │   │
│  │(local DB) │  │  (sync + auth)       │   │
│  └───────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
  ┌──────────────┐    ┌────────────────────┐
  │ Claude Vision│    │ Supabase Backend   │
  │ API          │    │ ┌────────────────┐ │
  │ (Identify)   │    │ │ Edge Functions │ │
  └──────────────┘    │ │ - Price scraper│ │
                      │ │ - NBP sync     │ │
                      │ └────────────────┘ │
                      │ ┌────────────────┐ │
                      │ │ PostgreSQL     │ │
                      │ │ (coins DB)     │ │
                      │ └────────────────┘ │
                      └────────────────────┘
```

---

## 📁 Struktura projektu

```
polish-coins-app/
├── app/                          # Expo Router (file-based)
│   ├── (tabs)/
│   │   ├── index.tsx             # Ekran główny / scanner
│   │   ├── catalogue.tsx         # Katalog monet
│   │   ├── collection.tsx        # Moja kolekcja
│   │   └── profile.tsx           # Profil + ustawienia
│   ├── coin/[id].tsx             # Szczegół monety
│   ├── scan/result.tsx           # Wynik skanowania
│   └── _layout.tsx
│
├── components/
│   ├── camera/
│   │   ├── CameraView.tsx        # Widok aparatu z overlay
│   │   └── ScanGuide.tsx         # Nakładka pomocnicza
│   ├── coins/
│   │   ├── CoinCard.tsx          # Karta monety (lista)
│   │   ├── CoinDetail.tsx        # Szczegóły monety
│   │   ├── CoinImage.tsx         # Zdjęcie monety (awers/rewers)
│   │   └── PriceChart.tsx        # Wykres ceny
│   ├── collection/
│   │   ├── CollectionItem.tsx
│   │   └── CollectionStats.tsx
│   └── ui/                       # Generyczne komponenty UI
│
├── services/
│   ├── ai/
│   │   └── coinIdentifier.ts     # Claude Vision integration
│   ├── database/
│   │   ├── schema.ts             # SQLite schema
│   │   ├── coinRepository.ts     # CRUD dla monet
│   │   └── collectionRepository.ts
│   ├── pricing/
│   │   └── priceService.ts       # Pobieranie cen
│   └── supabase/
│       └── client.ts
│
├── store/
│   ├── coinStore.ts              # Zustand - monety
│   ├── collectionStore.ts        # Zustand - kolekcja
│   └── scanStore.ts              # Zustand - skan
│
├── hooks/
│   ├── useCoinIdentification.ts
│   ├── useCamera.ts
│   └── useCollection.ts
│
├── types/
│   └── coin.types.ts             # TypeScript interfaces
│
├── scripts/                      # Skrypty do seedowania bazy
│   ├── scrape-nbp.ts             # Scraper NBP
│   ├── scrape-mennica.ts         # Scraper Mennicy
│   └── seed-database.ts          # Import do Supabase
│
├── supabase/
│   └── functions/
│       ├── scrape-prices/        # Edge function - ceny
│       └── sync-coins/           # Edge function - synchronizacja
│
├── assets/
│   └── coins/                    # Lokalne zdjęcia monet (cache)
│
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
└── package.json
```

---

## 🗃️ Schema bazy danych

### Tabela: `coins` (katalog główny)
```sql
CREATE TABLE coins (
  id              TEXT PRIMARY KEY,       -- np. "NBP-2024-001"
  name            TEXT NOT NULL,          -- "Orzeł Bielik 1 oz"
  series          TEXT,                   -- "Orzeł Bielik"
  denomination    REAL,                   -- 200 (PLN)
  year            INTEGER,               -- 2024
  mint            TEXT,                   -- "Mennica Polska"
  mintage         INTEGER,               -- nakład: 5000
  material        TEXT,                   -- "złoto 999,9"
  weight_g        REAL,                   -- 31.1
  diameter_mm     REAL,                   -- 32
  quality         TEXT,                   -- "proof"
  description     TEXT,                   -- pełny opis
  image_obverse   TEXT,                   -- URL zdjęcia awers
  image_reverse   TEXT,                   -- URL zdjęcia rewers
  issue_price     REAL,                   -- cena emisyjna NBP
  category        TEXT,                   -- "złote"|"srebrne"|"obiegowe"
  source_url      TEXT,                   -- URL źródła
  created_at      TEXT,
  updated_at      TEXT
);

CREATE TABLE coin_prices (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_id         TEXT REFERENCES coins(id),
  price           REAL,
  source          TEXT,                   -- "allegro"|"swiat-monet"
  source_url      TEXT,
  scraped_at      TEXT
);

CREATE TABLE my_collection (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  coin_id         TEXT REFERENCES coins(id),
  purchase_price  REAL,                   -- cena zakupu
  purchase_date   TEXT,
  condition       TEXT,                   -- G|VG|F|VF|EF|UNC
  notes           TEXT,                   -- własne notatki
  my_photo_obverse TEXT,                  -- własne zdjęcie
  my_photo_reverse TEXT,
  is_for_sale     INTEGER DEFAULT 0,
  added_at        TEXT
);
```

---

## 🤖 AI Identyfikacja — Prompt dla Claude Vision

```typescript
const COIN_IDENTIFICATION_PROMPT = `
Jesteś ekspertem numizmatycznym specjalizującym się w polskich monetach.
Przeanalizuj dokładnie zdjęcie monety i zwróć informacje w formacie JSON.

Odpowiedź TYLKO w JSON, bez żadnego tekstu przed lub po:
{
  "name": "pełna nazwa monety",
  "year": 2024,
  "denomination": 200,
  "denomination_currency": "PLN",
  "series": "nazwa serii jeśli znana",
  "material": "złoto|srebro|miedź|stop",
  "mint": "Mennica Polska|NBP|nieznana",
  "condition_estimate": "G|VG|F|VF|EF|UNC",
  "confidence": 0.95,
  "description": "krótki opis monety",
  "is_commemorative": true,
  "notes": "dodatkowe uwagi"
}

Jeśli nie możesz zidentyfikować monety jako polskiej, napisz w polu "notes": "Nie rozpoznano polskiej monety".
Skup się na szczegółach: inskrypcje, herb, godło, daty, nominał.
`;
```

---

## 📱 Ekrany aplikacji (User Flow)

### Ekran 1: Home / Scanner (Tab 1)
```
┌─────────────────────────┐
│   🪙 PolishCoins         │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │                   │  │
│  │   [VIEWFINDER]    │  │
│  │                   │  │
│  │  ┌───────────┐    │  │
│  │  │  moneta   │    │  │
│  │  └───────────┘    │  │
│  │  Umieść monetę    │  │
│  │  w ramce          │  │
│  └───────────────────┘  │
│                         │
│  [📷 Skanuj]  [🖼 Galeria]│
└─────────────────────────┘
```

### Ekran 2: Wynik identyfikacji
```
┌─────────────────────────┐
│  ← Wynik skanowania     │
├─────────────────────────┤
│  [ZDJĘCIE MONETY]       │
│                         │
│  ✅ Znaleziono w bazie! │
│  Orzeł Bielik 1 oz      │
│  Złoto 999,9 | 2024     │
│  Pewność: 94%           │
│                         │
│  💰 Cena emisyjna: 3500₴│
│  📈 Cena rynkowa: ~4200₴│
│                         │
│  [+ Dodaj do kolekcji]  │
│  [ℹ️ Więcej informacji] │
│  [✏️ Zmień opis]        │
└─────────────────────────┘
```

### Ekran 3: Dodawanie do kolekcji
```
┌─────────────────────────┐
│  ← Dodaj do kolekcji   │
├─────────────────────────┤
│  Orzeł Bielik 1oz 2024  │
│                         │
│  Cena zakupu: [____] PLN│
│  Data zakupu: [DD.MM.YY]│
│  Stan: [VF         ▼]   │
│                         │
│  Notatki:               │
│  [____________________] │
│                         │
│  Zdjęcie własne:        │
│  [📷 Awers] [📷 Rewers] │
│                         │
│  [✅ Zapisz w kolekcji] │
└─────────────────────────┘
```

### Ekran 4: Katalog (Tab 2)
```
┌─────────────────────────┐
│  🔍 [Szukaj monetę...]  │
│  Filtry: [Rok] [Seria]  │
├─────────────────────────┤
│  📌 Polecane            │
│  ┌──────┐ ┌──────┐      │
│  │ img  │ │ img  │      │
│  │Bielik│ │Sobieski│    │
│  └──────┘ └──────┘      │
│                         │
│  📋 Wszystkie monety    │
│  [Moneta] [Rok] [Cena]  │
│  ─────────────────────  │
│  Bielik 1oz    4200 PLN │
│  Chopin 10zł    320 PLN │
│  ...                    │
└─────────────────────────┘
```

### Ekran 5: Kolekcja (Tab 3)
```
┌─────────────────────────┐
│  Moja kolekcja (12 szt) │
│  💰 Zapłacono: 8,500 PLN│
│  📈 Wartość:  11,200 PLN│
│  🟢 Zysk:    +2,700 PLN │
├─────────────────────────┤
│  [img] Bielik 2024      │
│        Kupiono: 3500    │
│        Teraz: ~4200     │
│        🟢 +700 PLN      │
│  ─────────────────────  │
│  [img] Chopin 10zł      │
│        Kupiono: 280     │
│        Teraz: ~320      │
│        🟢 +40 PLN       │
└─────────────────────────┘
```

---

## 🚀 Plan realizacji (Sprint-based)

### Sprint 0 — Przygotowanie (1 tydzień)
- [ ] Setup projektu: `npx create-expo-app@latest polishcoins --template`
- [ ] Konfiguracja TypeScript, ESLint, Prettier
- [ ] Setup Supabase (projekt, tabele, API keys)
- [ ] Setup Expo EAS (konta Apple Developer + Google Play)
- [ ] Skonfigurowanie `app.json` (bundle ID, permissions: camera, photos)

### Sprint 1 — Baza danych monet (2 tygodnie)
- [ ] Scraper NBP → pobranie wszystkich monet z katalogu
- [ ] Scraper Mennicy → uzupełnienie danych
- [ ] Import do Supabase PostgreSQL
- [ ] Setup lokalnej SQLite z `expo-sqlite`
- [ ] Mechanizm synchronizacji Supabase → SQLite (przy starcie apki)

### Sprint 2 — Aparat + Identyfikacja AI (2 tygodnie)
- [ ] Integracja `expo-camera`
- [ ] UI skanera z nakładką pomocniczą
- [ ] Integracja Claude Vision API
- [ ] Ekran wyników identyfikacji
- [ ] Matching wyniku AI z bazą lokalną
- [ ] Fallback gdy moneta nie jest w bazie

### Sprint 3 — Katalog (1 tydzień)
- [ ] Lista monet z paginacją
- [ ] Wyszukiwarka (full-text search SQLite)
- [ ] Filtry (rok, seria, materiał, nominał)
- [ ] Szczegóły monety (pełny profil)
- [ ] Galeria zdjęć awers/rewers

### Sprint 4 — Kolekcja (2 tygodnie)
- [ ] Dodawanie monety do kolekcji
- [ ] Formularz: cena zakupu, data, stan, notatki
- [ ] Własne zdjęcia (expo-image-picker)
- [ ] Lista kolekcji z wartościami
- [ ] Edycja i usuwanie z kolekcji
- [ ] Dashboard: łączna wartość, zysk/strata

### Sprint 5 — Ceny rynkowe (2 tygodnie)
- [ ] Supabase Edge Function: scraper Allegro (poszukiwanie po nazwie monety)
- [ ] Supabase Edge Function: scraper Świat-Monet
- [ ] Cron job: odświeżanie cen co 24h
- [ ] Wyświetlanie cen w aplikacji
- [ ] Wykres historyczny ceny (Recharts / Victory Native)

### Sprint 6 — Polish & Store Release (2 tygodnie)
- [ ] Onboarding (pierwsze uruchomienie)
- [ ] Powiadomienia push (cena spada/rośnie)
- [ ] Tryb ciemny
- [ ] Animacje i micro-interactions
- [ ] Testy na fizycznych urządzeniach (Android + iOS)
- [ ] Przygotowanie materiałów do App Store / Google Play
- [ ] Submission do obu sklepów

---

## 🔑 Wymagane klucze API i konta

```env
# .env.local
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=              # Do Claude Vision (przez backend!)

# Nigdy nie wystawiaj ANTHROPIC_API_KEY w kliencie!
# Wywołania Claude Vision muszą iść przez Supabase Edge Function
```

### Konta do założenia:
1. **Anthropic API** — klucz do Claude Vision (claude-opus-4-5 lub claude-3-5-sonnet)
2. **Supabase** — darmowy plan wystarczy na start
3. **Apple Developer Account** — 99 USD/rok (wymagane do App Store)
4. **Google Play Console** — 25 USD jednorazowo

---

## ⚠️ Ważne decyzje architektoniczne

### 1. Bezpieczeństwo klucza API Claude
```
❌ Źle: Klient → Claude API (klucz widoczny w apce)
✅ Dobrze: Klient → Supabase Edge Function → Claude API
```
Klucz Anthropic nigdy nie może być w kodzie aplikacji mobilnej.

### 2. Strategia cen Allegro
Allegro nie ma publicznego API dla cen. Opcje:
- **Opcja A**: Scraping HTML (kruche, może zostać zablokowane)
- **Opcja B**: Allegro REST API (wymaga rejestracji aplikacji)
- **Opcja C**: Allegro Affiliate API (możliwe bez rejestracji sklepu)

Rekomendacja: Zacznij od Allegro REST API + scraping Świat-Monet jako backup.

### 3. Offline-first
Apka musi działać bez internetu (katalog + kolekcja) — stąd SQLite lokalnie.
Synchronizacja z Supabase tylko gdy jest połączenie.

### 4. Przechowywanie zdjęć
- Zdjęcia z NBP/Mennicy → Supabase Storage (CDN)
- Własne zdjęcia użytkownika → lokalnie (expo-file-system) + opcjonalny backup do Supabase

---

## 📋 Dla agenta Cursor — instrukcje startowe

```
Twoim zadaniem jest stworzenie aplikacji mobilnej "PolishCoins" zgodnie z tym PRD.

Zacznij od:
1. Inicjalizacji projektu Expo z TypeScript
2. Konfiguracji struktury folderów zgodnie z sekcją "Struktura projektu"
3. Setup Supabase client
4. Schema SQLite (lokalna baza)
5. Implementacji CameraScreen z expo-camera
6. Integracji z Claude Vision API przez Supabase Edge Function

Używaj:
- TypeScript strict mode
- NativeWind do stylowania
- Zustand do state management
- expo-router do nawigacji
- Konwencja nazewnictwa: PascalCase dla komponentów, camelCase dla functions/variables

Priorytet MVP:
Scanner → Identyfikacja AI → Wyniki → Dodanie do kolekcji → Lista kolekcji
```

---

## 📊 Metryki sukcesu

| Metryka | Cel MVP | Cel 6 miesięcy |
|---|---|---|
| Monety w bazie | 500+ | 2000+ |
| Trafność identyfikacji | 80%+ | 90%+ |
| Czas identyfikacji | < 5s | < 3s |
| Rating App Store | - | 4.0+ |
| Aktywni użytkownicy | 100 | 1000+ |

---

*Dokument wygenerowany: maj 2026 | Wersja: 1.0*
