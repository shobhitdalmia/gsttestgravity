# Vercel par OTP kaam nahi kar raha — kaaran aur fix

## Asli kaaran (code ki galti nahi hai)

Temporary OTP mode do server secrets se chalta hai:

```text
TEMP_OTP_ENABLED = true
TEMP_OTP_CODE    = <team wala OTP>
```

Ye Supabase/Lovable ke runtime secrets hain — ye GitHub me commit nahi hote (aur
hone bhi nahi chahiye). Isliye Vercel par ye variables maujood nahi hain,
`temporaryOtpMode()` false return karta hai, aur `sendOtp()` seedha wahi message
throw karta hai jo aapko dikha: "OTP bhejne ki service abhi configure nahi hai".

Matlab GitHub sync theek hai — code Vercel par pahunch raha hai; sirf secrets
nahi pahunch rahe. Lovable domain isliye chal raha hai kyunki wahan secrets
automatic inject hote hain.

## Fix — do hisse

### 1. Vercel me environment variables (aapka step, main nahi kar sakta)

Vercel -> Project -> Settings -> Environment Variables, **Production + Preview**
dono ke liye:

- `TEMP_OTP_ENABLED` = `true`
- `TEMP_OTP_CODE` = wahi OTP jo team use kar rahi hai
- `SUPABASE_URL` = `https://rnatmucftkgiyadxmlzh.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` = `.env` wali anon key
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase Dashboard -> Settings -> API -> service_role
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `LOVABLE_API_KEY` (sirf agar Vercel par bill-OCR / AI features chahiye)

Phir **Redeploy**. Hostinger ya kisi bhi host par bhi yahi list chahiye.

Saath hi Supabase -> Authentication -> URL Configuration me Vercel domain ko
Redirect URLs me add karein, warna verification/reset links wahan galat jayenge.

### 2. Code side (main karunga) — diagnose karna aasaan ho

- `src/lib/otp.server.ts`: error message me clearly batayenge ki **kaunsa**
  config missing hai, aur ek server-side `console.error` log karenge
  (`[otp] temporary mode off: TEMP_OTP_ENABLED/TEMP_OTP_CODE missing`) — code
  value kabhi log nahi hogi.
- `src/lib/otp.functions.ts`: `requestPhoneOtp` ka response me ek
  `configured: false` flag jodenge jab temporary mode off ho, aur UI ka toast
  होगा: "Is hosting par OTP service configure nahi hai — password se sign in
  karein ya admin se sampark karein". Raw variable naam user ko nahi dikhega.
- Ek chhota healthcheck server route `/api/public/health/otp` banayenge jo sirf
  boolean batayega: `{ supabaseUrl: true/false, serviceKey: true/false,
  tempOtp: true/false }` — koi value ya key expose nahi hogi. Isse aap kisi bhi
  host par 5 second me dekh sakte hain ki kya missing hai.
- `README.md` me ek "Self-hosting env variables" section jodenge (upar wali
  list), taaki har naye host par same checklist follow ho.

## Kya nahi badlega

- Koi database change nahi, koi OTP logic change nahi.
- Temporary OTP code kabhi codebase/GitHub me hardcode nahi hoga (public repo
  me chala jata aur koi bhi login kar leta).
