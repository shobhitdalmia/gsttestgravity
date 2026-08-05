export type OtpPurpose = "login" | "verify";

export function normalizeOtpPhone(raw: unknown): string {
  const phone = String(raw ?? "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error("Sahi 10-digit mobile number daalein");
  }
  return phone;
}

export function normalizeOtpPurpose(raw: unknown): OtpPurpose {
  return raw === "verify" ? "verify" : "login";
}