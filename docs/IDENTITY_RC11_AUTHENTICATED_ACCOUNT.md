# Identity RC1.1 — Authenticated Account Completion — Release Gate

Ground-truth checklist for the RC1.1 mission ("complete and verify the canonical authenticated AvatarK account experience before external product adoption"), on `feature/avatar-platform-rc3`. Verified by re-running the actual commands and by real headless-Chromium screenshots, not inferred from what was written. See `docs/IDENTITY_RC11_ACCOUNT_AUDIT.md` for the ground-truth audit this mission started from.

## Canonical account sections

| Section | Status | Evidence |
|---|---|---|
| Profile | ✅ | Pre-existing, unchanged this session. |
| Products | ✅ | `ProductsTab.tsx` renders three independent facts per product (`deploymentStatus`/`integrationStatus`/`accessRequirement`), never a collapsed "Coming Soon". Backed by `lib/products/accessModel.ts` composing `PRODUCT_IDENTITY_CONFIGS` with real `product_access` rows. |
| Access | ✅ | New `AccessTab.tsx` + `AccessAdapter` contract. Consumer-readable expansion of the same `computeProductAccessEntries` source as Products, so the two sections can never disagree. Honestly empty (`source: null`, `capabilities: []`) where no real data source exists. |
| Membership | ✅ | Refactored to drop product-relationship/enrollment cards (moved to Products/Access) — now purely plan/roles/benefits/usage for the host product itself. |
| Organizations | ✅ | New `OrganizationsTab.tsx` + `OrganizationsAdapter`, backed by real `organization_members`/`organizations` tables and a new `account_preferences.current_organization_id` column (migration 018). Server-side switch re-verifies real membership before persisting — never trusts the client-supplied org id. |
| Preferences | ✅ | Appearance/locale/landing-page options are read from real host registries (`@avatark/appearance`, `@avatark/locale`), never hardcoded. Reduced motion is now a real persisted column (migration 018) — previously a no-op checkbox. Notification enablement moved out to the Notifications section (no more undifferentiated single checkbox). |
| Notifications | ✅ | New `NotificationsTab.tsx` + categorized `NotificationsAdapter`, reading `NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY`. `security_account` is mandatory, always-on, and enforced server-side (GET always returns `enabled: true` for it regardless of stored value; PATCH rejects disabling it) — not just a disabled checkbox that could be bypassed by calling the API directly. `deliveryActive` (real infra flag) is shown as explicitly separate from stored preference. |
| Privacy | ✅ | Pre-existing, unchanged this session. |
| Security | ✅ | `isEmailVerified()` now reads real `email_confirmed_at` (previously a hardcoded "Verified" claim — a fabricated security claim, now fixed). Added optional `signOutAllDevices` (Supabase global sign-out, only shown when a host actually implements it). Apple OAuth setup-checklist leak (fixed last session) confirmed still absent. |
| Data & Export | ⚠️ Partial, by design | Still one "export everything" + one "contact support to delete" — the `DataExportScope`/`AccountClosureScope` vocabulary (Part 13) exists as a typed contract but no adapter/UI consumes it yet, because no backend supports a *scoped* export or closure today. Not fabricated; explicitly named as future work in the vocabulary's own doc comment. Not a blocker: the current UI make no false claims about what it does. |
| Feedback / Support | ✅ | Host-composed, unchanged. |

All nine product-registry entries (AvatarK, PrometheusK, GameK, ArenaK, StreamK, CinemaK, StudioK, Atlas, SetpointK) remain present; CinemaK/SetpointK correctly show `deploymentStatus: live` without implying `integrationStatus`/`accessRequirement` are also open — confirmed via `identityConfig.test.ts` and this session's dev-preview screenshots.

## Product strip ("0"/"A" controls)

**Root cause (confirmed, not assumed):** `NotificationBell` always rendered `{unreadCount}` even at 0 (a bare, unlabeled "0" — `@avatark/notifications` has no real delivery/unread-count implementation anywhere in the ecosystem), and `AvatarMenu`'s bare initial had no avatar-chip styling in this page's scoped CSS. **Fix:** the non-functional bell was removed from the header entirely (not hidden — it had no real content to show), and the avatar initial now renders as a real circular chip. Confirmed via screenshot: header now shows only the 9 product pills + a properly-styled avatar chip, no detached digits or bare letters.

## Authenticated visual verification

No real authenticated session was available this session (no seeded test-user credentials, no `SUPABASE_SERVICE_ROLE_KEY` to mint one, no browser-automation extension connected) — the same blocker named at the end of the prior RC1 session. **What was actually done instead**, and what it does and doesn't prove:

- Built `app/dev/account/page.tsx` — a dev-only, unauthenticated route (same precedent as the pre-existing `app/dev/integration/page.tsx`, excluded from the Echo shell, not linked from any nav) rendering the real `AvatarKAccount` component tree against `createMockAdapters()`.
- Captured real headless-Chromium screenshots (Playwright, installed via `npx playwright install-deps` in this sandbox) at desktop (1440×900/1000), tablet (834×1100), and mobile (390×844) for all 10 canonical sections plus the extension-slot demo, plus a keyboard-focus check (Tab-key navigation produces a visible focus ring).
- **This proves:** component rendering, responsive layout, empty/loading states, no duplicate navigation, no unexplained controls, and keyboard focus visibility are all real and correct against well-formed data.
- **This does NOT prove:** that the real adapters (`lib/account/adapters.ts`) correctly plumb real Supabase data end-to-end in an authenticated browser session, or that RLS/session behavior is correct live. That remains unverified and is the one honest remaining gap — unchanged in kind from the prior RC1 gate, just narrower in scope (the component layer is now verified; only the real-data-plumbing-in-a-live-session slice is not).

### Bug found and fixed during this verification (not hypothetical — reproduced and measured)

On mobile (390px), the account page's nav rail grew to 10 items (previously fewer), and `components/echo/shell/EchoShell.tsx`'s `#echo-main-content` div — the direct flex child of `<body>` (`flex flex-col`, `app/layout.tsx`) for every non-admin/non-dev/non-institutional route in the site, including the real `/account` — had no explicit width. A flex item under `align-items: stretch` still grows to fit an unshrinkable descendant (the nav's `overflow-x-auto` row of 10 nowrap buttons) instead of clamping to the stretched size; `min-width: 0` further down the chain (already present on `PageEnter`'s wrapper) does not stop this, matching this repo's own prior finding in `app/globals.css`'s comment on the same class of bug. Once the div overflowed (measured: 962px box in a 390px viewport), the site's global `overflow-x: hidden` (`app/globals.css`) silently clipped the excess instead of leaving it scrollable — real nav items (Security, Data & Export, etc.) were genuinely unreachable on narrow viewports, not just visually crowded. **Fixed** with one additive class (`w-full` on `#echo-main-content`) — verified via direct DOM measurement (`document.documentElement.scrollWidth` before/after) and re-screenshotted; no regression at desktop/tablet widths. This fix benefits every route using `EchoShell`, not just `/account`.

## Validation

Re-run this session, not assumed from a prior pass:

| Command | Result |
|---|---|
| `pnpm lint` | Clean — 2 pre-existing warnings only (`mockAdapters.ts` unused `_stats` param, `ProfileTab.tsx` `<img>` LCP hint), both pre-dating this session's changes. 2 real errors found and fixed (`react-hooks/set-state-in-effect` in `NotificationsTab.tsx`/`OrganizationsTab.tsx`, same fix shape already established in `PrivacyTab.tsx`). |
| `pnpm typecheck` | Clean. 1 real error found and fixed (`mockAdapters.ts` missing `AuthAdapter.isEmailVerified`, a contract the RC1.1 work added). |
| `pnpm test` | 464/464 passing. 2 real failures found and fixed: `publicApi.test.ts`'s stale `ACCOUNT_TAB_KEYS` assertion (7 tabs → 10), and `importBoundary.test.ts` catching `mockAdapters.ts` fixture data that had started naming real products (`prometheusk`, `Living Echo`) — genericized to synthetic `mock-product-*` ids, preserving the same three-axis test coverage without violating the package's host-neutral contract. |
| `pnpm build` | Succeeds (Next.js 16.2.10 / Turbopack, 84 routes). |
| `pnpm build:packages` | 19/19 packages build. |
| `pnpm pack:packages` | 19/19 packages pack, checksummed manifest written. |
| Focused security review (new server surfaces: both new API routes, the preferences route, `lib/account/adapters.ts`, `lib/products/accessModel.ts`, migration 018) | No high-confidence findings. Org-switch and mandatory-notification-category logic specifically confirmed non-bypassable. Two low-severity notes (raw DB error messages returned to client, loose boolean validation on two preference fields) — not release-blocking, no secrets or service-role concepts exposed. |

## READY_FOR_PRODUCT_ADOPTION

```
READY_FOR_PRODUCT_ADOPTION = false
```

**Why still false, precisely:** every mission requirement that can be verified without a real authenticated Supabase session is now genuinely done and re-verified this session — all 10 sections implemented with truthful state, the product-strip defect root-caused and fixed, a real (and previously undiscovered) mobile-overflow bug found and fixed via actual browser measurement, full lint/typecheck/test/build/pack passing, and a focused security review with no high-confidence findings. The sole remaining blocker is the same one named at the end of the prior RC1 session, now narrower: **a real authenticated browser session has still never exercised the real `lib/account/adapters.ts` implementation against a live Supabase project.** The mock-adapter dev-preview closes the component/layout/responsive verification gap honestly but explicitly does not close this one. Whoever picks this up next needs either a seeded Supabase test-user (email + password, or a service-role key to mint a magic-link/session directly) or a working browser-automation connection in this environment, purely to complete this one remaining check before flipping this flag to `true`.
