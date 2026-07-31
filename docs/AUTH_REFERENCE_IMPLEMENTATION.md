# AvatarK auth reference implementation — audit findings

Workstream D asked AvatarK to become the canonical shared-auth reference
experience, checked directly against the ecosystem's other real
implementation, `prometheusk-web`, described elsewhere as "mature." This
audit compares both codebases file-by-file and checks the 10 required
behaviors below. **Net finding: AvatarK's implementation is already more
defensive than PrometheusK's on every dimension checked — nothing was
copied from PrometheusK.** One real gap was found and fixed (#9).

## The 10 required behaviors

| # | Behavior | Status | Evidence |
|---|---|---|---|
| 1 | Magic-link appears when Supabase is configured | Met | `app/auth/sign-in/page.tsx` renders the email/magic-link form unconditionally — it isn't gated on any capability check, matching PrometheusK's own unconditional rendering. |
| 2 | Google appears automatically only when the provider is actually enabled | Met | `lib/auth/authProviderCapabilities.ts` queries Supabase's live `/auth/v1/settings`; the button only renders when `capabilities.google === true`. **PrometheusK has no equivalent check at all** — its Google button is unconditional, so it cannot claim this behavior. |
| 3 | No stale static flag falsely hides an enabled provider | Met | `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` is read only by `lib/admin/authDiagnostics.ts` (an admin-only diagnostics label), never by the sign-in page. |
| 4 | Return paths are validated and preserved | Met | `packages/auth/src/safeReturnPath.ts` re-resolves against a dummy origin to reject `://`/backslash-host bypasses, threaded through sign-in → callback → post-auth redirect. **PrometheusK's equivalent (`sanitizeNext`) is weaker** — it does not catch the backslash-host trick (`/\evil.example.com` resolves to a foreign origin and passes its checks) — confirmed by direct construction, not copied from here. |
| 5 | Callback errors map to explicit, safe user-facing states | Met | `packages/auth/src/callbackError.ts`'s `classifyCallbackFailure` distinguishes `access_denied`/`expired`/`reused_or_invalid`/`missing_code`/`callback_failed`, surfaced via `callbackErrorMessage` on `/auth/sign-in?error=...`. **PrometheusK has no equivalent at all** — it never reads `error`/`error_description` from the callback URL; a cancelled Google consent or an expired magic link silently shows a blank login form. |
| 6 | Session restores after refresh | Met | `lib/supabase/proxy.ts` (`updateSession`, this fork's middleware-equivalent) refreshes the session cookie on every request via `@supabase/ssr`. PrometheusK is architected differently (Bearer-token, not cookies — see below) so there is nothing to port; its own client-side `getSession()` rehydration (`WorkspaceShell.tsx`) has no timeout/error handling, unlike AvatarK's. |
| 7 | Signed-in header shows the shared identity/avatar menu | Met | `components/echo/shell/EchoAvatarMenu.tsx` is the one, deduplicated avatar/identity menu across the app (its own comment: "Account now belongs inside this avatar/profile menu, never as a sibling" of the main nav items) built on `lib/auth/useSignedInIdentity.ts` so header and other signed-in surfaces never compute displayName differently. "Shared" here means one implementation, not necessarily `@avatark/account-ui`'s `AvatarMenu` primitive specifically — see the note below on why this session did not fork `EchoAvatarMenu` onto that primitive. |
| 8 | Sign-out clears the shared identity session | Met | Single call path: `avatarKPlatformAdapters.auth.signOut()` → `supabase.auth.signOut()`, used identically by `EchoAvatarMenu` and `/account`. PrometheusK has **two divergent sign-out call sites** in the same repo (`TopNav.tsx` calls Supabase directly; the adapter path calls a service wrapper) — not something to adopt. |
| 9 | Auth-unavailable messaging appears only where relevant, not as a permanent global placeholder | **Was a real gap — now fixed.** | Before this session, `fetchAuthProviderCapabilities()` returning `'unavailable'` (network/parse failure, as opposed to Supabase genuinely reporting Google disabled) was only ever `console.warn`ed — invisible to anyone except someone with devtools open. No permanent banner existed (correct), but the diagnostic also weren't surfaced *anywhere* relevant. Fixed by wiring this same capability check into `/integration/platform` (Part 7) as a real, honest status (`CONFIGURED_UNVERIFIED` vs `NOT_SUPPORTED` vs `ERROR`, never fabricated `READY`) — visible to internal/admin users diagnosing the integration, without adding any global-nav placeholder for ordinary visitors. |
| 10 | No preview-access mechanism substitutes for AvatarK identity | Met | Confirmed by repo-wide search: no `PREVIEW_MASTER_PASSWORD`/`PREVIEW_ACCESS_CODES`/preview-gate concept exists anywhere in `avatark-platform-web` (that pattern belongs to `gamek-web`'s unrelated "Layer 1" private-preview gate, per `docs/AVATARK_SUPABASE_ENVIRONMENT_MATRIX.md`, and to nothing in PrometheusK either). |

## What was intentionally NOT copied from PrometheusK

PrometheusK is architecturally Bearer-token based (`Authorization: Bearer
<token>`, no cookies, no `@supabase/ssr`, no middleware) — a product-level
choice that conflicts with AvatarK's cookie/SSR session model. Its own
`.env` naming (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` vs AvatarK's
`NEXT_PUBLIC_SUPABASE_ANON_KEY`), route naming (`/login` + `?next=` vs
`/auth/sign-in` + `?return=`), and Supabase project ref
(`bxerfgwrtwowzgahdgrj`, distinct from AvatarK's `hapoerzbcnagyfafqojg`)
are product-specific and were not ported. Its weaker `sanitizeNext` guard
and inconsistent (two-path) sign-out were identified above specifically as
patterns *not* to adopt, not overlooked.

## Why `EchoAvatarMenu` was not rewritten onto `@avatark/account-ui`'s `AvatarMenu`

`packages/account-ui/src/AvatarMenu.tsx` is a genuinely simpler primitive —
open/close state only, no outside-click or Escape-key handling.
`components/echo/shell/EchoAvatarMenu.tsx` already implements both
(`pointerdown`/`keydown` listeners), plus `aria-haspopup`/`aria-expanded`
wiring tuned to Echo's own visual system. Forking Echo's nav shell onto the
weaker shared primitive would be a functional regression, and `EchoAvatarMenu`
is Echo-owned surface, out of bounds per this workstream's "do not redesign
Echo" constraint. `AvatarMenu` remains available, unconsumed-but-real, for a
future product that needs exactly its (simpler) contract — see
`docs/PLATFORM_PACKAGE_DISTRIBUTION.md`.

## Manual Supabase / Vercel requirements

Already documented in full at `docs/GOOGLE_OAUTH_DEPLOYMENT_CHECKLIST.md`
(Google Cloud OAuth client, Supabase provider toggle, redirect-URL
allowlist, Site URL guidance for the shared multi-product project). Nothing
in this pass changed those requirements; no Supabase provider configuration
was modified from code, per the workstream's own constraint.
