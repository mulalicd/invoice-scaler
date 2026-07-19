import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export interface DeviceInfo {
  browser: string;
  os: string;
  device: "Desktop" | "Mobitel" | "Tablet";
  raw: string;
}

export interface CurrentSessionInfo {
  session: Session | null;
  aal: "aal1" | "aal2" | "unknown";
  nextAal: "aal1" | "aal2" | "unknown";
  provider: string;
  issuedAt: Date | null;
  expiresAt: Date | null;
  lastSignInAt: Date | null;
  device: DeviceInfo;
}

export function parseUserAgent(ua: string): DeviceInfo {
  const s = ua || "";
  const isTablet = /iPad|Tablet/i.test(s);
  const isMobile = /Mobi|Android|iPhone|iPod/i.test(s) && !isTablet;
  let browser = "Nepoznat";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/.test(s)) browser = "Opera";
  else if (/Chrome\//.test(s) && !/Chromium/.test(s)) browser = "Chrome";
  else if (/Safari\//.test(s) && /Version\//.test(s)) browser = "Safari";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  let os = "Nepoznat";
  if (/Windows NT 10/.test(s)) os = "Windows 10/11";
  else if (/Windows/.test(s)) os = "Windows";
  else if (/Mac OS X/.test(s)) os = "macOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iOS/.test(s)) os = "iOS";
  else if (/Linux/.test(s)) os = "Linux";
  return { browser, os, device: isTablet ? "Tablet" : isMobile ? "Mobitel" : "Desktop", raw: s };
}

export async function getCurrentSessionInfo(): Promise<CurrentSessionInfo> {
  const [{ data: sessData }, { data: aalData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const session = sessData?.session ?? null;
  const user = session?.user ?? null;
  const expiresAt = session?.expires_at ? new Date(session.expires_at * 1000) : null;
  const issuedAt = expiresAt && session?.expires_in
    ? new Date(expiresAt.getTime() - session.expires_in * 1000)
    : null;
  const lastSignInAt = user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
  const provider = (user?.app_metadata?.provider as string) || "email";
  return {
    session,
    aal: (aalData?.currentLevel as CurrentSessionInfo["aal"]) ?? "unknown",
    nextAal: (aalData?.nextLevel as CurrentSessionInfo["nextAal"]) ?? "unknown",
    provider,
    issuedAt,
    expiresAt,
    lastSignInAt,
    device: parseUserAgent(typeof navigator !== "undefined" ? navigator.userAgent : ""),
  };
}

/** Odjava sa svih ostalih uređaja (trenutna sesija ostaje aktivna). */
export async function signOutOtherDevices(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) throw error;
}
