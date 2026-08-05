/**
 * Server-only accounting engine: resolves ledgers and writes balanced
 * double-entry vouchers for every business document.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type DB = SupabaseClient<any, "public", any>;

export type VoucherType =
  | "sales"
  | "purchase"
  | "receipt"
  | "payment"
  | "expense"
  | "journal"
  | "contra"
  | "credit_note"
  | "debit_note"
  | "opening";

export interface PostLine {
  ledgerId: string;
  debit?: number;
  credit?: number;
  narration?: string | null;
}

function r2(n: number) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

/** Ledger id by system code, seeding the default chart if it is missing. */
export async function ledgerIdByCode(db: DB, companyId: string, code: string): Promise<string> {
  const { data } = await db
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("code", code)
    .is("deleted_at", null)
    .maybeSingle();
  if (data?.id) return data.id as string;
  throw new Error(`Ledger "${code}" is company me nahi mila — Chart of Accounts check karein`);
}

/** Cash / bank ledger for a payment mode string. */
export async function cashBankLedgerId(db: DB, companyId: string, mode?: string | null) {
  const m = (mode ?? "cash").toLowerCase();
  if (m.includes("cash")) return ledgerIdByCode(db, companyId, "cash");
  if (m.includes("upi") || m.includes("wallet")) return ledgerIdByCode(db, companyId, "upi_wallet");
  return ledgerIdByCode(db, companyId, "bank");
}

/** Party ledger (creates one through the DB helper when missing). */
export async function partyLedgerId(db: DB, companyId: string, partyId: string): Promise<string | null> {
  const { data } = await db
    .from("parties")
    .select("id, ledger_id, name, type")
    .eq("company_id", companyId)
    .eq("id", partyId)
    .maybeSingle();
  if (!data) return null;
  if (data.ledger_id) return data.ledger_id as string;

  const groupCode = data.type === "supplier" ? "sundry_cred" : "sundry_deb";
  const { data: group } = await db
    .from("ledger_groups")
    .select("id")
    .eq("company_id", companyId)
    .eq("code", groupCode)
    .maybeSingle();
  if (!group) return null;

  const { data: created } = await db
    .from("ledgers")
    .insert({
      company_id: companyId,
      group_id: group.id,
      party_id: partyId,
      name: data.name,
      opening_type: data.type === "supplier" ? "credit" : "debit",
    })
    .select("id")
    .single();
  if (!created) return null;
  await db.from("parties").update({ ledger_id: created.id }).eq("id", partyId);
  return created.id as string;
}

/** Soft-delete any existing voucher for a source document (edit/delete safe). */
export async function unpostSource(db: DB, companyId: string, sourceType: string, sourceId: string) {
  await db
    .from("vouchers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .is("deleted_at", null);
}

/** Write one balanced voucher. Throws when debit ≠ credit. */
export async function writeVoucher(
  db: DB,
  args: {
    companyId: string;
    type: VoucherType;
    date: string;
    voucherNo?: string | null;
    narration?: string | null;
    sourceType?: string | null;
    sourceId?: string | null;
    isAuto?: boolean;
    createdBy?: string | null;
    lines: PostLine[];
  },
) {
  const lines = args.lines
    .map((l) => ({ ...l, debit: r2(l.debit ?? 0), credit: r2(l.credit ?? 0) }))
    .filter((l) => l.debit !== 0 || l.credit !== 0);
  if (lines.length < 2) return null;

  const totalDebit = r2(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = r2(lines.reduce((s, l) => s + l.credit, 0));
  if (Math.abs(totalDebit - totalCredit) > 0.02) {
    throw new Error(`Entry balance nahi ho rahi (Dr ${totalDebit} / Cr ${totalCredit})`);
  }

  if (args.sourceType && args.sourceId) {
    await unpostSource(db, args.companyId, args.sourceType, args.sourceId);
  }

  const { data: voucher, error } = await db
    .from("vouchers")
    .insert({
      company_id: args.companyId,
      voucher_type: args.type,
      voucher_no: args.voucherNo ?? null,
      voucher_date: args.date,
      narration: args.narration ?? null,
      source_type: args.sourceType ?? null,
      source_id: args.sourceId ?? null,
      is_auto: args.isAuto ?? true,
      total_debit: totalDebit,
      total_credit: totalCredit,
      created_by: args.createdBy ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: lineErr } = await db.from("voucher_lines").insert(
    lines.map((l, i) => ({
      voucher_id: voucher!.id,
      ledger_id: l.ledgerId,
      debit: l.debit,
      credit: l.credit,
      narration: l.narration ?? null,
      line_no: i + 1,
    })),
  );
  if (lineErr) throw new Error(lineErr.message);
  return voucher!.id as string;
}

/** Sales invoice → Party/Cash Dr, Sales Cr, Output GST Cr (+ receipt voucher). */
export async function postInvoice(db: DB, invoiceId: string, userId: string) {
  const { data: inv } = await db
    .from("invoices")
    .select(
      "id, company_id, party_id, invoice_number, invoice_date, invoice_type, is_interstate, subtotal, cgst, sgst, igst, total, amount_paid, status",
    )
    .eq("id", invoiceId)
    .maybeSingle();
  if (!inv) throw new Error("Invoice nahi mila");
  if (inv.status === "cancelled") {
    await unpostSource(db, inv.company_id, "invoice", inv.id);
    return null;
  }

  const companyId = inv.company_id as string;
  const isBOS = inv.invoice_type === "bill_of_supply";
  const salesCode = isBOS ? "sales_bos" : inv.is_interstate ? "sales_interstate" : "sales_local";

  const debitLedger = inv.party_id
    ? (await partyLedgerId(db, companyId, inv.party_id)) ?? (await ledgerIdByCode(db, companyId, "cash"))
    : await ledgerIdByCode(db, companyId, "cash");

  const lines: PostLine[] = [
    { ledgerId: debitLedger, debit: Number(inv.total) },
    { ledgerId: await ledgerIdByCode(db, companyId, salesCode), credit: Number(inv.subtotal) },
  ];
  if (Number(inv.cgst)) lines.push({ ledgerId: await ledgerIdByCode(db, companyId, "output_cgst"), credit: Number(inv.cgst) });
  if (Number(inv.sgst)) lines.push({ ledgerId: await ledgerIdByCode(db, companyId, "output_sgst"), credit: Number(inv.sgst) });
  if (Number(inv.igst)) lines.push({ ledgerId: await ledgerIdByCode(db, companyId, "output_igst"), credit: Number(inv.igst) });

  const diff = r2(Number(inv.total) - (Number(inv.subtotal) + Number(inv.cgst) + Number(inv.sgst) + Number(inv.igst)));
  if (Math.abs(diff) >= 0.01) {
    const roundOff = await ledgerIdByCode(db, companyId, "round_off");
    lines.push(diff > 0 ? { ledgerId: roundOff, credit: diff } : { ledgerId: roundOff, debit: -diff });
  }

  const voucherId = await writeVoucher(db, {
    companyId,
    type: "sales",
    date: inv.invoice_date,
    voucherNo: inv.invoice_number,
    narration: `${isBOS ? "Bill of Supply" : "Tax Invoice"} ${inv.invoice_number}`,
    sourceType: "invoice",
    sourceId: inv.id,
    createdBy: userId,
    lines,
  });

  // Amount received at billing time → receipt voucher against the party.
  const paid = Number(inv.amount_paid ?? 0);
  if (paid > 0 && inv.party_id) {
    const partyLedger = await partyLedgerId(db, companyId, inv.party_id);
    if (partyLedger) {
      await writeVoucher(db, {
        companyId,
        type: "receipt",
        date: inv.invoice_date,
        voucherNo: inv.invoice_number,
        narration: `Receipt against ${inv.invoice_number}`,
        sourceType: "invoice_receipt",
        sourceId: inv.id,
        createdBy: userId,
        lines: [
          { ledgerId: await ledgerIdByCode(db, companyId, "cash"), debit: paid },
          { ledgerId: partyLedger, credit: paid },
        ],
      });
    }
  } else {
    await unpostSource(db, companyId, "invoice_receipt", inv.id);
  }

  return voucherId;
}

/** Purchase bill → Purchase Dr, Input GST Dr, Party Cr (+ payment voucher). */
export async function postPurchase(db: DB, purchaseId: string, userId: string) {
  const { data: pur } = await db
    .from("purchases")
    .select(
      "id, company_id, party_id, bill_number, bill_date, is_interstate, subtotal, cgst, sgst, igst, total, amount_paid, status",
    )
    .eq("id", purchaseId)
    .maybeSingle();
  if (!pur) throw new Error("Purchase bill nahi mila");
  if (pur.status === "cancelled") {
    await unpostSource(db, pur.company_id, "purchase", pur.id);
    return null;
  }

  const companyId = pur.company_id as string;
  const purchaseCode = pur.is_interstate ? "purchase_interstate" : "purchase_local";
  const creditLedger = pur.party_id
    ? (await partyLedgerId(db, companyId, pur.party_id)) ?? (await ledgerIdByCode(db, companyId, "cash"))
    : await ledgerIdByCode(db, companyId, "cash");

  const lines: PostLine[] = [
    { ledgerId: await ledgerIdByCode(db, companyId, purchaseCode), debit: Number(pur.subtotal) },
  ];
  if (Number(pur.cgst)) lines.push({ ledgerId: await ledgerIdByCode(db, companyId, "input_cgst"), debit: Number(pur.cgst) });
  if (Number(pur.sgst)) lines.push({ ledgerId: await ledgerIdByCode(db, companyId, "input_sgst"), debit: Number(pur.sgst) });
  if (Number(pur.igst)) lines.push({ ledgerId: await ledgerIdByCode(db, companyId, "input_igst"), debit: Number(pur.igst) });

  const diff = r2(Number(pur.total) - (Number(pur.subtotal) + Number(pur.cgst) + Number(pur.sgst) + Number(pur.igst)));
  if (Math.abs(diff) >= 0.01) {
    const roundOff = await ledgerIdByCode(db, companyId, "round_off");
    lines.push(diff > 0 ? { ledgerId: roundOff, debit: diff } : { ledgerId: roundOff, credit: -diff });
  }
  lines.push({ ledgerId: creditLedger, credit: Number(pur.total) });

  const voucherId = await writeVoucher(db, {
    companyId,
    type: "purchase",
    date: pur.bill_date,
    voucherNo: pur.bill_number,
    narration: `Purchase bill ${pur.bill_number}`,
    sourceType: "purchase",
    sourceId: pur.id,
    createdBy: userId,
    lines,
  });

  const paid = Number(pur.amount_paid ?? 0);
  if (paid > 0 && pur.party_id) {
    const partyLedger = await partyLedgerId(db, companyId, pur.party_id);
    if (partyLedger) {
      await writeVoucher(db, {
        companyId,
        type: "payment",
        date: pur.bill_date,
        voucherNo: pur.bill_number,
        narration: `Payment against ${pur.bill_number}`,
        sourceType: "purchase_payment",
        sourceId: pur.id,
        createdBy: userId,
        lines: [
          { ledgerId: partyLedger, debit: paid },
          { ledgerId: await ledgerIdByCode(db, companyId, "cash"), credit: paid },
        ],
      });
    }
  } else {
    await unpostSource(db, companyId, "purchase_payment", pur.id);
  }

  return voucherId;
}

/** Payment row → Cash/Bank Dr + Party Cr (received) or reverse (paid). */
export async function postPayment(db: DB, paymentId: string, userId: string) {
  const { data: pay } = await db
    .from("payments")
    .select("id, company_id, party_id, direction, amount, payment_date, mode, reference")
    .eq("id", paymentId)
    .maybeSingle();
  if (!pay) throw new Error("Payment nahi mila");

  const companyId = pay.company_id as string;
  const bank = await cashBankLedgerId(db, companyId, pay.mode);
  const partyLedger = pay.party_id ? await partyLedgerId(db, companyId, pay.party_id) : null;
  const counter = partyLedger ?? (await ledgerIdByCode(db, companyId, pay.direction === "received" ? "other_income" : "misc_exp"));

  const amount = Number(pay.amount);
  const lines: PostLine[] =
    pay.direction === "received"
      ? [
          { ledgerId: bank, debit: amount },
          { ledgerId: counter, credit: amount },
        ]
      : [
          { ledgerId: counter, debit: amount },
          { ledgerId: bank, credit: amount },
        ];

  return writeVoucher(db, {
    companyId,
    type: pay.direction === "received" ? "receipt" : "payment",
    date: pay.payment_date,
    voucherNo: pay.reference ?? null,
    narration: pay.direction === "received" ? "Amount received" : "Amount paid",
    sourceType: "payment",
    sourceId: pay.id,
    createdBy: userId,
    lines,
  });
}

/** Expense row → matching expense ledger Dr, Cash/Bank Cr. */
export async function postExpense(db: DB, expenseId: string, userId: string) {
  const { data: exp } = await db
    .from("expenses")
    .select("id, company_id, category, amount, expense_date, payment_mode, notes")
    .eq("id", expenseId)
    .maybeSingle();
  if (!exp) throw new Error("Expense nahi mila");

  const companyId = exp.company_id as string;
  const category = (exp.category ?? "").trim();

  let expenseLedgerId: string | null = null;
  if (category) {
    const { data: match } = await db
      .from("ledgers")
      .select("id")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .ilike("name", category)
      .maybeSingle();
    expenseLedgerId = (match?.id as string) ?? null;
  }
  if (!expenseLedgerId) expenseLedgerId = await ledgerIdByCode(db, companyId, "misc_exp");

  return writeVoucher(db, {
    companyId,
    type: "expense",
    date: exp.expense_date,
    narration: category || exp.notes || "Expense",
    sourceType: "expense",
    sourceId: exp.id,
    createdBy: userId,
    lines: [
      { ledgerId: expenseLedgerId, debit: Number(exp.amount) },
      { ledgerId: await cashBankLedgerId(db, companyId, exp.payment_mode), credit: Number(exp.amount) },
    ],
  });
}
