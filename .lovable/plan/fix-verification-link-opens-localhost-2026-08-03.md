# Fix: verification link opens localhost

## Problem
The signup verification email link sends the user to `http://localhost:3000/#access_token=...`. The token itself is valid — only the destination is wrong, so the account never gets verified inside the app.

Cause: the Supabase Auth project setting for the site address is still the default `http://localhost:3000`, and the app's own address is not in the allowed-redirect list. On top of that, the code still carries addresses from the old project.

## What will be fixed

1. **Auth URL settings (Supabase)**
   - Site address: `https://gst-muse-buddy.lovable.app`
   - Allowed redirect addresses: the published app, the Lovable preview address, and localhost for development, covering `/dashboard`, `/reset-password`, and `/invite/*` paths.

2. **App code addresses**
   - `src/lib/site-url.ts`: canonical published address changed from `gstmunshi.lovable.app` to `gst-muse-buddy.lovable.app`.
   - `src/routes/lovable/email/auth/webhook.ts`: email branding/links changed from `indiacash-ai` / `indiacash-ai.lovable.app` to GST Munshi and the correct address. Sender domain left as-is.

3. **Existing admin user**
   - The pasted link's token shows `email_verified: true` already for `infotheadvices@gmail.com`. After the fix, sign-in should work directly; if it doesn't, that account is confirmed manually so you are not blocked.

## Notes
- No database schema change is needed.
- After the change, new verification and password-reset emails will open on the live site.
- Custom domain `gstmunshi.com` can be added to the allowed list later once it is connected to this project.
