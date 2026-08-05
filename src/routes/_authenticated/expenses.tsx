import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompany } from "@/lib/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatINR } from "@/lib/gst";
import { postExpenseVoucher } from "@/lib/accounting.functions";
import { fyDefaultDate, useFinancialYear, type FYValue } from "@/lib/fy";

import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — GST Munshi" }] }),
  component: ExpensesPage,
});

const CATEGORIES = ["Rent", "Salary", "Electricity", "Travel", "Fuel/Petrol", "Office", "Internet/Phone", "Bank Charges", "Misc"];

function ExpensesPage() {
  const company = useCurrentCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { fy, from: fyFrom, to: fyTo } = useFinancialYear(company.data?.id);

  const list = useQuery({
    enabled: !!company.data?.id,
    queryKey: ["expenses", company.data?.id, fyFrom ?? "all", fyTo ?? "all"],
    queryFn: async () => {
      let q = supabase.from("expenses").select("*").eq("company_id", company.data!.id);
      if (fyFrom) q = q.gte("expense_date", fyFrom);
      if (fyTo) q = q.lte("expense_date", fyTo);
      const { data } = await q.order("expense_date", { ascending: false }).limit(1000);
      return data ?? [];
    },
  });


  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">Business kharche categorize karein.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Expense</Button></DialogTrigger>
          <ExpenseDialog companyId={company.data?.id} fy={fy} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["expenses"] }); }} />
        </Dialog>
      </div>

      <div className="card-surface p-4">
        {list.data?.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary"><Wallet className="h-6 w-6" /></div>
            <p className="mt-3 text-sm text-muted-foreground">Koi expense nahi.</p>
          </div>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Notes</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {list.data?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.expense_date}</TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.notes ?? "—"}</TableCell>
                  <TableCell className="capitalize">{e.payment_mode}</TableCell>
                  <TableCell className="text-right font-semibold">{formatINR(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}


function ExpenseDialog({ companyId, fy, onDone }: { companyId?: string; fy: FYValue; onDone: () => void }) {
  const [form, setForm] = useState({
    category: "Misc",
    amount: "",
    expense_date: fyDefaultDate(fy),

    payment_mode: "cash",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!companyId || !form.amount) return toast.error("Amount required");
    setSaving(true);
    const { data: row, error } = await supabase
      .from("expenses")
      .insert({
        company_id: companyId,
        category: form.category,
        amount: Number(form.amount),
        expense_date: form.expense_date,
        payment_mode: form.payment_mode,
        notes: form.notes || null,
      })
      .select("id")
      .maybeSingle();
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }
    if (row?.id) {
      try {
        await postExpenseVoucher({ data: { expenseId: row.id } });
      } catch (accErr: any) {
        toast.warning(`Expense saved, accounting entry pending: ${accErr?.message ?? "error"}`);
      }
    }
    setSaving(false);
    toast.success("Expense added!");
    onDone();
  }

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount ₹</Label>
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Date</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
          <div>
            <Label>Payment mode</Label>
            <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save} disabled={saving}>Save</Button></DialogFooter>
    </DialogContent>
  );
}
