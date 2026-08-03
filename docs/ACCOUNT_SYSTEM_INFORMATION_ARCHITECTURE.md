# Account System Information Architecture

**Scope:** the new canonical Account → System Information section — a
reusable, tiered operational-context summary distinct from `/status`
(public) and `/admin` (privileged diagnostics).

## 1. Mounting location

- Contract: `packages/account/src/contracts/adapters.ts` —
  `SystemInformationSnapshot`, `SystemInformationAdapter`, optional on
  `AccountAdapters` (a host with no adapter simply doesn't get the tab).
- UI: `packages/account/src/ui/SystemInformationTab.tsx`, registered as
  the `systemInformation` core tab
  (`packages/account/src/contracts/tabs.ts`), rendered by
  `AvatarKAccount.tsx` between Security and Data & Export — matching the
  mission's recommended rail order.
- This repo's concrete implementation: `app/api/account/system-info/route.ts`
  (computation + tier decision) wired into `lib/account/adapters.ts`'s
  `avatarKPlatformAdapters.systemInformation`.
- **Cross-product reuse**: any product mounting `@avatark/account` gets the
  tab automatically once it supplies a `systemInformation` adapter whose
  `get()` calls that product's own equivalent route. The contract carries
  no AvatarK-specific assumptions (see §6).

## 2. Visibility tiers

The **server** decides `visibilityTier: 'safe' | 'admin'` on every request,
via `getAdminContext()` (the same `platform_roles.role = 'admin'` check
every other admin surface in this repo uses) — never from a header, query
param, or request body. `app/api/account/system-info/route.ts` reads no
client input at all beyond the authenticated session.

At the `'safe'` tier, every admin-only field in `SystemInformationSnapshot`
is `null` in the actual response body, not merely unrendered by the UI —
enforced in `lib/admin/systemInformation.ts:buildSystemInformationSnapshot`,
unit-tested (`lib/admin/systemInformation.test.ts`: "safe tier never
populates admin-only fields"). A compromised or modified client cannot
recover admin fields by inspecting the response, because they were never
sent.

## 3. Data contract

`SystemInformationSnapshot` (`packages/account/src/contracts/adapters.ts`):

| Field | Tier | Source |
|---|---|---|
| `environment` | safe | `VERCEL_ENV`/`NODE_ENV` (`lib/admin/environment.ts`) |
| `productId`/`productName` | safe | passed by the host (`'avatark'`/`'AvatarK'` here) |
| `appVersion` | safe | `NEXT_PUBLIC_RELEASE_VERSION` |
| `buildDate` | safe | `NEXT_PUBLIC_BUILD_TIME` |
| `deploymentIdShort` | safe | `VERCEL_DEPLOYMENT_ID` or `VERCEL_URL`, truncated |
| `authProviders` | safe | `user.identities[].provider` |
| `currentOrganizationName` | safe | `account_preferences.current_organization_id` → `organizations.name` |
| `currentOrganizationId` | **admin** | same lookup, id only shown at admin tier |
| `accountPackageVersion`/`authUiPackageVersion` | safe | real `package.json` reads (`lib/admin/packageVersions.ts`) |
| `registryVersion` | safe | `${PRODUCT_REGISTRY.length} products loaded` — see §4 for why this isn't a semver |
| `platformStatusSummary` | safe | worst-of-7-services label |
| `storageAvailability`/`capabilityServiceAvailability`/`invitationServiceAvailability` | safe | real live checks (`lib/admin/systemHealth.ts`) |
| `statusUrl`/`supportUrl` | safe | `/status`, `mailto:support@avatark.ai` |
| `vercelEnvironment`, `commitShaShort`, `buildTimestamp`, `supabaseProjectLabel`, `migrationLevel`, `services`, `callbackOrigin`, `currentSiteOrigin`, `packageVersions`, `registryRevision`, `lastHealthCheckAt`, `adminUrl` | **admin only** | see below |

## 4. Safe vs. prohibited fields

**Never rendered, at either tier** (mission's explicit list, verified by
inspection of every field this route ever reads): Supabase URL, anon key,
service-role key, database URL, tokens, OAuth client secret, session
secrets, raw credentials, private internal hostnames, complete user IDs,
any secret-presence indicator. None of these are in `SystemInformationSnapshot`
at all — there is no redaction step because there is nothing to redact;
the snapshot type itself has no field that could carry one.

**Honesty over fabrication — two deliberate departures from a "nicer"
answer:**

- `registryVersion`/`registryRevision` report a **product count**
  (`"9 products loaded"`), not a semantic version — because no real
  registry version field exists anywhere in this codebase (confirmed by
  audit: `packages/product-registry/src/registry.ts` has no
  `PRODUCT_REGISTRY_VERSION` constant; `app/admin/page.tsx`'s existing
  `registryVersion: String(PRODUCT_REGISTRY.length)` makes the same
  substitution). Labeling a count as a version would be a fabricated
  precision this system doesn't have.
- `migrationLevel` reports the **highest migration file bundled in this
  deployment's repo** (`lib/admin/migrationLevel.ts`,
  `HIGHEST_BUNDLED_MIGRATION`), not a live read of the database's actual
  applied-migration state — because `schema_migrations` is deliberately
  ungranted to every PostgREST-reachable role (migration 007's own
  comment: "only the migration runner... should ever read or write it").
  There is no live way to answer "what migration level is this database
  actually at" from application code. This is an upper bound, not a
  confirmation — `avatark-platform-test` currently lags behind it (stops
  at 019; see `docs/AVATARK_PLATFORM_TEST_MIGRATION_020_RUNBOOK.md`).

**Service health is never fabricated "operational."**
`lib/admin/systemHealth.ts` performs a real `select(..., {head:true})`
round trip per table (and a real `storage.getBucket('avatars')` call) —
this replaces the two hardcoded `invitationsConfigured: true` literals
found during this session's audit (`app/status/page.tsx:29`,
`app/admin/page.tsx:132`, both never computed from anything real, always
`true`). **Those two call sites are intentionally left unchanged by this
pass** (see §7) — System Information's invitation-service signal is real;
`/status`'s and `/admin`'s pre-existing ones are not, and that
inconsistency is called out here rather than silently fixed as a side
effect of unrelated work.

`'unknown'` is a first-class outcome, distinct from `'unavailable'`: a
missing service-role client, or an error code that isn't the specific
"table doesn't exist" signature, resolves to `'unknown'` — never guessed
as `'operational'` (`lib/admin/systemHealth.test.ts` covers both cases
explicitly).

## 5. Relationship to `/status`

`/status` (`app/status/page.tsx`) remains public, unauthenticated, and
account-agnostic — a single worst-of-all-statuses rollup with no
per-service detail, no account data. System Information links to it
(`statusUrl`) rather than duplicating its content. System Information is
richer (per-service state, account-scoped context) but only visible to a
signed-in user viewing their own account.

## 6. Relationship to `/admin`

`/admin` (`app/admin/page.tsx`) remains the privileged diagnostics and
administrative-actions surface — unchanged by this pass. System
Information's admin tier surfaces a *subset* of the same category of data
(environment, commit, package versions, per-service state) for **quick,
in-context reference while browsing the account UI**, not as a
replacement — it links to `/admin` (`adminUrl`) rather than reimplementing
its actions (revoke, grant, audit browsing, etc). Mission's rule "do not
duplicate the full `/admin` diagnostics UI inside Account" is satisfied by
scope: System Information has no mutation actions, no per-user lookup, no
audit-log browsing — only read-only summary + links.

## 7. Cross-product mounting requirements

A host product wanting this tab supplies:

```ts
systemInformation: {
  get: () => fetch('/api/<host>/system-info').then(...)
}
```

Its own route should:

1. Resolve the caller's own admin/privileged status server-side (however
   that host defines it) to pick `'safe'` or `'admin'`.
2. Reuse `buildSystemInformationSnapshot` from `lib/admin/systemInformation.ts`
   if the host shares this codebase, or reimplement the same tier-gating
   discipline (every admin-only field genuinely `null` at `'safe'`) if it
   doesn't.
3. Never accept a tier/visibility hint from the client.

## 8. Environment variable requirements

| Variable | Used for |
|---|---|
| `VERCEL_ENV`, `NODE_ENV` | environment name |
| `NEXT_PUBLIC_RELEASE_VERSION` | `appVersion` |
| `NEXT_PUBLIC_BUILD_TIME` | `buildDate`/`buildTimestamp` |
| `VERCEL_DEPLOYMENT_ID` or `VERCEL_URL` | `deploymentIdShort` |
| `VERCEL_GIT_COMMIT_SHA` | `commitShaShort` (admin only) |
| `NEXT_PUBLIC_PLATFORM_ORIGIN` or `VERCEL_URL` | `callbackOrigin`/`currentSiteOrigin` (admin only) |
| `SUPABASE_SERVICE_ROLE_KEY` | every live service-health check — without it, `storage`/`capabilities`/`invitations`/`organizations`/`account`/`audit` all report `'unknown'`, never a guessed `'operational'` |

None of these are new requirements — every one is already read elsewhere
in this repo (`lib/admin/environment.ts`, `lib/admin/authDiagnostics.ts`,
`app/admin/page.tsx`); System Information adds no new environment variable.

## 9. Manual verification checklist

- [ ] As a normal signed-in (non-admin) user, open Account → System
      Information; confirm only safe-tier fields render (no commit SHA,
      no migration level, no package-version list, no admin link).
- [ ] As a platform admin, open the same tab; confirm every admin-only
      field renders, including the copy action on the commit SHA.
- [ ] With `SUPABASE_SERVICE_ROLE_KEY` unset, confirm storage/capabilities/
      invitations all show "Unknown," never "Operational."
- [ ] Confirm the Platform Status and Support links resolve; confirm the
      Admin diagnostics link only appears for an admin.
- [ ] Resize to mobile width; confirm no horizontal overflow (grid
      collapses to a single column).
- [ ] Confirm `NEXT_PUBLIC_RELEASE_VERSION`/`NEXT_PUBLIC_BUILD_TIME` unset
      renders "Unknown," not a blank or a guessed value.

## 10. Known limitations

- `/status` and `/admin`'s own hardcoded `invitationsConfigured: true`
  literals are unchanged by this pass (see §4) — a real fix would replace
  both with `computeSystemHealth(...).invitations`, but that was judged
  out of scope for a pass focused on adding a new Account section, not
  modifying two already-shipped, unrelated pages.
- `migrationLevel` requires manual updates to
  `lib/admin/migrationLevel.ts`'s `HIGHEST_BUNDLED_MIGRATION` constant
  whenever a new `supabase/migrations/NNN_*.sql` file is added — there is
  no automated check that catches a stale value.
