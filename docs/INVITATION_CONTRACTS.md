# Shared Invitation Contracts — the IP foundation

**Do not implement invitation flows from this document.** Every type below is vocabulary only —
"the IP foundation for later implementation," per the mission that produced it. `@avatark/invitations`
already has a real, working local resolver (`localResolver.ts`, consumed by `/enter/[token]`) for
today's actual token flow; nothing here changes that. This document names the entities a *future*
implementation phase will need, so that phase inherits a considered shape instead of inventing one
under time pressure.

## Why this lives in `@avatark/invitations`, not a new package

The package's own header comment already states its role: "the same role for invitations that
`@avatark/product-registry` plays for products — one typed shape every AvatarK app can consume
instead of each product inventing its own invitation model." Every entity below is either a
refinement of that same invitation concept (Entry Door, Campaign, Target/Return Product) or a
cross-reference to a concept that already has its own canonical home elsewhere (Membership,
Organization, Practice, Episode, Journey) — extending the existing package keeps one place, not two,
as the invitation authority.

## The eleven entities

| Entity | Where it lives | Status |
|---|---|---|
| **Invitation** | `packages/invitations/src/types.ts` (pre-existing) | Real contract, real local resolver |
| **Invite Token** | `InvitationToken` (pre-existing, `= string`) | Real |
| **Entry Door** | `EntryDoor` (new this phase) | Contract only |
| **Target Product** | `TargetProduct` (new this phase, `= string`) | Contract only |
| **Return Product** | `ReturnProduct` (new this phase, `= string \| null`) | Contract only |
| **Membership** | `@avatark/membership`'s `MembershipPlan` (pre-existing, separate package) | Referenced by id only (`InvitationContext.membershipPlan: string \| null`) — see "No new dependency" below |
| **Organization** | `@avatark/organizations`'s `Organization` (pre-existing, separate package) | Referenced by id only (`InvitationContext.organizationId: string \| null`) |
| **Campaign** | `InvitationCampaign` (new this phase) | Contract only |
| **Episode** | `InvitationType`'s existing `"episode"` member (pre-existing) | Already real vocabulary — an invitation *type*, not a new entity |
| **Practice** | `InvitationType`'s existing `"practice"` member (pre-existing) | Already real vocabulary, same note as Episode |
| **Journey** | `@avatark/journey`'s `JourneyManifest` (pre-existing, separate package) | Referenced by id only (`InvitationContext.journeyId: string \| null`) |

## Entry Door — how a visitor arrived, distinct from what they're headed to

```ts
export type EntryDoor = "direct_link" | "qr_code" | "email" | "sms" | "social_share" | "referral"
```

`InvitationType` already answers *where* an invitation leads (echo/practice/cohort/event/story/
episode). `EntryDoor` answers a different question — *how* the person got here — because a QR code
scanned at a live event and a link pasted from an email can both resolve to the exact same
`InvitationType: "practice"` destination. Without this field, those two arrivals are
indistinguishable for attribution.

## Target Product / Return Product

```ts
export type TargetProduct = string   // the product an invitation ultimately leads to
export type ReturnProduct = string | null   // the product a visitor returns to once the destination concludes
```

Both are plain product-id strings, matching `@avatark/product-registry`'s own `AvatarKProduct.id:
string` — the same convention `@avatark/invitations`'s existing `InvitationMetadata.issuedBy`
already uses, and the same reason `@avatark/journey`'s `LivingEchoToArenaHandoff` names its target
by plain field rather than an imported enum. `ReturnProduct` mirrors the real, already-implemented
app-local pattern in `lib/journey/continuity.ts`'s `getContinuityAction()` — "Product → back to
Avatar → next product" — just made into a portable field name rather than re-derived from
prose each time a new product needs the same concept.

## Campaign

```ts
export interface InvitationCampaign {
  id: string
  name: string
  ownedBy: string        // product id — almost always "arenak", the Invitations producer
  startsAt: string | null
  endsAt: string | null
}
```

A named batch an invitation was issued as part of (a launch cohort, a seasonal push). `ownedBy` is
explicit rather than assumed, because ArenaK is the Invitations producer
(`docs/PLATFORM_CONTRACTS.md`) but a campaign is not inherently AvatarK's to own just because this
repo happens to be the one writing the contract down.

## `InvitationContext` — the shape once everything is known

```ts
export interface InvitationContext {
  invitation: Invitation
  entryDoor: EntryDoor | null
  campaign: InvitationCampaign | null
  targetProduct: TargetProduct
  returnProduct: ReturnProduct
  membershipPlan: string | null    // opaque id into @avatark/membership's vocabulary
  organizationId: string | null    // opaque id into @avatark/organizations' Organization.id
  journeyId: string | null         // opaque id into @avatark/journey's JourneyManifest.journeyId
}

createInvitationContext(invitation, targetProduct, overrides?): InvitationContext
```

`createInvitationContext` follows the same "one object, override what's true" convention as
`@avatark/product-registry`'s `PRODUCT_REGISTRY` — every optional field defaults to an honest
`null` ("not yet known"), never a fabricated placeholder.

## No new package dependency — why Membership/Organization/Journey stay id-only

`@avatark/invitations` does **not** add `@avatark/membership`, `@avatark/organizations`, or
`@avatark/journey` as a dependency. Two reasons, one structural and one deliberate:

1. **A structural cycle would result for Journey.** `@avatark/journey` already depends on
   `@avatark/invitations` (`packages/journey/src/manifest.ts` and `recovery.ts` import it,
   documented in `docs/PLATFORM_PACKAGE_DISTRIBUTION.md`'s dependency graph). If `@avatark/invitations`
   depended on `@avatark/journey` in return, that would be a real, buildable cycle — pnpm/tsc would
   not resolve it.
2. **Membership and Organization have no cycle risk, but the package's own precedent already
   answers the question.** This package's header comment states the rule directly: "A product id is
   a plain string ... rather than an imported enum, so this package never needs that one as a
   dependency either." The same logic extends cleanly to any foreign id — a membership plan id, an
   organization id, a journey id are all opaque strings this package carries but never interprets.

This keeps the existing 14-package dependency graph (`docs/PLATFORM_PACKAGE_DISTRIBUTION.md`)
completely unchanged — no new edges, no new build-order constraint.

## What this document does not do

- It does not implement a resolver, store, or accept/decline flow for any of the entities above —
  per the mission's explicit instruction.
- It does not change `@avatark/invitations`'s existing, real token flow (`/enter/[token]` →
  `localResolver.ts` → `classifyInvitationStatus` → accept) — see `docs/PLATFORM_CONTRACTS.md`'s
  Invitations section for that flow's real, current implementation.
- It does not merge organization-membership invitations (`lib/organizations/invitations.ts`) with
  this ArenaK-owned contract — that disambiguation was already made and remains unchanged (see
  `docs/PLATFORM_CONTRACTS.md`'s Organization Context section).
