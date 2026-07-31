> **Superseded by `docs/migrations/IDENTITY_STREAMK.md`** (AvatarK Identity RC1, Part 18) — restructured onto the mission's required template plus the new canonical Auth/Account packages.

# Migration guide — StreamK (`streamk-web`)

**Read this first:** this repo has confirmed StreamK's domain is reachable
(`docs/PLATFORM_INTEGRATION_MATRIX.md`: `streamk.ai`), but "scope (feature-level integration with
Platform, beyond domain reachability) not yet confirmed." This repo has no access to `streamk-web`'s
actual source. This is closer to a **green-field adoption guide** than a migration away from
existing legacy integration code, since none is confirmed to exist yet.

## Where StreamK already stands

`PRODUCT_REGISTRY`'s `streamk` entry: `supportsInvitations: true` (named as a target consumer in
`docs/PLATFORM_CONTRACTS.md`'s Invitations section — "Consumed by: ... StreamK" — not yet a
confirmed real implementation), `supportsAuth`/`supportsAccount`: `false` (unconfirmed). This repo's
own `/watch-first` is a real, static route with **no per-story StreamK content or integration
today** — `lib/onboarding/streamHandoff.ts`'s registry is deliberately empty, and
`@avatark/journey`'s `EchoToStreamKHandoff` contract (`packages/journey/src/handoffContracts.ts`) has
no real implementation behind it. `integrationStatus: "in-development"`.

## What to delete

Nothing confirmed — there is no known existing StreamK-side integration code to remove. If StreamK's
own app has built any placeholder/mock cross-product linking in anticipation of this integration,
replace it with the real contracts below rather than a hand-rolled stand-in.

## What to replace it with (adopt from the start, rather than migrate)

1. **`@avatark/bootstrap`** as the first and only integration surface StreamK needs to stand up:
   ```ts
   const boot = bootstrapProduct("streamk", { env: { supabaseUrl, supabaseAnonKey, siteUrl, callbackUrl } })
   ```
2. **`@avatark/navigation`'s `watchLink(slug)`** (`docs/DEEP_LINKS.md`) is the shape a *consuming*
   product (AvatarK, GameK) already uses to build a link into Watch First content — StreamK's own
   `/watch-first/{slug}`-equivalent route, once it exists, should be resolvable through this same
   contract on the *producing* side too, rather than each consumer guessing StreamK's URL structure.
3. **`@avatark/invitations`'s `InvitationResolver`**, if/when StreamK begins consuming
   ArenaK-issued invitations for real (today: target only, no implementation).
4. **`@avatark/auth`'s `safeReturnPath`** for any return-path handling StreamK's own auth mount
   builds, per `docs/AUTH_INTEGRATION_GUIDE.md` — since StreamK has no confirmed existing auth
   integration, this is a "build it right from day one" item, not a fix.

## What's confirmed NOT required

- No requirement to implement Living Echo consumption yet — `EchoToStreamKHandoff` is a typed
  contract with no real implementation anywhere, and building StreamK's side of it first would be
  ahead of the rest of the ecosystem.
- No requirement to change `status: "alpha"` — that's a product-maturity decision, separate from
  whatever integration work this guide covers (`docs/PLATFORM_INTEGRATION_MATRIX.md`'s own note on
  StreamK/ArenaK's `status` vs. `visibility`/`domain`).

## Verification StreamK should run

`checkProductConformance("streamk", { env: {...} })` — expect `deep_links` to report
`needs_live_verification` (StreamK has no defined role in the Deep Link Resolver's six kinds today —
see `docs/DEEP_LINKS.md`'s participant list) until/unless a `watch` producer-side integration is
built and this doc's Deep Link section above is extended to cover it.
