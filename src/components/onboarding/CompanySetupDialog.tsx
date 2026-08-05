import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { INDIAN_STATES } from "@/lib/gst";
import { setActiveCompanyId } from "@/lib/company";
import { setFinancialYear, currentFYStartYear } from "@/lib/fy";
import { Building2, BadgeIndianRupee, Phone, Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const BUSINESS_TYPES = [
  "Retailer / Shop",
  "Wholesaler / Distributor",
  "Manufacturer",
  "Trader",
  "Services",
  "Other",
] as const;

const STEPS = [
  { title: "Business details", icon: Building2 },
  { title: "GST & PAN", icon: BadgeIndianRupee },
  { title: "Contact & invoice", icon: Phone },
] as const;

export function CompanySetupDialog({ userEmail }: { userEmail?: string | null }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    legal_name: "",
    business_type: "Retailer / Shop",
    gst_registered: "yes" as "yes" | "no",
    gstin: "",
    pan: "",
    state_code: "",
    address: "",
    city: "",
    pincode: "",
    phone: "",
    email: userEmail ?? "",
    invoice_prefix: "INV",
    next_invoice_number: "1",
    fy_start_year: String(currentFYStartYear()),
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // Login mobile hamesha company se linked rehta hai — yahan sirf dikhta hai, edit nahi hota.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase.from("profiles").select("phone").eq("id", auth.user.id).maybeSingle();
      if (!alive || !data?.phone) return;
      setOwnerPhone(data.phone);
      setForm((f) => ({ ...f, phone: f.phone || data.phone! }));
    })();
    return () => {
      alive = false;
    };
  }, []);

  function validateStep(i: number): string | null {
    if (i === 0) {
      if (form.name.trim().length < 2) return "Business ka naam likhein (min 2 letters)";
      if (form.name.trim().length > 120) return "Business name bahut lamba hai";
    }
    if (i === 1) {
      if (!form.state_code) return "State chunein — isse CGST/SGST ya IGST decide hota hai";
      if (form.gst_registered === "yes") {
        if (!GSTIN_RE.test(form.gstin.trim().toUpperCase())) return "Sahi 15-digit GSTIN daalein";
        if (form.gstin.trim().slice(0, 2) !== form.state_code)
          return `GSTIN ke pehle 2 digit state code (${form.state_code}) se match hone chahiye`;
      }
      if (form.pan && !PAN_RE.test(form.pan.trim().toUpperCase())) return "PAN format galat hai (ABCDE1234F)";
    }
    if (i === 2) {
      if (form.phone && !/^[0-9+\-\s]{6,15}$/.test(form.phone.trim())) return "Phone number sahi nahi lag raha";
      if (form.pincode && !/^[0-9]{6}$/.test(form.pincode.trim())) return "Pincode 6 digit ka hota hai";
      if (!form.invoice_prefix.trim()) return "Invoice prefix chahiye (jaise INV)";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) return toast.error(err);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function submit() {
    for (let i = 0; i < STEPS.length; i++) {
      const err = validateStep(i);
      if (err) {
        setStep(i);
        return toast.error(err);
      }
    }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Session expired — dobara sign in karein");
      const state = INDIAN_STATES.find((s) => s.code === form.state_code);
      const gst = form.gst_registered === "yes" ? form.gstin.trim().toUpperCase() : null;
      const { data, error } = await supabase
        .from("companies")
        .insert({
          owner_id: uid,
          name: form.name.trim(),
          legal_name: form.legal_name.trim() || form.name.trim(),
          gstin: gst,
          pan: form.pan.trim().toUpperCase() || null,
          state: state?.name ?? null,
          state_code: form.state_code,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          pincode: form.pincode.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          invoice_prefix: form.invoice_prefix.trim().toUpperCase(),
          next_invoice_number: Math.max(1, Number(form.next_invoice_number) || 1),
          financial_year_start: `${form.fy_start_year}-04-01`,
          default_terms: null,
        })
        .select("*")
        .single();
      if (error) throw error;
      setActiveCompanyId(data.id, uid);
      setFinancialYear(data.id, Number(form.fy_start_year));
      await qc.invalidateQueries();
      toast.success("Company setup ho gaya — billing shuru karein!");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const fyOptions = [0, 1, 2].map((d) => currentFYStartYear() - d);

  return (
    <Dialog open>
      <DialogContent
        className="max-w-xl max-h-[92vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Apni company setup karein</DialogTitle>
          <DialogDescription>
            Ye ek baar ka setup hai. GST state ke hisaab se invoice CGST/SGST ya IGST calculate karega.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex flex-1 items-center gap-2">
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <div className="hidden sm:block text-xs font-medium truncate">{s.title}</div>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <div className="space-y-4 pt-2">
          {step === 0 && (
            <>
              <div>
                <Label htmlFor="c-name">Business name *</Label>
                <Input
                  id="c-name"
                  autoFocus
                  maxLength={120}
                  placeholder="Karni Traders"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="c-legal">Legal / registered name</Label>
                <Input
                  id="c-legal"
                  maxLength={160}
                  placeholder="Optional — invoice par print hoga"
                  value={form.legal_name}
                  onChange={(e) => set({ legal_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Business type</Label>
                <Select value={form.business_type} onValueChange={(v) => set({ business_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <Label>GST registered?</Label>
                <Select
                  value={form.gst_registered}
                  onValueChange={(v) => set({ gst_registered: v as "yes" | "no" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Haan — GSTIN hai</SelectItem>
                    <SelectItem value="no">Nahi — unregistered / composition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State (place of business) *</Label>
                <Select value={form.state_code} onValueChange={(v) => set({ state_code: v })}>
                  <SelectTrigger><SelectValue placeholder="State chunein" /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.code} — {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Same state = CGST + SGST, dusre state = IGST.
                </p>
              </div>
              {form.gst_registered === "yes" && (
                <div>
                  <Label htmlFor="c-gstin">GSTIN *</Label>
                  <Input
                    id="c-gstin"
                    maxLength={15}
                    placeholder="08ABCDE1234F1Z5"
                    value={form.gstin}
                    onChange={(e) => set({ gstin: e.target.value.toUpperCase().replace(/\s/g, "") })}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="c-pan">PAN</Label>
                <Input
                  id="c-pan"
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  value={form.pan}
                  onChange={(e) => set({ pan: e.target.value.toUpperCase().replace(/\s/g, "") })}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="c-phone">Phone {ownerPhone ? "(login mobile)" : ""}</Label>
                  <Input
                    id="c-phone"
                    maxLength={15}
                    value={form.phone}
                    readOnly={!!ownerPhone}
                    className={ownerPhone ? "bg-muted" : undefined}
                    onChange={(e) => set({ phone: e.target.value })}
                  />
                  {ownerPhone ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Yehi number aapke login aur is company se permanently linked rahega. Badalna ho to GST
                      Munshi team se sampark karein.
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="c-email">Email</Label>
                  <Input id="c-email" type="email" maxLength={255} value={form.email} onChange={(e) => set({ email: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="c-address">Address</Label>
                <Textarea id="c-address" rows={2} maxLength={400} value={form.address} onChange={(e) => set({ address: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="c-city">City</Label>
                  <Input id="c-city" maxLength={80} value={form.city} onChange={(e) => set({ city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="c-pin">Pincode</Label>
                  <Input id="c-pin" maxLength={6} value={form.pincode} onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="c-prefix">Invoice prefix *</Label>
                  <Input id="c-prefix" maxLength={10} value={form.invoice_prefix} onChange={(e) => set({ invoice_prefix: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label htmlFor="c-next">Start number</Label>
                  <Input
                    id="c-next"
                    inputMode="numeric"
                    value={form.next_invoice_number}
                    onChange={(e) => set({ next_invoice_number: e.target.value.replace(/\D/g, "") })}
                  />
                </div>
                <div>
                  <Label>Financial year</Label>
                  <Select value={form.fy_start_year} onValueChange={(v) => set({ fy_start_year: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fyOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          FY {y}-{String(y + 1).slice(2)} (1 Apr {y} – 31 Mar {y + 1})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="lg" onClick={next}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button size="lg" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Setup complete karein
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
