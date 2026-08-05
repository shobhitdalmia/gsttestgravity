import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  postExpense,
  postInvoice,
  postPayment,
  postPurchase,
  unpostSource,
  writeVoucher,
} from "@/lib/accounting.server";

/** Post (or re-post) the accounting entry for a sales invoice. */
export const postInvoiceVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ invoiceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const voucherId = await postInvoice(context.supabase as any, data.invoiceId, context.userId);
    return { voucherId };
  });

/** Post (or re-post) the accounting entry for a purchase bill. */
export const postPurchaseVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ purchaseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const voucherId = await postPurchase(context.supabase as any, data.purchaseId, context.userId);
    return { voucherId };
  });

/** Post the accounting entry for a receipt / payment row. */
export const postPaymentVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ paymentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const voucherId = await postPayment(context.supabase as any, data.paymentId, context.userId);
    return { voucherId };
  });

/** Post the accounting entry for an expense row. */
export const postExpenseVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ expenseId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const voucherId = await postExpense(context.supabase as any, data.expenseId, context.userId);
    return { voucherId };
  });

/** Remove the accounting entry of a source document (cancel / delete). */
export const unpostVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        sourceType: z.string().min(1).max(40),
        sourceId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await unpostSource(context.supabase as any, data.companyId, data.sourceType, data.sourceId);
    return { ok: true };
  });

/** Manual journal entry from the Day Book screen. */
export const createJournalVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        companyId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        narration: z.string().trim().max(300).optional(),
        voucherType: z.enum(["journal", "contra", "receipt", "payment", "expense"]).default("journal"),
        lines: z
          .array(
            z.object({
              ledgerId: z.string().uuid(),
              debit: z.number().min(0).max(1e12).default(0),
              credit: z.number().min(0).max(1e12).default(0),
            }),
          )
          .min(2)
          .max(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const voucherId = await writeVoucher(context.supabase as any, {
      companyId: data.companyId,
      type: data.voucherType,
      date: data.date,
      narration: data.narration ?? null,
      isAuto: false,
      createdBy: context.userId,
      lines: data.lines,
    });
    return { voucherId };
  });
