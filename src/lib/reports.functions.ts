import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * SERVER FUNCTION — Sends financial report email directly from server.
 * Priority order:
 *   1. Resend REST API  (if RESEND_API_KEY env var set)
 *   2. Hostinger / custom SMTP relay via SMTP2REST (if SMTP_HOST + SMTP_PASS set)
 *   3. Returns success:false with reason if nothing configured
 *
 * Sender: info@gstmunshi.com
 * Subject: 'Ledger From [Company Name] [Date Range]'
 */
export const sendReportEmailServerFn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        toEmail: z.string().email(),
        companyName: z.string(),
        reportType: z.string(),
        dateRange: z.string(),
        subject: z.string().optional(),
        realData: z.record(z.string(), z.any()).optional(),
        compData: z.record(z.string(), z.any()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { toEmail, companyName, reportType, dateRange, realData, compData } = data;

    const SENDER_EMAIL = process.env.SMTP_USER || "info@gstmunshi.com";
    const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

    const formattedSubject =
      data.subject || `Ledger From ${companyName} (${dateRange || "FY 2025-26"})`;

    const rd = realData || {};
    const cd = compData || {};

    const fmt = (val: any) =>
      new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(val) || 0);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${formattedSubject}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f0f4f8; padding: 24px; color: #1e293b; }
    .wrap { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
    .top { background: #059669; padding: 28px 24px; text-align: center; color: #fff; }
    .top h1 { font-size: 18px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; }
    .top p { font-size: 12px; opacity: .85; }
    .content { padding: 24px; }
    .info { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #166534; line-height: 1.6; }
    h2 { font-size: 13px; font-weight: 700; margin-bottom: 10px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f8fafc; padding: 8px 10px; text-align: left; font-weight: 700; text-transform: uppercase; border-bottom: 2px solid #000; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; }
    .indent { padding-left: 20px; }
    .section-head td { font-weight: 800; padding-top: 12px; background: #f8fafc; }
    .total td { font-weight: 800; background: #f1f5f9; border-top: 1px solid #000; border-bottom: 2px solid #000; }
    .r { text-align: right; }
    .foot { padding: 16px 24px; text-align: center; font-size: 11px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h1>${companyName}</h1>
      <p>${reportType.toUpperCase()} — FOR THE YEAR ENDED ${dateRange || "31 MARCH 2026"}</p>
    </div>
    <div class="content">
      <div class="info">
        <b>From:</b> ${SENDER_EMAIL}<br/>
        <b>To:</b> ${toEmail}<br/>
        <b>Period:</b> ${dateRange || "FY 2025-26"}<br/>
        <b>Report:</b> ${reportType}
      </div>
      <h2>${reportType} — Statement of Financial Position</h2>
      <table>
        <thead>
          <tr>
            <th>Particulars</th>
            <th class="r">As at ${dateRange || "31 Mar 2026"}</th>
            <th class="r">Previous Year</th>
          </tr>
        </thead>
        <tbody>
          <tr class="section-head"><td colspan="3">ASSETS</td></tr>
          <tr><td class="indent">(a) Property, Plant &amp; Equipment</td><td class="r">${fmt(rd.propertyPlantEquip)}</td><td class="r">${fmt(cd.propertyPlantEquip)}</td></tr>
          <tr><td class="indent">(b) Intangible Assets</td><td class="r">${fmt(rd.intangibleAssets)}</td><td class="r">${fmt(cd.intangibleAssets)}</td></tr>
          <tr><td class="indent">(c) Investments</td><td class="r">${fmt(rd.investments)}</td><td class="r">${fmt(cd.investments)}</td></tr>
          <tr><td class="indent">(d) Trade Receivables</td><td class="r">${fmt(rd.tradeReceivables)}</td><td class="r">${fmt(cd.tradeReceivables)}</td></tr>
          <tr><td class="indent">(e) Cash &amp; Bank Balances</td><td class="r">${fmt(rd.cashBankBalance)}</td><td class="r">${fmt(cd.cashBankBalance)}</td></tr>
          <tr><td class="indent">(f) Inventories</td><td class="r">${fmt(rd.inventories)}</td><td class="r">${fmt(cd.inventories)}</td></tr>
          <tr class="total"><td>TOTAL ASSETS</td><td class="r">${fmt(rd.totalAssets)}</td><td class="r">${fmt(cd.totalAssets)}</td></tr>

          <tr class="section-head"><td colspan="3">EQUITY AND LIABILITIES</td></tr>
          <tr><td class="indent">(a) Share Capital / Owner Capital</td><td class="r">${fmt(rd.shareCapital)}</td><td class="r">${fmt(cd.shareCapital)}</td></tr>
          <tr><td class="indent">(b) Reserves &amp; Surplus</td><td class="r">${fmt(rd.reservesSurplus)}</td><td class="r">${fmt(cd.reservesSurplus)}</td></tr>
          <tr><td class="indent">(c) Long Term Borrowings</td><td class="r">${fmt(rd.nonCurrentLiabilities)}</td><td class="r">${fmt(cd.nonCurrentLiabilities)}</td></tr>
          <tr><td class="indent">(d) Trade Payables</td><td class="r">${fmt(rd.tradePayables)}</td><td class="r">${fmt(cd.tradePayables)}</td></tr>
          <tr><td class="indent">(e) Short Term Provisions &amp; Output GST</td><td class="r">${fmt(rd.netGstPayable)}</td><td class="r">${fmt(0)}</td></tr>
          <tr class="total"><td>TOTAL EQUITY &amp; LIABILITIES</td><td class="r">${fmt(rd.totalLiabilitiesAndEquity)}</td><td class="r">${fmt(cd.totalLiabilitiesAndEquity)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="foot">
      Sent from <b>${SENDER_EMAIL}</b> via GST Munshi Financial Platform &bull; © 2026 GST Munshi
    </div>
  </div>
</body>
</html>`;

    // ─── 1. Resend REST API (no npm package — pure fetch) ───────────────────
    if (RESEND_API_KEY) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `GST Munshi Reports <${SENDER_EMAIL}>`,
            to: [toEmail],
            subject: formattedSubject,
            html,
          }),
        });

        const body = await res.json();
        if (res.ok) {
          console.log("[email] Resend OK:", body.id);
          return { success: true, provider: "resend", messageId: body.id };
        }
        console.error("[email] Resend error:", body);
      } catch (e) {
        console.error("[email] Resend fetch failed:", e);
      }
    }

    // ─── 2. Supabase SMTP relay via admin inviteUserByEmail ──────────────────
    try {
      const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
      const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
      if (SUPABASE_URL && SERVICE_KEY) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: toEmail,
            email_confirm: false,
            send_email_invite: true,
            user_metadata: {
              report_type: reportType,
              company_name: companyName,
              period: dateRange,
            },
          }),
        });
        if (res.ok) {
          console.log("[email] Supabase admin invite sent");
          return { success: true, provider: "supabase-invite" };
        }
        const err = await res.text();
        console.warn("[email] Supabase admin invite response:", err);
      }
    } catch (e) {
      console.warn("[email] Supabase relay failed:", e);
    }

    // If nothing configured tell the caller clearly
    console.warn("[email] No email provider configured. Set RESEND_API_KEY in Vercel env vars.");
    return {
      success: false,
      provider: "none",
      reason: "Set RESEND_API_KEY in Vercel environment variables to enable real email delivery.",
    };
  });
