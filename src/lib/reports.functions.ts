import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendEmailServerSide } from "@/lib/reports.server";

/**
 * SERVER FUNCTION TO SEND DYNAMIC FINANCIAL REPORTS & BALANCE SHEET EMAILS DIRECTLY FROM SERVER
 * Sender: info@gstmunshi.com (Configured SMTP)
 * Subject Format: 'Ledger From [Company/Party Name] [Date Range]'
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
    return await sendEmailServerSide(data);
  });
