# Phase 1 — Mobile mandatory + temporary OTP login

Haan, possible hai. Lekin ek zaroori security baat pehle.

## Warning: fixed OTP "123456" ka risk

Agar OTP hamesha `123456` hai, to koi bhi sirf mobile number jaan kar kisi bhi account me ghus sakta hai — GST data, invoices, party details sab. Ye ek open door hai.

Isliye plan me temporary OTP rakha jaayega, par in guardrails ke saath:

- OTP ka value code me hardcode nahi — server secret (`TEMP_OTP_CODE`) me. Aap kabhi bhi badal sakte hain, aur DLT aane par secret hata dene se temporary mode apne aap band.
- Temporary mode server-side flag se on/off (`TEMP_OTP_ENABLED`). Client kuch decide nahi karta.
- Rate limit: per phone 5 attempt / 10 min, per IP 20 / 10 min. Audit log har request+verify (phone, ip, outcome) — `admin_audit_log` me.
- Platform admin accounts ke liye temporary OTP login **band** (unhe password se hi login karna hoga).
- Login screen par ek chhoti si line: "Temporary access mode — apna OTP kisi ko na batayein". Aur aapke admin panel me temporary mode ka status dikhega.

Agar aap chahein to isse aur safe kar sakte hain: fixed code ke bajaye **per-user code** (aap admin panel se ek 6-digit code generate karke phone par batayein, 24 ghante valid). Same effort, bahut zyada safe. Plan me ye optional switch ke roop me shamil hai.

## Phase 1A — Mobile ko permanent identity banana

Aaj: `profiles.phone` me 10-digit number store hota hai, signup par mandatory hai, aur mobile+password login chal raha hai. Company form ka `phone` alag optional field hai.

Kaam:

- `profiles.phone` ko normalize + **NOT NULL-equivalent unique** karna: unique index normalized number par, taaki ek number = ek account. Purane rows me duplicate/blank ho to migration se pehle report nikaalenge aur aapko dikhayenge (koi data chup-chaap delete nahi).
- `profiles.phone_verified_at` column add.
- `companies.owner_phone` snapshot column: company banate waqt owner ka verified mobile permanently link ho jaata hai (GSTIN ke saath). Sirf platform admin badal sake — RLS + policy se.
- Company setup dialog: owner ka mobile read-only dikhega ("Login mobile: +91 …") aur company contact phone default me wahi bhar jaayega, user chahe to badal sake.
- Existing companies ke liye ek backfill: owner ke profile phone se `owner_phone` set.

## Phase 1B — OTP infra (provider-agnostic)

- Nayi table `phone_otps`: phone, code_hash, purpose (login/verify), channel, attempts, expires_at (5 min), consumed_at, ip, created_at. RLS: koi client access nahi — sirf server.
- Server functions:
  - `requestPhoneOtp({ phone })` — number registered hai ya nahi ye batata nahi (enumeration se bachne ke liye same response), row banata hai, 60s resend cooldown.
  - `verifyPhoneOtp({ phone, code })` — constant-time compare, max 5 attempt, expiry check; success par server-side session issue karke client ko token deta hai (jaise abhi `signInWithPhone` karta hai).
- Channel adapter interface `sendOtp(phone, code)` ab do implementation ke saath: `temporary` (kuch bheja nahi jaata, secret code hi valid) aur aage `msg91`/`whatsapp`. DLT approval ke baad sirf adapter switch karna hoga — baaki sab code same.

## Phase 1C — UI

- `/auth` par teen mode: **Mobile OTP (default)**, Mobile+Password, Email+Password.
- OTP screen: 6-digit boxes, resend timer, error/loading/empty states, mobile-first, keyboard friendly.
- Naya user: mobile → OTP verify → naam + email → company setup. Mobile verify hone ke baad hi account banta hai, isliye `phone_verified_at` sach me verified hota hai.

## Technical notes

- Secrets: `TEMP_OTP_ENABLED`, `TEMP_OTP_CODE` (ya per-user mode) — sirf server par, `VITE_` prefix kabhi nahi.
- Sab server logic `createServerFn` me, `src/lib/otp.functions.ts` + `src/lib/otp.server.ts`.
- Migration order: report duplicates → columns add → backfill → unique index → RLS/policies/grants.
- Naya provider aane par sirf adapter + secret change; DB aur UI same rahega.

## Aapse do decisions chahiye

1. Temporary code: **fixed `123456**` (aasan, kam safe) ya **per-user 6-digit code jo aap admin panel se generate karein**  ok new otp  is 252515
2. Mobile mandatory karne par purane accounts jinke paas phone missing/duplicate hai — unhe next login par mobile add/verify karne ko kehna theek hai? nahi jab unka mobile cjhalu hoga jab hi logib hoga , haan gar user hamarari compnay ko wriiten mein appliocation likh ke deag to to hum aone admin panale mein jake uska miobile uodate karenge with proper audit trail ke sath , yeh audit trail user ko bhi dikhega and admin ko .