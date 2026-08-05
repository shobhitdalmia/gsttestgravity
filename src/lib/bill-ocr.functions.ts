import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateObject, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ItemSchema = z.object({
  name: z.string(),
  hsn_code: z.string().nullable(),
  quantity: z.number(),
  unit: z.string().nullable(),
  rate: z.number(),
  gst_rate: z.number(),
  discount_pct: z.number().nullable(),
});

const BillSchema = z.object({
  supplier: z.object({
    name: z.string().nullable(),
    gstin: z.string().nullable(),
    state_code: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
  }),
  bill_number: z.string().nullable(),
  bill_date: z.string().nullable(),
  is_interstate_guess: z.boolean().nullable(),
  items: z.array(ItemSchema),
  totals: z.object({
    subtotal: z.number().nullable(),
    cgst: z.number().nullable(),
    sgst: z.number().nullable(),
    igst: z.number().nullable(),
    total: z.number().nullable(),
  }),
});

export type ExtractedBill = z.infer<typeof BillSchema>;

const SYSTEM = `You are an expert Indian GST purchase invoice OCR system.
Extract structured data from the supplied bill (image or PDF).
Rules:
- All amounts in INR, plain numbers (no ₹, commas).
- bill_date must be YYYY-MM-DD (convert from any dd-mm-yyyy / dd/mm/yyyy).
- HSN codes are 4-8 digits.
- gst_rate is a percentage number: 0, 0.25, 3, 5, 12, 18, or 28.
- state_code is the 2-digit GST state code (e.g. "27" for Maharashtra) — derive from GSTIN's first 2 chars if present.
- is_interstate_guess: true if bill shows IGST, false if it shows CGST+SGST, else null.
- If a field is not clearly visible, return null (do NOT hallucinate).
- Return every line item found in the itemized table.`;

export const extractPurchaseBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { fileBase64: string; mimeType: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    // Self-hosted deployments may not have the AI gateway key. Fail with a
    // clear, user-facing message instead of a raw env-var error.
    if (!key)
      throw new Error(
        "Bill scanning is not available on this deployment (AI service is not configured). Please enter the bill manually.",
      );

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3.5-flash");

    const isImage = data.mimeType.startsWith("image/");

    try {
      const { object } = await generateObject({
        model,
        schema: BillSchema,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract this purchase invoice." },
              isImage
                ? { type: "image", image: `data:${data.mimeType};base64,${data.fileBase64}` }
                : { type: "file", data: data.fileBase64, mediaType: data.mimeType },
            ],
          },
        ],
      });
      return object;
    } catch (e: any) {
      if (NoObjectGeneratedError.isInstance(e)) {
        throw new Error("Bill parse nahi ho paya. Saaf photo dobara try karein.");
      }
      const msg = String(e?.message ?? e);
      if (msg.includes("402")) throw new Error("AI credits khatam. Workspace mein credits add karein.");
      if (msg.includes("429")) throw new Error("Bahut zyada requests. Thodi der baad try karein.");
      throw new Error(msg);
    }
  });
