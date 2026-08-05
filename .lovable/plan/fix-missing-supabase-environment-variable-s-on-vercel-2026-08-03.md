# Fix "Missing Supabase environment variable(s)" on Vercel

## What is happening

Lovable पर app perfect चल रहा है क्योंकि Lovable hosting server-side secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) खुद inject करता है। Vercel एक अलग hosting है — वहाँ ये secrets मौजूद नहीं हैं, इसलिए signup के समय जो server-side check चलता है (क्या यह email पहले से registered है) वह fail होकर यही error दिखा देता है।

Page खुल रहा है क्योंकि browser वाला Supabase client `VITE_*` variables use करता है, जो build में bundle हो चुके हैं। सिर्फ server-side वाला हिस्सा टूटा है।

## Fix (two parts)

### 1. Vercel में environment variables add करना (आपका step — मैं यह नहीं कर सकता)

Vercel → Project → Settings → Environment Variables, Production + Preview दोनों के लिए:

- `SUPABASE_URL` = `https://rnatmucftkgiyadxmlzh.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` = वही anon key जो `.env` में है
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase Dashboard → Project Settings → API → service_role key (secret, कभी client में न डालें)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` = `.env` जैसी values
- `LOVABLE_API_KEY` (सिर्फ अगर Vercel पर bill-OCR / AI features चलाना है)

फिर Redeploy करें।

### 2. Code को fail-safe बनाना (मैं करूँगा)

अभी secret missing होने पर पूरा signup रुक जाता है। इसे graceful बनाया जाएगा:

- Duplicate-email check server function अब secret missing होने पर crash नहीं करेगी — एक neutral "unknown" result लौटाएगी, ताकि signup normal Supabase flow से आगे बढ़े (duplicate detection Supabase के अपने response से भी होगा), और screen पर raw env error न दिखे।
- Auth page पर raw `Missing Supabase environment variable(s)...` text की जगह user-friendly message दिखेगा।
- Server env पढ़ने वाली जगहों पर fallback जोड़ा जाएगा: `SUPABASE_URL` न मिलने पर `VITE_SUPABASE_URL`, और publishable key के लिए भी वही fallback — इससे सिर्फ `VITE_*` set होने पर भी ज़्यादातर server calls चलेंगी (service-role वाले admin काम के लिए फिर भी असली service key चाहिए)।

## Technical notes

- Files touched: `src/lib/auth.functions.ts` (duplicate-email check का error handling + env fallback), `src/routes/auth.tsx` (error message mapping), `src/integrations/supabase/client.server.ts` और `auth-middleware.ts` (`VITE_*` fallback for URL/publishable key)।
- Service-role key का कोई fallback नहीं हो सकता — वह असली secret है और उसे Vercel में डालना ज़रूरी है, वरना admin-level checks (duplicate email का पक्का पता, admin panel) Vercel पर काम नहीं करेंगे।
- Supabase Auth में Site URL / Redirect URLs में Vercel domain भी add करना पड़ेगा, वरना verification aur reset links Vercel deployment पर सही काम नहीं करेंगे।