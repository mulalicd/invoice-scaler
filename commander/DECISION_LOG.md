# DECISION LOG — Faktura Sistem

Format: `YYYY-MM-DD | ID | Odluka | Alternativa | Razlog`

---

- `2026-07-18 | D-007 | Email notifikacija na novom uređaju odgođena za Sprint 11 | Implementirati sad kroz custom trigger | Zahtijeva GoTrue auth webhook + Resend template + device fingerprinting; ne stane u okvir Sprint 10 (2FA). Prihvatljiv rizik jer je pristup zaključan na 3 whitelisted email-a.`
- `2026-07-18 | D-006 | Backup/recovery kodovi za 2FA odgođeni za Sprint 11 | Implementirati odmah uz TOTP | Supabase Auth MFA nema native backup code podršku; potrebna custom tabela hash-ovanih jednokratnih kodova + RLS + admin bypass. Trenutni oporavak: superadmin unenroll kroz seed-users service-role edge funkciju.`
- `2026-07-15 | D-005 | TD-03 Faza 2: uključiti samo noImplicitAny (ne full strict) | Uključiti kompletni strict:true odmah | strictNullChecks bi zahtijevao ~500 refactoringa; noImplicitAny hvata najveći dio rizika bez blast radiusa. Full strict planiran kao TD-03 Faza 3 nakon što Zod scheme (TD-02) konsolidiraju domain rowove.`
- `2026-07-14 | D-004 | TD-03 kreće incrementalno (Faza 1 = src/lib) | Jednokratni "big bang" strict flip | Manji rizik regresije; svaki sloj se validira testovima prije prelaska u sljedeći. Klijentski argument u authRlsProbe ostaje any kao dokumentovani test-seam.`
- `2026-07-14 | D-001 | Retroaktivno usvojiti Commander v1.1 | Ignorisati i nastaviti ad-hoc | Direktor izabrao opciju 2; potrebna dokumentovana governance struktura za dugoročno održavanje`
- `2026-07-14 | D-002 | Ne migrirati odmah na feature-based foldere | Odmah preraditi src/ | Rizik regresije velik; upisano kao TD-01 i planirano incrementalno`
- `2026-07-14 | D-003 | Zadržati SECURITY DEFINER WARN-ove | Refaktorisati u SECURITY INVOKER | SD je obavezan da bi RPC-ovi mogli čitati auth.users i user_roles bez recursivnog RLS-a; svaki SD ima eksplicitnu auth provjeru`
- `2026-06-13 | D-000 | Uvesti PostLoginOrgChooser nakon logina | Automatski prebaciti na prvu org | Direktor mora birati između IDSS i IMH; auto-prebacivanje je uzrokovalo pogrešan mapping klijenata`
