# Echo Domain Migration

Status: **code implemented, no DNS/production changes made.** This
document is the exact sequence to run later, once explicitly authorized —
nothing in it has been executed.

## What the code already does

`lib/sites/registry.ts` is the single site/domain registry:

```ts
export const SITE_REGISTRY = {
  institutional: { id: 'institutional', canonicalHost: 'avatark.ai', legacyHosts: [] },
  echo: { id: 'echo', canonicalHost: 'echo.avatark.ai', legacyHosts: ['next.avatark.ai'] },
}
```

`lib/sites/resolveSite.ts` reads the request's `host` header (via
`next/headers`), matches it against the registry, and is the **one** call
site that decides whether `/` renders the Echo landing page or the
existing institutional homepage (`app/page.tsx`). Every other route is
unambiguously one experience or the other regardless of host (`/founder`,
`/roadmap` → institutional always; everything else → Echo always), so no
other file needed to become host-aware.

For local development and any preview deployment without a matching
hostname, set `NEXT_PUBLIC_FORCE_SITE=echo` (or `institutional`) to force
`/` to render that experience. This was used throughout this build to
verify the Echo landing page without real DNS; it is **not** required in
any real deployment where the `host` header already matches the registry.

Verified (this pass, no code changes needed beyond the above):
- Default (no override, no matching host) → institutional homepage.
  ✓ unchanged.
- `Host: echo.avatark.ai` → Echo landing page. ✓
- `Host: next.avatark.ai` → Echo landing page (legacy host). ✓
- `/founder`, `/roadmap`, `/admin` → unaffected by any of the above. ✓

## Migration steps (not yet run — require explicit authorization)

1. **Add `echo.avatark.ai` to the correct Vercel project.** This repo
   (`avatark-platform-web`) is the one project — confirm via
   `.vercel/repo.json` (`prj_RPbcDpUZC8nqnxCKscoct0k5pe0A`) — no second
   project or repo is involved.
2. **Add or verify the DNS record** for `echo.avatark.ai` pointing at that
   Vercel project.
3. **Verify SSL** issues automatically for the new hostname once DNS
   resolves (standard Vercel behavior); confirm in the Vercel dashboard.
4. **Verify auth redirect allowlists.** Supabase Auth's redirect URL
   allowlist must include `https://echo.avatark.ai/auth/callback`
   alongside whatever `next.avatark.ai`/preview URLs are already there.
5. **Verify magic-link redirect URLs.** `app/auth/sign-in/page.tsx`'s
   `signInWithOtp` and `app/auth/callback/route.ts` both rely on
   `lib/auth/safeReturnPath.ts`'s same-origin check — confirm a magic link
   requested from `echo.avatark.ai` round-trips back to
   `echo.avatark.ai`, not a different host.
6. **Verify Google OAuth redirect URLs**, if/when
   `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` is turned on — the OAuth app's
   authorized redirect URIs need `echo.avatark.ai`'s callback added
   alongside existing hosts.
7. **Verify cross-product links** still resolve correctly: PrometheusK's
   `ONBOARDING_ALLOWED_RETURN_ORIGINS` / `isAllowedReturnOrigin()`
   (`lib/onboarding/returnOrigin.ts` in this repo's onboarding pipeline)
   must include `https://echo.avatark.ai` once that's the real host
   completions return to — otherwise the receipt-based return-to-AvatarK
   flow will reject a real completion.
8. **Test production** end-to-end on `echo.avatark.ai`: landing page,
   Start Here, invitation entry, Watch First, Discover, Echo/Practice
   detail, the full PrometheusK handoff and return via `/continue`, and
   the signed-in `/today`/`/my/echo`/`/my/journey`/`/my/journal` surfaces.
9. **Redirect or retire `next.avatark.ai` only after step 8 passes.**
   Until then, `next.avatark.ai` keeps serving the identical Echo
   experience (it's a legacy host in the same registry entry) — no user
   sees a broken or different experience during the transition, and no
   redirect happens automatically or silently.

## Explicitly not done in this task

No DNS records were added or changed. No Vercel project/domain
configuration was changed. No Supabase Auth or OAuth redirect allowlists
were changed. No traffic was redirected. All of the above require your
explicit authorization first, per the task's own instructions.
