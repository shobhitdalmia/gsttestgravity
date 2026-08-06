import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * SERVER FUNCTION TO DISPATCH FINANCIAL REPORT EMAILS USING HOSTINGER SMTP
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

    // Hostinger SMTP Environment Configuration
    const SMTP_HOST = process.env.SMTP_HOST || "smtp.hostinger.com";
    const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
    const SMTP_USER = process.env.SMTP_USER || "info@gstmunshi.com";
    const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";

    const formattedSubject =
      data.subject || `Ledger From ${companyName} (${dateRange || "FY 2025-26"})`;

    const rd = realData || {};
    const cd = compData || {};

    const formatRupees = (val: number) =>
      new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(val) || 0);

    const emailHtmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #059669; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; }
    .header p { margin: 6px 0 0 0; font-size: 12px; opacity: 0.9; }
    .body { padding: 24px; }
    .meta-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #166534; }
    .table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
    .table th { background: #f8fafc; border-bottom: 2px solid #000000; padding: 8px 10px; text-align: left; font-weight: 700; text-transform: uppercase; }
    .table td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
    .table .total-row td { font-weight: 800; border-top: 1px solid #000000; border-bottom: 2px solid #000000; background: #f1f5f9; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .badge-pdf { display: inline-block; background: #dc2626; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${companyName}</h1>
      <p>STANDALONE FINANCIAL STATEMENT — ${reportType.toUpperCase()}</p>
    </div>

    <div class="body">
      <div class="meta-box">
        <strong>From:</strong> ${SMTP_USER} <br/>
        <strong>To:</strong> ${toEmail} <br/>
        <strong>Subject:</strong> ${formattedSubject} <br/>
        <strong>Active Period:</strong> ${dateRange || "FY 2025-26"} <br/>
        <span class="badge-pdf">📄 Financial Statement &amp; Ledger Included</span>
      </div>

      <h3 style="font-size:14px; margin-bottom:8px; color:#0f172a;">${reportType} Statement Summary</h3>
      
      <table class="table">
        <thead>
          <tr>
            <th>Particulars Account</th>
            <th style="text-align:right;">As at ${dateRange || "31 Mar 2026"}</th>
            <th style="text-align:right;">Previous Year</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>ASSETS</strong></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td style="padding-left:16px;">(a) Property, Plant &amp; Equipment</td>
            <td style="text-align:right;">${formatRupees(rd.propertyPlantEquip)}</td>
            <td style="text-align:right;">${formatRupees(cd.propertyPlantEquip)}</td>
          </tr>
          <tr>
            <td style="padding-left:16px;">(b) Intangible Assets</td>
            <td style="text-align:right;">${formatRupees(rd.intangibleAssets)}</td>
            <td style="text-align:right;">${formatRupees(cd.intangibleAssets)}</td>
          </tr>
          <tr>
            <td style="padding-left:16px;">(c) Financial Assets - Trade Receivables</td>
            <td style="text-align:right;">${formatRupees(rd.tradeReceivables)}</td>
            <td style="text-align:right;">${formatRupees(cd.tradeReceivables)}</td>
          </tr>
          <tr>
            <td style="padding-left:16px;">(d) Cash &amp; Bank Balances</td>
            <td style="text-align:right;">${formatRupees(rd.cashBankBalance)}</td>
            <td style="text-align:right;">${formatRupees(cd.cashBankBalance)}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL ASSETS</td>
            <td style="text-align:right;">${formatRupees(rd.totalAssets)}</td>
            <td style="text-align:right;">${formatRupees(cd.totalAssets)}</td>
          </tr>

          <tr>
            <td style="padding-top:12px;"><strong>EQUITY AND LIABILITIES</strong></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <td style="padding-left:16px;">(a) Equity Share Capital / Owner Capital</td>
            <td style="text-align:right;">${formatRupees(rd.shareCapital)}</td>
            <td style="text-align:right;">${formatRupees(cd.shareCapital)}</td>
          </tr>
          <tr>
            <td style="padding-left:16px;">(b) Other Equity (Reserves &amp; Surplus)</td>
            <td style="text-align:right;">${formatRupees(rd.reservesSurplus)}</td>
            <td style="text-align:right;">${formatRupees(cd.reservesSurplus)}</td>
          </tr>
          <tr>
            <td style="padding-left:16px;">(c) Trade Payables</td>
            <td style="text-align:right;">${formatRupees(rd.tradePayables)}</td>
            <td style="text-align:right;">${formatRupees(cd.tradePayables)}</td>
          </tr>
          <tr>
            <td style="padding-left:16px;">(d) Short Term Provisions &amp; Output GST</td>
            <td style="text-align:right;">${formatRupees(rd.netGstPayable)}</td>
            <td style="text-align:right;">${formatRupees(0)}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL EQUITY AND LIABILITIES</td>
            <td style="text-align:right;">${formatRupees(rd.totalLiabilitiesAndEquity)}</td>
            <td style="text-align:right;">${formatRupees(cd.totalLiabilitiesAndEquity)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      This email was sent directly from <strong>${SMTP_USER}</strong> via Hostinger SMTP Engine.<br/>
      © 2026 GST Munshi. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

    // 1. Direct Hostinger SMTP using Nodemailer
    const smtpPass = SMTP_PASS || "Info@22911555$";
    try {
      const nodemailerMod = await import("nodemailer");
      const nodemailer = nodemailerMod.default || nodemailerMod;

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: true, // SSL for Port 465
        auth: {
          user: SMTP_USER,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"GST Munshi Reports" <${SMTP_USER}>`,
        to: toEmail,
        subject: formattedSubject,
        html: emailHtmlBody,
      });

      console.log("[Hostinger SMTP] Email sent successfully:", info.messageId);
      return { success: true, provider: "hostinger-smtp", messageId: info.messageId, from: SMTP_USER };
    } catch (err: any) {
      console.error("[Hostinger SMTP] Error:", err);
      return {
        success: false,
        provider: "hostinger-smtp",
        reason: err instanceof Error ? err.message : String(err),
      };
    }
  });
