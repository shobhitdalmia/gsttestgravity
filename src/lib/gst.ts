// GST calculation helpers (Regular scheme, India)
export interface LineInput {
  quantity: number;
  rate: number;
  discountPct?: number;
  gstRate: number; // 0, 5, 12, 18, 28
}

export interface LineComputed {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export function computeLine(input: LineInput, isInterstate: boolean): LineComputed {
  const gross = input.quantity * input.rate;
  const discount = gross * ((input.discountPct ?? 0) / 100);
  const taxable = round2(gross - discount);
  const taxAmt = round2((taxable * input.gstRate) / 100);
  let cgst = 0,
    sgst = 0,
    igst = 0;
  if (isInterstate) {
    igst = taxAmt;
  } else {
    cgst = round2(taxAmt / 2);
    sgst = round2(taxAmt - cgst);
  }
  const total = round2(taxable + cgst + sgst + igst);
  return { taxable, cgst, sgst, igst, total };
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatINR(n: number | string | null | undefined) {
  const val = typeof n === "string" ? Number(n) : n ?? 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export function formatNumber(n: number | string | null | undefined) {
  const val = typeof n === "string" ? Number(n) : n ?? 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(val || 0);
}

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
];

/** "Delhi (07)" style label used on printed invoices. */
export function stateLabel(code: string | null | undefined, fallbackName?: string | null): string {
  if (!code) return fallbackName ?? "—";
  const s = INDIAN_STATES.find((x) => x.code === code);
  return `${s?.name ?? fallbackName ?? ""} (${code})`.trim();
}

export interface HsnSummaryRow {
  hsn: string;
  rate: number;
  qty: number;
  uqc: string;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

/** Group invoice items by HSN + GST rate for the statutory HSN summary table. */
export function hsnSummary(
  items: {
    hsn_code?: string | null;
    gst_rate: number | string;
    quantity: number | string;
    unit?: string | null;
    taxable_amount: number | string;
    cgst?: number | string | null;
    sgst?: number | string | null;
    igst?: number | string | null;
  }[],
): HsnSummaryRow[] {
  const map = new Map<string, HsnSummaryRow>();
  for (const it of items) {
    const hsn = (it.hsn_code ?? "").trim() || "—";
    const rate = Number(it.gst_rate ?? 0);
    const key = `${hsn}|${rate}`;
    const row =
      map.get(key) ??
      ({
        hsn,
        rate,
        qty: 0,
        uqc: (it.unit ?? "PCS").toUpperCase(),
        taxable: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0,
      } as HsnSummaryRow);
    row.qty = round2(row.qty + Number(it.quantity ?? 0));
    row.taxable = round2(row.taxable + Number(it.taxable_amount ?? 0));
    row.cgst = round2(row.cgst + Number(it.cgst ?? 0));
    row.sgst = round2(row.sgst + Number(it.sgst ?? 0));
    row.igst = round2(row.igst + Number(it.igst ?? 0));
    row.totalTax = round2(row.cgst + row.sgst + row.igst);
    map.set(key, row);
  }
  return [...map.values()];
}


const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

function indianWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  if (crore) parts.push(`${indianWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(" ");
}

/** Indian-format amount in words, e.g. "Rupees One Lakh Twenty Three Thousand and Fifty Paise Only" */
export function amountInWords(amount: number): string {
  const val = round2(Math.abs(amount || 0));
  const rupees = Math.floor(val);
  const paise = Math.round((val - rupees) * 100);
  let out = `Rupees ${indianWords(rupees)}`;
  if (paise > 0) out += ` and ${twoDigits(paise)} Paise`;
  return `${out} Only`;
}
