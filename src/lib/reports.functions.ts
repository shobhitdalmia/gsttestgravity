import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * PDF GENERATOR FOR STANDALONE FINANCIAL STATEMENT / BALANCE SHEET
 * Generates an A4 PDF Buffer matching official CA financial report format
 */
async function generateReportPdfBuffer(
  companyName: string,
  reportType: string,
  dateRange: string,
  realData: Record<string, any>,
  compData: Record<string, any>
): Promise<Buffer> {
  const PDFDocumentMod = await import("pdfkit");
  const PDFDocument = PDFDocumentMod.default || PDFDocumentMod;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: any) => reject(err));

    const rd = realData || {};
    const cd = compData || {};
    const fmt = (val: number) =>
      new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(val) || 0);

    // Company Header
    doc.fontSize(18).fillColor("#059669").font("Helvetica-Bold").text(companyName.toUpperCase(), { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#334155").font("Helvetica").text(`STANDALONE FINANCIAL STATEMENT — ${reportType.toUpperCase()}`, { align: "center" });
    doc.fontSize(8.5).fillColor("#475569").font("Helvetica-Oblique").text(`FOR THE YEAR ENDED ${dateRange.toUpperCase()}`, { align: "center" });
    doc.moveDown(0.8);

    // Horizontal Line
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#000000").lineWidth(1).stroke();
    doc.moveDown(0.6);

    // Table Column Headers
    const startY = doc.y;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#000000");
    doc.text("Particulars", 40, startY, { width: 260 });
    doc.text("Note", 300, startY, { width: 40, align: "center" });
    doc.text(`As at ${dateRange}`, 340, startY, { width: 100, align: "right" });
    doc.text("Previous Year", 445, startY, { width: 110, align: "right" });

    doc.moveDown(0.4);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#000000").lineWidth(1.5).stroke();
    doc.moveDown(0.5);

    const addRow = (particulars: string, note: string, curr: number | string, prev: number | string, isBold = false, indent = 0) => {
      const y = doc.y;
      if (y > 740) {
        doc.addPage();
      }
      doc.fontSize(8.5).font(isBold ? "Helvetica-Bold" : "Helvetica").fillColor("#000000");
      doc.text(particulars, 40 + indent, y, { width: 260 - indent });
      if (note) doc.text(note, 300, y, { width: 40, align: "center" });
      doc.text(typeof curr === "number" ? fmt(curr) : curr, 340, y, { width: 100, align: "right" });
      doc.text(typeof prev === "number" ? fmt(prev) : prev, 445, y, { width: 110, align: "right" });
      doc.moveDown(0.4);
    };

    const addLine = (double = false) => {
      const y = doc.y;
      doc.moveTo(40, y).lineTo(555, y).strokeColor("#000000").lineWidth(1).stroke();
      if (double) {
        doc.moveTo(40, y + 2).lineTo(555, y + 2).strokeColor("#000000").lineWidth(1).stroke();
      }
      doc.moveDown(0.3);
    };

    // ASSETS SECTION
    addRow("ASSETS", "", "", "", true);
    addRow("Property Plant & Equipment", "1", rd.propertyPlantEquip, cd.propertyPlantEquip, false, 12);
    addRow("Capital Work in Progress", "2", 0, 0, false, 12);
    addRow("Intangible Assets", "3", rd.intangibleAssets, cd.intangibleAssets, false, 12);
    addRow("Investments", "4", rd.investments, cd.investments, false, 12);
    addRow("Long Term Loans & Advances", "6", rd.longTermLoans, cd.longTermLoans, false, 12);
    addRow("Trade Receivables", "8", rd.tradeReceivables, cd.tradeReceivables, false, 12);
    addRow("Cash & Cash Equivalents", "9", rd.cashBankBalance, cd.cashBankBalance, false, 12);
    addRow("Inventories", "7", rd.inventories, cd.inventories, false, 12);
    addLine();
    addRow("TOTAL ASSETS", "", rd.totalAssets, cd.totalAssets, true);
    addLine(true);

    doc.moveDown(0.8);

    // EQUITY AND LIABILITIES SECTION
    addRow("EQUITY AND LIABILITIES", "", "", "", true);
    addRow("Share Capital / Owner Capital", "12", rd.shareCapital, cd.shareCapital, false, 12);
    addRow("Reserves & Surplus (Profit)", "13", rd.reservesSurplus, cd.reservesSurplus, false, 12);
    addRow("Long Term Borrowings", "14", rd.nonCurrentLiabilities, cd.nonCurrentLiabilities, false, 12);
    addRow("Trade Payables", "17", rd.tradePayables, cd.tradePayables, false, 12);
    addRow("Short Term Provisions & Output GST", "19", rd.netGstPayable, 0, false, 12);
    addLine();
    addRow("TOTAL EQUITY AND LIABILITIES", "", rd.totalLiabilitiesAndEquity, cd.totalLiabilitiesAndEquity, true);
    addLine(true);

    // Footer Signoff
    doc.moveDown(2);
    doc.fontSize(8).font("Helvetica-Oblique").fillColor("#64748b").text("Generated via GST Munshi Financial Platform.", { align: "center" });

    doc.end();
  });
}

/**
 * SERVER FUNCTION TO DISPATCH FINANCIAL REPORT EMAILS WITH PDF ATTACHMENT VIA HOSTINGER SMTP
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
    const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "Info@22911555$";

    const formattedSubject =
      data.subject || `Ledger From ${companyName} (${dateRange || "FY 2025-26"})`;

    const rd = realData || {};
    const cd = compData || {};

    // Exact email text requested by user
    const emailHtmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6; padding: 20px; background-color: #f8fafc; }
    .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .firm-name { font-weight: bold; color: #059669; font-size: 16px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="email-container">
    <p>Dear User,</p>
    <br/>
    <p>Please find the attached ${reportType.toLowerCase()} for the period <strong>${dateRange || "01-Aug-2026 to 06-Aug-2026"}</strong>.</p>
    <br/>
    <p>Feel free to reach out if you have any questions or need clarification.</p>
    <br/>
    <p>Best regards,</p>
    <p class="firm-name">${companyName}</p>
  </div>
</body>
</html>
`;

    try {
      // 1. Generate PDF Attachment Buffer matching CA Standalone Financial Statement
      const pdfBuffer = await generateReportPdfBuffer(
        companyName,
        reportType,
        dateRange || "FY 2025-26",
        rd,
        cd
      );

      // 2. Initialize Nodemailer with Hostinger SMTP
      const nodemailerMod = await import("nodemailer");
      const nodemailer = nodemailerMod.default || nodemailerMod;

      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: true, // SSL for Port 465
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      const pdfFilename = `${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_${reportType.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      const info = await transporter.sendMail({
        from: `"${companyName}" <${SMTP_USER}>`,
        to: toEmail,
        subject: formattedSubject,
        html: emailHtmlBody,
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });

      console.log("[Hostinger SMTP] Email with PDF sent successfully:", info.messageId);
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
