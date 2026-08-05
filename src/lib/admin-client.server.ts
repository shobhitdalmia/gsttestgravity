/**
 * Optional service-role client.
 *
 * The admin client throws when SUPABASE_SERVICE_ROLE_KEY is not bound on the
 * host (self-host / Vercel / a broken binding). Flows that only degrade in
 * that case use this helper so the user sees a friendly message instead of a
 * raw environment-variable error.
 */
export type SupabaseAdmin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export async function tryAdminClient(): Promise<SupabaseAdmin | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Touching a property forces the lazy proxy to construct the client.
    void supabaseAdmin.auth;
    return supabaseAdmin;
  } catch (error) {
    console.error(
      "[supabaseAdmin] unavailable:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
