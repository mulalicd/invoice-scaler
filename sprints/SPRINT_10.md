# SPRINT 10 — 2FA (TOTP) + Session Management
Datum: 18.07.2026
Status: ✅ DONE

## Cilj
Podignuti sigurnosnu razinu na nivo koji zahtijeva financijski SaaS: obavezna dvofaktorska provjera na login-u i mogućnost odjave sa svih uređaja.

## Isporučeno

### 2FA (TOTP)
- `src/lib/mfa.ts` — enroll / verify / challenge / list / unenroll helper koji koristi native Supabase Auth MFA API.
- `src/components/SecuritySettings.tsx` — dijalog za aktivaciju s QR kodom (Supabase vraća SVG data-uri, bez dodatnih dependencija), fallback ručnog upisa tajnog ključa, prikaz i uklanjanje aktivnih faktora.
- `src/components/MfaChallenge.tsx` — full-screen gate koji se pojavljuje nakon logina kada je `currentLevel=aal1 && nextLevel=aal2`. 6-cifreni kod, auto-focus, one-time-code autocomplete.
- `src/contexts/AuthContext.tsx` — nova `mfaRequired` flag; evaluira se pri onAuthStateChange i initial getSession.
- `src/components/ProtectedRoute.tsx` — MfaChallenge se prikazuje prije `ForcePasswordChange`, org chooser-a i dashboarda.

### Session management
- `signOutAllDevices()` → `supabase.auth.signOut({ scope: 'global' })` — poništava sve refresh tokene korisnika.
- Nova kartica "Sigurnost" u Settings s AlertDialog potvrdom.

### Governance
- Sprint doc + HANDOFF + ACTIVITY_LOG + DECISION_LOG update.

## Odluke
- **D-006:** Backup kodovi (recovery codes) nisu dio Sprint 10 — Supabase Auth MFA nema native podršku; implementacija bi zahtijevala custom tabelu s hash-ovanim jednokratnim kodovima + RLS + admin bypass. Planirano kao Sprint 11 stavka ako Direktor potvrdi potrebu.
- **D-007:** Email notifikacija na novom uređaju odgođena — zahtijeva GoTrue auth webhook + Resend template; Sprint 11.

## Otvoreni rizici
- Ako korisnik izgubi authenticator i nema backup kodove, jedini oporavak je superadmin unenroll preko service_role edge funkcije. Trenutno pokriveno kroz `seed-users` protokol (`SEED_USERS_ADMIN_TOKEN`).

## Testiranje
- Ručno: enroll → QR → verify → logout → login → MfaChallenge → verify → dashboard ✅
- Typecheck + build + 15 unit testova zeleno.

## Next
Sprint 11 kandidati: (a) immutable invoices + storno/credit note (zakonska obaveza), (b) backup kodovi + email na novom uređaju (dopuna 2FA), (c) TD-02 Zod konsolidacija.
