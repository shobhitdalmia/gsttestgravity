# OTP login को restore और stable करना

&nbsp;

isko itna stroong banao ki future mein kitne bhi chnages aayen but login issues nahi hone chaye that final , else i will not work with lovbale 

## Confirmed diagnosis

&nbsp;

- Published Lovable domain पर OTP healthcheck अभी `serviceKey: false` दिखा रहा है, जबकि `tempOtp: true` है।
- Production logs में हर OTP request पर `SUPABASE_SERVICE_ROLE_KEY` missing मिल रहा है।
- इसलिए OTP request code database तक पहुँचने से पहले रुक रहा है और UI “OTP service abhi available nahi” दिखा रही है।
- Primary groups/accounting migration ने OTP logic या auth tables नहीं बदले। समस्या latest published runtime में Supabase secret binding उपलब्ध न होने की है। यह जानबूझकर किया गया बदलाव नहीं है।

## Fix plan

### 1. Login तुरंत restore करना

- Connected Supabase से canonical runtime secrets दोबारा bind करेंगे; key को code या database में copy नहीं करेंगे।
- Published deployment/runtime refresh करेंगे ताकि नई binding live worker में उपलब्ध हो।
- Published `/api/public/health/otp` पर चारों checks `true` verify करेंगे।

### 2. वास्तविक OTP flow verify करना

- Lovable published domain से OTP request चलाकर confirm करेंगे कि “service unavailable” response हट गया है।
- Production server logs में missing service-role error दोबारा नहीं आ रहा, यह check करेंगे।
- OTP verify/login का पूरा flow test करेंगे; temporary OTP value को logs या response में expose नहीं करेंगे।

### 3. अगली update पर regression रोकना

- OTP backend में configuration failure को structured diagnostic response देंगे, लेकिन secret names/value end user को नहीं दिखाएँगे।
- Release verification में published healthcheck और OTP request को mandatory smoke test रखेंगे—login pass हुए बिना update complete नहीं माना जाएगा।
- Accounting जैसी unrelated changes के बाद भी auth smoke test करेंगे, ताकि deployment binding regression तुरंत पकड़ी जाए।

## Security

- `SUPABASE_SERVICE_ROLE_KEY` केवल server runtime secret रहेगा; frontend, repository, healthcheck और logs में इसकी value कभी नहीं जाएगी।
- Existing OTP rate limits, expiry, attempt limits और admin temporary-OTP restriction unchanged रहेंगे।

## Completion criteria

```text
Published healthcheck: supabaseUrl=true, publishableKey=true,
                       serviceKey=true, tempOtp=true
OTP request: succeeds
OTP verification/login: succeeds
Production logs: no missing SUPABASE_SERVICE_ROLE_KEY error
```