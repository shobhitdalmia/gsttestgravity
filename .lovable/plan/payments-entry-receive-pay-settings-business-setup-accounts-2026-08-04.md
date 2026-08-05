# Payments entry (Receive / Pay) + Settings → Business Setup (Accounts & Account Groups)

## Aaj kya hai (verified)
- Payment receive ka option **sirf** ek jagah hai: sales invoice detail page (`sales.$invoiceId.tsx` → `recordPayment`, jo `payments` row + `postPaymentVoucher` accounting entry banata hai).
- Purchase ke liye payment entry ka **koi** option nahi hai (purchases list me payment ka koi code nahi).
- Dashboard par payment ka koi quick action nahi, aur `/payments` naam ka koi page/list nahi hai.
- Chart of Accounts page par groups/ledgers sirf **add** ho sakte hain (`GroupLedgerDialog` = insert only). Edit / rename / delete / group change ka option nahi hai. 11 primary groups DB trigger se locked hain.
- Settings page ek single long form hai — koi sub-tab structure nahi.

## Kya banega

### 1. Payments module (Tally/Busy jaisa Receipt & Payment voucher)
Naya page **Payments** (sidebar me nav item + dashboard top-right par do quick buttons: "Payment Receive" aur "Payment Pay").

Ek hi dialog, do mode:
- **Receive (Receipt)** — Customer chunein → us party ke pending sales invoices dikhenge outstanding ke saath → amount, date, mode (Cash / Bank / UPI / Cheque), bank/cash ledger, reference, notes. Invoice select karne par uska `amount_paid`/status update hoga; "On account" (bina invoice) bhi allowed.
- **Pay (Payment)** — Supplier chunein → us party ke pending purchase bills → wahi fields; bill ka `amount_paid`/status update.

Har entry par double-entry voucher automatically post hoga (Cash/Bank Dr — Party Cr receipt me, ulta payment me) — existing `postPaymentVoucher` server function se, jo already books me sahi entry karta hai.

Payments page par list: date, party, type (Receive/Pay), invoice/bill ref, mode, amount, search + date filter, aur entry delete (voucher bhi unpost hoga).

### 2. Purchase par payment option
- Purchases list ke har row par "Pay" action, jo wahi payment dialog Pay-mode me party + bill pre-selected ke saath kholega.
- Sales list par bhi "Receive" quick action (invoice pre-selected), taaki bill khole bina entry ho jaye.

### 3. Settings → Business Setup (2 sub-tabs)
Settings page ko tabs me todenge: **Company**, **Business Setup** (aur baaki existing sections apni jagah).

Business Setup ke andar do sub-tab:

**a) Account Groups**
- Poora tree (11 primary groups + saare sub-groups), search ke saath.
- Naya group banayein; existing **non-primary** group ka naam badlein, parent (under) change karein, delete karein (agar uske andar ledger/child group ho to delete block + message).
- Primary groups par lock badge — rename/delete disabled (DB trigger bhi rokta hai), lekin unke andar sub-group/ledger banana khula.
- Nature parent se auto-inherit.

**b) Accounts (Ledgers)**
- Saare ledgers ki searchable/sortable list — naam, group, opening balance Dr/Cr, closing balance, type (System / Party / Custom).
- Group ke hisaab se filter, aur naya ledger add.
- **Edit**: naam, group change (kisi bhi group me move), opening balance + Dr/Cr, notes. Party-linked ledgers ka party link intact rehta hai.
- **Delete**: sirf tab jab us ledger par koi voucher entry na ho aur system ledger na ho; warna clear reason ke saath block.
- System ledgers (Cash, Bank, Sales, GST accounts) rename/move ho sakte hain par delete nahi — Tally jaisa behaviour.

Chart of Accounts page (Accounting → Chart of Accounts) bhi wahi edit actions use karega, isliye dono jagah se same control milega.

## Technical notes
- Naye files: `src/lib/payments.ts` (party-wise outstanding invoices/bills + payments list queries), `src/components/payments/PaymentDialog.tsx`, `src/routes/_authenticated/payments.tsx`, `src/components/accounting/LedgerEditDialog.tsx`, `src/components/accounting/GroupEditDialog.tsx`, aur `src/routes/_authenticated/settings.business-setup.tsx` (Accounts / Account Groups sub-tabs).
- Edit ho rahe files: `settings.tsx` (tabs + Business Setup link), `route.tsx` (sidebar nav), `dashboard.tsx` (top-right quick actions), `sales.index.tsx`, `purchases.index.tsx`, `accounting.index.tsx`, `src/lib/accounting.ts` (ledger update/delete helpers, `notes`/`group_id` fields).
- Koi schema change zaroori nahi: `payments`, `ledgers`, `ledger_groups` me already saare fields hain (mode, reference, notes, soft-delete). Ledger delete soft-delete (`deleted_at`) se hoga taaki purane vouchers na tootein.
- Voucher posting existing `postPaymentVoucher` / `unpostVoucher` server functions se; koi naya accounting logic duplicate nahi hoga.
- Sab dialogs mobile-first, loading/empty/error states aur amount validation ke saath.
