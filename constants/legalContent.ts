/** In-app legal copy (PL). Host the same text on a public URL for store listings. */

export const PRIVACY_POLICY_PL = `
Polityka prywatności — CoinFlip

Ostatnia aktualizacja: maj 2026

1. Administrator danych
Aplikacja CoinFlip („Aplikacja”) służy do katalogowania polskich monet i prowadzenia własnej kolekcji. Operatorem jest właściciel projektu CoinFlip (kontakt: patryk@coinflip.app — zastąp własnym adresem przed publikacją).

2. Jakie dane przetwarzamy
• Dane konta: adres e-mail i identyfikator użytkownika (logowanie przez Supabase Auth).
• Dane kolekcji: ceny zakupu, wartości, daty, notatki, zdjęcia monet dodane przez Ciebie.
• Dane techniczne: standardowe logi dostawcy hostingu (Supabase) niezbędne do działania usługi.

3. Zdjęcia i aparat
Zdjęcia monet przetwarzane są na urządzeniu (OCR / dopasowanie wizualne). Nie wysyłamy zdjęć do płatnych usług AI. Możesz odmówić dostępu do aparatu lub galerii — wtedy dodawanie zdjęć będzie ograniczone.

4. Cele przetwarzania
• Utworzenie i obsługa konta.
• Synchronizacja kolekcji między urządzeniem a chmurą.
• Poprawa działania aplikacji.

5. Podstawy prawne (RODO)
• Wykonanie umowy (art. 6 ust. 1 lit. b) — konto i synchronizacja.
• Uzasadniony interes (art. 6 ust. 1 lit. f) — bezpieczeństwo i diagnostyka.
• Zgoda (art. 6 ust. 1 lit. a) — opcjonalne uprawnienia (aparat, galeria).

6. Udostępnianie danych
Korzystamy z Supabase (hosting bazy danych i uwierzytelniania). Dane nie są sprzedawane podmiotom trzecim w celach marketingowych.

7. Okres przechowywania
Dane przechowujemy do czasu usunięcia konta lub wycofania zgody, z zastrzeżeniem obowiązków prawnych.

8. Twoje prawa
Masz prawo dostępu, sprostowania, usunięcia, ograniczenia, przenoszenia danych oraz sprzeciwu. Skargę możesz złożyć do UODO (uodo.gov.pl).

9. Usunięcie konta
W aplikacji: Profil → Usuń konto. Usuwamy konto, wpisy kolekcji w chmurze i dane powiązane z kontem.

10. Zmiany
O istotnych zmianach poinformujemy w aplikacji lub e-mailem.
`.trim();

export const TERMS_PL = `
Regulamin — CoinFlip

1. Aplikacja służy do celów informacyjnych i organizacji własnej kolekcji monet. Nie stanowi porady inwestycyjnej ani wyceny prawnej.

2. Ceny rynkowe i szacunki mają charakter orientacyjny.

3. Użytkownik odpowiada za treści dodawanych zdjęć i notatek.

4. Zabronione jest naruszanie prawa lub bezpieczeństwa usługi.

5. Usługa może być zmieniana lub zakończona z uzasadnionym wyprzedzeniem.

6. W sprawach konta i danych: jakubkulewicz05@gmail.com
`.trim();

/** Replace before production — required for Google Play Data safety form. */
export const ACCOUNT_DELETION_WEB_URL =
  process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ??
  "https://s0ul3r.github.io/coinflip-legal/delete-account.html";

export const PRIVACY_POLICY_WEB_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ??
  "https://s0ul3r.github.io/coinflip-legal/privacy.html";
