# PROJECT CLAUDE.md TEMPLATE — Faktura Sistem (IDSS · IMH)

> Ovaj fajl je projekt-specifičan template za AI kolaboratora (ACA / Lovable agent).
> Commander v1.2 dokumenti (CONSTITUTION, ENGINEERING_RULES, ARCHITECTURE_PATTERNS,
> ACA_COMMUNICATION_PROTOCOL, FEATURE_LIFECYCLE, DONE_CHECKLIST) imaju prednost;
> ovaj fajl definiše specifičnosti Faktura Sistema.

---

## 1. Identitet projekta

- **Naziv:** Faktura Sistem
- **Organizacije:** IDSS, IMH (multi-org, izolacija na RLS nivou)
- **Režim (M-20):** FULL — produkcijski sistem sa stvarnim finansijskim podacima
- **Jezik komunikacije s korisnikom:** bosanski
- **Valuta:** KM (BAM), `1.234,56 KM`
- **Format datuma:** `DD.MM.YYYY`

## 2. Whitelist (M-4 anti-hallucination)

| Email | Uloga |
|-------|-------|
| mulalic.davor@outlook.com | superadmin |
| financije@idss.ba | admin |
| mehmed.s@poslovnost.ba | viewer |

**Nikada** ne dodavati korisnike izvan ove liste bez izričite direktive Direktora.

## 3. Stack

- React 18 + Vite 5 + TypeScript 5 (`noImplicitAny: true`)
- Tailwind CSS v3 + shadcn/ui + Recharts
- Lovable Cloud (Supabase) — RLS, RPC, edge functions
- Testing: Vitest (unit) + Playwright (E2E) + CI error-gate

## 4. Obavezna pravila (izvod)

- **E-1:** TypeScript strict incrementalno (`strict: true` = TD-03 Faza 3)
- **E-2:** Zod na svakom I/O boundary
- **E-3:** RLS + GRANT na SVAKOJ `public.*` tabeli
- **E-4:** SECURITY DEFINER funkcije uvijek `SET search_path = public`
- **E-5:** `log_action` audit trail na svakoj privilegovanoj operaciji
- **E-6:** `src/lib/redact.ts` maskiranje u error log UI + CSV export

## 5. Layered architecture (M-5)

```
Presentation   src/pages, src/components
Application    src/contexts, TanStack Query hooks
Domain         src/lib (format, redact, passwordPolicy, numberToWords, domain)
Infrastructure src/integrations/supabase, supabase/functions
```

## 6. Governance putanje

| Dokument | Namjena |
|----------|---------|
| `commander/PROJECT_CONSTITUTION.md` | vizija + poslovna pravila |
| `commander/COMPLIANCE_AUDIT.md` | M/E/A matrica + TD registar |
| `commander/HANDOFF.md` | trenutni sprint handoff |
| `commander/DECISION_LOG.md` | arhitektonske odluke |
| `corrections/ACTIVITY_LOG.md` | direktive, korekcije, reversal-i |
| `sprints/SPRINT_NN.md` | sprint zapisi |

## 7. Hookovi

`.claude/hooks/` nije uveden — Lovable sandbox ne pokreće Claude hookove.
Ekvivalent: `.github/workflows/ci.yml` + `scripts/error-gate.mjs` (typecheck, unit,
Playwright E2E, fail-on-new-error gate na PR).

## 8. Zabrane (izvod iz constraints memorije)

- ❌ Auto-switch aktivne organizacije nakon logina — koristi `PostLoginOrgChooser`
- ❌ Viewer write operacije bilo koje vrste
- ❌ Uloge na `profiles` tabeli — samo `user_roles`
- ❌ Direktan pristup `service_role` iz klijenta
- ❌ Registracija novih korisnika kroz UI
- ❌ Purple/indigo gradijenti + Inter/Poppins bez izričite naredbe

## 9. M-22 KRAJ protokol

Nakon završetka svake značajnije faze:
1. Update `commander/HANDOFF.md` s "Completed / Not completed / Open risks / Next"
2. Novi red u `commander/DECISION_LOG.md` ako je donesena odluka
3. Novi red u `corrections/ACTIVITY_LOG.md` za direktivu ili korekciju
4. Kreiraj `sprints/SPRINT_NN.md` sa isporukama i odlukama
