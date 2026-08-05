import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeOtpPhone, normalizeOtpPurpose } from "./otp.schemas";

/**
 * Ask for a login/verification OTP.
 *
 * The response never says whether the number is registered — that keeps the
 * endpoint from being used to enumerate customers.
 */
export const requestPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; purpose?: "login" | "verify" }) => ({
    phone: normalizeOtpPhone(input?.phone),
    purpose: normalizeOtpPurpose(input?.purpose),
  }))
  .handler(async ({ data }) => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const otp = await import("./otp.server");
    const { tryAdminClient } = await import("./admin-client.server");
    const supabaseAdmin = await tryAdminClient();
    if (!supabaseAdmin) {
      return {
        ok: false as const,
        error: "OTP service abhi available nahi — thodi der baad ya password se sign in karein",
      };
    }

    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;

    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: recent } = await supabaseAdmin
      .from("phone_otps")
      .select("created_at")
      .eq("phone", data.phone)
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if ((recent?.length ?? 0) >= otp.OTP_MAX_PER_PHONE_10MIN) {
      return { ok: false as const, error: "Bahut zyada koshish — 10 minute baad dobara try karein" };
    }
    const last = recent?.[0]?.created_at;
    if (last) {
      const waited = Date.now() - new Date(last).getTime();
      if (waited < otp.OTP_RESEND_COOLDOWN_MS) {
        const secs = Math.ceil((otp.OTP_RESEND_COOLDOWN_MS - waited) / 1000);
        return { ok: false as const, error: `${secs} second baad dobara bhej sakte hain` };
      }
    }

    if (ip) {
      const { count } = await supabaseAdmin
        .from("phone_otps")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", since);
      if ((count ?? 0) >= otp.OTP_MAX_PER_IP_10MIN) {
        return { ok: false as const, error: "Bahut zyada requests — thodi der baad try karein" };
      }
    }

    const temp = otp.temporaryOtpMode();
    const code = temp.enabled && temp.code ? temp.code : otp.randomOtp();

    let channel: Awaited<ReturnType<typeof otp.sendOtp>>;
    try {
      channel = await otp.sendOtp(data.phone, code);
    } catch (error) {
      return {
        ok: false as const,
        configured: false as const,
        error: error instanceof Error ? error.message : "OTP bhej nahi paye",
      };
    }

    const { error } = await supabaseAdmin.from("phone_otps").insert({
      phone: data.phone,
      code_hash: otp.hashOtp(data.phone, code),
      purpose: data.purpose,
      channel,
      ip,
      expires_at: new Date(Date.now() + otp.OTP_TTL_MS).toISOString(),
    });
    if (error) return { ok: false as const, error: "OTP banane me dikkat hui — dobara try karein" };

    return {
      ok: true as const,
      temporary: channel === "temporary",
      resendIn: Math.round(otp.OTP_RESEND_COOLDOWN_MS / 1000),
      expiresIn: Math.round(otp.OTP_TTL_MS / 1000),
    };
  });

/** Verify an OTP and (for purpose=login) hand back a session for that number. */
export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string; purpose?: "login" | "verify" }) => {
    const code = String(input?.code ?? "").replace(/\D/g, "");
    if (code.length < 4) throw new Error("Poora OTP daalein");
    return {
      phone: normalizeOtpPhone(input?.phone),
      code,
      purpose: input?.purpose === "verify" ? ("verify" as const) : ("login" as const),
    };
  })
  .handler(async ({ data }) => {
    const otp = await import("./otp.server");
    const { tryAdminClient } = await import("./admin-client.server");
    const supabaseAdmin = await tryAdminClient();
    if (!supabaseAdmin) {
      return {
        ok: false as const,
        error: "OTP service abhi available nahi — thodi der baad ya password se sign in karein",
      };
    }

    const { data: row } = await supabaseAdmin
      .from("phone_otps")
      .select("id, code_hash, attempts, expires_at, consumed_at, channel")
      .eq("phone", data.phone)
      .eq("purpose", data.purpose)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return { ok: false as const, error: "OTP expire ho gaya — naya OTP bhejein" };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "OTP expire ho gaya — naya OTP bhejein" };
    }
    if ((row.attempts ?? 0) >= otp.OTP_MAX_ATTEMPTS) {
      return { ok: false as const, error: "Bahut galat koshish — naya OTP bhejein" };
    }

    if (!otp.otpMatches(data.phone, data.code, row.code_hash)) {
      await supabaseAdmin
        .from("phone_otps")
        .update({ attempts: (row.attempts ?? 0) + 1 })
        .eq("id", row.id);
      return { ok: false as const, error: "OTP galat hai" };
    }

    await supabaseAdmin
      .from("phone_otps")
      .update({ consumed_at: new Date().toISOString(), attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id);

    if (data.purpose === "verify") return { ok: true as const, verified: true as const };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (!profile) {
      return { ok: false as const, error: "Is number par koi account nahi hai — pehle account banayein" };
    }

    // Temporary shared-code mode must never open a platform admin account.
    if (row.channel === "temporary") {
      const { data: isAdmin } = await supabaseAdmin
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (isAdmin) {
        return {
          ok: false as const,
          error: "Admin account ke liye mobile + password use karein — OTP login band hai",
        };
      }
    }

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const email = userRes?.user?.email;
    if (!email) return { ok: false as const, error: "Account me email nahi mila — support se baat karein" };

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      return { ok: false as const, error: "Sign in nahi ho paya — thodi der baad try karein" };
    }

    const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
    const anonKey =
      process.env["SUPABASE_ANON_KEY"] ||
      process.env["SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["VITE_SUPABASE_ANON_KEY"];
    if (!url || !anonKey) return { ok: false as const, error: "Server configuration adhoori hai" };
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(url, anonKey, { auth: { persistSession: false } });

    const { data: session, error: verifyError } = await client.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    if (verifyError || !session.session) {
      return { ok: false as const, error: "Sign in nahi ho paya — thodi der baad try karein" };
    }

    await supabaseAdmin
      .from("profiles")
      .update({ phone_verified_at: new Date().toISOString() })
      .eq("id", profile.id);

    return {
      ok: true as const,
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
    };
  });

/**
 * After signup, stamp the profile as phone-verified — only if a matching
 * verify-purpose OTP was actually consumed for that number in the last
 * 15 minutes. The client cannot fake this.
 */
export const confirmSignupPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string }) => ({ phone: normalizeOtpPhone(input?.phone) }))
  .handler(async ({ data, context }) => {
    const { tryAdminClient } = await import("./admin-client.server");
    const supabaseAdmin = await tryAdminClient();
    if (!supabaseAdmin) return { ok: false as const };
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: row } = await supabaseAdmin
      .from("phone_otps")
      .select("id")
      .eq("phone", data.phone)
      .eq("purpose", "verify")
      .not("consumed_at", "is", null)
      .gte("consumed_at", since)
      .limit(1)
      .maybeSingle();
    if (!row) return { ok: false as const };

    await supabaseAdmin
      .from("profiles")
      .update({ phone: data.phone, phone_verified_at: new Date().toISOString() })
      .eq("id", context.userId);
    return { ok: true as const };
  });
