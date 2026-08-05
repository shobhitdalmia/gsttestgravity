import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Receipt,
  ShoppingBag,
  Boxes,
  Users,
  Wallet,
  FileBarChart2,
  BookOpen,
  Settings,
  LogOut,
  Plus,
  Menu,
  Check,
  ChevronsUpDown,
  KeyRound,
  ShieldCheck,
  Search,
  Bell,
  LifeBuoy,
  Crown,
  IndianRupee,
  HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCurrentMembership,
  setActiveCompanyId,
  clearTenantStorage,
  ROLE_LABEL,
  canManageBooks,
} from "@/lib/company";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { FYSwitcher } from "@/components/FYSwitcher";
import { setFinancialYear, currentFYStartYear } from "@/lib/fy";
import { useMemo, useState } from "react";
import { CompanySetupDialog } from "@/components/onboarding/CompanySetupDialog";
import { useIsPlatformAdmin } from "./admin";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, books: false, tone: "var(--kpi-blue)" },
  { to: "/sales", label: "Sales", icon: Receipt, books: false, tone: "var(--kpi-emerald)" },
  { to: "/purchases", label: "Purchase", icon: ShoppingBag, books: true, tone: "var(--kpi-purple)" },
  { to: "/payments", label: "Receipts & Payments", icon: HandCoins, books: true, tone: "var(--kpi-emerald)" },
  { to: "/products", label: "Inventory", icon: Boxes, books: false, tone: "var(--kpi-violet)" },
  { to: "/parties", label: "Parties", icon: Users, books: false, tone: "var(--kpi-cyan)" },
  { to: "/expenses", label: "Expenses", icon: Wallet, books: true, tone: "var(--kpi-red)" },
  { to: "/accounting", label: "Accounting", icon: BookOpen, books: true, tone: "var(--kpi-indigo)" },
  { to: "/reports", label: "Reports", icon: FileBarChart2, books: true, tone: "var(--kpi-orange)" },
  { to: "/team", label: "Team & CA", icon: KeyRound, books: true, tone: "var(--kpi-teal)" },
  { to: "/settings", label: "Settings", icon: Settings, books: false, tone: "var(--kpi-slate)" },
] as const;

function Shell() {
  const { user } = Route.useRouteContext() as { user: { email?: string } };
  const { membership, companies, isLoading, isSuccess } = useCurrentMembership();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const adminCheck = useIsPlatformAdmin();
  const isAdmin = !!adminCheck.data?.isAdmin;

  const role = membership?.role ?? null;
  const nav = NAV.filter((n) => !n.books || canManageBooks(role));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nav.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 5);
  }, [query, nav]);

  // Mandatory onboarding: no company yet → nothing else in the app is reachable.
  // Platform admins may have no company of their own — the admin area must stay reachable.
  // `isSuccess` matters: signing out clears the query cache, which would
  // otherwise look like "fetched, zero companies" and flash onboarding.
  const needsSetup =
    !signingOut &&
    !isLoading &&
    isSuccess &&
    companies.length === 0 &&
    pathname !== "/join" &&
    !pathname.startsWith("/admin");

  async function signOut() {
    setSigningOut(true);
    await qc.cancelQueries();
    clearTenantStorage();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
    qc.clear();
  }

  async function switchCompany(id: string) {
    const target = companies.find((m) => m.company.id === id);
    setActiveCompanyId(id);
    setFinancialYear(id, currentFYStartYear());
    setMobileOpen(false);
    await qc.invalidateQueries();
    navigate({ to: "/dashboard" });
    if (target) {
      toast.success(`Ab aap ${target.company.name} ki books me kaam kar rahe hain`);
    }
  }

  const navPill = (active: boolean) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
      active
        ? "bg-primary/10 text-primary"
        : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
    }`;

  const SidebarInner = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--kpi-emerald) 0%, var(--kpi-teal) 100%)" }}
        >
          <IndianRupee className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-[17px] font-extrabold leading-tight text-sidebar-foreground">
            GST Munshi
          </div>
          <div className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Sahi hisab, pakka vishwas
          </div>
        </div>
      </div>

      <div className="mx-3 mb-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-2 text-left text-xs transition hover:opacity-90">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-muted-foreground">
                    {membership && !membership.isOwned ? "Client books" : "Company"}
                    {role ? ` · ${ROLE_LABEL[role]}` : ""}
                  </div>
                  <div className="truncate font-semibold text-sidebar-foreground">
                    {membership?.company.name ?? "Loading..."}
                  </div>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Switch company</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {companies.map((m) => (
              <DropdownMenuItem key={m.company.id} onClick={() => switchCompany(m.company.id)}>
                <div className="flex w-full items-center gap-2">
                  <Check
                    className={`h-4 w-4 shrink-0 ${
                      m.company.id === membership?.company.id ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{m.company.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.isOwned ? "My business" : "Client books"} · {ROLE_LABEL[m.role]}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setMobileOpen(false); navigate({ to: "/join" }); }}>
              <KeyRound className="h-4 w-4 mr-2" /> Join with invite code
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-3 mb-3">
        <FYSwitcher companyId={membership?.company.id} onSelected={() => setMobileOpen(false)} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {nav.map((n) => {
          const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
          return (
            <Link key={n.to} to={n.to} onClick={() => setMobileOpen(false)} className={navPill(active)}>
              <n.icon className="h-[18px] w-[18px] shrink-0" style={{ color: active ? n.tone : undefined }} />
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}

        {isAdmin ? (
          <Link
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={navPill(pathname.startsWith("/admin"))}
          >
            <ShieldCheck className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">Admin Panel</span>
          </Link>
        ) : null}
      </nav>

      <div className="space-y-2 p-3">
        <Link to="/sales/new" onClick={() => setMobileOpen(false)}>
          <Button className="w-full gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </Link>

        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-sidebar-foreground">
            <Crown className="h-4 w-4" style={{ color: "var(--kpi-yellow)" }} /> Free plan
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Unlimited invoices ke liye Pro plan par upgrade karein.
          </p>
          <Link to="/settings" onClick={() => setMobileOpen(false)}>
            <Button size="sm" variant="secondary" className="mt-2 w-full">
              Upgrade
            </Button>
          </Link>
        </div>

        <Link
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-sidebar-accent"
        >
          <LifeBuoy className="h-4 w-4" /> Help &amp; Support
        </Link>
      </div>
    </>
  );

  if (needsSetup) {
    return (
      <div className="min-h-screen bg-background">
        <CompanySetupDialog userEmail={user?.email ?? null} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {SidebarInner}
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[268px] border-sidebar-border bg-sidebar p-0">
          <div className="flex h-full flex-col">{SidebarInner}</div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/80 px-3 backdrop-blur sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            <div className="relative min-w-0 flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && matches[0]) {
                    navigate({ to: matches[0].to });
                    setQuery("");
                  }
                  if (e.key === "Escape") setQuery("");
                }}
                placeholder="Search anything..."
                aria-label="Search modules"
                className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
              {matches.length ? (
                <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                  {matches.map((m) => (
                    <button
                      key={m.to}
                      onClick={() => {
                        navigate({ to: m.to });
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <m.icon className="h-4 w-4 shrink-0" style={{ color: m.tone }} />
                      {m.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              onClick={() => navigate({ to: "/dashboard" })}
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
            </Button>
            <div className="hidden lg:block">
              <FYSwitcher companyId={membership?.company.id} variant="compact" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 px-1.5 sm:px-2">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {(user.email ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="hidden min-w-0 text-left sm:block">
                    <div className="truncate text-xs font-semibold">{user.email}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {role ? ROLE_LABEL[role] : "User"}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
