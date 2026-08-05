import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TeamRole = "owner" | "accountant" | "staff";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(len = 6) {
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function assertRole(role: string): TeamRole {
  if (role !== "accountant" && role !== "staff" && role !== "owner") {
    throw new Error("Invalid role");
  }
  return role;
}

/** Owner-only guard using the caller's own RLS-scoped client. */
async function requireOwner(
  supabase: {
    rpc: (
      fn: "is_company_owner",
      args: { _company_id: string },
    ) => PromiseLike<{ data: boolean | null; error: unknown }>;
  },
  companyId: string,
) {
  const { data, error } = await supabase.rpc("is_company_owner", { _company_id: companyId });
  if (error) throw new Error("Permission check failed");
  if (data !== true) throw new Error("Sirf owner hi team manage kar sakta hai");
}

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: members, error } = await supabase
      .from("company_members")
      .select("id, user_id, role, created_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: invites } = await supabase
      .from("company_invites")
      .select("id, email, code, role, expires_at, accepted_at, revoked_at, created_at")
      .eq("company_id", data.companyId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    // Resolve emails/names for the member list
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = (members ?? []).map((m) => m.user_id);
    const emails: Record<string, string> = {};
    for (const id of ids) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
      if (u?.user?.email) emails[id] = u.user.email;
    }

    return {
      members: (members ?? []).map((m) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role as TeamRole,
        email: emails[m.user_id] ?? "—",
        joinedAt: m.created_at,
      })),
      invites: (invites ?? []).map((i) => ({
        id: i.id,
        email: i.email,
        code: i.code,
        role: i.role as TeamRole,
        expiresAt: i.expires_at,
      })),
    };
  });

export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; role: string; email?: string | null }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireOwner(supabase, data.companyId);
    const role = assertRole(data.role);
    if (role === "owner") throw new Error("Owner role invite nahi kar sakte");

    const email = data.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email theek nahi hai");

    let code = makeCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: row, error } = await supabase
        .from("company_invites")
        .insert({ company_id: data.companyId, role, email, code, invited_by: userId })
        .select("id, code, role, email, expires_at")
        .single();
      if (!error && row) return row;
      if (error && !error.message.includes("company_invites_code_key")) throw new Error(error.message);
      code = makeCode();
    }
    throw new Error("Invite banane mein dikkat hui, dobara koshish karein");
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { inviteId: string; companyId: string }) => input)
  .handler(async ({ data, context }) => {
    await requireOwner(context.supabase, data.companyId);
    const { error } = await context.supabase
      .from("company_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.inviteId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; memberId: string; role: string }) => input)
  .handler(async ({ data, context }) => {
    await requireOwner(context.supabase, data.companyId);
    const role = assertRole(data.role);
    const { error } = await context.supabase
      .from("company_members")
      .update({ role })
      .eq("id", data.memberId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; memberId: string }) => input)
  .handler(async ({ data, context }) => {
    await requireOwner(context.supabase, data.companyId);
    const { data: row } = await context.supabase
      .from("company_members")
      .select("role")
      .eq("id", data.memberId)
      .maybeSingle();
    if (row?.role === "owner") throw new Error("Owner ko remove nahi kar sakte");
    const { error } = await context.supabase
      .from("company_members")
      .delete()
      .eq("id", data.memberId)
      .eq("company_id", data.companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Look up an invite by code without joining — used to show a confirm screen. */
export const previewInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("company_invites")
      .select("id, role, expires_at, accepted_at, revoked_at, company_id, companies(name)")
      .eq("code", code)
      .maybeSingle();
    if (!invite) throw new Error("Ye code valid nahi hai");
    if (invite.revoked_at) throw new Error("Ye invite cancel kar diya gaya hai");
    if (invite.accepted_at) throw new Error("Ye invite pehle hi use ho chuka hai");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Ye invite expire ho gaya hai");
    return {
      companyName: (invite.companies as { name: string } | null)?.name ?? "Company",
      role: invite.role as TeamRole,
    };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => input)
  .handler(async ({ data, context }) => {
    const code = data.code.trim().toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite } = await supabaseAdmin
      .from("company_invites")
      .select("id, company_id, role, email, expires_at, accepted_at, revoked_at")
      .eq("code", code)
      .maybeSingle();
    if (!invite) throw new Error("Ye code valid nahi hai");
    if (invite.revoked_at) throw new Error("Ye invite cancel kar diya gaya hai");
    if (invite.accepted_at) throw new Error("Ye invite pehle hi use ho chuka hai");
    if (new Date(invite.expires_at) < new Date()) throw new Error("Ye invite expire ho gaya hai");

    // If the invite was addressed to a specific email, enforce it strictly.
    if (invite.email) {
      let callerEmail = (context.claims as { email?: string } | null)?.email?.toLowerCase() ?? null;
      if (!callerEmail) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
        callerEmail = u?.user?.email?.toLowerCase() ?? null;
      }
      if (!callerEmail || callerEmail !== invite.email.toLowerCase()) {
        throw new Error(`Ye invite ${invite.email} ke liye hai. Usi email se login karein.`);
      }
    }

    const { error: memberErr } = await supabaseAdmin
      .from("company_members")
      .upsert(
        { company_id: invite.company_id, user_id: context.userId, role: invite.role },
        { onConflict: "company_id,user_id" },
      );
    if (memberErr) throw new Error(memberErr.message);

    await supabaseAdmin
      .from("company_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: context.userId })
      .eq("id", invite.id);

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .eq("id", invite.company_id)
      .single();

    return { companyId: invite.company_id, companyName: company?.name ?? "Company", role: invite.role as TeamRole };
  });
