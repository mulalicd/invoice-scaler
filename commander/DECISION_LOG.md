# DECISION LOG — Faktura Sistem

Format: `YYYY-MM-DD | ID | Odluka | Alternativa | Razlog`

---

- `2026-07-14 | D-001 | Retroaktivno usvojiti Commander v1.1 | Ignorisati i nastaviti ad-hoc | Direktor izabrao opciju 2; potrebna dokumentovana governance struktura za dugoročno održavanje`
- `2026-07-14 | D-002 | Ne migrirati odmah na feature-based foldere | Odmah preraditi src/ | Rizik regresije velik; upisano kao TD-01 i planirano incrementalno`
- `2026-07-14 | D-003 | Zadržati SECURITY DEFINER WARN-ove | Refaktorisati u SECURITY INVOKER | SD je obavezan da bi RPC-ovi mogli čitati auth.users i user_roles bez recursivnog RLS-a; svaki SD ima eksplicitnu auth provjeru`
- `2026-06-13 | D-000 | Uvesti PostLoginOrgChooser nakon logina | Automatski prebaciti na prvu org | Direktor mora birati između IDSS i IMH; auto-prebacivanje je uzrokovalo pogrešan mapping klijenata`
