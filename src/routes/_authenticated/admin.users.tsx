import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, ShieldCheck, Eye, MailWarning } from "lucide-react";
import { adminListUsers } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsersPage,
});

const PAGE_SIZE = 25;
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

type Filter = "all" | "verified" | "unverified" | "no_company";
type Sort = "newest" | "oldest" | "active" | "invoices";

function AdminUsersPage() {
  const fetchUsers = useServerFn(adminListUsers);
  const q = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    let list = q.data?.users ?? [];
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(s) ||
          (u.full_name ?? "").toLowerCase().includes(s) ||
          u.companyNames.some((n) => n.toLowerCase().includes(s)),
      );
    }
    if (filter === "verified") list = list.filter((u) => u.email_confirmed_at);
    if (filter === "unverified") list = list.filter((u) => !u.email_confirmed_at);
    if (filter === "no_company") list = list.filter((u) => u.companiesOwned === 0);

    const sorted = [...list];
    if (sort === "newest") sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (sort === "oldest") sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sort === "active") sorted.sort((a, b) => (b.last_sign_in_at ?? "").localeCompare(a.last_sign_in_at ?? ""));
    if (sort === "invoices") sorted.sort((a, b) => b.invoices - a.invoices);
    return sorted;
  }, [q.data, search, filter, sort]);

  const pageRows = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  if (q.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Email, naam ya company se search karein"
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => { setFilter(v as Filter); setPage(0); }}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sab users</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="no_company">Company nahi banayi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest signup</SelectItem>
            <SelectItem value="oldest">Oldest signup</SelectItem>
            <SelectItem value="active">Last active</SelectItem>
            <SelectItem value="invoices">Most invoices</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{rows.length} users</p>

      {rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Koi user nahi mila.</CardContent></Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Signed up</th>
                  <th className="p-3">Last active</th>
                  <th className="p-3">Companies</th>
                  <th className="p-3 text-right">Invoices</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{u.full_name ?? u.email ?? u.id}</div>
                          <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                        </div>
                        {u.isPlatformAdmin ? (
                          <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />Admin</Badge>
                        ) : null}
                        {!u.email_confirmed_at ? (
                          <Badge variant="outline" className="gap-1 text-amber-600"><MailWarning className="h-3 w-3" />Unverified</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">{fmt(u.created_at)}</td>
                    <td className="p-3 whitespace-nowrap">{fmt(u.last_sign_in_at)}</td>
                    <td className="p-3">
                      {u.companiesOwned === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="truncate">{u.companyNames.join(", ")}</span>
                      )}
                    </td>
                    <td className="p-3 text-right">{u.invoices}</td>
                    <td className="p-3 text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/admin/users/$userId" params={{ userId: u.id }}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {pageRows.map((u) => (
              <Card key={u.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{u.full_name ?? u.email}</div>
                      <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    {u.isPlatformAdmin ? <Badge variant="secondary">Admin</Badge> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>Signup: {fmt(u.created_at)}</span>
                    <span>Active: {fmt(u.last_sign_in_at)}</span>
                    <span>Companies: {u.companiesOwned}</span>
                    <span>Invoices: {u.invoices}</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to="/admin/users/$userId" params={{ userId: u.id }}>View details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {pages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-muted-foreground">
                Page {page + 1} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
