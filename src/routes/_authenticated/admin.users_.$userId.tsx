import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Building2, ShieldCheck, Trash2, TriangleAlert, MailWarning, Smartphone } from "lucide-react";
import { adminUserDetail, adminDeleteUser, adminUpdateUserPhone } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/users_/$userId")({
  component: AdminUserDetailPage,
});

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

function AdminUserDetailPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchDetail = useServerFn(adminUserDetail);
  const doDelete = useServerFn(adminDeleteUser);
  const doUpdatePhone = useServerFn(adminUpdateUserPhone);

  const q = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => fetchDetail({ data: { userId } }),
  });

  const [confirmEmail, setConfirmEmail] = useState("");
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneReason, setPhoneReason] = useState("");

  const savePhone = useMutation({
    mutationFn: () => doUpdatePhone({ data: { userId, phone: newPhone, reason: phoneReason } }),
    onSuccess: async () => {
      toast.success("Login mobile update ho gaya — user ko audit me dikh jayega");
      setNewPhone("");
      setPhoneReason("");
      await qc.invalidateQueries({ queryKey: ["admin-user", userId] });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: () => doDelete({ data: { userId, confirmEmail, reason } }),
    onSuccess: async () => {
      toast.success("User aur uska poora data delete ho gaya");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      await qc.invalidateQueries({ queryKey: ["admin-overview"] });
      navigate({ to: "/admin/users" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <Skeleton className="h-64 w-full" />;
  if (q.error) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;

  const d = q.data!;
  const u = d.user;
  type Mem = { role: string; company: { id: string; name: string } | null; isOwned: boolean };
  const clientBooks: Mem[] = (d.memberships as Mem[]).filter((m) => !m.isOwned);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/users">
          <ArrowLeft className="mr-1 h-4 w-4" /> Users
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg font-bold">{u.full_name ?? u.email}</h2>
              {d.isPlatformAdmin ? (
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> Platform admin
                </Badge>
              ) : null}
              {!u.email_confirmed_at ? (
                <Badge variant="outline" className="gap-1 text-amber-600">
                  <MailWarning className="h-3 w-3" /> Email unverified
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{u.email}</p>
            <div className="mt-2 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
              <span>Signup: {fmt(u.created_at)}</span>
              <span>Last sign-in: {fmt(u.last_sign_in_at)}</span>
              <span>Login method: {u.provider}</span>
              <span>Phone: {d.profile?.phone ?? u.phone ?? "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Invoices", d.usage.invoices],
          ["Purchases", d.usage.purchases],
          ["Parties", d.usage.parties],
          ["Products", d.usage.products],
          ["Expenses", d.usage.expenses],
          ["Invoiced value", inr(d.usage.revenue)],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-display text-lg font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4" /> Login mobile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Current: <span className="font-medium text-foreground">{d.profile?.phone ?? "—"}</span>. Naya number
            unique hona chahiye; change audit log me actor ke saath record hoga aur user ko Settings me dikhega.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Naya mobile number</Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Input
                placeholder="Kyun badal rahe hain"
                value={phoneReason}
                onChange={(e) => setPhoneReason(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={newPhone.length !== 10 || phoneReason.trim().length < 3 || savePhone.isPending}
            onClick={() => savePhone.mutate()}
          >
            Mobile update karein
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Companies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {d.companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Is user ne koi company setup nahi ki.</p>
          ) : (
            d.companies.map((c: { id: string; name: string; gstin: string | null; state: string | null }) => (
              <Link
                key={c.id}
                to="/admin/companies/$companyId"
                params={{ companyId: c.id }}
                className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.gstin ?? "GSTIN nahi"} · {c.state ?? "—"}
                </span>
              </Link>
            ))
          )}

          {clientBooks.length > 0 ? (
            <div className="pt-2">
              <div className="mb-1 text-xs font-medium text-muted-foreground">Client books (invited)</div>
              {clientBooks.map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>{m.company?.name ?? "—"}</span>
                  <Badge variant="outline">{m.role}</Badge>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {d.recentInvoices.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {d.recentInvoices.map((r) => (
              <div key={String(r.id)} className="flex items-center justify-between border-b py-2 last:border-0">
                <span className="font-medium">{String(r.invoice_number)}</span>
                <span className="text-xs text-muted-foreground">{String(r.invoice_date)}</span>
                <span>{inr(Number(r.total ?? 0))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {!d.isPlatformAdmin ? (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <TriangleAlert className="h-4 w-4" /> Danger zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              User ka account, uski saari companies, invoices, purchases, parties, products, expenses aur payments
              permanently delete ho jaayenge. Yeh undo nahi ho sakta.
            </p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete user & poora data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Permanently delete user?</DialogTitle>
                  <DialogDescription>
                    Confirm karne ke liye user ka email likhein aur reason batayein (audit log me save hoga).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Type email: {u.email}</Label>
                    <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={u.email ?? ""} />
                  </div>
                  <div className="space-y-1">
                    <Label>Reason</Label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Dummy / spam account" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={del.isPending || confirmEmail.trim().toLowerCase() !== (u.email ?? "").toLowerCase() || reason.trim().length < 3}
                    onClick={() => del.mutate()}
                  >
                    {del.isPending ? "Deleting..." : "Delete permanently"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
