# CORRECTIONS · ACTIVITY LOG — Faktura Sistem

Retroaktivno usaglašeno s Commander v1.2 bootstrap protokolom.
Format: `YYYY-MM-DD | TYPE | Opis | Referenca`

TYPE ∈ { CORRECTION, CLARIFICATION, REVERSAL, SCOPE-CHANGE, DIRECTIVE }

---

## 2026-07 Sprint zapisi

- `2026-07-15 | DIRECTIVE | Nastavak TD-03 Faze 2 (contexts + pages strict typing) | commander/HANDOFF.md`
- `2026-07-15 | CORRECTION | Vraćen GRANT EXECUTE na helper funkcije nakon 403 regresije | migration + D-005 kontekst`
- `2026-07-14 | DIRECTIVE | Retroaktivno usvojiti Commander v1.1 (kasnije upgrade na v1.2) | commander/DECISION_LOG.md D-001`
- `2026-07-14 | SCOPE-CHANGE | 3D scena reducirana na finance-safe varijantu, uklonjen drei/Text zbog font fetch grešaka | src/components/three/AuthScene.tsx`
- `2026-07-14 | CORRECTION | Uklonjena Registration tab (whitelist-only pristup) | src/pages/Auth.tsx (A2 STRESS-TEST)`
- `2026-07-13 | DIRECTIVE | BRUTAL OVERALL STRESS TEST pokrenut | STRESS-TEST-01062026.md`
- `2026-07-12 | CLARIFICATION | Cookie __cf_bm i CameraPlainVariable warnings su Lovable CDN artefakti, ne app greške | konzola`
- `2026-07-11 | CORRECTION | Multi-org izolacija: dodan organization_id filter na sve upite + PostLoginOrgChooser | src/components/PostLoginOrgChooser.tsx`
- `2026-07-10 | DIRECTIVE | Whitelist pristupa zaključan na 3 email adrese | supabase/functions/seed-users, allowed_emails`
- `2026-07-09 | SCOPE-CHANGE | Prisilna promjena lozinke pri prvoj prijavi | src/components/ForcePasswordChange.tsx`
- `2026-06-13 | DIRECTIVE | Uveden PostLoginOrgChooser umjesto auto-org-switcha | D-000`

## Otvorene stavke

Vidi `commander/COMPLIANCE_AUDIT.md` (TD-01..TD-05) i `STRESS-TEST-01062026.md` (P2/P3 rezidual).
