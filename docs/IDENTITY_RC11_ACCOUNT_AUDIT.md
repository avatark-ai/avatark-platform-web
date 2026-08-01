# Identity RC1.1 — Authenticated Account Audit

Ground-truth audit of the authenticated account surface before RC1.1 work began. Every claim below was checked against the actual current file, not assumed.

## Starting state

`git status` clean, `feature/avatar-platform-rc3` up to date with origin, HEAD `edf3d0c`. No uncommitted work to recover.

## Root cause: the "0" / "A" controls

`app/account/page.tsx`'s header row renders `<ProductSwitcher/> <NotificationBell unreadCount={0} /> <AvatarMenu .../>` side by side, which is why they read as one "strip."

- `packages/account-ui/src/NotificationBell.tsx` always renders `<span data-avatark-part="unread-count" aria-hidden="true">{unreadCount}</span>` even when `unreadCount === 0` — a visible, unlabeled "0" with no bell icon anywhere in the component. `@avatark/notifications` has no real delivery implementation anywhere in the ecosystem (confirmed: no notifications table, no delivery code), so `unreadCount` is permanently hardcoded to `0` — the control has zero real function today.
- `packages/account-ui/src/AvatarMenu.tsx` renders only `<span aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>` as the button's entire visible content, and `app/account/page.tsx`'s scoped CSS never gives it a background/circle — so it renders as a bare capital letter with no avatar-chip affordance.

Fix applied: removed the non-functional `NotificationBell` from the header (its dropdown had no real content to show; reintroduce once `@avatark/notifications` has a real delivery adapter), and gave `AvatarMenu`'s initial a real circular avatar-chip style.

## Root cause: live products showing "Coming Soon"

Two disconnected classification systems exist:

1. **Legacy**: `AvatarKProduct.status` (`alpha`/`beta`/`live`/`internal` — a maturity rating) on `packages/product-registry/src/registry.ts`. `lib/products/registry.ts`'s `toPlatformProduct()` collapses this to a binary `availability: status === 'live' ? 'live' : 'coming_soon'`. Under this, only `avatark` and `prometheusk` show as live — GameK (`beta`), ArenaK/StreamK/CinemaK/StudioK/Atlas (`alpha`), SetpointK (`internal`) all render "Coming Soon," even though all nine have real, DNS-resolvable `domain` values.
2. **Canonical (RC1, Part 4)**: `packages/product-registry/src/identityConfig.ts`'s `PRODUCT_IDENTITY_CONFIGS`, already built last session, correctly derives `deploymentStatus` (`domain !== null` → `'live'` for every product today), reads the registry's own `integrationStatus`, and hand-authors `accessState` (`available` / `entitlement_dependent` / `entitlement_and_consent_required`). This is exactly the three-axis model the mission asks for — it already exists, it's just never consumed by `lib/account/adapters.ts`, `ProductsTab`, or `MembershipTab`.

Fix: `lib/account/adapters.ts`'s `productAccess.list`/`membership.getRelationships` and the account UI now read `PRODUCT_IDENTITY_CONFIGS` for deployment/integration/access, combined with real `product_access` rows (migration 012) for user-specific grants, instead of the legacy binary field. "Coming Soon" is no longer used as a fallback label.

## Contracts that exist but weren't surfaced

- `@avatark/organizations` (`context.ts`, RC1 Part 9) — no `OrganizationsTab`, no adapter wiring anywhere.
- `@avatark/membership`'s `ProductAccess`/`resolveCapability`/`hasActiveAccess` (Part 8) — no consumer-facing "Access" section anywhere; `MembershipTab` mixes product-relationship data into what should be a pure AvatarK-membership view.
- `@avatark/notifications`'s `NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY` (Part 12) — `PreferencesTab` has one undifferentiated "Email notifications" checkbox; the 9-category registry is never read.
- `packages/account/src/contracts/adapters.ts`'s `DATA_EXPORT_SCOPES`/`ACCOUNT_CLOSURE_SCOPES` vocabulary (already defined) — `DataExportTab` never reads either constant; it hardcodes two export buttons and one disabled-looking delete card.
- `identityConfig.ts`'s `PRODUCT_IDENTITY_CONFIGS.accessState`/`deploymentStatus` — as above.

## Placeholder / incorrect data found

- `SignInMethodsTab.tsx`: `{email} · Primary · Verified · Current Session` hardcodes "Verified" — never reads `user.email_confirmed_at`. A fabricated security claim.
- `PreferencesTab.tsx`'s `LOCALES` constant hardcodes `en-GB`, which does not exist anywhere in `@avatark/locale`'s `LOCALE_REGISTRY` (only `en-US`/`en-IN` are `available`) — an invented locale option with no backing translation.
- `PreferencesTab.tsx`'s theme row is a static string (`"Dark (Light coming soon)"`), never reads `APPEARANCE_MODE_REGISTRY`.
- `MembershipTab.tsx`'s "Billing not yet enabled. No storage limits currently enforced." — accurate but implementation-oriented phrasing per the mission's own example of what to replace.

## Authenticated session for browser verification

None available, confirmed by direct check this session:

- No claude-in-chrome MCP tools registered (`ToolSearch` returned no browser-automation tool).
- `.env.local` has no `SUPABASE_SERVICE_ROLE_KEY` — cannot mint a session server-side or use the admin API to generate a real link.
- `NEXT_PUBLIC_SUPABASE_URL` points at a real hosted Supabase project (`hapoerzbcnagyfafqojg.supabase.co`), not a local instance with an Inbucket/test-mail catcher — a real magic-link email would need a real inbox this environment doesn't have access to.

Mitigation used: `packages/account/src/testing/mockAdapters.ts` already exists as a legitimate test double. A new dev-only, unauthenticated preview route (following the exact existing precedent of `app/dev/integration/page.tsx` — no auth, not linked from nav) renders the real `AvatarKAccount` component tree against `createMockAdapters()` so real layout/spacing/responsive/duplicate-nav/empty-state defects are visually catchable. This is **not** a substitute for a real authenticated session and is documented as such in the release gate — it verifies component rendering, not the real adapters' real data plumbing.

## Database reality check

- `product_access` (migration 012): `user_id, product_id, status, granted_at, granted_by` — no `organization_id`, no `source`, no `valid_until`/suspension/expiry columns. Access section fields beyond status/grantor/date are honestly omitted per product until a real column exists, never fabricated.
- `organizations`/`organization_members` (migration 010): minimal `id/name` + `org_id/user_id/role`. No `type` column (matches `OrganizationType`'s own comment that it's target vocabulary, unenforced).
- No notifications table exists. Added migration `018_notification_category_prefs.sql` (additive, one JSONB column) so per-category preference storage is real, not fabricated in-memory state — see Part 8 section of the release gate for what this does and does not imply about delivery.
- No route anywhere writes to `product_access` — grants are admin/SQL-applied today. Confirms "Request access" CTAs must not be offered without a real request path; `ProductsTab`/`AccessTab` use "Learn more" instead, per the mission's own CTA rule.
