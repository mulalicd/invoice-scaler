# 🛡️ BRUTAL OVERALL STRESS TEST — Faktura Sistem
**Datum izvještaja:** 01.06.2026  
**Verzija:** v1.0  
**Cilj:** THE BEST WORLD-CLASS FINANCIAL WEB APP · Zero Tolerance for Bugs  
**Metodologija:** Statički audit koda + RLS audit + Supabase linter + Security scan + Logički walkthrough svake rute, dugmeta, forme, dijagrama, filtera, edge-case scenarija.

> Format: `[P0]` = Critical (sigurnost / data integrity / blokira korištenje) · `[P1]` = High · `[P2]` = Medium · `[P3]` = Polish.  
> Rješavati redoslijedom: **P0 → P1 → P2 → P3**. Svaka stavka mora biti označena kao završena tek nakon QA verifikacije.


> ✅ **03.06.2026 — Hotfix wave 1:** P0 stavke A1, A5, A6, B1, B2, B3, D1 zatvorene (Auth zod return-i, viewer UI gating na InvoiceDetail, validacija negativnih i parsing zareza u NewInvoice, unique index na (org, invoice_number) i (org, year, seq), multi-page A4 paginacija PDF-a).

---

## 🔴 BLOK A — SIGURNOST, AUTH & RLS (najviši prioritet)

- [x] **A1 [P0]** ✅ FIXED 03.06.2026 — `Auth.tsx` — *signup zod validation bug*: u `handleSignIn`/`handleSignUp` blokovi `catch (err) { if (err instanceof z.ZodError) return toast.error(...) }` **ne sadrže `return` izvan if-a** — kad validacija ne uspije, kod nastavlja i poziva `supabase.auth.signUp` sa pogrešnim podacima. Premjestiti validaciju izvan try/catch ili dodati eksplicitan `return` u svim granama.
- [ ] **A2 [P0]** *Onemogućiti samostalnu registraciju u UI-u.* Politika je whitelist (3 korisnika) — Tab "Registracija" na `/auth` mora biti **uklonjen ili sakriven**, jer `handle_new_user` trigger ionako odbija sve van whitelist-a → korisnik dobije zbunjujuću grešku. Ostaviti samo Sign-In tab + "Zaboravljena lozinka".
- [ ] **A3 [P0]** *Nekonzistentna password politika:*  
  • `Auth.tsx` zahtijeva 8 znakova  
  • `ResetPassword.tsx` zahtijeva 8 znakova  
  • `Settings.tsx → changePassword` 8 znakova  
  • `ForcePasswordChange.tsx` zahtijeva 10 + veliko slovo + broj  
  → Centralizirati u `lib/passwordPolicy.ts` (min 12, A-Z, a-z, 0-9, simbol) i koristiti svuda.
- [ ] **A4 [P0]** *Leaked password protection (HIBP).* Uključiti `password_hibp_enabled: true` preko `configure_auth`. Trenutno isključeno → privremene lozinke iz `seed-users` mogu biti u poznatim leak listama.
- [x] **A5 [P0]** ✅ FIXED 03.06.2026 — *`InvoiceDetail.tsx` — viewer može mijenjati status fakture.* `<Select value={invoice.status} onValueChange={updateStatus}>` nije gated na `canWrite`. Iako RLS server-side blokira, UI ne smije ni nuditi opciju. Dodati `isViewer` provjeru.
- [x] **A6 [P0]** ✅ FIXED 03.06.2026 — *`InvoiceDetail.tsx` — viewer može pozvati `sendEmail` i `downloadPdf`.* Slanje emaila je *write action* (komunikacija sa klijentom). Mora biti `canWrite` only. PDF download ostaje dozvoljen viewer-u (izvoz).
- [ ] **A7 [P0]** *Supabase Linter — 10 WARN:* "Signed-In Users Can Execute SECURITY DEFINER Function". Provjeriti SVE `SECURITY DEFINER` funkcije, suziti `EXECUTE` privilegije (REVOKE FROM `public`, GRANT samo gdje treba) ili prebaciti pomoćne funkcije na `SECURITY INVOKER`. Lista: `has_role`, `has_role_or_super`, `is_superadmin`, `is_member_of_org`, `get_active_org`, `next_invoice_number`, `admin_set_user_role`, `claim_organization`, `wipe_org_data`, `bulk_import_invoices_detailed`, `log_client_error`, `switch_active_organization`, `get_organizations_for_onboarding`, `handle_new_user`.
- [ ] **A8 [P1]** *`OnboardingScreen.tsx` poziva `claim_organization` koji može automatski dodjeljivati admin/accountant ulogu* — to zaobilazi whitelist filozofiju. Verificirati RPC implementaciju: za 3 whitelist korisnika role moraju biti **pre-seed-ane** u migraciji, a OnboardingScreen prikazivati samo "Odaberi aktivnu organizaciju" (bez claim akcije).
- [ ] **A9 [P1]** *`profiles` RLS update policy* — "Admins update profiles in their org" dozvoljava admin-u da mijenja bilo koji profil u svojoj org (uključujući email/ime drugog admina). Dodati WITH CHECK koji sprječava promjenu `id`, `email`, `must_change_password` osim kroz dedicated RPC.
- [ ] **A10 [P1]** *`user_roles` UPDATE policy* — admin može promijeniti rolu superadmina (`USING` provjera prolazi za bilo koju rolu, samo `WITH CHECK role <> 'superadmin'` štiti). Treba i `USING (role <> 'superadmin')` da admin uopće ne može modificirati superadmin redove.
- [ ] **A11 [P1]** *Audit log nepotpun.* CREATE/UPDATE/DELETE na `invoices`, `clients`, `user_roles`, `organizations` trebaju imati BEFORE/AFTER triggere koji upisuju u `audit_log` automatski (trenutno ovisi o manualnim pozivima). Dodati `tg_audit_*` triggere.
- [ ] **A12 [P1]** *Bez rate-limit / brute-force zaštite na login.* Implementirati edge function "login-throttle" ili koristiti Supabase Auth attack protection u dashboard postavkama.
- [ ] **A13 [P2]** *Tokeni u `localStorage`* (`supabase/client.ts`) — XSS rizik. Dodati strogi CSP header u `index.html`, ukloniti inline `<script>` tagove tamo gdje je moguće.
- [ ] **A14 [P2]** *`seed-users` edge function* — `verify_jwt = false` + brisanje korisnika. Treba dodatni sloj: hardcoded shared secret u `Authorization` headeru ili IP allow-list, da niko ne može nasumično pozvati funkciju i obrisati sve.
- [ ] **A15 [P2]** *Service-role ključ samo u edge funkcijama* — verificirati da nije slučajno commit-an u repo / .env.example.

---

## 🟠 BLOK B — DATA INTEGRITY & POSLOVNA LOGIKA

- [x] **B1 [P0]** ✅ FIXED 03.06.2026 — *Negativna količina/cijena prolazi.* `NewInvoice.tsx` ne validira `quantity > 0` ni `unit_price >= 0`. Korisnik može unijeti `-5 × 100 KM` i kreirati fakturu sa minus iznosom. Dodati zod schemu.
- [x] **B2 [P0]** ✅ FIXED 03.06.2026 — *Decimalni separator za uneseni broj.* Bosanski korisnik prirodno unosi "919,16" — `Number("919,16") = NaN` → tiha greška, total ispadne 0 i čak prolazi (jer `subtotal <= 0` toast, ali na ivici). Dodati `parseLocalNumber()` helper i koristiti svuda.
- [x] **B3 [P0]** ✅ FIXED 03.06.2026 — *Race condition kod izdavanja fakture* — između `next_invoice_number` RPC i `INSERT invoices` postoji prozor u kojem dva korisnika mogu dobiti isti broj. RPC mora **u istoj transakciji** inkrementirati i vratiti broj + uraditi insert (zatvoriti u SECURITY DEFINER RPC `create_invoice_atomic`).
- [ ] **B4 [P0]** *`due_date` se računa u JS-u (`new Date(issueDate).getTime() + days*86400000`)* — DST i timezone-shift mogu dati pogrešan dan. Računati server-side preko `issue_date + INTERVAL '_ days'`.
- [ ] **B5 [P1]** *Nema statusa `overdue`.* Sve "izdano" + `due_date < today` → trenutno se prikazuje kao samo "Izdana". Dodati derived status (CASE u view) i bojati crveno na Dashboard / Invoices listi.
- [ ] **B6 [P1]** *Nema modela uplata (`payments` tabela).* Trenutno samo flag `paid` — nema datuma plaćanja, iznosa, instrumenta. Bez ovoga "plaćeno (ukupno)" KPI nije revizijski upotrebljiv.
- [ ] **B7 [P1]** *PDV uvijek 0% u `InvoicePrintable`.* Ako u budućnosti budete obveznik PDV-a, model fakture treba `tax_rate`, `tax_amount` i `discount` polja po stavci.
- [ ] **B8 [P1]** *JIB / JMBG bez format-checka.* JIB BiH = 13 cifara, JMBG = 13 cifara sa checksumom. `Clients.tsx` prima bilo šta. Dodati `z.string().regex(/^\d{13}$/)` opcionalno.
- [ ] **B9 [P1]** *`InvoicePrintable` koristi `client.notes` kao "ime djeteta".* Krivo korištenje polja — pravi data model: dodati posebnu kolonu `child_name` (ili tabelu `client_dependents`).
- [ ] **B10 [P1]** *`period_from`/`period_to`* — `InvoicePrintable` čita ova polja ali ona ne postoje u `invoices` tabeli → uvijek prazno. Ili dodati kolone, ili ukloniti UI.
- [ ] **B11 [P1]** *`amount_in_words` se generira samo na klijentu* — ako neko izmijeni iznos kroz import / direct SQL, riječi se ne ažuriraju. Premjestiti u DB trigger.
- [ ] **B12 [P2]** *Nema soft-delete-a.* Brisanje fakture/klijenta je trajno. Dodati `deleted_at` i RLS filter za audit-friendly arhivu.
- [ ] **B13 [P2]** *Brisanje klijenta:* `Clients.tsx` hvata sve greške porukom "možda postoje fakture". Pravo rješenje: provjeriti broj faktura prije brisanja i ponuditi "merge" / "deaktiviraj".
- [ ] **B14 [P2]** *Invoice counters per (org, year)* — ako se obriše posljednja faktura, sequence ostaje, što je legalno ispravno ali UI treba upozorenje "broj X je preskočen".
- [ ] **B15 [P2]** *`organizations.brand_color`* nije validiran kao HEX. Korisnik može unijeti "plava" → CSS-ulom postaje nevažeće → PDF puca.

---

## 🟡 BLOK C — UI / UX / FILTERI / SEARCH / STATS

- [ ] **C1 [P0]** *`Invoices.tsx` filter — null-safe bug.* `i.invoice_number.toLowerCase()` puca ako broj null. Iako u shemi NOT NULL, defenzivno dodati `?.toLowerCase() ?? ""`.
- [ ] **C2 [P0]** *Dashboard "Ovaj mjesec" / "Godina"* — koristi ISO string compare. Korektno za UTC ali u BA timezone-u (+1/+2 ljeti) prvi dan mjeseca može pogrešno klasificirati fakturu izdanu u 23:30 lokalno. Računati granice u **Europe/Sarajevo** vremenu (`Intl.DateTimeFormat`).
- [ ] **C3 [P0]** *Dashboard učitava SVE fakture* (nema limita, nema agregacije). Sa 5000+ faktura → spor pageload + bandwidth. Premjestiti agregacije u `dashboard_stats(_org_id, _from, _to)` SQL RPC.
- [ ] **C4 [P1]** *Nema paginacije nigdje.* `Invoices.tsx`, `Clients.tsx` učitavaju sve. Limit Supabase = 1000, pa 1001-i ne vidite. Dodati paginated query + UI "Učitaj još".
- [ ] **C5 [P1]** *Pluralizacija* — "1 faktura · 2 faktura · 5 faktura". Bosanski: 1=faktura, 2-4=fakture, 5+=faktura. Implementirati `bsPlural(n, [jedn, mn2_4, mn5])`.
- [ ] **C6 [P1]** *Globalni Search ne postoji.* Trenutno su filteri lokalni po stranici. Implementirati `Cmd+K` Command palette (postoji `@/components/ui/command`) koji pretražuje fakture + klijente + akcije.
- [ ] **C7 [P1]** *Dashboard chart-ovi bez "no-data" konzistentnog state-a.* Area chart pokazuje praznu mrežu umjesto poruke "Nema podataka u 12 mjeseci".
- [ ] **C8 [P1]** *Status-distribution PieChart bez postotaka.* Dodati `label={({percent}) => (percent*100).toFixed(0)+"%"}`.
- [ ] **C9 [P1]** *Top 5 klijenata BarChart — naziv klijenta cut-off* na 130px. Dodati tooltip sa punim imenom + povećati width za jedan klijent.
- [ ] **C10 [P1]** *Nedostaje "Outstanding > 30/60/90 dana" aging report.* Standard u finansijskoj app.
- [ ] **C11 [P1]** *Nedostaje "Prihod po organizaciji"* za superadmina koji vidi obje (IDSS + IMH).
- [ ] **C12 [P1]** *Nedostaje godišnja komparacija* (YoY %). KPI mora pokazati ±% naspram prošle godine.
- [ ] **C13 [P2]** *Mobilna tabela* na `Invoices.tsx` — mobile card variant ne prikazuje period ni JIB. Dodati.
- [ ] **C14 [P2]** *Skeleton loaders* umjesto "Učitavanje..." teksta.
- [ ] **C15 [P2]** *`window.confirm()`* na brisanju klijenta/fakture — zamijeniti `<AlertDialog>` iz shadcn.
- [ ] **C16 [P2]** *Realtime sync* — kad admin obriše/promijeni fakturu, drugi prijavljeni korisnik ne vidi promjenu dok ne refresh-uje. Aktivirati Supabase Realtime na `invoices` + `clients`.
- [ ] **C17 [P2]** *Sort kolona* na `Invoices.tsx` tabeli (klik na header). Trenutno fiksno desc po datumu.
- [ ] **C18 [P2]** *Filter chips ispod search bara* pokazuju aktivne filtere sa "X" za uklanjanje pojedinačno.
- [ ] **C19 [P2]** *Print CSS* — `@media print` skriva sidebar, ali ne i `<header>` ni toast container. Dodati `.no-print` na njih.
- [ ] **C20 [P2]** *AppLayout window.location.reload() na switchOrg* — gubi nesnimljeni state. Koristiti `queryClient.invalidateQueries()` umjesto reload-a.
- [ ] **C21 [P3]** *Keyboard shortcuts:* `n` = nova faktura, `/` = fokus search, `?` = help.
- [ ] **C22 [P3]** *Tamna/svijetla tema toggle* u header-u (postoji CSS infrastruktura, fali UI prekidač).
- [ ] **C23 [P3]** *Empty state ilustracije* (custom SVG, ne samo lucide ikona).

---

## 🟢 BLOK D — PDF / PRINT / EMAIL

- [x] **D1 [P0]** ✅ FIXED 03.06.2026 — *PDF preljev preko A4* — `html2canvas` + jedan `addImage` ne radi pagination. Faktura sa 25+ stavki gubi donji dio. Implementirati multi-page split (`html2pdf.js` ili manualni slicing).
- [ ] **D2 [P0]** *`html2canvas` ne podržava modern CSS* (oklch, conic-gradient, container queries) — provjeriti da `InvoicePrintable` koristi samo "safe" CSS (trenutno koristi inline style — OK, ali validirati).
- [ ] **D3 [P1]** *`printInvoice` otvara `window.open` koji popup blocker blokira* po defaultu u Firefox/Safari. Dodati fallback "Print preview u istom tabu" + objaviti korisniku.
- [ ] **D4 [P1]** *Email šalje iz `onboarding@resend.dev`* (hardcoded). Mora se verificirati custom domain (npr. `noreply@idss.ba`) i koristiti dynamic from-address po organizaciji.
- [ ] **D5 [P1]** *Email nema retry / outbox tabelu.* Ako Resend padne, korisnik dobije generic toast i ne zna je li poslano. Dodati `email_outbox` tabelu sa status (queued/sent/failed).
- [ ] **D6 [P1]** *`InvoicePrintable` koristi `crossOrigin="anonymous"` na logo* — ako logo nije served sa CORS headerom, html2canvas baca grešku i PDF je crn. Verificirati Supabase storage CORS.
- [ ] **D7 [P2]** *Code 39 barcode kodira samo JIB* — beskorisno. Industrijski standard za uplatu u BiH je **PDF417** sa strukturiranim payment data (HUB-3). Implementirati.
- [ ] **D8 [P2]** *PDF watermark "DRAFT"* preko draft faktura da se ne pomiješa sa izdanima.
- [ ] **D9 [P2]** *Hardcoded "Reg. br."* (`580342` / `6501016512`) u `InvoicePrintable` — premjestiti u `organizations.registration_number` kolonu.
- [ ] **D10 [P2]** *`organization.phone ? <div>www.{email split}</div>`* — pogrešna logika (uvjet je telefon a renderira se domain iz emaila). Dodati posebno polje `organizations.website`.
- [ ] **D11 [P3]** *Email template HTML* nije responsive za Gmail mobile.

---

## 🔵 BLOK E — 3D & VIZUALNI IDENTITET

- [ ] **E1 [P1]** *`AuthScene` frameloop="always"* — drži CPU/GPU na 60fps čak i kad korisnik ne gleda. Promijeniti u `frameloop="demand"` + manualni invalidate, ili pauzirati kad `document.hidden`.
- [ ] **E2 [P1]** *Three.js bundle ~600 KB* — code-split je već urađen kroz `lazy()`, ali dodati `Suspense` fallback sa skeleton sceneom (trenutno `null` → flash).
- [ ] **E3 [P2]** *Reduced motion* — `prefers-reduced-motion: reduce` → renderirati statičku sliku umjesto animirane scene.
- [ ] **E4 [P2]** *Dashboard nema 3D elemenata* — korisnik je tražio dominantni vizuelni dojam. Dodati suptilan 3D KPI mesh (npr. tilt-on-hover Card ili animirani "coin stack" pored "Plaćeno" KPI).
- [ ] **E5 [P3]** *Mobilni uređaj* — onemogućiti Canvas na width < 640px (zamijeniti static gradient).

---

## ⚪ BLOK F — PERFORMANSE, A11Y, SEO, DEVOPS

- [ ] **F1 [P1]** *`audit_log` nema indeksa* na `(organization_id, created_at DESC)`. Admin stranica sa 10k zapisa će se vući. Dodati indeks.
- [ ] **F2 [P1]** *`invoices` indeksi:* `(organization_id, issue_date DESC)`, `(organization_id, status)`, `(client_id)`. Verificirati postoje.
- [ ] **F3 [P1]** *Recharts cijela biblioteka* je u glavnom bundle-u. Dynamic-import Dashboard chart sekcije.
- [ ] **F4 [P1]** *a11y* — ikon-only dugmad bez `aria-label` (Pencil, Trash, Download...). Dodati svuda.
- [ ] **F5 [P1]** *Color contrast* — `text-muted-foreground` na `bg-card` u dark mode-u je ispod WCAG AA (4.5:1). Provjeriti tokene.
- [ ] **F6 [P2]** *`index.html`* — title "lovable" placeholder, opis generic. Postaviti:  
  `<title>Faktura — IDSS · IMH Financial System</title>` + meta description.
- [ ] **F7 [P2]** *Favicon* default placeholder.
- [ ] **F8 [P2]** *Service Worker / PWA* — instalabilno na desktop/mobile sa offline shellom.
- [ ] **F9 [P2]** *Error reporting* — `reportClientError` postoji ali se ne poziva iz `window.onerror` / `unhandledrejection`. Dodati listenere u `main.tsx`.
- [ ] **F10 [P2]** *Skip-to-content link* za screen-reader korisnike.
- [ ] **F11 [P2]** *Focus-ring* na NavLink stavkama u sidebar-u (trenutno nestane).
- [ ] **F12 [P3]** *Bundle analyzer* — pokrenuti `vite-bundle-visualizer` i ukloniti neiskorištene shadcn komponente.
- [ ] **F13 [P3]** *Lighthouse 100/100/100/100* kao QA gate.

---

## 🟣 BLOK G — IMPORT / EXPORT / BACKUP

- [ ] **G1 [P1]** *`InvoiceImport` provjera headera* gleda samo prvi red — ako je prvi red prazan a drugi pun, validacija pada. Validirati prema `XLSX.utils.sheet_to_json({header:1})`.
- [ ] **G2 [P1]** *Excel datum* — `XLSX.SSF.parse_date_code` ne handle-uje datume prije 1900. Dodati guard.
- [ ] **G3 [P1]** *Bulk import ne validira duplikate JIB-a* kod auto-kreiranja klijenata → može napraviti 2 zapisa za isti JIB iz dvije fakture. Trigger ili unique constraint na `(organization_id, jib) WHERE jib IS NOT NULL`.
- [ ] **G4 [P1]** *Bez full DB backup-a u UI-u.* Admin treba dugme "Preuzmi backup (JSON/SQL)" za sve podatke organizacije (audit-ready).
- [ ] **G5 [P2]** *Excel export* (XLSX) pored CSV-a — finansijski svijet preferira XLSX sa formulama i formatiranjem.
- [ ] **G6 [P2]** *PDF batch export* — "Izvezi sve filtrirane fakture kao ZIP".
- [ ] **G7 [P3]** *Drag-drop upload* na InvoiceImport.

---

## 🧪 BLOK H — TEST POKRIVENOST

- [ ] **H1 [P1]** Postoji samo `example.test.ts`. Dodati:  
  • Unit testovi za `numberToBosnianWords`, `formatKM`, `parseLocalNumber`, `bsPlural`  
  • Komponentni test za `InvoicePrintable` snapshot  
  • E2E (Playwright) flow: login → kreiraj klijenta → kreiraj fakturu → PDF download → email send.
- [ ] **H2 [P2]** RLS testovi (pgTAP ili SQL skripta) koji impersoniraju svaku ulogu i provjeravaju select/insert/update/delete dozvole na svakoj tabeli.
- [ ] **H3 [P2]** Visual regression (Chromatic / Percy) za Dashboard i InvoicePrintable.

---

## 📋 BLOK I — DOKUMENTACIJA & ONBOARDING

- [ ] **I1 [P2]** Ažurirati `RLS_Audit_Report.md` nakon svake RLS izmjene iz Bloka A.
- [ ] **I2 [P2]** `RUNBOOK.md`: kako rotirati lozinke, šta uraditi ako edge function padne, kako restore-ati backup.
- [ ] **I3 [P3]** In-app help tour (Shepherd.js / driver.js) za prvi login.

---

## 🎯 Definicija "GOTOVO"

Sve P0 zatvoreno → app je **production-grade**.  
Sve P0+P1 zatvoreno → app je **world-class financial**.  
Sve P0+P1+P2 zatvoreno → app je **PLATINUM industry standard** kako je naručeno.  
Sve P0+P1+P2+P3 zatvoreno → **THE BEST FINANCIAL WEB APP IN THE WORLD.**

---

### 📊 Sažetak nalaza

| Prioritet | Broj stavki |
|-----------|------------|
| P0 — Critical | **17** |
| P1 — High | **38** |
| P2 — Medium | **34** |
| P3 — Polish | **9** |
| **UKUPNO** | **98** |

> Sljedeći korak: potvrdi koje blokove (A, B, C, D, E, F, G, H, I) krećem rješavati prvo, ili reci "kreni redom po prioritetu" pa ću otvoriti P0 jedan po jedan.
