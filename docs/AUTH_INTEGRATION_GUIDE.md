# Shared Auth Integration Guide

The canonical implementation guide for mounting AvatarK's own real, working auth pattern in a
product. This is a **pattern to copy**, not a shared UI component or a network call to this repo —
every product still runs its own Supabase Auth project and its own `/auth/*` routes; what's shared
is the *shape* of those routes (`packages/auth`'s framework-agnostic helpers) and the diagnostic
tooling (`@avatark/bootstrap`'s Environment Validator and Conformance checker) that confirms a
product's mount is wired correctly. See `docs/AUTH_REFERENCE_IMPLEMENTATION.md` for the audit that
established AvatarK's implementation as the reference (it out-performs PrometheusK's on every
checked dimension, and nothing was copied *from* PrometheusK).

## Required environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | This product's own Supabase project URL. Read client-side (public), used for every Supabase call including the Google-provider capability check. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | The publishable/anon key — never the service-role key. Public by design (`NEXT_PUBLIC_*`). |
| `SUPABASE_SERVICE_ROLE_KEY` | No (server-only) | Only needed for admin-surface features (e.g. this repo's `/admin/*`) that must bypass RLS. Never exposed to the client, never `NEXT_PUBLIC_*`. Not required to mount sign-in/callback/account. |
| Site URL (`NEXT_PUBLIC_PLATFORM_ORIGIN` in this repo's own convention) | Yes | This product's own canonical origin. Feeds `@avatark/navigation`'s Redirect Manager and should match what's configured as Supabase's own "Site URL." |
| `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED` | Recommended | `"true"`/`"false"` string flag gating whether `/account` renders live or a stub — this repo's own real convention (`app/account/page.tsx`, `components/echo/shell/EchoAvatarMenu.tsx`). Optional if a product always wants `/account` live. |

Run `@avatark/bootstrap`'s `validateProductEnv()` (see `docs/PRODUCT_BOOTSTRAP.md`) against these
values before deploying — it catches missing variables, malformed URLs/keys, Site-URL/Callback-URL
origin mismatches, and a mismatch between what the Product Registry declares this product supports
and what's actually configured.

## Mounting each piece

### 1. `/auth/sign-in`

Real reference: `app/auth/sign-in/page.tsx`. The required shape:

- A plain email input + "Send magic link" button calling `supabase.auth.signInWithOtp({ email,
  options: { emailRedirectTo } })` — **unconditional**, never gated on any capability check
  (`docs/AUTH_REFERENCE_IMPLEMENTATION.md`'s behavior #1).
- `emailRedirectTo` / OAuth's `redirectTo` must be built from `window.location.origin` (or this
  product's own known origin) + `/auth/callback`, carrying through a `?return=` param if one was
  present on the sign-in page's own URL. Never hardcode a different product's callback URL here —
  use `@avatark/navigation`'s `buildCallbackUrl(productId)` if the callback target is ever a
  *different* product's domain (rare — almost always this product's own).
- Read `?return=` and `?error=` from `useSearchParams()`. `error` maps through `@avatark/auth`'s
  `callbackErrorMessage()` to a human-readable string — never leave a raw error code on screen.
- **Google button visibility must be live, not a static flag.** Call
  `fetchAuthProviderCapabilities()`'s pattern (`lib/auth/authProviderCapabilities.ts`): fetch
  `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings` with the anon key, read `external.google`, and only
  render the Google button when it's `true`. A static `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`-style flag
  can drift from what Supabase actually has configured — this repo's own audit found and fixed
  exactly that conflation (`docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md`).

### 2. `/auth/callback`

Real reference: `app/auth/callback/route.ts`. The required shape, as a server route handler:

1. Parse `code`, `return`, and `error`/`error_description` from the incoming URL.
2. If `error` is present, both magic-link *and* Google OAuth failures land here (Supabase redirects
   with `error` instead of `code` when the provider itself rejects the request) — classify it via
   `@avatark/auth`'s `classifyCallbackFailure()` and redirect back to `/auth/sign-in?error=<reason>`.
3. If `code` is missing with no `error` either, redirect with `error=missing_code`.
4. Otherwise, `supabase.auth.exchangeCodeForSession(code)`. On success, redirect to the **validated**
   return path (`@avatark/auth`'s `safeReturnPath(returnParam, fallback)` — never redirect to a raw,
   unvalidated query param, this is the open-redirect guard every product must reuse verbatim). On
   failure, classify and redirect back to sign-in with the reason.

### 3. `/account`

This repo's own copy consumes the vendored `@avatark/account` package (`docs/PLATFORM_CONTRACTS.md`'s
Account section) — **that package's canonical source lives in `prometheusk-web`, not here**, so a
new product should follow the same vendoring path (a `file:` tarball dependency, same as this repo
and `gamek-web` already do), not re-derive its own Account UI. Gate the mount behind
`NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED` if you want a staged rollout, matching
`app/account/page.tsx`'s own real pattern.

### 4. Avatar menu

Every signed-in surface should share **one** identity/avatar menu implementation — this repo's is
`components/echo/shell/EchoAvatarMenu.tsx`, built on `lib/auth/useSignedInIdentity.ts` so header and
`/account` never compute `displayName` two different ways
(`docs/AUTH_REFERENCE_IMPLEMENTATION.md`'s behavior #7). `@avatark/account-ui`'s `AvatarMenu`
primitive is available as a simpler starting point for a product with no existing nav shell to
extend — it is deliberately headless (open/close state only), so pick it only if you don't already
have outside-click/Escape-key handling to preserve.

### 5. Sign out

One call path, used identically everywhere a sign-out control exists:
`supabase.auth.signOut()` → `redirect('/auth/sign-in')` (`lib/auth/actions.ts`'s `signOut()` server
action, or the equivalent client call in `lib/account/adapters.ts`). **Do not** give a product two
divergent sign-out call sites (one direct-to-Supabase, one through an adapter) — this repo's audit
found and flagged exactly that pattern in PrometheusK as something *not* to copy
(`docs/AUTH_REFERENCE_IMPLEMENTATION.md`'s behavior #8).

### 6. Return paths

Every `?return=` parameter, anywhere in the product, must be validated before use —
`@avatark/auth`'s `safeReturnPath(raw, fallback)` (re-exported as `@avatark/navigation`'s
`buildReturnPath`). It resolves the value against a dummy origin and rejects anything that isn't a
same-origin relative path, including the backslash-host bypass (`/\evil.example.com`) that a naive
`//`-only check misses. **Never** skip this step for a value that "looks safe" — this is the exact
guard `docs/AUTH_REFERENCE_IMPLEMENTATION.md` found PrometheusK's own `sanitizeNext` fails to catch.

### 7. Google OAuth

Two distinct URLs, easy to conflate (full detail: `docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md`):

1. **Google → Supabase**: `https://<your-project-ref>.supabase.co/auth/v1/callback` — registered in
   Google Cloud Console as the Authorized redirect URI. Belongs to the Supabase project, not the app.
2. **Supabase → the app**: `https://<your-app-origin>/auth/callback` — registered in Supabase's own
   **Authentication → URL Configuration → Redirect URLs** allowlist. This is a genuine allowlist
   (unlike Site URL, which is only a default fallback) — every real origin the product is served
   from (production, and any stable Preview alias) must be added explicitly, or the final redirect
   is rejected even though the OAuth flow itself succeeded.

Once configured, the sign-in page's own live capability check (step 1 above) picks it up
automatically — no code change needed per environment.

### 8. Magic link

Unconditional once `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are present — no
Supabase provider toggle gates it the way Google's does. If a magic-link email never arrives, check
Supabase's SMTP configuration and Resend/email-sending setup (`docs/PLATFORM_CONTRACTS.md`'s
Notification Center section names the current, unrelated state of transactional email in this repo)
rather than assuming a code defect in the sign-in flow itself.

## Verifying the mount

Use `@avatark/bootstrap` (`docs/PRODUCT_BOOTSTRAP.md`) rather than re-deriving these checks by hand:

```ts
import { validateProductEnv, checkProductConformance } from "@avatark/bootstrap"

const envReport = validateProductEnv({ productId: "gamek", supabaseUrl, supabaseAnonKey, siteUrl, callbackUrl })
const conformance = checkProductConformance("gamek", { env: { supabaseUrl, supabaseAnonKey, siteUrl, callbackUrl } })
```

`envReport` catches structural misconfiguration (missing/malformed values, origin mismatches,
registry/environment capability mismatches). `conformance`'s `auth`/`magic_link` checks reuse the
same validation; its `oauth` check can only ever report `needs_live_verification` — Google
enablement itself is a live Supabase setting this static tool cannot see, exactly as
`docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md` requires a human to confirm.

## What this guide does not cover

- It does not describe how to configure Supabase Auth itself (SMTP, provider secrets) — see
  `docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md` for Google specifically.
- It does not describe cross-Supabase-project identity federation. Each product in this ecosystem
  runs its own Supabase project today (`docs/PLATFORM_CONTRACTS.md`'s Identity section: "PrometheusK,
  GameK, and ArenaK each run separate Supabase projects — this contract does not make them
  interoperate") — a trust bridge is an explicit, not-yet-made decision, out of scope here.
