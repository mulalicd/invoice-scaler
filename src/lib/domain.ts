// Shared domain row types derived from the generated Supabase schema.
// Central place so pages can import strongly typed rows without redeclaring
// per-file shapes or reaching for `any`.

import type { Database } from "@/integrations/supabase/types";

type Tables = Database["public"]["Tables"];

export type ClientRow = Tables["clients"]["Row"];
export type InvoiceRow = Tables["invoices"]["Row"];
export type InvoiceItemRow = Tables["invoice_items"]["Row"];
export type ProfileRow = Tables["profiles"]["Row"];
export type OrganizationRow = Tables["organizations"]["Row"];
export type AuditLogRow = Tables["audit_log"]["Row"];
export type UserRoleRow = Tables["user_roles"]["Row"];

export type InvoiceStatus = "draft" | "issued" | "paid" | "cancelled";

/** Invoice + selected client fields as returned by `select("*, clients(*)")`. */
export interface InvoiceWithClient extends InvoiceRow {
  clients: ClientRow | null;
}

/** Invoice list row from `Invoices` page (subset + client shorthand). */
export interface InvoiceListRow {
  id: string;
  invoice_number: string;
  total: number | string;
  status: InvoiceStatus | string;
  issue_date: string;
  due_date: string | null;
  period_text: string | null;
  clients: { name: string | null; jib: string | null; jmbg: string | null } | null;
}

/** Dashboard invoice row. */
export interface DashboardInvoiceRow {
  id: string;
  invoice_number: string;
  total: number | string;
  status: InvoiceStatus | string;
  issue_date: string;
  client_id: string;
  clients: { name: string | null } | null;
}
