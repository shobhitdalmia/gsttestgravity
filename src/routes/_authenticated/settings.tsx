import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCurrentCompany } from "@/lib/company";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { INDIAN_STATES } from "@/lib/gst";
import { Building2, Landmark, FileText, ImagePlus, Trash2, Save, History, Briefcase } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { myAccountAuditLog } from "@/lib/admin.functions";
import { BusinessSetup } from "@/components/settings/BusinessSetup";

/** Admin actions taken on this account — user ko transparency ke liye dikhta hai. */
function AccountAuditCard() {
  const fetchLog = useServerFn(myAccountAuditLog);
  const q = useQuery({ queryKey: ["my-account-audit"], queryFn: () => fetchLog({}) });
  const entries = q.data?.entries ?? [];
  if (q.isLoading || entries.length === 0) return null;
  return (
    <section className="card-surface p-4 md:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <History className="h-5 w-5 text-primary" /> Aapke account par admin activity
      </h2>
      <ul className="space-y-2 text-sm">
        {entries.map((e) => (
          <li key={e.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{e.action.replace(/_/g, " ")}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {e.actor_email ? `By ${e.actor_email}` : "By GST Munshi team"}
              {e.reason ? ` — ${e.reason}` : ""}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Company Settings — GST Munshi" },
      { name: "description", content: "Company, GST, bank and invoice print settings for your books." },
      { property: "og:title", content: "Company Settings — GST Munshi" },
      { property: "og:description", content: "Company, GST, bank and invoice print settings for your books." },
    ],
  }),
  component: SettingsPage,
});

const DEFAULT_TERMS = `E.& O.E.
1. Goods once sold will not be taken back.
2. Interest @ 24% p.a. will be charged if the payment is not made with in the stipulated time.
3. Subject to Jurisdiction only.`;

/** Downscale an image file to a small PNG data URL so it can be stored inline. */
async function toLogoDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Invalid image"));
    i.src = dataUrl;
  });
  const maxW = 320;
  const scale = Math.min(1, maxW / img.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function SettingsPage() {
  const company = useCurrentCompany();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    legal_name: "",
    gstin: "",
    pan: "",
    state_code: "",
    address: "",
    city: "",
    pincode: "",
    phone: "",
    email: "",
    invoice_prefix: "INV",
    logo_url: "",
    bank_name: "",
    bank_account_no: "",
    bank_ifsc: "",
    bank_branch: "",
    jurisdiction: "",
    default_terms: "",
    default_transport: "",
  });
  const [saving, setSaving] = useState(false);
  const [mainTab, setMainTab] = useState<"company" | "business">("company");

  useEffect(() => {
    const c = company.data;
    if (!c) return;
    setForm({
      name: c.name ?? "",
      legal_name: c.legal_name ?? "",
      gstin: c.gstin ?? "",
      pan: c.pan ?? "",
      state_code: c.state_code ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      pincode: c.pincode ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      invoice_prefix: c.invoice_prefix ?? "INV",
      logo_url: c.logo_url ?? "",
      bank_name: c.bank_name ?? "",
      bank_account_no: c.bank_account_no ?? "",
      bank_ifsc: c.bank_ifsc ?? "",
      bank_branch: c.bank_branch ?? "",
      jurisdiction: c.jurisdiction ?? "",
      default_terms: c.default_terms ?? "",
      default_transport: c.default_transport ?? "",
    });
  }, [company.data]);

  async function pickLogo(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Image file chunein");
    if (file.size > 5 * 1024 * 1024) return toast.error("Logo 5MB se chhota hona chahiye");
    try {
      const url = await toLogoDataUrl(file);
      setForm((f) => ({ ...f, logo_url: url }));
      toast.success("Logo ready — Save Settings dabaayein");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function save() {
    if (!company.data) return;
    setSaving(true);
    const state = INDIAN_STATES.find((s) => s.code === form.state_code);
    const { error } = await supabase
      .from("companies")
      .update({
        ...form,
        logo_url: form.logo_url || null,
        bank_name: form.bank_name || null,
        bank_account_no: form.bank_account_no || null,
        bank_ifsc: form.bank_ifsc || null,
        bank_branch: form.bank_branch || null,
        jurisdiction: form.jurisdiction || null,
        default_terms: form.default_terms || null,
        default_transport: form.default_transport || null,
        state: state?.name ?? null,
      })
      .eq("id", company.data.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Company details saved!");
    qc.invalidateQueries({ queryKey: ["current-company"] });
    qc.invalidateQueries({ queryKey: ["memberships"] });
  }

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Company details, invoice print aur business setup (accounts &amp; account groups) — sab ek jagah.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border p-1">
        <button
          onClick={() => setMainTab("company")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mainTab === "company" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Building2 className="h-4 w-4" /> Company
        </button>
        <button
          onClick={() => setMainTab("business")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mainTab === "business" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Briefcase className="h-4 w-4" /> Business Setup
        </button>
      </div>

      {mainTab === "business" ? (
        <BusinessSetup companyId={company.data?.id} />
      ) : (
      <>

      {/* Business */}
      <section className="card-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Building2 className="h-4 w-4 text-primary" /> Business details
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Business Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Legal Name</Label><Input value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} /></div>
          <div><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} maxLength={15} /></div>
          <div><Label>PAN</Label><Input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} maxLength={10} /></div>
          <div>
            <Label>Home State *</Label>
            <Select value={form.state_code} onValueChange={(v) => setForm({ ...form, state_code: v })}>
              <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
              <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">CGST/SGST vs IGST decide karta hai.</p>
          </div>
          <div className="md:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Invoice Prefix</Label><Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value.toUpperCase() })} maxLength={8} /></div>
          <div><Label>Jurisdiction (city for terms)</Label><Input placeholder="e.g. Jodhpur" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} /></div>
        </div>
      </section>

      {/* Logo */}
      <section className="card-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <ImagePlus className="h-4 w-4 text-primary" /> Invoice logo
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-[70px] w-[110px] items-center justify-center overflow-hidden rounded border border-border bg-muted/40">
            {form.logo_url ? (
              <img src={form.logo_url} alt={`${form.name || "Company"} logo`} className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">No logo</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              {form.logo_url ? "Change logo" : "Upload logo"}
            </Button>
            {form.logo_url && (
              <Button type="button" variant="ghost" className="gap-2 text-destructive" onClick={() => setForm({ ...form, logo_url: "" })}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void pickLogo(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <p className="text-xs text-muted-foreground">A4 invoice ke top-left corner par print hoga (PNG/JPG, auto-resize).</p>
        </div>
      </section>

      {/* Bank */}
      <section className="card-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <Landmark className="h-4 w-4 text-primary" /> Bank details (invoice par print)
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
          <div><Label>A/C No.</Label><Input value={form.bank_account_no} onChange={(e) => setForm({ ...form, bank_account_no: e.target.value })} /></div>
          <div><Label>IFSC</Label><Input value={form.bank_ifsc} onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })} maxLength={11} /></div>
          <div><Label>Branch</Label><Input value={form.bank_branch} onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} /></div>
        </div>
      </section>

      {/* Print defaults */}
      <section className="card-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <FileText className="h-4 w-4 text-primary" /> Invoice defaults
        </h2>
        <div className="grid gap-4">
          <div>
            <Label>Default Transport</Label>
            <Input placeholder="SELF" value={form.default_transport} onChange={(e) => setForm({ ...form, default_transport: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">Naye invoice mein transport field yahi se bhar jaayega.</p>
          </div>
          <div>
            <Label>Default Terms &amp; Conditions</Label>
            <Textarea rows={5} placeholder={DEFAULT_TERMS} value={form.default_terms} onChange={(e) => setForm({ ...form, default_terms: e.target.value })} />
            <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => setForm({ ...form, default_terms: DEFAULT_TERMS.replace("Jurisdiction", `'${form.jurisdiction || form.city || "local"}' Jurisdiction`) })}>
              Standard terms bhar do
            </Button>
          </div>
        </div>
      </section>

      <AccountAuditCard />

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button size="lg" className="w-full gap-2 md:w-auto md:min-w-[240px]" onClick={save} disabled={saving}>
          <Save className="h-5 w-5" /> {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
      </>
      )}
    </div>
  );
}
