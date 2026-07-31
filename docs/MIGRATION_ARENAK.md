# Migration guide — ArenaK

**Read this first:** ArenaK's real implementation lives in a separate `dt4m-os` repo's
`apps/avatark-consumer`, not as a sibling repo in this workspace — `PRODUCT_REGISTRY`'s
`arenak.repository` is `null` for exactly this reason, confirmed absent rather than guessed
(`docs/PLATFORM_CONTRACTS.md`'s Invitations section). This repo cannot inspect ArenaK's actual code
or reach its API at all. Everything below is therefore contract-shape guidance for whoever owns
`dt4m-os`'s ArenaK app, not a verified audit — treat "what to delete" as "if your code does this,
delete it," not a confirmed finding about what ArenaK's code currently does.

## Where ArenaK already stands

ArenaK is the **owner and producer** of the Invitations contract, not a consumer
(`docs/PLATFORM_CONTRACTS.md`: "Owned by ArenaK. Consumed by: AvatarK, GameK, PrometheusK, StreamK,
StudioK"). `PRODUCT_REGISTRY`'s `arenak.supportsInvitations: true` reflects ownership, the one
product in the registry where that flag means "producer," not "consumer" — see this registry
entry's own in-line comment. `integrationStatus: "coming-online"` — domain and visibility are
confirmed real (`arenak.ai`), but feature-level Platform integration is not yet confirmed.

## What to delete

If ArenaK's app currently hand-encodes any of the following, replace it (this repo cannot confirm
whether it does, since ArenaK's source isn't reachable):
- A locally-defined `Invitation`/`InvitationType`/`InvitationStatus` shape that duplicates
  `@avatark/invitations`'s real, framework-agnostic contract (`packages/invitations/src/types.ts`) —
  as the producer, ArenaK should be issuing tokens whose shape *is* this contract, not a
  parallel one consumers have to translate.
- Any hardcoded URL back to AvatarK, GameK, PrometheusK, or StreamK for the invitation-acceptance
  redirect flow.

## What to replace it with

1. **`@avatark/invitations`'s real contract** as the shape ArenaK's own invitation-issuance service
   produces: `Invitation { token, type, destination, status, metadata }`, with `InvitationMetadata`
   correctly stamping `issuedBy: "arenak"`, `expiresAt`, `maxUses`, `useCount` — the same fields every
   consumer's `InvitationResolver.resolve(token)` already expects.
2. **`@avatark/invitations`'s new Phase 1 contracts** (`EntryDoor`, `TargetProduct`, `ReturnProduct`,
   `InvitationCampaign`, `InvitationContext` — `docs/INVITATION_CONTRACTS.md`) as the vocabulary for
   any campaign/attribution feature ArenaK builds around invitation issuance. `InvitationCampaign`'s
   `ownedBy` field defaults to `"arenak"` for exactly this reason.
3. **`@avatark/navigation`'s Redirect Manager and Deep Link Resolver** for building the URL an
   accepted invitation redirects to — `arenaLink(path)` (built the other direction, from a consumer's
   point of view) mirrors `resolveProductDomain("arenak")` on ArenaK's own side, so neither side
   hardcodes the other's domain.
4. **Run `@avatark/bootstrap`'s Environment Validator and Conformance checker** against ArenaK's own
   env once it has a real, testable environment — this repo cannot do so on ArenaK's behalf today.

## What's confirmed NOT required

- No requirement to consume AvatarK's shared Auth/Account/Identity — `supportsAuth`/`supportsAccount`
  are `false` in the registry for ArenaK today, and nothing in this pass changes that; ArenaK's own
  auth model is entirely unconfirmed from this repo, not assumed to need AvatarK's.

## Verification ArenaK should run

Cannot be exercised from this repo — no reachable API, no local source. Whoever owns `dt4m-os`'s
ArenaK app should independently run `checkProductConformance("arenak", { env: {...} })` once a real
environment exists, and should specifically verify that tokens it issues successfully round-trip
through this repo's own `packages/invitations/src/localResolver.ts` reference resolver (the closest
thing to a compatibility check available without a real ArenaK API to call).
