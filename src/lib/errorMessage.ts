// Narrowing helpers for `unknown` error values coming out of catch blocks
// and Supabase/PostgREST responses. Keeps call sites TS-strict without
// leaking `any`.

export interface ErrorLike {
  message?: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  status?: number | null;
  stack?: string;
}

export function toErrorLike(err: unknown): ErrorLike {
  if (err && typeof err === "object") return err as ErrorLike;
  if (typeof err === "string") return { message: err };
  return {};
}

/** Returns a human-readable message for any thrown value. */
export function errorMessage(err: unknown, fallback = "Nepoznata greška"): string {
  const e = toErrorLike(err);
  return e.message ?? fallback;
}

/** Optional stack, safe against `unknown`. */
export function errorStack(err: unknown): string | undefined {
  return toErrorLike(err).stack;
}
