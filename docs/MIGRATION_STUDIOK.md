> **Superseded by `docs/migrations/IDENTITY_STUDIOK.md`** (AvatarK Identity RC1, Part 18) — restructured onto the mission's required template plus the new canonical Auth/Account packages.

# Migration guide — StudioK

**Read this first:** StudioK has **no confirmed local repository in this workspace** — a real,
actively-deployed Vercel project exists under a name that doesn't match this ecosystem's planning
documents (`PRODUCT_REGISTRY`'s `studiok.repository: null`, `docs/PRODUCT_REGISTRY.md`). This repo
cannot inspect StudioK's actual source at all. Like StreamK, this is a **green-field adoption guide**,
not a migration away from confirmed existing integration code.

## Where StudioK already stands

`PRODUCT_REGISTRY`'s `studiok` entry: `supportsContent: true` (creation tools is its stated purpose),
`supportsInvitations: true` (named as a target consumer in `docs/PLATFORM_CONTRACTS.md`'s Invitations
section — "Consumed by: ... StudioK" — not a confirmed real implementation).
`supportsAuth`/`supportsAccount`/`supportsNavigation`: `false` (unconfirmed). `visibility: "internal"`,
`status: "alpha"`. No `journeyRole`/`integrationStatus` set — StudioK isn't yet positioned on the
platform journey graph at all (`docs/PLATFORM_INTEGRATION_MATRIX.md`).

## What to delete

Nothing confirmed — same caveat as StreamK's guide: no known existing StudioK-side integration code
to remove, since this repo cannot see StudioK's source.

## What to replace it with (adopt from the start, rather than migrate)

1. **`@avatark/bootstrap`** as StudioK's entry point into every RC3 contract at once:
   ```ts
   const boot = bootstrapProduct("studiok", { env: { supabaseUrl, supabaseAnonKey, siteUrl, callbackUrl } })
   ```
2. **`@avatark/navigation`'s `studioLink(path)`** (`docs/DEEP_LINKS.md`) as the one contract other
   products should use to link into StudioK, and that StudioK's own outbound links to other products
   should use in reverse — never a hand-assembled URL literal on either side.
3. **`@avatark/invitations`'s `InvitationResolver`**, if/when StudioK begins consuming
   ArenaK-issued invitations for real (today: target only, no implementation).
4. **Get StudioK onto the platform journey graph**, if it's meant to have one — `journeyRole`/
   `journeyOrder`/`integrationStatus`/`nextProductIds` are all currently unset for this product in
   `PRODUCT_REGISTRY`. This is a registry-data change in this repo (`packages/product-registry`),
   not something StudioK's own repo does — flag it to whoever owns the registry once StudioK's real
   position in the journey (if any) is decided.
5. **Confirm StudioK's real repository identity first.** Before any of the above is adopted for
   real, someone needs to reconcile the "actively-deployed Vercel project under a different name"
   finding with a real repo this workspace or `dt4m-os` can reference — otherwise every item above
   remains a target contract with nothing to wire it into.

## What's confirmed NOT required

- No requirement to implement Auth/Account/Navigation immediately — none is declared in the
  registry today, and nothing in this pass changes that; StudioK adopting them is a future decision,
  not a gap this migration closes.

## Verification StudioK should run

Cannot be exercised from this repo — no reachable source or environment. Once one exists,
`checkProductConformance("studiok", { env: {...} })` — expect `product_registry` and
`capability_matrix` to already pass (StudioK is registered), `auth`/`account`/`navigation` to fail or
need live verification until StudioK actually adopts those pieces, and `deep_links` to pass once
`resolveProductDomain("studiok")` (already real: `https://studiok.dt4m.ai`) is confirmed reachable.
