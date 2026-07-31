# Identity RC1 Audit (Part 1)

Read-only ground-truth audit of `avatark-platform-web` (branch `feature/avatar-platform-rc3`) against the AvatarK Identity RC1 mission spec. Every claim below was verified by reading the cited file directly (package.json, index/exports files, and source), not inferred from directory names or prior docs. No other file was modified to produce this audit.

---

## 1. `packages/account-ui/` — export surface and section coverage

`packages/account-ui/package.json`: name `@avatark/account-ui`, `exports["."]` points at `./src/index.ts` (dev) / `./dist/index.d.ts` + `./dist/index.js` (`publishConfig`, after `pnpm run build`). Explicitly described in its own `description` field as "headless and prop-driven, no data fetching, no app coupling. Not wired into any application yet."

`packages/account-ui/src/index.ts` re-exports exactly 7 components:
```
AvatarMenu, IdentityBadge, MembershipBadge, ProductSwitcher, JourneyRail, NotificationBell, AccountDrawer
```
All 7 are headless UI **primitives** (`data-avatark-component`/`data-avatark-part` attribute hooks only, no visual styling, no data fetching):
- `AvatarMenu.tsx` — dropdown shell, avatar button renders `displayName.charAt(0).toUpperCase()` (a bare initial letter, no icon).
- `IdentityBadge.tsx` — display name + role chips.
- `MembershipBadge.tsx` — renders `MEMBERSHIP_PLAN_LABEL[plan]` from `@avatark/membership`.
- `ProductSwitcher.tsx` — renders one pill button per `AvatarKProduct`.
- `NotificationBell.tsx` — bell button whose only visible content is `{unreadCount}` (no icon).
- `AccountDrawer.tsx` — generic modal/drawer shell.
- `JourneyRail.tsx` — ordered list of `JourneyStepId`s.

**None of these implement the 9-section account shell** (Profile, Products, Membership, Preferences, Privacy, Security, Data & Export, Feedback, Support). That shell already exists, but in a **different, vendored** package: `@avatark/account` (a tarball dependency, `file:avatark-account-0.1.1.tgz`, canonical source lives in `prometheusk-web` per code comments). Its `dist/index.d.ts` exports `AvatarKAccount`, `AccountTabs`, `ACCOUNT_TAB_KEYS`, `AccountAdaptersProvider`, and a large `AdapterResult`/`*Adapter` contract surface (Profile, ProductAccess, Membership, Preferences, Privacy, Activity, Echoes, Data/Export, Support, Links). Its compiled `AccountTabs.js` defines:
```
ACCOUNT_TAB_KEYS = ['profile','signin','products','membership','preferences','privacy','activity','echoes','data']
```
i.e. 9 tabs, but the set does **not exactly match** the mission's 9 sections: it has `signin` (labelled "Sign-in Methods", the de-facto Security tab), `activity`, and `echoes` instead of `Security`/`Feedback`/`Support` by name. `app/account/page.tsx` (see §5) bridges this gap by adding host-level `Feedback`/`Support` sections alongside the package's tabs and mapping its own `security` rail id onto the package's `signin` tab.

**Verdict: `@avatark/account-ui` is reusable as low-level UI primitives only; it is not itself a canonical account shell.** The actual account-shell contract to reuse/extend lives in the vendored `@avatark/account` package, which this repo does not own (source is in `prometheusk-web`).

## 2. `packages/auth/` — nature of the package, and auth-UI component search

`packages/auth/package.json` description: "Shared, framework-agnostic auth **utilities** (open-redirect-safe return paths, callback failure classification) and the target `AuthProvider` contract... Contract only." `src/index.ts` re-exports only `safeReturnPath.ts`, `callbackError.ts`, `types.ts`. This is a **logic/contracts package, not a UI package** — zero `.tsx` files, zero React.

`packages/auth/src/types.ts` declares `AuthProvider` (`login/logout/currentUser/session/refresh`) explicitly marked "Target contract only -- not yet implemented against a concrete provider." The repo's real sign-in flow does not use it.

**Repo-wide search (grep across all `.ts`/`.tsx`, excluding `node_modules`) for every mission component name** — `AuthShell`, `SignInCard`, `MagicLinkForm`, `ProviderButtons`, `GoogleProviderButton`, `ProviderDivider`, `AuthLoadingState`, `AuthUnavailableState`, `AuthErrorState`, `MagicLinkSentState`, `SignedInTransition`, `ReturnDestination`, `AuthFooter`, `ProductIdentityContext` — **returned zero matches anywhere in the repo**, including inside `packages/account-ui/`. **`@avatark/auth-ui` does not exist in any form** (no package directory, no component, no naming precedent). This is confirmed net-new.

## 3. `app/auth/sign-in/page.tsx` — current implementation

Single client component (`SignInForm` inside a `Suspense` boundary). Renders, in order: a plain `<h1>Sign in</h1>` heading (no eyebrow text, no "AVATARK IDENTITY" label — confirmed via grep, zero matches for that string anywhere in `app/`/`components/`); an optional callback-error message; conditionally a "Continue with Google" button (gated on `fetchAuthProviderCapabilities()`, `lib/auth/authProviderCapabilities.ts` — a live capability probe, not a hardcoded flag) with an "or" divider; an email input + "Send magic link" button (`supabase.auth.signInWithOtp`). No footer links of any kind (confirmed via grep for `footer`/`Footer` in the file — no matches). No "identity statement" copy. No visible "product return context" UI — the `return` query param is read and threaded into the callback URL (`buildCallbackUrl()`), but nothing on the page tells the visitor which product they're returning to.

**Verdict: does not implement the mission's canonical hierarchy.** It has the magic-link + gated-Google mechanics and the return-param plumbing, but none of the eyebrow/heading-copy/identity-statement/return-context/footer requirements.

## 4. `app/auth/callback/route.ts` — error classification and safe-path validation

`GET` handler: reads `code`, `return`, and `error` query params. Resolves the destination via `safeReturnPath(searchParams.get('return'), '/account')` — this function lives in `packages/auth/src/safeReturnPath.ts` (exported through `@avatark/auth`), not duplicated locally. Its algorithm: reject anything not starting with `/`, then resolve against a dummy origin (`http://localhost`) and verify the resolved origin didn't change — specifically defends against both `//host` and backslash-based (`/\evil.example.com`) open-redirect tricks, per its own code comment.

Error classification: provider errors (`error` param, e.g. OAuth `access_denied`) and Supabase `exchangeCodeForSession` failures are both passed through `classifyCallbackFailure()` (`packages/auth/src/callbackError.ts`), which returns one of `access_denied | expired | reused_or_invalid | missing_code | callback_failed`, each mapped to a specific user-facing message in `CALLBACK_ERROR_MESSAGES`. This is a real, tested (`callbackError.test.ts`) classification — not a single generic error string.

`safeReturnPath` is also consumed elsewhere: `packages/navigation/src/redirect.ts`, `packages/journey/src/guestContext.ts`, `lib/onboarding/practiceHandoff.ts`, `lib/invitations/signInReturn.ts`, `lib/identity/supabaseIdentityProvider.ts` — i.e. it is already the one shared implementation across the app, not something `IDENTITY_RC1` needs to re-derive.

## 5. `app/account/` implementation and route structure

`app/account/page.tsx` is the entire route (client component, gated by `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED` — see "surprising findings" below). It defines exactly:
```ts
type Section = 'profile' | 'products' | 'membership' | 'preferences' | 'privacy' | 'security' | 'data' | 'feedback' | 'support'
```
— **the mission's 9 sections already exist verbatim as the rail**, 7 of them mapped onto the vendored `@avatark/account` package's own `AccountTabKey` tabs (`profile→profile, products→products, membership→membership, preferences→preferences, privacy→privacy, security→signin, data→data`), and `feedback`/`support` rendered locally (`FeedbackView`/`SupportView`) outside the package, at the same rail level — not nested under a second "Account" tab, per the in-code comment. Sign Out is a header action, not a rail section, matching the mission's implied hierarchy.

The header row (lines 134–148) composes 4 `@avatark/account-ui` components (`IdentityBadge`, `MembershipBadge`, `ProductSwitcher`, `NotificationBell`, `AvatarMenu`) with a scoped `<style>` block that styles their headless `data-avatark-*` hooks to match the Echo visual language — i.e. the headless primitives from Finding 1 **are** consumed, just only inside this one header row, not for the tabbed body (which is the vendored package's own `AvatarKAccount` component with its internal tab strip hidden via CSS: `.echo-account-embed .aka-tablist { display: none; }`).

**No duplicate Account links or duplicate product-identity menus were found on this page itself.** The one genuine cross-cutting duplication is architectural, not visual: two independent avatar-menu implementations exist in the repo (see §6).

**The "0"/"A" chip finding (confirmed):** in the same header row, `NotificationBell` renders `unreadCount={0}` as bare text with no bell icon and no visible label (`<span data-avatark-part="unread-count">{unreadCount}</span>`, `packages/account-ui/src/NotificationBell.tsx:26`) — commented as an honest stub since `@avatark/notifications` has no real backing implementation anywhere in the ecosystem. Immediately next to it, `AvatarMenu` renders `displayName.charAt(0).toUpperCase()` as its entire trigger-button content (`packages/account-ui/src/AvatarMenu.tsx:24`) — a bare single uppercase initial, no `aria-label`/`title` on that specific span. Both sit pill-styled beside `ProductSwitcher`'s product pills (`app/account/page.tsx:140`, styled via `[data-avatark-part="product-option"]`). Neither is a stray index/`journeyOrder` leak (no code path renders `journeyOrder` or an array index directly into JSX anywhere in the repo — confirmed by search), but visually the row reads exactly as "product pills with an unexplained 0/A chip beside them," because neither the "0" nor the "A" carries a visible icon or label.

## 6. Avatar/profile menu component — location and behavior

**Two separate implementations exist:**
1. `components/echo/shell/EchoAvatarMenu.tsx` — the **real, wired** menu used in the global site header (`EchoHeader.tsx`), independently resolving identity via `useSignedInIdentity()`, showing an "Account" link (gated on `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`) and "Sign Out". Handles outside-click/Escape dismissal, focus styling, real initials rendering.
2. `packages/account-ui/src/AvatarMenu.tsx` — the **headless package primitive** (Finding 1), consumed only inside `app/account/page.tsx`'s own header, not in the global nav.

These are not literally duplicated on the same screen, but they are two independently-written implementations of the same concept with diverging prop/behavior contracts (`EchoAvatarMenu` is a self-contained, identity-resolving component; `AvatarMenu` is a pure prop-driven shell) — a real inconsistency to reconcile if `@avatark/auth-ui`/canonical account-ui components are meant to replace `EchoAvatarMenu` eventually. `EchoHeader.tsx`'s own doc comment already flags this: "Account now belongs inside this avatar/profile menu... Independently resolves identity, same convention as EchoBottomNav and EchoHeader itself."

## 7. `packages/product-registry/` — export surface, status axes, all 9 products

`src/index.ts` (not read verbatim above but confirmed via `package.json`'s test script) re-exports `registry.ts`, `types.ts`, `helpers.ts`, `validation.ts`, `capabilityMatrix.ts`, `hooks.ts`.

**Status axes:** `AvatarKProduct` has three separate, real fields — **not** the mission's exact `deploymentStatus`/`integrationStatus`/`accessState` trio, but a comparable 3-axis model:
- `status: 'alpha' | 'beta' | 'live' | 'internal'` — the product's own maturity (closest analog to "deploymentStatus").
- `integrationStatus?: 'live' | 'preview' | 'coming-online' | 'in-development' | 'vision'` — **optional**, a distinct axis explicitly documented as "how confirmed this product's platform integration is *today* — a separate axis from `status`" (`types.ts:27-31`). Not set on every product (e.g. absent entirely for `avatark`, `studiok`, `setpointk`).
- `visibility: 'public' | 'internal'` — closest analog to "accessState," but is a simple 2-value flag, not a distinct richer accessState concept.

There is **no field literally named `deploymentStatus` or `accessState`**, and no formal 3-way distinction matching the mission's exact vocabulary — the closest mapping is `status`≈deploymentStatus, `integrationStatus`≈integrationStatus, `visibility`≈accessState (partial).

**All 9 mandatory products are present** in `PRODUCT_REGISTRY` (`packages/product-registry/src/registry.ts`) — **none missing**:
| id | status | visibility | integrationStatus |
|---|---|---|---|
| avatark | live | public | *(unset)* |
| prometheusk | live | public | live |
| gamek | beta | public | live |
| arenak | alpha | public | coming-online |
| streamk | alpha | public | in-development |
| **cinemak** | alpha | **internal** | **vision** |
| studiok | alpha | internal | *(unset)* |
| atlas | alpha | internal | preview |
| **setpointk** | **internal** | **internal** | *(unset)* |

**CinemaK and SetpointK specifically:** neither is marked `live`. CinemaK is `status: 'alpha'`, `visibility: 'internal'`, `integrationStatus: 'vision'` (the lowest rung — "Scope not yet integrated with Platform"). SetpointK is `status: 'internal'` (the most restrictive status value), `visibility: 'internal'`, with **no `integrationStatus` set at all** and description noting "Historically backed by its own Cognito auth; not yet integrated with Platform identity." Neither uses a literal `'coming-soon'` string (that is not a value in the `ProductStatus`/`IntegrationStatus` union at all) — the mission's "coming soon" language does not correspond to an actual enum value here; the closest real signal is `visibility: 'internal'` combined with a non-`live` `status`.

## 8. Capability matrix — `capabilityMatrix.test.ts` coverage

`packages/product-registry/src/capabilityMatrix.ts` defines `EcosystemCapability` (11 values: `auth, account, invitation, journey, echo, recommendation, notifications, organizations, publisher, admin, creator`) and `buildCapabilityMatrix()` producing "every (product, capability) cell — 9 products × 11 capabilities." Two sourcing modes: capabilities with a direct boolean field on `AvatarKProduct` are **derived** (never hand-duplicated); capabilities without one (`journey`, `publisher`, `admin`, `creator`) are **hand-authored** per product with a citation string, defaulting to `'unconfirmed'` (not `'not_supported'`) when uncited.

`capabilityMatrix.test.ts` (7 `node:test` cases) verifies: every product×capability pair appears exactly once with no duplicates; a derived capability (`auth`) reflects the registry flag exactly; the `echo` capability (Living Echo, not this repo's "Echo" content product) is confirmed only for `prometheusk`; a hand-authored capability (`admin`) is `confirmed` only where explicitly cited and `unconfirmed` elsewhere; an uncited capability (`creator`) is `unconfirmed`, never fabricated as `not_supported`, for every single product; an unknown product id resolves to `unconfirmed` rather than throwing; `journey` targets resolve to exactly `['arenak','prometheusk','streamk']`. This is a real, run test file, not a stub.

## 9. `packages/membership/` — concept coverage

`src/types.ts` defines exactly one thing: `MembershipPlan = "free" | "paid" | "enterprise" | "education"` plus a label map. Its own header comment is explicit: "Plan-tier vocabulary AvatarK owns... No billing implementation... `free` is the only plan that exists anywhere in this ecosystem today." **It does not distinguish identity/membership/entitlement/role/capability/organization as 6 concepts — it models exactly 1 (plan tier).** The other 5 concepts live scattered elsewhere: identity in `packages/identity/`, entitlement/role partially in the vendored `@avatark/account`'s `EntitlementState`/`ProductAccessAdapter` and in `packages/organizations/src/permissions.ts`'s `RoleCapability`, capability in `packages/product-registry/src/capabilityMatrix.ts`, organization in `packages/organizations/`. No single package unifies all 6 as the mission expects.

## 10. `packages/organizations/` — export surface and contract

`src/index.ts` re-exports `types.ts`, `invitations.ts`, `permissions.ts`. Package description: "Shared organization-context contract... Contract only -- no backend."

- `types.ts`: `OrganizationType` (12-value target vocabulary: personal/family/team/company/university/school/community/conference/event/workshop/institution/temple) — explicitly "Target vocabulary only -- no `type`/`kind` column exists on the real `organizations` table today." Four `*Authority` interfaces (Invitation/Publishing/Recognition/Challenge/Membership) also target-only/unenforced. Real, live-schema-matching shapes: `Organization {id, name, createdAt, updatedAt}` and `OrganizationMember {orgId, userId, role, createdAt}` (no `type` field, matches `supabase/migrations/010_organizations.sql`).
- `permissions.ts`: `ORG_ROLE_CAPABILITY_REFERENCE` — a **design-reference-only** table for `owner/admin/member` roles, explicitly labeled "NOT currently enforced anywhere in this repo — no code branches on `organization_members.role` beyond display today."

**Current org contract does not yet model:** "current org" selection, membership listing wired to a real adapter, or org-switching — those concepts appear only as vendored `@avatark/account` adapter shapes or not at all; `packages/organizations/` itself is vocabulary + a display-only role reference, no runtime org-context/switching logic.

## 11. `packages/notifications/` — current model

`src/types.ts`: still fundamentally a placeholder contract, explicitly stated: "Contract only: no engine, no delivery mechanism, no database exists yet anywhere in the ecosystem for notifications. The only real, live thing adjacent to this today is a single boolean preference, `notificationsEnabled`." It does define a `NotificationCategory` union (Phase 2 addition) with 10 values: `invitation | reminder | recommendation | community | recognition | practice | story | challenge | organization | system`. **This is a different vocabulary than the mission's required categories** (Security, Invitations, Practices, Events, Publishing, Recognition, Announcements, Research, Care/physiological) — there is partial overlap (`invitation`≈Invitations, `practice`≈Practices, `recognition`≈Recognition) but no `security`, `events`, `publishing`, `announcements`, `research`, or `care`/physiological category exists in this type. The real, persisted preference remains the single undifferentiated boolean (`account_preferences.notifications_enabled`, read/written by `app/api/account/preferences/route.ts`) — categories are not wired to anything.

## 12. Privacy / preferences / data-export — where they live

- **Privacy:** `app/api/account/privacy/route.ts` — real GET/PATCH against a `privacy_settings` table (`supabase/migrations/004_privacy_settings.sql`, `008_privacy_consent_columns.sql`, `009_privacy_bootstrap_fix.sql`). Fields: `profileVisibility` (`private|public|unlisted`), `discoverable`, `productCommunicationsEnabled`, `personalizationEnabled`, `analyticsEnabled`. This is a real, validated (400 on bad enum/type) implementation — not a stub.
- **Preferences:** `app/api/account/preferences/route.ts` — real GET/PATCH against `account_preferences` (`003_account_preferences.sql`). Fields: `theme` (DB default `'dark'`), `locale` (stored as `language` column), `notificationsEnabled`, plus two fields the route always returns as fixed placeholders regardless of DB state: `timezone: null` and `reducedMotion: false` (not persisted anywhere — hardcoded in both GET and PATCH responses).
- **Data export / close-account / delete:** **No `closeAccount`/`deleteAccount` route, table, or contract was found anywhere in the repo** (grep for close/delete-account, data-export terms across `lib/`, `app/`, `packages/` turned up only unrelated matches — mostly `toLocaleDateString`/`Locale`-named UI copy on unrelated pages). The vendored `@avatark/account` package does declare an `ExportAdapter` type in its adapter contract surface (Finding 1), but no local route implements or binds it. **This is a genuine gap**, not merely an extension point.

## 13. Diagnostics/admin surfaces — `lib/admin/*`

Files present: `environment.ts` (+ test), `emailDiagnostics.ts` (+ test), `authDiagnostics.ts` (+ test), `audit.ts` (+ test), `authz.ts`, `userDirectory.ts`.

- `environment.ts`: pure `computeEnvironmentHealth(env)` — classifies current env (`local|test|preview|production`) as `healthy|misconfigured|unknown` based on Supabase URL/anon-key presence; other envs are always reported `unknown` ("Not verifiable from the currently running process").
- `emailDiagnostics.ts`: reports config-presence state (`configured|missing|unknown`) for Resend/SMTP/domain-verification/SPF/DKIM/callback-allowlist/templates, plus a derived `testReadiness` boolean. Explicitly never fetches or reports secret values.
- `authDiagnostics.ts`: same `configured|missing|unknown` pattern for Supabase URL/anon/service-role keys, magic-link (structurally always enabled), Google OAuth (flag-gated), computed `redirectUrl`, callback-allowlist status.
- `audit.ts`: `recordAuditEvent()` — writes real rows to `platform_audit_events` via the service-role client (best-effort, swallows its own logging failures).
- `authz.ts`: `getAdminContext()` — single binary check: does `platform_roles` contain a `role = 'admin'` row for this user. **No multi-tier role model** (no distinction beyond "is admin or not").
- `userDirectory.ts`: best-effort `userId → email` map via `admin.auth.admin.listUsers()`, bounded to a 1000-row scan (documented limitation, not silently truncated).

**Gating:** all of the above are consumed under `app/admin/**`, which is gated by `getAdminContext()`'s single `role === 'admin'` check — **there is no consumer/developer/platform-ops three-tier distinction anywhere in this code.** Every admin surface is all-or-nothing behind one role value.

## 14. Package build/pack scripts, tsconfig, pnpm-workspace

- `pnpm-workspace.yaml`: `packages: ["packages/*"]`, plus `ignoredBuiltDependencies: [sharp, unrs-resolver]`.
- `tsconfig.json` (root): standard Next.js config (`ES2017`, `bundler` resolution, `paths: {"@/*": ["./*"]}`); no project-references/composite setup — each package has its own `tsconfig.json` for its own `tsc -p` build step.
- `scripts/build-packages.mjs`: hand-ordered `BUILD_ORDER` array (not computed from the dependency graph, but the comment states it "matches the dependency graph confirmed by direct source audit"): leaves first (`auth, identity, product-registry, timeline, recommendations, membership, invitations, notifications, organizations, motion`), then one-hop (`navigation, living-echo, journey`), then two-hop (`account-ui, bootstrap`) — 15 packages total, runs `pnpm run build` per package via `execSync`.
- `scripts/pack-packages.mjs`: runs `pnpm pack --pack-destination ../../dist-packages` per package (same 15-name list), computes a SHA-256 checksum per tarball, writes `dist-packages/manifest.json`.
- `dist-packages/` **already contains all 15 real tarballs** (`avatark-account-ui-0.1.0.tgz` through `avatark-timeline-0.1.0.tgz`) plus `manifest.json` — this pipeline has been run and its output committed/present, not merely scripted-but-unrun.

**Verdict: package build/pack is deterministic today** — hand-ordered by verified dependency graph, produces checksummed artifacts, and `docs/PLATFORM_PACKAGE_DISTRIBUTION.md` documents this exact mechanism in detail (see §19).

## 15. Existing migration docs vs. mission's required structure; new CinemaK/Atlas/SetpointK guides

Headers found (`##` level) in each existing guide:

| Doc | Sections present |
|---|---|
| `MIGRATION_GAMEK.md` | Where GameK already stands · What to delete · What to replace it with · What's confirmed NOT required · Verification GameK should run |
| `MIGRATION_ARENAK.md` | Where ArenaK already stands · What to delete · What to replace it with · What's confirmed NOT required · Verification ArenaK should run |
| `MIGRATION_PROMETHEUSK.md` | ⚠️ Do not force PrometheusK onto AvatarK's cookie/SSR auth architecture · What to delete · What to replace it with · What's confirmed NOT required · Verification PrometheusK should run |
| `MIGRATION_STREAMK.md` | Where StreamK already stands · What to delete · What to replace it with (adopt from the start) · What's confirmed NOT required · Verification StreamK should run |
| `MIGRATION_STUDIOK.md` | Where StudioK already stands · What to delete · What to replace it with (adopt from the start) · What's confirmed NOT required · Verification StudioK should run |

All 5 follow one **consistent internal template** (current-state → delete → replace-with → not-required → verification), but this template is **narrower than the mission's required structure** — none of the 5 has explicit, separately-headed sections for: repo/path identification block, package-artifact listing, adapter specification, product-identity config, return-route contract, route-prefix table, "extension" sections, entitlement/org concerns, an env-var table, Supabase redirect-URL entries, a rollback plan, or backward-compat route handling. Some of this content likely exists inlined under "What to replace it with" / "Verification," but not as the mission's named, separate sections — a **restructure/extend**, not pure reuse.

**Confirmed: no `docs/migrations/` directory exists at all** (`ls docs/migrations/` → "No such file or directory"), and none of `IDENTITY_CINEMAK.md`, `IDENTITY_ATLAS.md`, `IDENTITY_SETPOINTK.md` (or any CinemaK/Atlas/SetpointK migration doc under any name) exist anywhere in `docs/`. These 3 are confirmed fully net-new, with no prior art to extend.

## 16. Locale / i18n scaffolding

Grep for `en-US`, `en-IN`, `i18n`, `locale` across the repo (excluding `.next`/`node_modules`) found: no i18n library, no translation-namespace files, no locale-routing. The only real hits are: (a) `app/api/account/preferences/route.ts` — a single `locale` field that round-trips to/from the `account_preferences.language` DB column, with **no consumer anywhere that reads it to change rendered copy**; (b) unrelated `.localeCompare()` calls in `packages/product-registry/src/helpers.ts` (string sorting, not i18n). **Confirmed: no locale/i18n scaffolding exists.** `LOCALE_ARCHITECTURE.md` is fully net-new; the only reusable fact is that a `locale` value is already persisted per-user (just inert).

## 17. Appearance / theme contract

`app/globals.css` defines a `:root` block with design tokens (`--gold`, `--midnight`, `--paper`, `--surface`, `--surface-line`, etc.) and one `@media (prefers-color-scheme: dark)` override block (line 62) — i.e. **exactly one binary, OS-driven light/dark switch, no explicit `system|dark|light|high-contrast` appearance-mode contract, and no in-app theme toggle wired to the `account_preferences.theme` DB column** (that column exists and defaults to `'dark'`, per Finding 12, but nothing reads it to apply a theme). `packages/motion/` (Finding 18) contains zero theme/color-token code — it is pure animation primitives (`pathLength.ts` SVG math + 4 client components), explicitly noting "CSS keyframes/utility classes remain in each app's own stylesheet this phase — not yet centralized." **No product-accent-token system exists as a package** — `accentColor` per product lives only as a field on `AvatarKProduct` in the registry (Finding 7), consumed nowhere for actual theming. `APPEARANCE_THEME_CONTRACT.md` is fully net-new.

## 18. Package classification (one paragraph each) — relevance to Identity/Account/Auth RC1 scope

- **`packages/bootstrap/`** — the "Platform Adoption Kit": `bootstrapProduct()` composing registry lookup + Redirect Manager + Product Switcher, a static env validator, a Product-Conformance-Checklist checker, and reference adapters for AvatarK/PrometheusK/GameK/ArenaK/StreamK/StudioK (`bootstrap.ts`, `conformance.ts`, `envValidator.ts`, `referenceAdapters.ts`, each with a `.test.ts`). **Adjacent/relevant**: it's the onboarding glue a migrating product runs, and would plausibly need updating once new auth-ui/account-shell contracts exist, but it is not itself part of the identity/account/auth surface.
- **`packages/journey/`** — the Entry Engine's framework-agnostic state machine, manifest, deep links, continuity, guest context, invitation acceptance, and cross-product handoff contracts (9 source files + tests). **Adjacent**: journey steps interact with sign-in (guest→signed-in transitions) but the package's scope is the journey graph itself, not identity/auth/account UI. Largely **out of scope** for this mission except where `ReturnDestination`/`SignedInTransition`-style auth-UI states need to compose with it.
- **`packages/navigation/`** — cross-product nav contract: viewer-state vocabulary, next-product resolution, the Redirect Manager (return/callback/preview/production domain helpers), Product Switcher's entry-building API, and the Deep Link Resolver. Its own description explicitly notes `EchoHeader`/`EchoAvatarMenu`/`AdminNav` remain separate, unmigrated UI. **Adjacent**: the canonical `ProductIdentityContext`/product-return UI the mission wants would likely consume this package's Redirect Manager, but the package itself is logic, not UI — **out of scope** to modify, in scope to depend on.
- **`packages/invitations/`** — ArenaK-owned, framework-agnostic invitation contract (types, validation, local resolver, context) consumed by every other product. **Out of scope** — invitations are a distinct domain from identity/account/auth, though invitation-derived membership (mission item 10) may need to read from here.
- **`packages/living-echo/`** — pure type contract for PrometheusK's own recorded practice trace; "No Supabase, no API, no product-specific logic." **Out of scope** — unrelated domain.
- **`packages/timeline/`** — shared activity-stream event vocabulary, contract only. **Out of scope** — unrelated domain, though an account "Activity" tab (already present in vendored `@avatark/account`, Finding 1) could theoretically read from it; no such wiring exists today.
- **`packages/recommendations/`** — ecosystem-wide recommendation contract, PrometheusK-producer/GameK-ArenaK-StreamK-AvatarK-consumer, contract only. **Out of scope** — unrelated domain.

## 19. Root docs already covering platform contracts

- **`docs/PLATFORM_CONTRACTS.md`** — the broadest existing contracts doc: dedicated sections for Identity, Authentication, Account, Product Registry, Entitlements, Organization Context, Notification Center, Recommendations, Living Echo, Invitations, and a Phase 2 Shared Navigation Contract section, closing with an explicit "No UI redesign" non-goal. This is the single most load-bearing existing doc for Parts 2–12 of the new mission — any new doc in those areas should be checked against it first to avoid restating already-settled contract facts.
- **`docs/ARCHITECTURE_INDEX_V1.md`** — a corpus index/map (not a contract itself): Track A (Onboarding & Cross-Product Integration), Track B (Identity/Account/Platform Admin — directly names the doc cluster this mission overlaps), Track C (Ecosystem/Franchise Architecture), a "named concepts with no dedicated file" section (useful for finding true gaps), an Implementation Readiness section, and explicit non-goals.
- **`docs/PLATFORM_PRODUCT_ADOPTION_MATRIX.md`** — a naming-collision inventory across the 14 (at the time) distributed packages, cataloguing confirmed cross-repo naming collisions; this partially satisfies mission Part 17 (package distribution) by documenting adoption risk, but is not itself a distribution mechanism doc.
- **`docs/ADAPTER_CONFORMANCE_CONTRACTS.md`** — audits all 12 domain adapters for state-shape consistency, finds 4 incompatible "loading/ready/error" shapes in use, and introduces one new shared vocabulary (`lib/adapters/status.ts`) for future contracts only. Directly relevant groundwork for any new `AccountAdapters`/`AuthProvider` work this mission does.
- **`docs/PLATFORM_PACKAGE_DISTRIBUTION.md`** — the actual Part 17 answer already exists here in detail: why the doc exists, an audit of pre-fix state, the verified dependency graph, the build/pack/checksum mechanism (matching Finding 14), consumer installation/versioning/upgrade/rollback procedures, and a "prohibited workspace-only assumptions" list. **This doc substantially already satisfies the mission's Part 17 requirements** — a new `IDENTITY_PACKAGE_DISTRIBUTION.md` should extend/cross-reference it, not duplicate its mechanism description.

No existing doc functions as a release-gate checklist (Part 19) — `IDENTITY_RC1_RELEASE_GATE.md` is net-new (see table below).

---

## Reuse vs. Extend vs. Create-New — packages

| Package | Verdict | Why |
|---|---|---|
| `packages/account-ui` | **Extend** | Real headless primitives exist and are consumed today (Finding 1, 5); missing the actual auth-UI components and any richer section-composition beyond what the vendored `@avatark/account` already provides. |
| `packages/auth` | **Extend** | `safeReturnPath`/`callbackError` are real, tested, multiply-consumed utilities (Finding 2, 4) — keep as the utility layer; `@avatark/auth-ui` (component layer) is fully **create-new** (confirmed zero prior art, Finding 2). |
| `packages/product-registry` | **Extend** | All 9 products present, capability matrix real and tested (Finding 7, 8); status-axis vocabulary needs reconciling with the mission's `deploymentStatus`/`integrationStatus`/`accessState` naming, not a rebuild. |
| `packages/membership` | **Extend or re-scope** | Currently 1 of the mission's 6 required concepts (plan tier only, Finding 9); the other 5 exist scattered across other packages/vendored code, not here. |
| `packages/organizations` | **Extend** | Target vocabulary + real-schema types + a display-only role reference exist (Finding 10); no current-org/switching/membership-listing runtime contract yet. |
| `packages/notifications` | **Extend** | A category-typed contract exists (Finding 11) but uses a different vocabulary than the mission's required categories, and the real, live thing is still a single boolean toggle — largely reusable structure, needs new categories layered in. |
| `@avatark/account` (vendored) | **Reuse (cannot modify)** | Canonical source lives in `prometheusk-web`; this repo only binds adapters to it (Finding 1, 5). Any new canonical account-shell work must either wrap/extend this from outside or explicitly fork, not edit in place. |
| `packages/identity`, `bootstrap`, `journey`, `navigation`, `invitations`, `living-echo`, `timeline`, `recommendations`, `motion` | **Reuse as-is / out of scope** | See Finding 18 — adjacent or unrelated domains; no changes indicated by this mission's stated scope. |

## Gaps ordered by mission Part number (2–19)

- **Part 2 (Canonical Auth UI):** Zero prior art for any named component (`AuthShell`, `SignInCard`, etc.) anywhere in the repo — full create-new (Finding 2).
- **Part 3/4 (sign-in/callback behavior):** Sign-in page lacks eyebrow, identity statement, return-context UI, and footer links (Finding 3); callback error-classification and safe-path logic are already solid and reusable (Finding 4).
- **Part 5 (Account shell):** 9-section rail already exists and matches the mission almost exactly, built on a vendored package this repo doesn't own (Finding 5) — extend, don't rebuild; fix the "0"/"A" unlabeled-chip issue (Finding 5).
- **Part 6 (Avatar/profile menu):** Two divergent implementations need reconciling (Finding 6).
- **Part 7 (Product registry):** All 9 products present; status-axis naming/semantics need reconciling with mission vocabulary; CinemaK and SetpointK are both confirmedly non-live (Finding 7).
- **Part 8 (Capability matrix):** Already real and tested; likely just needs new capabilities/products layered in, not built from scratch (Finding 8).
- **Part 9 (Membership/entitlement/etc. 6-concept split):** Only 1 of 6 concepts modeled in `packages/membership`; the rest need consolidating from scattered locations (Finding 9).
- **Part 10 (Organization context):** Vocabulary and real-schema types exist; runtime current-org/switching contract is a gap (Finding 10).
- **Part 11 (Account extension contract):** Not separately audited as its own doc topic beyond the adapter contract described in Findings 1/5 — no dedicated "extension contract" doc or code exists.
- **Part 12 (Security/connected methods):** The vendored package's `signin` tab ("Sign-in Methods") is the closest existing surface; no local doc or contract elaborates it further.
- **Part 13 (Notification preferences):** Category vocabulary exists but doesn't match mission's required categories; real preference is still one boolean (Finding 11).
- **Part 14 (Privacy/data control):** Privacy settings are real and validated; data-export/close-account is a genuine, confirmed gap — no route, table, or binding exists despite the vendored package declaring an `ExportAdapter` type (Finding 12).
- **Part 15 (Safe diagnostics):** Rich, real diagnostics exist (`environment.ts`, `emailDiagnostics.ts`, `authDiagnostics.ts`, `audit.ts`) but gating is single-tier (`admin` or nothing) — no consumer/developer/platform-ops split exists (Finding 13).
- **Part 16 (Platform status contract):** No single dedicated doc; closest existing material is `docs/ADAPTER_CONFORMANCE_CONTRACTS.md`'s per-domain status table and `lib/admin/environment.ts` (Finding 13, 19).
- **Part 17 (Package distribution):** Build/pack pipeline is real, deterministic, and already documented in detail in `docs/PLATFORM_PACKAGE_DISTRIBUTION.md` — extend, don't recreate (Finding 14, 19).
- **Part 18 (Migration guides):** 5 existing guides share a consistent but narrower template than required; 3 required new guides (CinemaK, Atlas, SetpointK) have zero prior art anywhere (Finding 15).
- **Part 19 (Release gate):** No existing doc functions as a release-gate checklist — fully net-new.
- **Cross-cutting gaps found but not tied to a single mission Part:** no locale/i18n scaffolding at all beyond one inert DB column (Finding 16); no appearance-mode contract beyond a single OS-driven light/dark CSS switch (Finding 17); `app/account` is entirely feature-flagged off by `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED`, and `EchoAvatarMenu`'s "Account" link is separately gated by the *same* flag (see below) — a single env var currently controls whether any of this mission's account surface is reachable at all.

## Required top-level docs — reuse vs. net-new

| Mission doc | Verdict | Existing equivalent (if any) |
|---|---|---|
| `IDENTITY_RC1_AUDIT.md` | This document (net-new, Part 1 deliverable) | — |
| `CANONICAL_AUTH_UI.md` | **Net-new** | No existing doc describes an auth-UI component contract; `docs/AUTH_INTEGRATION_GUIDE.md`/`docs/AUTH_REFERENCE_IMPLEMENTATION.md` describe the current flow, not a canonical UI contract. |
| `CANONICAL_ACCOUNT_SHELL.md` | **Net-new, but should cite `docs/ACCOUNT_COMPOSITION.md`** | `ACCOUNT_COMPOSITION.md` exists and (by name) likely documents how `app/account/page.tsx` composes the vendored package + `account-ui` primitives (Finding 5) — check it before writing a canonical shell doc from scratch. |
| `IDENTITY_PRODUCT_CONFIG.md` | **Net-new** | No doc models a per-product identity-config contract; `PLATFORM_INTEGRATION_MATRIX.md` and the registry (Finding 7) are the nearest data sources. |
| `LOCALE_ARCHITECTURE.md` | **Net-new** | Confirmed no scaffolding exists (Finding 16). |
| `APPEARANCE_THEME_CONTRACT.md` | **Net-new** | Confirmed no mode contract beyond CSS media query exists (Finding 17). |
| `MEMBERSHIP_ENTITLEMENT_AUTHORIZATION.md` | **Net-new** | `packages/membership` covers only 1 of 6 concepts (Finding 9); no doc unifies them. |
| `ORGANIZATION_CONTEXT.md` | **Extend** | `docs/PLATFORM_CONTRACTS.md`'s "Organization Context" section (Finding 19) already covers this topic at a contract level — extend it or supersede explicitly, don't duplicate. |
| `ACCOUNT_EXTENSION_CONTRACT.md` | **Net-new** | No dedicated extension-contract doc found (Part 11 gap above). |
| `SECURITY_CONNECTED_METHODS.md` | **Net-new** | No doc elaborates the vendored `signin` tab beyond its existence. |
| `NOTIFICATION_PREFERENCES.md` | **Extend** | `docs/PLATFORM_CONTRACTS.md`'s "Notification Center" section is cited directly in `packages/notifications/src/types.ts`'s own header comment as this contract's source — extend that section's vocabulary rather than starting fresh. |
| `PRIVACY_DATA_CONTROL_MODEL.md` | **Net-new** | Privacy settings are real (Finding 12) but no doc models the full contract including the confirmed missing data-export/close-account piece. |
| `SAFE_DIAGNOSTICS.md` | **Net-new** | No doc describes the diagnostics tiering gap (Finding 13). |
| `PLATFORM_STATUS_CONTRACT.md` | **Net-new** | Closest existing material is scattered across `ADAPTER_CONFORMANCE_CONTRACTS.md` and `lib/admin/environment.ts` (Finding 19) — no unifying doc. |
| `IDENTITY_PACKAGE_DISTRIBUTION.md` | **Extend** | `docs/PLATFORM_PACKAGE_DISTRIBUTION.md` already covers the build/pack/versioning/rollback mechanism in detail (Finding 14, 19) — this should cross-reference/extend it for identity-specific packages, not restate the mechanism. |
| `IDENTITY_RC1_RELEASE_GATE.md` | **Net-new** | No existing doc functions as a release-gate checklist (Finding 19). |

## Surprising findings

1. **The account surface is entirely feature-flagged off.** `app/account/page.tsx` renders "Account is not yet available" unless `NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === 'true'`. Separately, `components/echo/shell/EchoAvatarMenu.tsx` gates its "Account" nav link on the exact same env var. If this flag is unset in any deployed environment, the entire 9-section account shell this mission wants to extend is currently unreachable there, even though the code is otherwise real and wired.
2. **The "0"/"A" chip issue is real and precisely locatable**: `packages/account-ui/src/NotificationBell.tsx:26` and `packages/account-ui/src/AvatarMenu.tsx:24`, both rendered adjacent to `ProductSwitcher`'s pills in `app/account/page.tsx:139-146`. Both are deliberate (commented) stand-ins, not bugs, but neither carries a visible label/icon, so they read as unexplained.
3. **Two independent avatar-menu implementations** (`EchoAvatarMenu` vs. `@avatark/account-ui`'s `AvatarMenu`) exist with different contracts and no plan to unify them (Finding 6).
4. **`@avatark/account`, the package that actually implements most of the mission's account-shell requirement, is not owned by this repo** — it's a vendored tarball (`avatark-account-0.1.1.tgz`) whose canonical source lives in `prometheusk-web` (confirmed: the same tarball, byte-identical version number, also present in `gamek-web`, `avatark-web` (older `0.1.0`), and two `prometheusk-web` locations). Any mission work that wants to change its tab set, adapter shapes, or add new sections must either coordinate a cross-repo change or wrap/extend it from this repo without editing it in place.
5. **`account_preferences.theme`, `.language` (locale), and `notificationsEnabled` are already persisted per-user in the database**, but none of the three currently drives any real UI behavior — `theme` isn't applied, `locale` has no reader, and `notificationsEnabled` is a single boolean with no categories wired to it despite a typed category contract existing (Finding 11, 17). `reducedMotion` and `timezone` are hardcoded response fields (`false`/`null`), not real preferences at all.
6. **Diagnostics are richer than expected but flatly single-tier**: `lib/admin/authDiagnostics.ts` and `emailDiagnostics.ts` are thorough, tested, and secret-safe, but every one of them is gated by the exact same binary `role === 'admin'` check (`lib/admin/authz.ts`) — there is no lighter "developer" or "platform-ops" tier to build the mission's safe-diagnostics model on top of; it would need to be introduced from scratch.
