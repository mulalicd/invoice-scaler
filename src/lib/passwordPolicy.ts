// Centralna password politika — koristi se na svim mjestima gdje se postavlja/mijenja lozinka.
// HIBP (leaked password protection) je uključen i na strani backend-a kao dodatni sloj.

export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_RULES_TEXT =
  "Min. 12 karaktera, mora sadržavati veliko slovo, malo slovo, broj i specijalni znak.";

const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SYMBOL = /[^A-Za-z0-9]/;

export interface PasswordCheckResult {
  ok: boolean;
  error?: string;
}

export function validatePassword(pwd: string, confirm?: string): PasswordCheckResult {
  if (!pwd || pwd.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: `Lozinka mora imati minimalno ${PASSWORD_MIN_LENGTH} karaktera` };
  }
  if (pwd.length > 72) {
    return { ok: false, error: "Lozinka može imati najviše 72 karaktera" };
  }
  if (!HAS_UPPER.test(pwd)) return { ok: false, error: "Lozinka mora sadržavati barem jedno veliko slovo" };
  if (!HAS_LOWER.test(pwd)) return { ok: false, error: "Lozinka mora sadržavati barem jedno malo slovo" };
  if (!HAS_DIGIT.test(pwd)) return { ok: false, error: "Lozinka mora sadržavati barem jedan broj" };
  if (!HAS_SYMBOL.test(pwd)) return { ok: false, error: "Lozinka mora sadržavati barem jedan specijalni znak (npr. ! @ # $ %)" };
  if (confirm !== undefined && pwd !== confirm) return { ok: false, error: "Lozinke se ne podudaraju" };
  return { ok: true };
}
