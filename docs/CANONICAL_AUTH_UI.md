# Canonical Auth UI — `@avatark/auth-ui` (Mission Parts 2–3)

Status: **wired into `app/auth/sign-in/page.tsx` (Part 16 landed).** `app/auth/callback/route.ts` needed no changes — it already used `@avatark/auth`'s `safeReturnPath`/`classifyCallbackFailure` directly and renders no UI itself (a pure server redirect).

## Why this exists

The audit (`docs/IDENTITY_RC1_AUDIT.md`, Finding 2) confirmed zero prior art for a canonical sign-in UI existed anywhere in the repo — `packages/auth` is a logic-only package (`safeReturnPath`, `classifyCallbackFailure`), and `app/auth/sign-in/page.tsx` is a one-off implementation with no eyebrow, identity statement, product-return context, or footer. `@avatark/auth-ui` is the missing UI layer, built to compose with `@avatark/auth`'s existing, already-tested logic rather than duplicating it.

## Layering

```
@avatark/auth        -- logic only: safeReturnPath, classifyCallbackFailure, CALLBACK_ERROR_MESSAGES
@avatark/auth-ui      -- UI only: components below, depends on @avatark/auth for error copy
host app (AvatarK,    -- Supabase client calls, live provider-capability probe, product identity
GameK, ...)              config, actual routing -- none of this lives inside auth-ui
```

`auth-ui` holds **no Supabase credentials, no project ref, and no environment-variable reads** — enforced by `src/noSecrets.test.ts`, which greps every non-test source file for Supabase-shaped strings, JWT-shaped literals, and `process.env.*` reads.

## Component contract

| Component | Role |
|---|---|
| `AuthShell` | Frozen top of the hierarchy: "AVATARK IDENTITY" eyebrow, "Sign in" heading, "One identity across the AvatarK ecosystem." statement. Wraps everything else. |
| `ProductIdentityProvider` / `useProductIdentity` | React context carrying `{ productId, productName, signInContext, defaultReturnPath }` — the narrow slice of Part 4's product identity config this package needs. |
| `SignInCard` | Composes `ReturnDestination` → `ProviderButtons` → (host-supplied children, e.g. an error state) → `MagicLinkForm` → `AuthFooter`, in that fixed order. |
| `ProviderButtons` | Renders `GoogleProviderButton` only when `shouldShowGoogleButton(capabilities)` is true; always renders `ProviderDivider` alongside any provider; has a slot for future configured providers. |
| `GoogleProviderButton` | Pure button; the host supplies `onClick` (the real OAuth kick-off) and decides whether to render it at all via capabilities. |
| `ProviderDivider` | The "or" divider between provider buttons and the magic-link form. |
| `MagicLinkForm` | Email field + submit; calls host-supplied `onSubmit(email)` — never touches Supabase itself. |
| `AuthLoadingState` | "Checking sign-in status..." — shown while session/capability checks are in flight, to avoid a signed-out flash. |
| `AuthUnavailableState` | Renders **only** `"Sign-in is temporarily unavailable. Please try again later."` — accepts no reason/detail prop, so there is no code path that could leak a misconfiguration string through it (enforced by `noSecrets.test.ts`). |
| `AuthErrorState` | Renders `callbackErrorMessage(reason)` from `@avatark/auth` — one of the 5 classified, consumer-safe messages, never a raw provider error string. |
| `MagicLinkSentState` | "Check `{email}` for a sign-in link." |
| `SignedInTransition` | "Signed in. Returning you to `{productName}`..." — shown between successful callback and redirect. |
| `ReturnDestination` | Renders the product's `signInContext` sentence. Does **not** re-validate the return path — that already happened via `safeReturnPath` before this component mounts. |
| `AuthFooter` | Support/privacy/terms/status links — all hrefs host-supplied, no hardcoded URLs. |

## Canonical copy (`src/copy.ts`)

Base copy (frozen, identical for every product):

- Eyebrow: `AVATARK IDENTITY`
- Heading: `Sign in`
- Identity statement: `One identity across the AvatarK ecosystem.`
- Unavailable state: `Sign-in is temporarily unavailable. Please try again later.`

Product return-context sentences (`PRODUCT_SIGN_IN_CONTEXT`):

| Product | Sentence |
|---|---|
| GameK | You will return to GameK when sign-in is complete. |
| StudioK | You will return to StudioK to continue creating. |
| StreamK | You will return to StreamK to continue watching. |
| CinemaK | You will return to CinemaK to continue your cinematic experience. |
| ArenaK | You will return to ArenaK to continue your invitation, event, or challenge. |
| PrometheusK | You will return to PrometheusK, where your practices and Living Echo live. |
| Atlas | You will return to Atlas to continue your project or research. |
| SetpointK | You will return to SetpointK to continue with your authorized physiological data experience. |

AvatarK itself has no return-context sentence — it's the home product; `ReturnDestination` is only meaningful when arriving *from* another product.

`FORBIDDEN_DIAGNOSTIC_PHRASES` (also in `copy.ts`) is the shared regression list — any copy string rendered by this package is tested against it (`copy.test.ts`), so a future edit can't accidentally reintroduce "Supabase is misconfigured"-style text into user-facing copy.

## Provider-capability detection

`auth-ui` defines its own `AuthProviderCapabilities` shape (`{ google: boolean, status: 'enabled'|'disabled'|'unavailable' }`) mirroring `lib/auth/authProviderCapabilities.ts`'s existing live probe, **without importing from `lib/`** (packages must not depend on host app code). The host is responsible for running the actual probe (Supabase's `/auth/v1/settings` endpoint today, or an equivalent for a future non-Supabase host) and passing the result into `<ProviderButtons capabilities={...} />`. `shouldShowGoogleButton()` is the one pure gating function — `status !== 'enabled'` always hides the button, so an inconclusive check never offers a provider AvatarK can't confirm works.

## Composition example

```tsx
<ProductIdentityProvider value={{ productId: "gamek", productName: "GameK", signInContext: PRODUCT_SIGN_IN_CONTEXT.gamek, defaultReturnPath: "/dashboard" }}>
  <AuthShell>
    {capabilitiesLoading ? (
      <AuthLoadingState />
    ) : capabilitiesUnavailable ? (
      <AuthUnavailableState />
    ) : (
      <SignInCard
        capabilities={capabilities}
        onGoogleSignIn={handleGoogleSignIn}
        onMagicLinkSubmit={handleMagicLinkSubmit}
        footerLinks={{ support: "/support", privacy: "/privacy", terms: "/terms", status: "/status" }}
      >
        {callbackError && <AuthErrorState reason={callbackError} />}
      </SignInCard>
    )}
  </AuthShell>
</ProductIdentityProvider>
```

## Tests

`src/copy.test.ts`, `src/providerCapabilities.test.ts`, `src/noSecrets.test.ts` — 12 cases, all passing: base copy correctness, all 8 product sentences present and verbatim, no forbidden phrase in any rendered copy, Google-button gating logic (enabled/disabled/unavailable), and the no-secrets/no-env-read regression sweep.

## Part 16 migration outcome

1. **Resolved:** `app/auth/sign-in/page.tsx` uses `getProductIdentityConfig('avatark')` unmodified — `defaultReturnPath` is never overridden by the raw `return` query param (that would have been re-introducing an unvalidated trust path). The `return` param is only ever echoed into the callback URL, same as before; `app/auth/callback/route.ts`'s existing `safeReturnPath` call is the sole place that validates it.
2. **Resolved:** `AuthErrorState` receives the raw `error` query param string directly and passes it straight to `@avatark/auth`'s `callbackErrorMessage()` — no new classification logic was needed in the page.
3. **Resolved:** Supabase call sites (`signInWithOAuth`, `signInWithOtp`) remain entirely in `app/auth/sign-in/page.tsx`; `auth-ui` only received the submitted email/click events via `onMagicLinkSubmit`/`onGoogleSignIn`.
4. **New during migration:** `GoogleProviderButton`/`ProviderButtons`/`SignInCard` gained an optional `label`/`googleRedirecting` prop — the original page showed a "Redirecting..." label and disabled the button while the OAuth kick-off was in flight, which the first-cut component contract had no way to express. Added rather than silently dropping that behavior.
5. **Known gap:** no browser-level visual verification (desktop/tablet/mobile) was performed for the migrated sign-in page — only `pnpm typecheck`/`pnpm test`/`pnpm lint`/`pnpm build` passed. See `docs/IDENTITY_RC1_RELEASE_GATE.md`.
