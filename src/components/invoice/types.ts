import type { Company } from "@/lib/company";

export interface InvoiceItemRow {
  id: string;
  name: string;
  hsn_code: string | null;
  quantity: number;
  unit: string | null;
  rate: number;
  discount_pct: number | null;
  gst_rate: number;
  taxable_amount: number;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  total: number;
}

export interface InvoicePartyRow {
  id: string;
  name: string;
  gstin: string | null;
  phone: string | null;
  billing_address: string | null;
  shipping_address?: string | null;
  state: string | null;
  state_code: string | null;
}

export interface InvoiceFull {
  id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_time?: string | null;
  due_date: string | null;
  place_of_supply: string | null;
  is_interstate: boolean | null;
  invoice_type?: "tax_invoice" | "bill_of_supply" | null;
  reverse_charge?: boolean | null;
  transport_name?: string | null;
  vehicle_no?: string | null;
  gr_rr_no?: string | null;
  station?: string | null;
  shipping_address?: string | null;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  amount_paid: number;
  status: string;
  notes: string | null;
  terms?: string | null;
  items: InvoiceItemRow[];
  party: InvoicePartyRow | null;
  company: Company | null;
}
