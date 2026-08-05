import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Users } from "lucide-react";
import { INDIAN_STATES, formatINR } from "@/lib/gst";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/parties")({
  head: () => ({ meta: [{ title: "Parties — GST Munshi" }] }),
  component: PartiesPage,
});

function PartiesPage() {
  const company = useCurrentCompany();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const parties = useQuery({
    enabled: !!company.data?.id,
    queryKey: ["parties", company.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .eq("company_id", company.data!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (parties.data ?? []).filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) || (p.phone ?? "").includes(q),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Parties</h1>
          <p className="text-sm text-muted-foreground">Customers aur Suppliers ek jagah.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Party</Button>
          </DialogTrigger>
          <PartyDialog
            companyId={company.data?.id}
            onDone={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["parties"] });
            }}
          />
        </Dialog>
      </div>

      <div className="card-surface p-4">
        <div className="relative mb-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Koi party nahi mila. Pehla add karein!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Opening Bal.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Badge variant={p.type === "supplier" ? "secondary" : "default"} className="capitalize">
                      {p.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.gstin ?? "—"}</TableCell>
                  <TableCell>{p.phone ?? "—"}</TableCell>
                  <TableCell>{p.state ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatINR(p.opening_balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function PartyDialog({ companyId, onDone }: { companyId?: string; onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    type: "customer" as "customer" | "supplier" | "both",
    gstin: "",
    phone: "",
    email: "",
    state_code: "",
    billing_address: "",
    opening_balance: "0",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!companyId || !form.name.trim()) return toast.error("Name required");
    setSaving(true);
    const state = INDIAN_STATES.find((s) => s.code === form.state_code);
    const { error } = await supabase.from("parties").insert({
      company_id: companyId,
      name: form.name.trim(),
      type: form.type,
      gstin: form.gstin || null,
      phone: form.phone || null,
      email: form.email || null,
      state_code: form.state_code || null,
      state: state?.name ?? null,
      billing_address: form.billing_address || null,
      opening_balance: Number(form.opening_balance) || 0,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Party added!");
    onDone();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Party</DialogTitle>
      </DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>GSTIN</Label>
            <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} maxLength={15} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>State</Label>
            <Select value={form.state_code} onValueChange={(v) => setForm({ ...form, state_code: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Opening Balance</Label>
            <Input type="number" value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Billing Address</Label>
          <Textarea rows={2} value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>Save Party</Button>
      </DialogFooter>
    </DialogContent>
  );
}
