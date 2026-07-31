# AvatarK Identity RC1 — Release Gate

This is a ground-truth checklist against the mission's Part 19 criteria, verified by re-running the actual commands, not inferred from what was written. `READY_FOR_PRODUCT_ADOPTION` is set honestly below — it is **not** `true` merely because code compiles.

## Checklist

| Criterion | Status | Evidence |
|---|---|---|
| AvatarK consumes the extracted packages | ✅ | `app/account/page.tsx` imports `@avatark/account`/`@avatark/account-ui` (workspace, not tarball); `app/auth/sign-in/page.tsx` imports `@avatark/auth-ui`. `avatark-account-0.1.1.tgz` deleted, `package.json` updated. |
| Sign-in and account visuals pass desktop/tablet/mobile review | ❌ **NOT DONE** | No browser was used this session. `pnpm build`/`typecheck`/`lint`/`test` all pass, which confirms the pages compile and render server-side without throwing — it does **not** confirm visual parity, responsive layout, or that the DARK AvatarK look was preserved. This is a real, unclosed gap, not a rounding error. |
| Google-provider visibility is dynamically resolved | ✅ | Unchanged live-capability-probe mechanism (`lib/auth/authProviderCapabilities.ts`), now threaded through `@avatark/auth-ui`'s `shouldShowGoogleButton()`. No static `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` dependency anywhere in the new code. |
| Magic-link flow is intact | ✅ | `MagicLinkForm`/`MagicLinkSentState` wired to the same `supabase.auth.signInWithOtp` call as before; behavior unchanged, only the UI composition changed. |
| Callback and safe return paths pass tests | ✅ | `packages/auth/src/safeReturnPath.test.ts`, `callbackError.test.ts` — pre-existing, still passing. `app/auth/callback/route.ts` untouched (already correct). |
| Product configuration exists for all nine products | ✅ | `PRODUCT_IDENTITY_CONFIGS` (`packages/product-registry/src/identityConfig.ts`) — all 9, tested (`identityConfig.test.ts`, 7 cases). |
| CinemaK and StatpointK are marked live | ⚠️ **Partial, by design** | Both are `deploymentStatus: 'live'` (DNS-reachable, correctly distinguished from "coming soon"). Neither is `accessState: 'available'` or `integrationStatus: 'live'` — that's the mission's own required distinction (deployment ≠ integration ≠ access), not an oversight. |
| Locale contract is frozen | ✅ | `@avatark/locale`: en-US/en-IN `available`, es/fr/hi/te/ta `planned`. 12 tests passing. |
| Appearance contract is frozen | ✅ | `@avatark/appearance`: system/dark `complete`, light `internal`, high-contrast `planned`. 9 products' accent tokens. 6 tests passing. |
| Membership/entitlement/role/capability contracts are frozen | ✅ | `@avatark/membership`'s `entitlement.ts` (`ProductAccess`, `resolveCapability`, default-deny). 7 tests passing. |
| Organization contract is frozen | ✅ | `@avatark/organizations`'s `context.ts` (current org, switching, org-scoped entitlement). 6 tests passing. |
| Extension-slot API is frozen | ✅ | `packages/account/src/contracts/adapters.ts`'s `ExtensionAdapter`/`ExtensionSlotContent`, rendered by `ExtensionTab`. All 9 products' extension domains registered in `identityConfig.ts`. |
| Diagnostics are protected | ⚠️ **Partial** | The 3-tier contract (`lib/admin/diagnosticsTiers.ts`) exists and is tested (8 cases), but **is not wired into `app/admin/**`'s actual routes** — those still run on the pre-existing single `role === 'admin'` check only. The contract layer is real; the enforcement wiring is not done. `docs/SAFE_DIAGNOSTICS.md` states this explicitly as a non-goal of this phase — it is not silently claimed done here. |
| Secret-exposure regression tests pass | ✅ | `packages/auth-ui/src/noSecrets.test.ts`, `packages/account/src/importBoundary.test.ts`, `lib/admin/diagnosticsTiers.test.ts`'s redaction fixture — all passing. |
| Packages build and pack deterministically | ✅ | `pnpm run build:packages` (19/19) and `pnpm run pack:packages` (19/19, checksummed) both re-run clean this session. |
| Migration artifacts are generated | ✅ | `docs/migrations/IDENTITY_{GAMEK,STUDIOK,STREAMK,CINEMAK,ARENAK,ATLAS,SETPOINTK,PROMETHEUSK}.md` — all 8, plus pointers added from the 5 prior narrower guides. |
| Package versions are assigned | ✅ | `@avatark/account` 0.2.0 (ownership transfer), `@avatark/auth-ui`/`locale`/`appearance` 0.1.0 (new). See `docs/IDENTITY_PACKAGE_DISTRIBUTION.md`. |
| No open critical security defects | ⚠️ **One found and fixed; no dedicated audit performed** | Found and fixed during this session: `SignInMethodsTab` exposed an Apple OAuth deployment checklist (Team ID/Key ID/callback URLs) to every consumer, violating the mission's explicit "hide unconfigured providers" rule. No dedicated security-review pass (e.g. a full `/security-review`) was run against the full diff — the fixes made were found organically while implementing, not via exhaustive audit. |
| No product mounting instructions depend on uncommitted code | ⚠️ **Pending commit** | True once this session's changes are committed and pushed, per the instructions below — not true before that. |

## Known deferred architectural risk (not a blocker, tracked honestly)

Two independent avatar-menu implementations still exist (`components/echo/shell/EchoAvatarMenu.tsx` and `@avatark/account-ui`'s `AvatarMenu`) with diverging contracts. They do not visibly duplicate on any single screen today, so this was not treated as a release blocker — but merging them is real, separate work, not yet done. See `docs/CANONICAL_ACCOUNT_SHELL.md`.

## READY_FOR_PRODUCT_ADOPTION

```
READY_FOR_PRODUCT_ADOPTION = false
```

**Why false, precisely:** three real, named gaps remain — (1) no browser-level visual verification of the migrated sign-in/account surfaces at desktop/tablet/mobile, (2) diagnostics tiers are a tested contract but not wired into `app/admin/**`'s actual gating, (3) no dedicated security-review pass was run against the full changeset. None of these are fabricated caution — each is a specific, checkable, currently-true gap. Every other mission criterion is genuinely met, verified by re-running the actual command (not assumed). Closing gaps 1–3 is what should flip this to `true`, not a second pass of "everything looks fine."
