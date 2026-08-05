/**
 * Server-only OTP helpers.
 *
 * Channel adapters are provider-agnostic: today the `temporary` adapter is
 * active (a fixed code shared with the customer over phone, kept in the
 * TEMP_OTP_CODE secret). Once DLT registration is done, add the msg91 /
 * whatsapp adapter here — nothing else in the app has to change.
 */
import { createHash, timingSafeEqual } from "crypto";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_PHONE_10MIN = 5;
export const OTP_MAX_PER_IP_10MIN = 20;

export function hashOtp(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export function otpMatches(phone: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(phone, code));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function temporaryOtpMode(): { enabled: boolean; code: string | null } {
  const enabled = String(process.env["TEMP_OTP_ENABLED"] ?? "").toLowerCase() === "true";
  const code = process.env["TEMP_OTP_CODE"] ?? null;
  return { enabled: enabled && !!code && /^\d{4,8}$/.test(code), code };
}

/** Names of the config values that are missing for temporary OTP mode. */
export function missingOtpConfig(): string[] {
  const missing: string[] = [];
  if (String(process.env["TEMP_OTP_ENABLED"] ?? "").toLowerCase() !== "true") {
    missing.push("TEMP_OTP_ENABLED");
  }
  const code = process.env["TEMP_OTP_CODE"] ?? "";
  if (!/^\d{4,8}$/.test(code)) missing.push("TEMP_OTP_CODE");
  return missing;
}

export function randomOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export type OtpChannel = "temporary" | "sms" | "whatsapp";

/**
 * Deliver the code. In temporary mode nothing is sent — the customer already
 * knows the shared code. Real adapters plug in here.
 */
export async function sendOtp(_phone: string, _code: string): Promise<OtpChannel> {
  const temp = temporaryOtpMode();
  if (temp.enabled) return "temporary";
  // Never log the code itself — only which config keys are absent.
  console.error(
    `[otp] temporary mode off: ${missingOtpConfig().join(", ") || "unknown"} missing on this host`,
  );
  // TODO: MSG91 WhatsApp primary + SMS fallback once DLT approval is done.
  throw new Error(
    "Is hosting par OTP service configure nahi hai — password se sign in karein ya admin se sampark karein",
  );
}
