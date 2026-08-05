import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Boxes, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatINR, formatNumber, GST_RATES } from "@/lib/gst";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Inventory — GST Munshi" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const company = useCurrentCompany();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const products = useQuery({
    enabled: !!company.data?.id,
    queryKey: ["products", company.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", company.data!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (products.data ?? []).filter(
    (p) => p.name.toLowerCase().includes(q.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Products, services aur stock manage karein.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Item</Button>
          </DialogTrigger>
          <ProductDialog
            companyId={company.data?.id}
            onDone={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["products"] });
            }}
          />
        </Dialog>
      </div>

      <div className="card-surface p-4">
        <div className="relative mb-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              <Boxes className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Koi item nahi. Pehla product add karein!</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead className="text-right">Sale Price</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const low = Number(p.stock_quantity) <= Number(p.low_stock_threshold ?? 0);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.sku ? `SKU: ${p.sku}` : p.is_service ? "Service" : ""}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.hsn_code ?? "—"}</TableCell>
                    <TableCell className="text-right">{formatINR(p.sale_price)}</TableCell>
                    <TableCell className="text-right">{p.gst_rate}%</TableCell>
                    <TableCell className="text-right">
                      {p.is_service ? (
                        <Badge variant="secondary">Service</Badge>
                      ) : (
                        <span className={low ? "text-warning-foreground font-semibold flex items-center gap-1 justify-end" : ""}>
                          {low && <AlertTriangle className="h-3 w-3" />}
                          {formatNumber(p.stock_quantity)} {p.unit}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function ProductDialog({ companyId, onDone }: { companyId?: string; onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    sku: "",
    hsn_code: "",
    unit: "PCS",
    sale_price: "0",
    purchase_price: "0",
    gst_rate: "18",
    stock_quantity: "0",
    low_stock_threshold: "5",
    is_service: false,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!companyId || !form.name.trim()) return toast.error("Name required");
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      company_id: companyId,
      name: form.name.trim(),
      sku: form.sku || null,
      hsn_code: form.hsn_code || null,
      unit: form.unit,
      sale_price: Number(form.sale_price) || 0,
      purchase_price: Number(form.purchase_price) || 0,
      gst_rate: Number(form.gst_rate),
      stock_quantity: form.is_service ? 0 : Number(form.stock_quantity),
      low_stock_threshold: Number(form.low_stock_threshold),
      is_service: form.is_service,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Item added!");
    onDone();
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Add Item</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>SKU / Code</Label>
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <div className="text-sm font-medium">Service item</div>
            <div className="text-xs text-muted-foreground">Stock track nahi hoga</div>
          </div>
          <Switch checked={form.is_service} onCheckedChange={(v) => setForm({ ...form, is_service: v })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>HSN/SAC</Label>
            <Input value={form.hsn_code} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} />
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["PCS", "KG", "GM", "LTR", "BOX", "MTR", "SET", "DOZ", "NOS"].map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>GST %</Label>
            <Select value={form.gst_rate} onValueChange={(v) => setForm({ ...form, gst_rate: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GST_RATES.map((g) => <SelectItem key={g} value={String(g)}>{g}%</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Sale Price</Label>
            <Input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
          </div>
          <div>
            <Label>Purchase Price</Label>
            <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
          </div>
        </div>
        {!form.is_service && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Opening Stock</Label>
              <Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
            </div>
            <div>
              <Label>Low Stock Alert</Label>
              <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>Save Item</Button>
      </DialogFooter>
    </DialogContent>
  );
}
