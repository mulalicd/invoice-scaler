// Sensitive-data masking for logs, viewer UI, and CSV exports.
// Redacts emails, JWT-like tokens, bearer tokens, API keys, and common
// secret-shaped fields inside JSON contexts.

const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_RE = /\b(Bearer|Basic)\s+[A-Za-z0-9._\-+/=_]{8,}/gi;
const SBP_RE = /\bsb(?:p|s)_[A-Za-z0-9_-]{10,}\b/g;
const SK_RE = /\bsk_(?:test|live)_[A-Za-z0-9]{8,}\b/g;
const LONG_HEX_RE = /\b[a-f0-9]{32,}\b/gi;
const APIKEY_PARAM_RE = /([?&](?:apikey|api_key|access_token|token|key)=)[^&\s"']+/gi;

const SECRET_KEYS = new Set([
  "password","pass","pwd","secret","api_key","apikey","access_token","refresh_token","token",
  "authorization","auth","jwt","cookie","set-cookie","client_secret","service_role_key",
]);

export function maskEmail(s: string): string {
  return s.replace(EMAIL_RE, (_m, first, domain) => `${first}***${domain}`);
}

export function redactString(s: string | null | undefined): string {
  if (!s) return s ?? "";
  return s
    .replace(BEARER_RE, "[REDACTED_AUTH]")
    .replace(JWT_RE, "[REDACTED_JWT]")
    .replace(SBP_RE, "[REDACTED_KEY]")
    .replace(SK_RE, "[REDACTED_KEY]")
    .replace(APIKEY_PARAM_RE, "$1[REDACTED]")
    .replace(LONG_HEX_RE, "[REDACTED_HEX]")
    .replace(EMAIL_RE, (_m, first, domain) => `${first}***${domain}`);

}

export function redactValue(value: any): any {
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEYS.has(k.toLowerCase())) { out[k] = "[REDACTED]"; continue; }
      out[k] = redactValue(v);
    }
    return out;
  }
  return value;
}
