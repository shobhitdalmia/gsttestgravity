# Fix: reset-password email, post-logout setup popup, duplicate signup

## 1. Forgot password mail nahi ja rahi

Verified: Supabase Auth logs dikhate hain ki `/recover` request 200 return karti hai (`user_recovery_requested`), matlab request app se theek pahunch rahi hai — problem email dispatch me hai.

Verified: project me custom auth-email webhook maujood hai (`src/routes/lovable/email/auth/webhook.ts`) jo hardcoded sender domain `notify.gstmunshi.com` use karta hai, lekin is project me **koi email domain configured nahi hai** (email setup status: not started). Us domain se koi bhi send fail hoga.

Root cause abhi confirmed nahi hai (signup mails aa rahi hain, recovery nahi), to pehla step diagnosis hai:

- Auth/email logs se confirm karna ki recovery mail (a) custom hook se ja rahi hai aur fail ho rahi hai, ya (b) Supabase default sender se ja rahi hai aur rate limit (`over_email_send_rate_limit`) me atak rahi hai.
- Uske hisaab se fix:
  - Agar custom hook cause hai: hook ko band karke recovery/signup dono Supabase ke default sender par le aana (turant kaam karne lagega), ya aapka real domain configure karke templates usi par bhejna.
  - Agar rate limit cause hai: auth email rate limit badhana.
- Fix ke baad `/auth` se ek real reset request bhej kar log me `sent` event verify karna.

Note: `notify.gstmunshi.com` sirf tab kaam karega jab aap `gstmunshi.com` ke owner ho aur DNS setup complete ho. Warna default sender best option hai.

## 2. Logout ke baad GST-detail wali setup window khul jaati hai

Root cause verified in code: `src/routes/_authenticated/route.tsx` ka `signOut()` pehle React Query cache clear karta hai, phir `supabase.auth.signOut()` await karta hai, aur uske baad `/auth` par navigate karta hai. Beech ke us moment me companies list khaali ho jaati hai (`isLoading` false, `companies.length === 0`), isliye `needsSetup` true ho jaata hai aur CompanySetupDialog flash ho jaata hai. Refresh karne par session hat chuka hota hai, isliye page theek dikhta hai.

Fix:
- Ek `signingOut` state rakh kar sign-out ke dauraan setup dialog aur shell content ko render hone se rokna.
- Sign-out sequence badalna: pehle `/auth` par redirect trigger, cache clear baad me — taaki authenticated shell dobara onboarding decide na kare.
- `needsSetup` ko sirf tab true karna jab companies query actually successfully fetch hui ho (fetched + session maujood), cache clear hone se nahi.

## 3. Already registered email par dobara signup

Verified in code + logs: `src/routes/auth.tsx` ka `signUp()` sirf mobile number ki availability check karta hai (`isPhoneAvailable`), email ki nahi. Supabase duplicate email par koi error nahi deta (privacy ke liye "repeated signup" as success), isliye app "Verification email bhej diya" dikha deta hai. Auth log me `user_repeated_signup` event isi ka proof hai.

Fix:
- `src/lib/auth.functions.ts` me ek email-availability server function jodna (mobile check ke same pattern par, server-side admin lookup, koi email list client ko expose nahi).
- Signup submit par email check karna; agar registered hai to signup rok kar clear message dikhana: "Ye email pehle se registered hai — sign in karein ya password reset karein", saath me Sign in / Forgot password shortcut.
- Agar user unconfirmed hai to message "pehle se signup hai, verification pending" dikhana aur resend/verify screen par le jaana (naya duplicate signup nahi).

## Technical notes

- Files: `src/routes/auth.tsx`, `src/routes/_authenticated/route.tsx`, `src/lib/auth.functions.ts`, aur (issue 1 ke result ke hisaab se) `src/routes/lovable/email/auth/webhook.ts`.
- Email existence check server-side hi hogi, sirf boolean return karegi — enumeration ko limit karne ke liye validated input aur generic messages.
- Koi database schema change nahi.
