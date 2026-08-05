# Do cheezein: OTP par service-key error, aur Auth "Phone" column khaali

## 1. "Missing SUPABASE_SERVICE_ROLE_KEY" (OTP bhejein wala error)

OTP request/verify server functions (`src/lib/otp.functions.ts`) hamesha service-role
client (`client.server.ts`) load karte hain. Jis host par woh key inject nahi hoti,
wahan pehla hi step throw kar deta hai aur wahi red toast dikhta hai.

Kya karenge:

- Supabase runtime binding dobara bind karenge (`rebind_secrets`) taaki Lovable
  worker me key wapas aa jaye.
- Iske baad bhi ye flow key par depend na kare, isliye `otp.functions.ts` me
  service-role client ko `try` me load karke saaf, Hindi/Hinglish message denge:
  "OTP service abhi available nahi — thodi der baad ya password se sign in karein",
  raw environment-variable text kabhi user ko nahi dikhega.
- Same treatment `sendPasswordReset` aur `updateOwnPhone` ke admin-client load par.

## 2. Supabase dashboard me kisi user ka Phone khaali dikh raha hai

Ye galti nahi hai. Dono jagah alag column hai:

```text
auth.users.phone      -> khaali (SMS/phone provider se sign up karne par bharta hai)
public.profiles.phone -> hamara number, sab 7 users ka bhara hua hai
```

Database check (aaj): saatoN accounts ke `profiles.phone` set hain —
9310811555, 9555811555, 9212471555, 9811764576, 9310744777, 9999988888, 9871070722.
Login, company owner mobile aur OTP sab isi column se chalte hain, isliye app
sahi kaam kar raha hai.

Aap dashboard me bhi number dekhna chahte hain, to hum har user ke Auth
metadata me number mirror kar denge (Display name ke saath dikhega). `auth.users.phone`
ko bharna theek nahi — Supabase usko SMS-login identity maanta hai aur usse
duplicate/verification conflict aa sakte hain.

Isliye plan: admin panel ki user list me mobile column pehle se hai; extra kaam
sirf Auth metadata mirror + ek chhota backfill (naye users ke liye trigger already
number save karta hai).

## Technical notes

- `supabase--rebind_secrets` chalayenge; koi key rotate nahi hoti.
- `src/lib/otp.functions.ts`: `await import("@/integrations/supabase/client.server")`
  ko guard karenge, aur `{ ok: false, error: "..." }` return karenge (throw nahi),
  taaki UI toast friendly rahe.
- Auth metadata mirror: ek server function jo `profiles.phone` se
  `raw_user_meta_data.phone` set kare (admin-only, audit ke saath) — sirf tab jab
  aap ye chahein.
- Koi schema change nahi, koi data delete nahi.
