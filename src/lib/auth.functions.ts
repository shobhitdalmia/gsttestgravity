import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Server env with VITE_* fallback so non-Lovable hosts (Vercel etc.) also work. */
function serverSupabaseEnv() {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_ANON_KEY"];
  return { url, anonKey };
}

/**
 * Phone based sign-in.
 *
 * The mobile number is resolved to an account on the SERVER only — the email
 * address is never returned to the browser. Wrong number and wrong password
 * both produce the same generic failure so numbers can't be enumerated.
 */
export const signInWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; password: string }) => {
    const phone = String(input?.phone ?? "").replace(/\D/g, "").slice(-10);
    const password = String(input?.password ?? "");
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Mobile number theek nahi hai");
    if (!password) throw new Error("Password daalein");
    return { phone, password };
  })
  .handler(async ({ data }) => {
    const fail = { ok: false as const, error: "Mobile number ya password galat hai" };
    const { tryAdminClient } = await import("./admin-client.server");
    const supabaseAdmin = await tryAdminClient();
    if (!supabaseAdmin) {
      return { ok: false as const, error: "Mobile se sign in abhi available nahi — email se sign in karein" };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (!profile) return fail;

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const email = userRes?.user?.email;
    if (!email) return fail;

    const { createClient } = await import("@supabase/supabase-js");
    const { url, anonKey } = serverSupabaseEnv();
    if (!url || !anonKey) return fail;
    const client = createClient(url, anonKey, { auth: { persistSession: false } });

    const { data: signed, error } = await client.auth.signInWithPassword({ email, password: data.password });
    if (error || !signed.session) {
      if (error?.message?.toLowerCase().includes("not confirmed")) {
        return { ok: false as const, error: "Email verify karna baaki hai — mail me link/code use karein" };
      }
      return fail;
    }

    return {
      ok: true as const,
      accessToken: signed.session.access_token,
      refreshToken: signed.session.refresh_token,
    };
  });

/** Signup-time duplicate check so the account isn't created with a taken number. */
export const isPhoneAvailable = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string }) => {
    const phone = String(input?.phone ?? "").replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Mobile number theek nahi hai");
    return { phone };
  })
  .handler(async ({ data }) => {
    const { tryAdminClient } = await import("./admin-client.server");
    const supabaseAdmin = await tryAdminClient();
    if (!supabaseAdmin) return { available: true };
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    return { available: !row };
  });

/** Update the signed-in user's own mobile number (unique across accounts). */
export const updateMyPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string }) => {
    const phone = String(input?.phone ?? "").replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("10-digit mobile number daalein");
    return { phone };
  })
  .handler(async ({ data, context }) => {
    const { tryAdminClient } = await import("./admin-client.server");
    const supabaseAdmin = await tryAdminClient();
    if (supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("phone", data.phone)
        .maybeSingle();
      if (existing && existing.id !== context.userId) {
        throw new Error("Ye mobile number pehle se kisi account par register hai");
      }
    }
    const { error } = await context.supabase
      .from("profiles")
      .update({ phone: data.phone })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, phone: data.phone };
  });

/** Signup-time duplicate check using the server-only Auth admin API. */
export const checkEmailStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => {
    const email = String(input?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email theek nahi hai");
    return { email };
  })
  .handler(async ({ data }) => {
    const perPage = 200;
    try {
      // Primary path: SECURITY DEFINER RPC over the publishable key. Works on every
      // host (Lovable, Vercel, self-host) because it needs no service-role key.
      const { url, anonKey } = serverSupabaseEnv();
      if (url && anonKey) {
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(url, anonKey, { auth: { persistSession: false } });
        const { data: rows, error } = await client.rpc("email_registered", { _email: data.email });
        if (!error) {
          const row = Array.isArray(rows) ? rows[0] : rows;
          const exists = !!row?.exists_flag;
          return exists
            ? { exists: true as const, confirmed: !!row?.confirmed, checked: true as const }
            : { exists: false as const, confirmed: false, checked: true as const };
        }
      }

      // Fallback: Auth admin API (only where a service-role key is configured).
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      for (let page = 1; page <= 50; page += 1) {
        const { data: result, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) throw new Error(error.message);

        const user = result.users.find((candidate) => candidate.email?.toLowerCase() === data.email);
        if (user) {
          return { exists: true as const, confirmed: !!user.email_confirmed_at, checked: true as const };
        }
        if (result.users.length < perPage) break;
      }

      return { exists: false as const, confirmed: false, checked: true as const };
    } catch (error) {
      console.error("[checkEmailStatus] skipped:", error instanceof Error ? error.message : error);
      return { exists: false as const, confirmed: false, checked: false as const };
    }
  });

/**
 * Password reset that accepts either the registered email or the 10-digit
 * mobile number, and surfaces the real GoTrue failure (rate limits, unknown
 * address) instead of a silent "mail bhej diya".
 */
export const sendPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((input: { identifier: string; redirectTo: string }) => {
    const identifier = String(input?.identifier ?? "").trim();
    const redirectTo = String(input?.redirectTo ?? "").trim();
    if (!identifier) throw new Error("Email ya mobile number daalein");
    if (!/^https?:\/\//.test(redirectTo)) throw new Error("Redirect URL theek nahi hai");
    return { identifier, redirectTo };
  })
  .handler(async ({ data }) => {
    const { tryAdminClient } = await import("./admin-client.server");
    const supabaseAdmin = await tryAdminClient();
    const digits = data.identifier.replace(/\D/g, "");
    let email = data.identifier.toLowerCase();

    if (!data.identifier.includes("@")) {
      const phone = digits.slice(-10);
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return { ok: false as const, error: "Registered email ya 10-digit mobile number daalein" };
      }
      if (!supabaseAdmin) {
        return { ok: false as const, error: "Mobile se reset abhi available nahi — registered email daalein" };
      }
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      if (!profile) return { ok: false as const, error: "Is number par koi account nahi mila" };
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (!userRes?.user?.email) return { ok: false as const, error: "Is number par koi account nahi mila" };
      email = userRes.user.email;
    }

    const { createClient } = await import("@supabase/supabase-js");
    const { url, anonKey } = serverSupabaseEnv();
    if (!url || !anonKey) {
      return { ok: false as const, error: "Server configuration adhoori hai — thodi der baad koshish karein" };
    }
    const client = createClient(url, anonKey, { auth: { persistSession: false } });

    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: data.redirectTo });
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("rate limit") || (error as { status?: number }).status === 429) {
        return {
          ok: false as const,
          error: "Email bhejne ki limit ho gayi hai — kuch minute baad dobara koshish karein",
        };
      }
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const, sentTo: email };
  });
