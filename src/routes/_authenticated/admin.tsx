import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, ShieldCheck, Users, Building2, ScrollText, LayoutDashboard } from "lucide-react";
import { amIPlatformAdmin } from "@/lib/admin.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Platform Admin — GST Munshi" },
      { name: "description", content: "Users, companies aur platform usage manage karein." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users, exact: false },
  { to: "/admin/companies", label: "Companies", icon: Building2, exact: false },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText, exact: false },
] as const;

export function useIsPlatformAdmin() {
  const check = useServerFn(amIPlatformAdmin);
  return useQuery({
    queryKey: ["platform-admin"],
    queryFn: () => check(),
    staleTime: 5 * 60_000,
  });
}

function AdminLayout() {
  const q = useIsPlatformAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!q.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-bold">Access nahi hai</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Yeh platform admin area hai. Aapke account ko iska access nahi diya gaya hai.
        </p>
        <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium text-primary underline">
          Dashboard par jaayein
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold sm:text-2xl">Platform Admin</h1>
          <p className="text-sm text-muted-foreground">Users, companies aur platform usage.</p>
        </div>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />
    </div>
  );
}
