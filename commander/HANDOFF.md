# HANDOFF NOTE — Sprint 10 (2FA + Session Management)
Datum: 18.07.2026
Sprint: sprint-10-2fa-sessions

## Completed (this sprint)

- **Commander v1.2 alignment** — `.commander-version=1.2`, bootstrap tabela u `commander/COMPLIANCE_AUDIT.md` osvježena.
- **2FA (TOTP)** kroz native Supabase Auth MFA:
  - `src/lib/mfa.ts` helper (enroll, challenge, verify, list, unenroll, isMfaRequired, signOutAllDevices)
  - `src/components/SecuritySettings.tsx` — enroll dijalog s QR + fallback secret + uklanjanje faktora
  - `src/components/MfaChallenge.tsx` — post-login gate (6-cifreni kod)
  - `AuthContext` prati `mfaRequired` (getAuthenticatorAssuranceLevel: aal1→aal2)
  - `ProtectedRoute` renderuje `MfaChallenge` prije bilo koje aplikativne rute
- **Session management** — "Odjavi sa svih uređaja" (global scope signOut) s AlertDialog potvrdom.
- **Settings** — nova "Sigurnost" kartica između Korisnici i Moj račun.
- **Governance** — SPRINT_10.md, ACTIVITY_LOG update, DECISION_LOG D-006/D-007.

## Prior sprint

Sprint 09 — bootstrap alignment (corrections/, sprints/, automation/, PROJECT_CLAUDE_MD_TEMPLATE).

## Not completed (planned)

- **Sprint 11 kandidat:** backup/recovery kodovi (Supabase MFA nema native — potrebna vlastita tabela hash-ovanih jednokratnih kodova).
- **Sprint 11 kandidat:** email notifikacija na novom uređaju (GoTrue webhook + Resend template).
- **Sprint 11 kandidat:** immutable invoices + storno/credit note (financijski zakonski zahtjev).
- TD-01 → feature-based folderi
- TD-02 → konsolidovane Zod scheme (preduslov za TD-03 Fazu 3)
- TD-03 Faza 3 → full `strict: true`
- TD-04 → JSDoc pokrivenost
- TD-05 → RLS regression suite

## Open risks

- Bez backup kodova, oporavak izgubljenog authenticatora ide kroz `seed-users` service-role edge funkciju (zaštićenu `SEED_USERS_ADMIN_TOKEN`). Prihvatljivo za 3 korisnika; skalabilnije rješenje je Sprint 11.
- SECURITY DEFINER WARN-ovi ostaju (D-003).
- `strictNullChecks` još nije aktivan (TD-03 Faza 3).

## Next sprint (preporuka)

**Immutable invoices + storno/credit note** — zakonska obaveza za financijske dokumente u BiH. Zaključavanje `invoices.status='issued'`, kreiranje storno dokumenta s referencom na original, audit trail obavezan.
