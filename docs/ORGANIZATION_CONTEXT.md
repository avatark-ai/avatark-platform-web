# Organization Context (Runtime Contract)

AvatarK Identity RC1, Part 9. This document covers **only what's new**:
runtime current-organization, membership-listing, and safe-switching
contracts added to `@avatark/organizations` (`packages/organizations/src/context.ts`).

**Read `docs/PLATFORM_CONTRACTS.md`'s "Organization Context" section first**
— it remains the authoritative source for: the real schema
(`organizations`/`organization_members`/`organization_invitations`), the
target `OrganizationType` vocabulary and its explicit non-implementation,
the `owner`/`admin`/`member` role reference (design-only, unenforced), the
two-invitation-systems disambiguation, and the known gap that migrations
010–016 are authored but unverified against a live database. Nothing below
contradicts that section; it only adds the pieces that section explicitly
said didn't exist yet: current-org selection, membership listing, and
org-switching.

## What's new here

`@avatark/organizations` previously exported vocabulary and a display-only
role reference (`types.ts`, `permissions.ts`) but had no runtime shape for
"which org is the user in right now" or "let them switch." `context.ts`
adds exactly that, as contracts + pure functions — still no backend, still
no organization-admin application.

### `OrganizationMembership` / `OrganizationContext`

```ts
interface OrganizationMembership {
  organization: Organization        // real {id, name, createdAt, updatedAt} row
  role: string                      // matches organization_members.role
  source: "invitation" | "organization" | "administrator"
}

interface OrganizationContext {
  memberships: OrganizationMembership[]
  currentOrganizationId: string | null   // null = no organization (e.g. Personal-only user)
}
```

`source` is a subset of `@avatark/membership`'s `EntitlementSource` — an
organization membership is always attributable to an invitation, a direct
organization action, or an administrator, never to `public`/`purchase`/
`scholarship`/etc.

### Reading the context

- `findMembership(context, organizationId)` — the membership row for a
  specific org, or `undefined` if the user isn't a member.
- `currentMembership(context)` — the membership for `currentOrganizationId`,
  or `undefined` if it's `null` or stale.
- `toMembershipList(members, organizations, source?)` — joins raw
  `OrganizationMember[]`/`Organization[]` rows (as read from the real
  tables) into the membership list, silently skipping rows whose org id
  isn't in the provided `organizations` list rather than throwing.

### Safe switching

```ts
function switchOrganization(context, targetOrganizationId): OrganizationSwitchResult
// { ok: true, context: OrganizationContext } | { ok: false, reason: "not_a_member" }
```

Never mutates the input context. Never allows switching into an
organization the caller has no membership row for — no backend round-trip
is needed to reject that, because membership itself (not a separate ACL
check) is the source of truth this function trusts. A caller that fetches
memberships from an untrusted source must still validate that fetch
separately; this function only guards against switching to an org outside
an already-fetched, presumed-trustworthy membership list.

### Organization-scoped product entitlement

```ts
function organizationProductAccess(context, organizationId, access): ProductAccess | undefined
```

Composes a `@avatark/membership` `ProductAccess` (see
[`MEMBERSHIP_ENTITLEMENT_AUTHORIZATION.md`](./MEMBERSHIP_ENTITLEMENT_AUTHORIZATION.md))
with an organization, setting `organizationId` only when the user is
actually a member — returns `undefined`, never a fabricated row, otherwise.

## Non-goals (unchanged from `PLATFORM_CONTRACTS.md`)

- No organization-admin application, no organization creation/deletion UI,
  no invitation-send flow beyond what already exists.
- No enforcement of `ORG_ROLE_CAPABILITY_REFERENCE` — it remains a labeled
  design reference; `resolveCapability` (membership package) is the actual
  enforcement point, and it does not consult organization role today.
- No claim that migrations 010–016 have been verified live — that gap is
  unchanged by this work.
