// One-shot seed of the 3 allowed users. Idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEED = [
  { email: "mulalic.davor@outlook.com", password: "M1a2k345!Platinum#2026", first_name: "Davor",  last_name: "Mulalić" },
  { email: "financije@idss.ba",          password: "Azra-Idss-Finance#2026!", first_name: "Azra",   last_name: "Rahmanović" },
  { email: "mehmed.s@poslovnost.ba",     password: "Mehmed-Viewer-IDSS#2026!", first_name: "Mehmed", last_name: "Šarić" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const allowedEmails = new Set(SEED.map(s => s.email.toLowerCase()));
  const results: any[] = [];
  const removed: string[] = [];

  // Lockout: ukloni sve auth korisnike koji NISU u whitelist-u
  try {
    const { data: list } = await admin.auth.admin.listUsers();
    for (const u of list?.users ?? []) {
      const e = (u.email ?? "").toLowerCase();
      if (e && !allowedEmails.has(e)) {
        const { error: delErr } = await admin.auth.admin.deleteUser(u.id);
        removed.push(`${u.email}${delErr ? `: ${delErr.message}` : ""}`);
      }
    }
  } catch (e: any) {
    removed.push(`lockout_error: ${e.message}`);
  }

  for (const u of SEED) {
    try {
      // Check if user already exists (refetch to be safe after lockout)
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((x: any) => x.email?.toLowerCase() === u.email.toLowerCase());

      if (existing) {
        // Update password + confirm
        const { error: upErr } = await admin.auth.admin.updateUserById(existing.id, {
          password: u.password,
          email_confirm: true,
          user_metadata: { first_name: u.first_name, last_name: u.last_name },
        });
        results.push({ email: u.email, status: upErr ? `update_failed: ${upErr.message}` : "updated" });
      } else {
        const { error: cErr } = await admin.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { first_name: u.first_name, last_name: u.last_name },
        });
        results.push({ email: u.email, status: cErr ? `create_failed: ${cErr.message}` : "created" });
      }
    } catch (e: any) {
      results.push({ email: u.email, status: `error: ${e.message}` });
    }
  }

  return new Response(JSON.stringify({ results, removed }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
