import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Platform (SaaS owner) admin API.
 *
 * Every function re-verifies platform-admin status server-side using the
 * CALLER's RLS-scoped client (`is_platform_admin()`), and only then loads the
 * privileged client. Never trust the UI for authorization.
 */

type CallerSupabase = {
  rpc: (fn: "is_platform_admin") => PromiseLike<{ data: boolean | null; error: unknown }>;
};

type Ctx = { supabase: CallerSupabase; userId: string; claims: unknown };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

/** Plain JSON row — server-fn return values must be serializable. */
type Row = Record<string, string | number | boolean | null>;


async function requireAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("is_platform_admin");
  if (error) throw new Error("Permission check failed");
  if (data !== true) throw new Error("Aapke paas admin panel ka access nahi hai");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = (context.claims as { email?: string } | null)?.email ?? null;
  // Cast: this module builds dynamic table queries; generated row types are not needed here.
  return { admin: supabaseAdmin as unknown as Admin, actorId: context.userId, actorEmail: email };
}

async function logAction(
  admin: Admin,
  actorId: string,
  actorEmail: string | null,
  action: string,
  target: { type?: string; id?: string; label?: string | null; reason?: string | null; details?: unknown },
) {
  await admin.from("admin_audit_log").insert({
    actor_id: actorId,
    actor_email: actorEmail,
    action,
    target_type: target.type ?? null,
    target_id: target.id ?? null,
    target_label: target.label ?? null,
    reason: target.reason ?? null,
    details: target.details ?? null,
  });
}

async function countOf(admin: Admin, table: string, column: string, value: string) {
  const { count } = await admin.from(table).select("id", { count: "exact", head: true }).eq(column, value);
  return count ?? 0;
}

async function listAuthUsers(admin: Admin) {
  const users: Array<{
    id: string;
    email: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    full_name: string | null;
    phone: string | null;
  }> = [];
  for (let page = 1; page <= 40; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const batch = data?.users ?? [];
    for (const u of batch) {
      users.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        full_name: (u.user_metadata?.full_name as string | undefined) ?? null,
        phone: u.phone ?? null,
      });
    }
    if (batch.length < 200) break;
  }
  return users;
}

/** Is the signed-in user a platform admin? Used to show/hide the Admin nav. */
export const amIPlatformAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context as unknown as Ctx).supabase.rpc("is_platform_admin");
    return { isAdmin: data === true };
  });

export const adminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await requireAdmin(context as unknown as Ctx);
    const users = await listAuthUsers(admin);

    const now = Date.now();
    const since = (days: number) => now - days * 86400000;
    const signedUp = (days: number) => users.filter((u) => new Date(u.created_at).getTime() >= since(days)).length;
    const activeSince = (days: number) =>
      users.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() >= since(days)).length;

    const [companies, invoices, purchases, parties, products] = await Promise.all([
      admin.from("companies").select("id", { count: "exact", head: true }),
      admin.from("invoices").select("id", { count: "exact", head: true }),
      admin.from("purchases").select("id", { count: "exact", head: true }),
      admin.from("parties").select("id", { count: "exact", head: true }),
      admin.from("products").select("id", { count: "exact", head: true }),
    ]);

    const { data: invTotals } = await admin.from("invoices").select("total");
    const gmv = (invTotals ?? []).reduce((s: number, r: { total: number }) => s + Number(r.total ?? 0), 0);

    // Signup trend: last 14 days
    const trend: Array<{ date: string; count: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      trend.push({
        date: key,
        count: users.filter((u) => u.created_at.slice(0, 10) === key).length,
      });
    }

    return {
      users: {
        total: users.length,
        today: signedUp(1),
        week: signedUp(7),
        month: signedUp(30),
        verified: users.filter((u) => u.email_confirmed_at).length,
        unverified: users.filter((u) => !u.email_confirmed_at).length,
        active7: activeSince(7),
      },
      counts: {
        companies: companies.count ?? 0,
        invoices: invoices.count ?? 0,
        purchases: purchases.count ?? 0,
        parties: parties.count ?? 0,
        products: products.count ?? 0,
      },
      gmv,
      trend,
    };
  });

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await requireAdmin(context as unknown as Ctx);
    const users = await listAuthUsers(admin);

    const [{ data: companies }, { data: members }, { data: invoices }, { data: admins }] = await Promise.all([
      admin.from("companies").select("id, name, owner_id, gstin, state, created_at"),
      admin.from("company_members").select("company_id, user_id, role"),
      admin.from("invoices").select("id, company_id"),
      admin.from("platform_admins").select("user_id"),
    ]);

    const adminIds = new Set((admins ?? []).map((a: { user_id: string }) => a.user_id));
    const invByCompany = new Map<string, number>();
    for (const i of invoices ?? []) {
      invByCompany.set(i.company_id, (invByCompany.get(i.company_id) ?? 0) + 1);
    }

    return {
      users: users
        .map((u) => {
          const owned = (companies ?? []).filter((c: { owner_id: string }) => c.owner_id === u.id);
          const memberships = (members ?? []).filter((m: { user_id: string }) => m.user_id === u.id);
          return {
            ...u,
            isPlatformAdmin: adminIds.has(u.id),
            companiesOwned: owned.length,
            companyNames: owned.map((c: { name: string }) => c.name) as string[],
            memberships: memberships.length,
            invoices: owned.reduce((s: number, c: { id: string }) => s + (invByCompany.get(c.id) ?? 0), 0),
          };
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  });

export const adminUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId) throw new Error("userId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { admin } = await requireAdmin(context as unknown as Ctx);

    const { data: authRes, error } = await admin.auth.admin.getUserById(data.userId);
    if (error) throw new Error(error.message);
    const u = authRes?.user;
    if (!u) throw new Error("User nahi mila");

    const [{ data: profile }, { data: owned }, { data: memberships }, { data: isAdminRow }] = await Promise.all([
      admin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      admin.from("companies").select("*").eq("owner_id", data.userId).order("created_at"),
      admin
        .from("company_members")
        .select("role, company:companies(id, name, owner_id)")
        .eq("user_id", data.userId),
      admin.from("platform_admins").select("user_id, is_super").eq("user_id", data.userId).maybeSingle(),
    ]);

    const companyIds = (owned ?? []).map((c: { id: string }) => c.id);
    const usage = { invoices: 0, purchases: 0, parties: 0, products: 0, expenses: 0, payments: 0, revenue: 0 };
    let recentInvoices: Row[] = [];

    if (companyIds.length) {
      const tally = async (table: string) => {
        const { count } = await admin.from(table).select("id", { count: "exact", head: true }).in("company_id", companyIds);
        return count ?? 0;
      };
      const [inv, pur, par, pro, exp, pay] = await Promise.all([
        tally("invoices"),
        tally("purchases"),
        tally("parties"),
        tally("products"),
        tally("expenses"),
        tally("payments"),
      ]);
      usage.invoices = inv;
      usage.purchases = pur;
      usage.parties = par;
      usage.products = pro;
      usage.expenses = exp;
      usage.payments = pay;

      const { data: totals } = await admin.from("invoices").select("total").in("company_id", companyIds);
      usage.revenue = (totals ?? []).reduce((s: number, r: { total: number }) => s + Number(r.total ?? 0), 0);

      const { data: recent } = await admin
        .from("invoices")
        .select("id, invoice_number, invoice_date, total, status, company_id")
        .in("company_id", companyIds)
        .order("created_at", { ascending: false })
        .limit(10);
      recentInvoices = recent ?? [];
    }

    return {
      user: {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        email_confirmed_at: u.email_confirmed_at ?? null,
        phone: u.phone ?? null,
        provider: (u.app_metadata?.provider as string | undefined) ?? "email",
        full_name: (u.user_metadata?.full_name as string | undefined) ?? null,
      },
      profile: profile ?? null,
      isPlatformAdmin: !!isAdminRow,
      companies: owned ?? [],
      memberships: (memberships ?? []).map((m: { role: string; company: { id: string; name: string; owner_id: string } | null }) => ({
        role: m.role,
        company: m.company,
        isOwned: m.company?.owner_id === data.userId,
      })),
      usage,
      recentInvoices,
    };
  });

export const adminListCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await requireAdmin(context as unknown as Ctx);
    const [{ data: companies }, { data: invoices }, { data: members }] = await Promise.all([
      admin.from("companies").select("*").order("created_at", { ascending: false }),
      admin.from("invoices").select("company_id, total"),
      admin.from("company_members").select("company_id"),
    ]);

    const users = await listAuthUsers(admin);
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    const stats = new Map<string, { invoices: number; revenue: number }>();
    for (const i of invoices ?? []) {
      const s = stats.get(i.company_id) ?? { invoices: 0, revenue: 0 };
      s.invoices += 1;
      s.revenue += Number(i.total ?? 0);
      stats.set(i.company_id, s);
    }
    const memberCount = new Map<string, number>();
    for (const m of members ?? []) memberCount.set(m.company_id, (memberCount.get(m.company_id) ?? 0) + 1);

    return {
      companies: (companies ?? []).map((c: { id: string; owner_id: string }) => ({
        ...c,
        ownerEmail: emailById.get(c.owner_id) ?? null,
        invoices: stats.get(c.id)?.invoices ?? 0,
        revenue: stats.get(c.id)?.revenue ?? 0,
        members: memberCount.get(c.id) ?? 0,
      })),
    };
  });

export const adminCompanyDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string }) => {
    if (!input?.companyId) throw new Error("companyId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { admin } = await requireAdmin(context as unknown as Ctx);
    const id = data.companyId;

    const { data: company } = await admin.from("companies").select("*").eq("id", id).maybeSingle();
    if (!company) throw new Error("Company nahi mili");

    const [invoices, purchases, parties, products, expenses] = await Promise.all([
      countOf(admin, "invoices", "company_id", id),
      countOf(admin, "purchases", "company_id", id),
      countOf(admin, "parties", "company_id", id),
      countOf(admin, "products", "company_id", id),
      countOf(admin, "expenses", "company_id", id),
    ]);

    const [{ data: invTotals }, { data: recent }, { data: members }] = await Promise.all([
      admin.from("invoices").select("total, cgst, sgst, igst").eq("company_id", id),
      admin
        .from("invoices")
        .select("id, invoice_number, invoice_date, total, status")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      admin.from("company_members").select("user_id, role").eq("company_id", id),
    ]);

    const users = await listAuthUsers(admin);
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    const revenue = (invTotals ?? []).reduce((s: number, r: { total: number }) => s + Number(r.total ?? 0), 0);
    const gst = (invTotals ?? []).reduce(
      (s: number, r: { cgst: number; sgst: number; igst: number }) =>
        s + Number(r.cgst ?? 0) + Number(r.sgst ?? 0) + Number(r.igst ?? 0),
      0,
    );

    return {
      company,
      ownerEmail: emailById.get(company.owner_id) ?? null,
      counts: { invoices, purchases, parties, products, expenses },
      revenue,
      gst,
      recentInvoices: recent ?? [],
      members: (members ?? []).map((m: { user_id: string; role: string }) => ({
        ...m,
        email: emailById.get(m.user_id) ?? null,
      })),
    };
  });

/** Delete a company and every row that belongs to it. */
async function purgeCompany(admin: Admin, companyId: string) {
  const { data: invoices } = await admin.from("invoices").select("id").eq("company_id", companyId);
  const invoiceIds = (invoices ?? []).map((i: { id: string }) => i.id);
  if (invoiceIds.length) await admin.from("invoice_items").delete().in("invoice_id", invoiceIds);

  const { data: purchases } = await admin.from("purchases").select("id").eq("company_id", companyId);
  const purchaseIds = (purchases ?? []).map((p: { id: string }) => p.id);
  if (purchaseIds.length) await admin.from("purchase_items").delete().in("purchase_id", purchaseIds);

  for (const table of ["payments", "invoices", "purchases", "expenses", "products", "parties", "company_invites", "company_members"]) {
    const { error } = await admin.from(table).delete().eq("company_id", companyId);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  const { error } = await admin.from("companies").delete().eq("id", companyId);
  if (error) throw new Error(`companies: ${error.message}`);
}

export const adminDeleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { companyId: string; reason: string }) => {
    if (!input?.companyId) throw new Error("companyId required");
    if (!input.reason || input.reason.trim().length < 3) throw new Error("Reason likhna zaroori hai");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { admin, actorId, actorEmail } = await requireAdmin(context as unknown as Ctx);
    const { data: company } = await admin.from("companies").select("name").eq("id", data.companyId).maybeSingle();
    await purgeCompany(admin, data.companyId);
    await logAction(admin, actorId, actorEmail, "delete_company", {
      type: "company",
      id: data.companyId,
      label: company?.name ?? null,
      reason: data.reason,
    });
    return { ok: true };
  });

/** Hard-delete a user: all owned companies + their data, memberships, profile, auth account. */
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; confirmEmail: string; reason: string }) => {
    if (!input?.userId) throw new Error("userId required");
    if (!input.confirmEmail) throw new Error("Confirm email required");
    if (!input.reason || input.reason.trim().length < 3) throw new Error("Reason likhna zaroori hai");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { admin, actorId, actorEmail } = await requireAdmin(context as unknown as Ctx);

    if (data.userId === actorId) throw new Error("Apna hi account admin panel se delete nahi kar sakte");

    const { data: isAdminRow } = await admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (isAdminRow) throw new Error("Platform admin ko delete nahi kiya ja sakta");

    const { data: authRes, error: authErr } = await admin.auth.admin.getUserById(data.userId);
    if (authErr) throw new Error(authErr.message);
    const target = authRes?.user;
    if (!target) throw new Error("User nahi mila");
    if ((target.email ?? "").toLowerCase() !== data.confirmEmail.trim().toLowerCase()) {
      throw new Error("Confirm email match nahi hua");
    }

    const { data: owned } = await admin.from("companies").select("id, name").eq("owner_id", data.userId);
    const purged: string[] = [];
    for (const c of owned ?? []) {
      await purgeCompany(admin, c.id);
      purged.push(c.name);
    }

    await admin.from("company_members").delete().eq("user_id", data.userId);
    await admin.from("profiles").delete().eq("id", data.userId);

    const { error: delErr } = await admin.auth.admin.deleteUser(data.userId);
    if (delErr) throw new Error(delErr.message);

    await logAction(admin, actorId, actorEmail, "delete_user", {
      type: "user",
      id: data.userId,
      label: target.email ?? null,
      reason: data.reason,
      details: { companiesPurged: purged },
    });

    return { ok: true, companiesPurged: purged };
  });

/**
 * Platform admin fix for a user's login mobile. Number stays unique, the
 * owner_phone snapshot on his companies follows, and the change is written to
 * the audit log so the user can also see it in Settings.
 */
export const adminUpdateUserPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; phone: string; reason: string }) => {
    const userId = String(input?.userId ?? "");
    const phone = String(input?.phone ?? "").replace(/\D/g, "").slice(-10);
    const reason = String(input?.reason ?? "").trim();
    if (!userId) throw new Error("userId required");
    if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("Sahi 10-digit mobile number daalein");
    if (reason.length < 3) throw new Error("Reason likhna zaroori hai");
    return { userId, phone, reason };
  })
  .handler(async ({ data, context }) => {
    const { admin, actorId, actorEmail } = await requireAdmin(context as unknown as Ctx);

    const { data: clash } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (clash && clash.id !== data.userId) {
      throw new Error("Ye mobile number kisi doosre account par register hai");
    }

    const { data: before } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", data.userId)
      .maybeSingle();

    const { error } = await admin
      .from("profiles")
      .update({ phone: data.phone, phone_verified_at: new Date().toISOString() })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    await admin.from("companies").update({ owner_phone: data.phone }).eq("owner_id", data.userId);

    await logAction(admin, actorId, actorEmail, "update_user_phone", {
      type: "user",
      id: data.userId,
      label: data.phone,
      reason: data.reason,
      details: { from: before?.phone ?? null, to: data.phone },
    });

    return { ok: true, phone: data.phone };
  });

/** Audit entries about the signed-in user himself (admin actions on his account). */
export const myAccountAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("admin_audit_log")
      .select("id, action, actor_email, reason, details, created_at")
      .eq("target_type", "user")
      .eq("target_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { entries: data ?? [] };
  });

export const adminAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin } = await requireAdmin(context as unknown as Ctx);
    const { data } = await admin
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return { entries: data ?? [] };
  });
