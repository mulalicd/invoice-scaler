# PROJECT CONSTITUTION — Faktura Sistem (IDSS · IMH)
Verzija 1.0 — Juli 2026
Governance: [Commander](https://github.com/IDSS123a/commander) v1.1 (retroaktivno primijenjeno)

> Ovaj dokument nadopunjuje Commander CONSTITUTION.md, ENGINEERING_RULES.md,
> ARCHITECTURE_PATTERNS.md, ACA_COMMUNICATION_PROTOCOL.md, FEATURE_LIFECYCLE.md,
> DONE_CHECKLIST.md i DECISION_LOG.md. Commander dokumenti uvijek imaju prednost
> u pitanjima mindset-a i procesa; ovaj dokument definiše specifičnosti projekta.

---

## 1. Vizija i institucionalna svrha

Sistem fakturisanja za dvije pravne osobe pod istim krovom:
- **IDSS** — Islamski džemat sarajevske sportske sekcije (kod: `IDSS`)
- **IMH** — Islamska mektebska hošnica (kod: `IMH`)

Svaka organizacija ima nezavisan brojač faktura, klijente, cjenik i podatke,
ali djeli isti korisnički whitelist i platformu. Multi-org izolacija je obavezna
na RLS nivou — nikada ne oslanjati se samo na frontend filtere.

## 2. Režim (M-20)

**FULL** — produkcijski sistem koji obrađuje stvarne račune. Sve DONE_CHECKLIST
stavke se primjenjuju.

## 3. Whitelist korisnika (M-4 anti-hallucination)

Pristup je zaključan na tačno tri email adrese (`allowed_emails` tabela):

| Email                          | Uloga          | Organizacije |
|--------------------------------|----------------|--------------|
| mulalic.davor@outlook.com      | superadmin     | sve          |
| financije@idss.ba              | admin          | IDSS, IMH    |
| mehmed.s@poslovnost.ba         | viewer         | IDSS, IMH    |

Registracija je onemogućena. Nikada ne dodavati druge korisnike bez izričite
naredbe Direktora.

## 4. Uloge (`app_role` enum)

- `superadmin` — puni pristup svim organizacijama i sistemskim funkcijama
- `admin` — CRUD i administracija u vlastitoj organizaciji
- `accountant` — CRUD faktura i klijenata u vlastitoj organizaciji
- `viewer` — **isključivo read-only + CSV/PDF export**. Nikada dozvoliti write.

Provjere se rade preko `has_role_or_super(_user_id, _role, _org_id)` SECURITY
DEFINER funkcije. Nikada čitati uloge direktno iz `user_roles` u policy-jima
(rekurzivni RLS problem).

## 5. Poslovna pravila (M-4)

- Valuta: **KM (BAM)**, prikaz s dvije decimale, hiljadar tačka: `1.234,56 KM`
- Datum: `DD.MM.YYYY`
- Jezik UI-a: **bosanski**
- Broj fakture: `{prefix}{seq:0000}/{year}` — atomično kroz `next_invoice_number` RPC
- Nakon logina korisnik **bira aktivnu organizaciju** (`PostLoginOrgChooser`).
  Nikada automatski birati organizaciju osim ako korisnik ima pristup samo jednoj.
- Aktivna organizacija se drži u `profiles.active_organization_id` i mijenja
  isključivo kroz `switch_active_organization` RPC (audit trail obavezan).

## 6. Sigurnost (M-3 hijerarhija)

- RLS uključen na svim `public.*` tabelama, GRANT eksplicitno postavljen po
  ulogama (nikada `anon` osim za javne readove).
- Uloge se čuvaju **isključivo** u `user_roles` — nikada na `profiles`.
- Client error log maskiran (`src/lib/redact.ts`) — email, tokeni, API ključevi.
- `X-Content-Type-Options: nosniff`, strict Referrer-Policy, restriktivan
  Permissions-Policy u `index.html`.
- HTTPS-only (Lovable hosting default).
- Client kod nikada ne priprema service_role ključ; sve privilegovane operacije
  idu kroz SECURITY DEFINER RPC-ove ili edge funkcije.

## 7. Arhitektura (M-5 slojevi)

```
Presentation      src/pages, src/components
      ↓
Application       src/contexts (AuthContext), TanStack Query hooks
      ↓
Domain            src/lib (format, redact, passwordPolicy, numberToWords)
      ↓
Infrastructure    src/integrations/supabase, edge functions
      ↓
External          Lovable Cloud (Supabase), Resend, Lovable AI Gateway
```

**Napomena:** Trenutna struktura još nije striktno feature-based (M-6).
Vidi `commander/COMPLIANCE_AUDIT.md` — planirana migracija na `src/features/*`
je Tech Debt Item TD-01.

## 8. Test i CI (DONE_CHECKLIST)

- Unit: Vitest (`src/test/*`, `src/lib/*.test.ts`)
- Regresija: `src/test/dynamic-imports.test.ts` (HMR + dynamic import)
- E2E: Playwright (`e2e/auth-rls.spec.ts`) — login + role/org fetch
- CI: `.github/workflows/ci.yml` — lint, typecheck, test, error-gate na svakom push
- Error-gate: `scripts/error-gate.mjs` — poredi broj 403/stack u PR-u

## 9. Handoff pravilo (M-9)

Nakon svakog većeg sprinta obavezno ažurirati `commander/HANDOFF.md`
i `commander/DECISION_LOG.md`.
