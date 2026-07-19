import { supabase } from "@/integrations/supabase/client";

export interface TotpFactorSummary {
  id: string;
  friendlyName: string | null;
  status: "unverified" | "verified";
  createdAt: string | null;
}

export interface EnrollResult {
  factorId: string;
  qrCodeSvg: string; // data-uri SVG
  secret: string;
  uri: string;
}

/** List all verified + unverified TOTP factors for the current user. */
export async function listTotpFactors(): Promise<TotpFactorSummary[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return (data?.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    status: (f.status as "unverified" | "verified") ?? "unverified",
    createdAt: f.created_at ?? null,
  }));
}

/** Start TOTP enrollment. Returns QR code SVG + factor id to feed into verifyEnrollment. */
export async function enrollTotp(friendlyName: string): Promise<EnrollResult> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error) throw error;
  return {
    factorId: data.id,
    qrCodeSvg: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/** Verify a 6-digit code to finalize enrollment for a given factor. */
export async function verifyTotpEnrollment(factorId: string, code: string): Promise<void> {
  const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chalErr) throw chalErr;
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: chal.id,
    code,
  });
  if (error) throw error;
}

/** Answer an active challenge for a verified factor (post-login gate). */
export async function challengeAndVerify(factorId: string, code: string): Promise<void> {
  const { data: chal, error: chalErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chalErr) throw chalErr;
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: chal.id,
    code,
  });
  if (error) throw error;
}

/** Remove a factor (verified or unverified). Requires current AAL to match. */
export async function unenrollFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

/** True if the session is enrolled but has not yet stepped up to aal2 this login. */
export async function isMfaRequired(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  return data?.currentLevel === "aal1" && data?.nextLevel === "aal2";
}

/** Sign the user out of every device (global scope). */
export async function signOutAllDevices(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) throw error;
}
