# Primary Groups (Tally-style) — lock down + complete the list

## Current state (verified in your Supabase)
Har company ke liye 20 system groups seed hote hain. In 11 primary groups me se **6 already hain**:

Capital Account, Current Assets, Current Liabilities, Fixed Assets, Investments, Loans (Liability)

**Missing 5 primary groups:** Revenue Accounts, Expense Accounts, Profit & Loss, Suspense Account, Pre-Operative Expenses.

Aur ek gap: `ledger_groups` par RLS abhi owner/accountant ko **koi bhi** group edit/delete karne deta hai — system/primary groups bhi. Yaani user primary group ko badal sakta hai. Yeh band karna hai.

## Kya banega

### 1. Missing primary groups add
Naye primary groups (parent = none, system, locked):

```text
Revenue Accounts          (income)    -> Sales Accounts, Direct Income, Indirect Income iske under
Expense Accounts          (expenses)  -> Purchase Accounts, Direct/Indirect Expenses iske under
Profit & Loss             (liabilities/equity)
Suspense Account          (liabilities)
Pre-Operative Expenses    (assets)
```

Existing groups ko in naye parents ke under move kiya jayega taaki tree Tally jaisa dikhe:

```text
Capital Account
Current Assets ─ Bank Accounts, Cash-in-Hand, Sundry Debtors, Stock-in-Hand, Loans & Advances
Current Liabilities ─ Duties & Taxes, Sundry Creditors, Provisions
Fixed Assets
Investments
Loans (Liability)
Revenue Accounts ─ Sales Accounts, Direct Income, Indirect Income
Expense Accounts ─ Purchase Accounts, Direct Expenses, Indirect Expenses
Profit & Loss
Suspense Account
Pre-Operative Expenses
```

Purane ledgers/vouchers pe koi asar nahi — sirf parent link badalta hai, ledger ka group same rehta hai. Naye Profit & Loss / Suspense / Pre-Operative groups me default ledgers bhi seed honge (Profit & Loss A/c, Suspense A/c, Preliminary Expenses).

### 2. Primary group lock (user edit nahi kar sakta)
- `ledger_groups.is_primary` flag add hoga; ye 11 groups par `true`.
- Database-level guard: primary group ka naam / parent / nature change ya delete **sirf platform admin** kar sakta hai. Normal owner/accountant ki koshish par saaf error milega (frontend hide karna kaafi nahi — backend par rok lagegi).
- Sub-group aur ledger banana/edit karna user ke liye pehle jaisa hi khula rahega — bas primary group ke *under* hi.

### 3. UI — user ko better experience
Chart of Accounts page par:
- Primary groups par chhota lock icon + "Primary" badge, aur edit/delete option unke liye hidden.
- Har primary group ke saamne "+ Sub-group" aur "+ Ledger" quick action — dono me parent primary group pre-selected aur locked.
- Group create/edit dialog: parent picker se primary groups sirf parent ke roop me chun sakte hain, rename/delete nahi.
- Nature (Assets/Liabilities/Income/Expenses) parent primary group se auto inherit — user ko galat nature chunne ka mauka nahi.
- Delete par: agar group me ledgers ya child groups hain to block, warna confirm.
- Platform admin ko ek chhota "Admin: primary groups edit" mode dikhega (aapke liye), normal user ko nahi.

### 4. Sab companies par apply
Ek migration seed function ko update karega aur **existing companies** me bhi missing primary groups create + reparent karega, taaki purani company bhi turant sahi tree dikhaye.

## Technical notes
- Migration: `ALTER TABLE public.ledger_groups ADD COLUMN is_primary boolean NOT NULL DEFAULT false`; `public.seed_default_coa` rewrite (naye primary codes: `revenue_accounts`, `expense_accounts`, `profit_loss`, `suspense`, `pre_operative`); backfill DO block for existing companies; BEFORE UPDATE/DELETE trigger `guard_primary_ledger_group()` using `public.is_platform_admin()`.
- Frontend: `src/lib/accounting.ts` (add `is_primary` to `LedgerGroupRow` + query), `src/routes/_authenticated/accounting.index.tsx` (badges, quick actions, dialogs), group mutations ke liye ek chhota `group-dialog` component.
- Reports (trial balance / P&L) nature-based hain, isliye reparenting se numbers nahi badlenge.
