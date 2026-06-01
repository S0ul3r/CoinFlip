# CoinFlip — checklist publikacji (Google Play & App Store)

Ten dokument zbiera wymagania sklepów i status w projekcie. Oficjalne źródła:

- [Google Play — User Data](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Google Play — Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Apple — Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple — App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## Zaimplementowane w aplikacji

| Wymaganie | Status |
|-----------|--------|
| Polityka prywatności w aplikacji | ✅ Profil → Polityka prywatności |
| Regulamin w aplikacji | ✅ Profil → Regulamin |
| Usunięcie konta w aplikacji | ✅ Profil → Usuń konto w aplikacji |
| Link do usunięcia konta (Google Play) | ✅ Stały URL w `EXPO_PUBLIC_ACCOUNT_DELETION_URL` |
| Uprawnienia aparat/galeria z opisem | ✅ `app.json` infoPlist / permissions |
| Brak ukrytych opłat / mylących UI | Do weryfikacji przed wysłaniem |

## Do zrobienia przed publikacją (Ty / DevOps)

### Obowiązkowe

1. **Publiczny URL polityki prywatności**  
   Opublikuj treść z `constants/legalContent.ts` (lub tę samą stronę co w aplikacji) pod adresem HTTPS, np. `https://twoja-domena.pl/privacy`.  
   Ustaw: `EXPO_PUBLIC_PRIVACY_POLICY_URL` w `.env` i wklej URL w:
   - Google Play Console → App content → Privacy policy  
   - App Store Connect → App Privacy → Privacy Policy URL  

2. **Publiczny URL usuwania konta (Google Play)**  
   Strona z instrukcją + e-mail kontaktowy lub formularz. Ten sam flow co w aplikacji.  
   Ustaw: `EXPO_PUBLIC_ACCOUNT_DELETION_URL` (np. `https://twoja-domena.pl/delete-account`).

3. **E-mail kontaktowy**  
   Zamień placeholder `patryk@coinflip.app` w `constants/legalContent.ts` na prawdziwy adres wsparcia.

4. **Konto testowe dla recenzentów Apple**  
   W App Store Connect → App Review Information podaj login/hasło do konta demo z danymi w kolekcji.

5. **EAS Build + podpisy**  
   - Android: keystore, `eas build --platform android`  
   - iOS: Apple Developer Program, certyfikaty, `eas build --platform ios`  

6. **Google Play — Data safety**  
   Zadeklaruj: e-mail, zdjęcia (opcjonalne), dane kolekcji, Supabase jako procesor. Zaznacz **account deletion** i wklej URL usuwania konta.

7. **Apple — App Privacy**  
   Wypełnij kategorie danych (contact info: email; user content: photos, collection notes; identifiers).

8. **Content rating**  
   IARC w Play Console; kwestionariusz wieku w App Store Connect.

9. **Target API level (Android)**  
   Sprawdź wymagany poziom API w [Play target API policy](https://developer.android.com/google/play/requirements/target-sdk) — Expo SDK 54 zwykle spełnia; zweryfikuj przy buildzie produkcyjnym.

### Zalecane

- **Regulamin** na publicznym URL (opcjonalnie wymagany przez Apple jako privacy-related).  
- **Ekran „O aplikacji”** z wersją i linkami prawnymi.  
- **Crash reporting** (Sentry) — nie wymagane, ale pomaga przy review.  
- **Screenshots** i opisy PL/EN w obu sklepach.  
- **RODO**: jeśli masz użytkowników w UE, DPIA nie jest zawsze wymagana dla małej apki, ale konsultacja prawna się opłaca.

## Czego NIE wolno (częste odrzucenia)

- Aplikacja „pusta” bez konta demo dla Apple  
- Brak polityki prywatności przy zbieraniu e-maila  
- Brak usuwania konta przy rejestracji e-mail  
- Mylące uprawnienia (aparat bez uzasadnienia w opisie)  
- Placeholder / Lorem ipsum w UI  
- Ceny szacunkowe prezentowane jako gwarancja inwestycyjna (dopisek w regulaminie już jest)

## Build produkcyjny (skrót)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
eas build --platform ios --profile production
```

Po pierwszym buildzie z natywnymi modułami (OCR, date picker) używaj profilu **production**, nie Expo Go.
