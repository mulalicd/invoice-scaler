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
    await supabase.rpc("log_client_error" as any, {
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

export async function reportSupabaseError(source: string, error: PostgrestError | Error | any, context?: ErrorContext) {
  if (!error) return;
  const message = [error.message, error.details, error.hint].filter(Boolean).join(" | ");
  await reportClientError(message || "Backend request failed", source, error.stack, {
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
    status: error.status ?? null,
    statusCode: error.statusCode ?? null,
    ...toPlainContext(context),
  });
}