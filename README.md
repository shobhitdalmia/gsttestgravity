# GSTMunshi AI Assistant

naya project banajo    uska naam hai "gstmunshi"   databse use kara mera supabase ka  jiska naam hai   "gstmunshi"        इस project में indiacash-ai का पूरा code copy करो  and haan   cloud use mat karna by default jo lovabale ka hota hai

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gst-muse-buddy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d4ae04f8-52de-44cc-9696-76ef109c4f90).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Self-hosting environment variables (Vercel / Hostinger / anywhere)

Lovable hosting injects these automatically. On any other host set them yourself
(Production + Preview), then redeploy — otherwise OTP login and signup checks fail:

| Variable | Notes |
| --- | --- |
| `TEMP_OTP_ENABLED` | `true` while the temporary OTP mode is in use |
| `TEMP_OTP_CODE` | the shared 4-8 digit code (never commit it) |
| `SUPABASE_URL` | project URL |
| `SUPABASE_PUBLISHABLE_KEY` | anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API (secret) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | browser client |
| `LOVABLE_API_KEY` | only for bill-OCR / AI features |

Also add the host's domain to Supabase → Authentication → URL Configuration
(Site URL + Redirect URLs), or verification and reset links break.

Check any deployment with `GET /api/public/health/otp` — it returns booleans
only (no keys). It returns HTTP 503 if any required OTP binding is missing, so
an unhealthy deployment can be blocked before release.

Run the mandatory auth readiness check after every deployment:

```sh
APP_URL=https://your-domain.example npm run smoke:auth
```

Do not mark a release complete unless this command passes. This catches secret
binding regressions even when the code change itself is unrelated to login.
