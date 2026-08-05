import { createFileRoute } from "@tanstack/react-router";

/**
 * Boolean-only config healthcheck for whichever host serves the app.
 * Never returns key values — only whether each binding is present.
 */
export const Route = createFileRoute("/api/public/health/otp")({
  server: {
    handlers: {
      GET: async () => {
        const has = (name: string) => Boolean(process.env[name]);
        const tempCode = process.env["TEMP_OTP_CODE"] ?? "";
        const checks = {
          supabaseUrl: has("SUPABASE_URL") || has("VITE_SUPABASE_URL"),
          publishableKey:
            has("SUPABASE_PUBLISHABLE_KEY") ||
            has("SUPABASE_ANON_KEY") ||
            has("VITE_SUPABASE_PUBLISHABLE_KEY"),
          serviceKey: has("SUPABASE_SERVICE_ROLE_KEY"),
          tempOtp:
            String(process.env["TEMP_OTP_ENABLED"] ?? "").toLowerCase() === "true" &&
            /^\d{4,8}$/.test(tempCode),
        };
        const ready = Object.values(checks).every(Boolean);
        return Response.json(
          { ...checks, ready },
          {
            status: ready ? 200 : 503,
            headers: { "Cache-Control": "no-store" },
          },
        );
      },
    },
  },
});
