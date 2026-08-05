# Mobile number ko profile se sync karna

## Asli wajah

Aapka number galat nahi hai — wo signup ke waqt save hi nahi hua tha.

- Signup metadata me `9310811555` maujood hai (admin email `infotheadvices@gmail.com` ke saath).
- Lekin `profiles.phone` us account par khaali (NULL) hai.
- OTP login `profiles.phone` me number dhoondhta hai, isliye "Is number par koi account nahi hai" aata hai.

Ye gap sabse purane 3 accounts me hai (mobile-mandatory kaam se pehle bane the):

```text
infotheadvices@gmail.com        metadata 9310811555   profile: khaali
dalmiashobhit@outlook.com       metadata 9555811555   profile: khaali
shridalmiathreadmills@gmail.com metadata 9212471555   profile: khaali
```

Baaki 4 accounts me number theek se save hai.

## Kya karenge

1. **Backfill migration** — jin profiles ka phone khaali hai, unka number signup metadata se bhar denge (10-digit normalize karke). Duplicate number wale case me pehla wala rakha jaayega aur baaki chhoot jaayenge — filhal koi duplicate nahi hai, isliye teeno bhar jaayenge.
2. **Aage ke liye pakka fix** — naye user ka trigger already metadata se phone leta hai; usme sirf normalization (sirf 10 digit) confirm karenge taaki `+91`/space wale number bhi theek se save hon.
3. **Company `owner_phone` sync** — jin companies ka `owner_phone` khaali hai, backfill ke baad owner ke profile phone se bhar denge (GSTIN ke saath number permanently linked rahe).

## Admin OTP ke baare me

Aapke decision ke hisaab se: **platform admin account temporary shared OTP se sign in nahi karega**. Backfill ke baad bhi admin ko `/auth` par **Mobile + Password** (ya Email + Password) se login karna hoga — wahan wahi `9310811555` chalega. Baaki normal users OTP se login karenge.

Isliye login screen par chhota sudhaar: admin account par OTP maangne pe seedha saaf message aayega — "Admin account ke liye mobile + password use karein" — abhi wala confusing message nahi.

## Technical notes

- Ek migration: `profiles.phone` backfill `auth.users.raw_user_meta_data->>'phone'` se `public.normalize_phone()` ke through, `WHERE phone IS NULL`; phir `companies.owner_phone` backfill; unique index ke chalte conflict-safe update.
- `handle_new_user()` me phone normalization confirm/tighten (behaviour same rahega).
- `verifyPhoneOtp` (`src/lib/otp.functions.ts`): jab number kisi platform admin ka ho, "account nahi hai" ke bajaye admin-specific message.
- Koi data delete nahi hoga.
