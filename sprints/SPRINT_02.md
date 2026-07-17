# SPRINT 02 — Invoice UX i Bulk Import
Datum: Juli 2026 (retroaktivno)
Status: ✅ DONE

## Isporučeno
- InvoicePrintable + PDF generisanje (`src/lib/invoicePdf.tsx`)
- Bulk import iz .xlsm (`src/components/InvoiceImport.tsx`)
- `bulk_import_invoices_detailed` RPC (row-by-row error report, idempotent)
- UNIQUE indeksi na `(organization_id, invoice_number)`
- Zod validacija + Bosnian broj/datum format (`parseNum`)
