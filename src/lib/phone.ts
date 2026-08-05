/** Indian mobile number helpers (client + server safe). */

/** Keep the last 10 digits — handles +91, 0 prefix, spaces and dashes. */
export function normalizePhone(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "").slice(-10);
}

export function isValidIndianMobile(raw: string | null | undefined): boolean {
  const p = normalizePhone(raw);
  return /^[6-9]\d{9}$/.test(p);
}

export function formatPhone(raw: string | null | undefined): string {
  const p = normalizePhone(raw);
  if (p.length !== 10) return raw ?? "";
  return `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
}
