# Google OAuth deployment checklist

Current status (2026-07-31): Google sign-in is fully implemented in code
(`app/auth/sign-in/page.tsx`, `app/auth/callback/route.ts`,
`lib/auth/authProviderCapabilities.ts`) but **not configured** in Supabase
Auth for the `avatark-platform-test` project (ref `hapoerzbcnagyfafqojg`),
confirmed directly against its `/auth/v1/settings` endpoint
(`external.google: false`). This is why the "Continue with Google" button
does not appear — the sign-in page asks Supabase at runtime whether Google
is enabled and hides the button when it isn't, rather than trusting a
static flag. It is not a code bug; it is unfinished manual configuration.

Everything below is `BLOCKED_MANUAL_CONFIGURATION` — it requires access to
the Google Cloud Console and the Supabase dashboard, neither of which is
reachable from this repo or the Vercel/CLI tooling used to diagnose this.

## Two distinct URLs — do not conflate them

1. **Google → Supabase.** Google redirects the browser to Supabase's own
   OAuth callback, which lives on the Supabase project, not this app:
   ```
   https://hapoerzbcnagyfafqojg.supabase.co/auth/v1/callback
   ```
   This is the exact URL to register as an **Authorized redirect URI** in
   the Google Cloud OAuth client. It never changes with Preview vs.
   Production deploys — it belongs to the Supabase project, which is
   shared across all AvatarK environments.

2. **Supabase → the application.** After Supabase completes the exchange,
   it redirects the browser again, this time to the app's own callback:
   ```
   https://<app-origin>/auth/callback
   ```
   This is registered in **Supabase Auth → URL Configuration → Redirect
   URLs**, not in Google Cloud. `<app-origin>` varies per environment (see
   below).

## Google Cloud Console steps

1. Create (or reuse) an OAuth 2.0 Client ID of type "Web application"
   under the Google Cloud project that owns AvatarK's Google identity.
2. **Authorized JavaScript origins:** add every origin the sign-in page is
   served from — at minimum the Production origin
   (`https://next.avatark.ai` per current Vercel production alias) and, if
   Preview OAuth testing is desired, the specific Preview origin under
   test (Vercel mints a new one per deployment, so this has to be re-added
   per Preview URL or a stable Preview alias must be used instead).
3. **Authorized redirect URIs:** add exactly the Supabase callback from
   item 1 above — `https://hapoerzbcnagyfafqojg.supabase.co/auth/v1/callback`.
   Do not add the app's `/auth/callback` here; Google never talks to it
   directly.
4. Copy the generated Client ID and Client Secret — needed for the next
   section. Never commit these to the repo or paste them into logs/docs.

## Supabase dashboard steps

1. **Authentication → Providers → Google:** enable the provider, paste the
   Client ID and Client Secret from above.
2. **Authentication → URL Configuration → Site URL:** since this Supabase
   project (`avatark-platform-test`) is shared across multiple AvatarK
   products/environments (see `docs/AVATARK_SUPABASE_ENVIRONMENT_MATRIX.md`),
   the Site URL should be set to the canonical Production origin
   (`https://next.avatark.ai`) — it's only the *default* fallback redirect,
   not an allowlist, so it does not need to enumerate every consumer.
3. **Authentication → URL Configuration → Redirect URLs:** this list *is*
   the allowlist Supabase enforces `emailRedirectTo`/`redirectTo` against.
   Add, at minimum:
   - `https://next.avatark.ai/auth/callback` (Production)
   - `https://<preview-alias>/auth/callback` for any stable Preview alias
     used for testing (per-deployment Preview URLs from `vercel ls` are
     not practical to enumerate individually and will be rejected unless
     added)
   - Any other AvatarK product origin that reuses this same Supabase
     project for its own `/auth/callback` (cross-check
     `docs/AVATARK_SUPABASE_ENVIRONMENT_MATRIX.md` before assuming scope)
4. Save, then re-run the manual verification flow in
   `docs/PLATFORM_CONTRACTS.md` § Authentication before describing Google
   sign-in as working.

## Preview vs. Production behavior once configured

- The button's visibility requires no further code change — both
  environments already read `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (confirmed present in both via `vercel
  env ls`) and call the same live Supabase settings check.
- Once the Google provider is enabled in Supabase, the button will appear
  on **every** environment simultaneously (Preview and Production alike),
  because the check reads Supabase's project-wide setting, not a
  per-deployment flag. There is no way to enable Google for Preview only
  without a second Supabase project.
- If a Preview deployment's exact origin is not in the Redirect URLs
  allowlist, `signInWithOAuth` will still redirect to Google, but the
  final Supabase → app redirect will be rejected — verify the specific
  Preview origin under test is allowlisted before testing there.
