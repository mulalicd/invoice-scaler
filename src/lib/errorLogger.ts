import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type ErrorContext = Record<string, unknown> | null | undefined;

const toPlainContext = (context?: ErrorContext) => ({
  route: typeof window !== "undefined" ? window.location.pathname : null,
  timestamp: new Date().toISOString(),
  ...(context ?? {}),
});

export async function reportClientError(message: string, source: string, stack?: string, context?: ErrorContext) {
  try {
    await supabase.rpc("log_client_error", {
      _message: message,
      _source: source,
      _stack: stack ?? null,
      _url: typeof window !== "undefined" ? window.location.href : null,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      _context: toPlainContext(context),
    });
  } catch (e) {
    console.warn("[error-logger] failed", e);
  }
}

interface SupabaseLikeError {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
  status?: number | null;
  statusCode?: number | null;
  stack?: string;
}

export async function reportSupabaseError(source: string, error: PostgrestError | Error | SupabaseLikeError | null | undefined, context?: ErrorContext) {
  if (!error) return;
  const e = error as SupabaseLikeError;
  const message = [e.message, e.details, e.hint].filter(Boolean).join(" | ");
  await reportClientError(message || "Backend request failed", source, e.stack, {
    code: e.code ?? null,
    details: e.details ?? null,
    hint: e.hint ?? null,
    status: e.status ?? null,
    statusCode: e.statusCode ?? null,
    ...toPlainContext(context),
  });
}