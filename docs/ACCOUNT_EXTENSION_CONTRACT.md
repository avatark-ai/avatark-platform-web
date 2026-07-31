# Account Extension Contract

Status: **frozen contract**, implemented in `packages/account/src/contracts/adapters.ts` (`ExtensionAdapter`, `ExtensionItem`, `ExtensionSlotContent`, `AccountAdapters.extensions`) and rendered generically by `packages/account/src/ui/ExtensionTab.tsx`.

## Why this exists

The canonical account core (`docs/CANONICAL_ACCOUNT_SHELL.md`) must stay identical for every product. Products need to attach their own sections — PrometheusK's Living Echo, GameK's Game Profile, ArenaK's Invitations, CinemaK's Screenings, SetpointK's Physiological Profile, etc. — without the shared package ever hardcoding what those sections mean. The forked source solved exactly one instance of this problem (`ActivityAdapter`/`EchoesAdapter`, both PrometheusK-shaped) as fixed, optional core adapters. This contract generalizes that pattern to any number of named slots, for any product.

## The mechanism

```ts
export interface ExtensionItem {
  id: string
  title: string
  subtitle?: string
  status?: string
  href?: string
}

export interface ExtensionSlotContent {
  emptyMessage?: string
  emptyActionHref?: string
  emptyActionLabel?: string
  items: ExtensionItem[]
  footerHref?: string
  footerLabel?: string
}

export interface ExtensionAdapter {
  slotId: string
  label: string
  get(): Promise<AdapterResult<ExtensionSlotContent>>
}

// on AccountAdapters:
extensions?: ExtensionAdapter[]
```

A host registers zero or more `ExtensionAdapter`s. `AvatarKAccount`:

1. Adds one tab per registered extension, keyed `` `ext:${slotId}` `` (never a bare product name — see `CoreTabKey`/`ExtensionTabKey` in `contracts/tabs.ts`), labeled with the adapter's own `label`.
2. Fetches each adapter's content once the user is signed in.
3. Renders the tab's body with the generic `ExtensionTab` component — a mechanical renderer with **zero built-in knowledge of what any slot represents**. It renders `items` as a list (each optionally linked via `href`, annotated with `status`), an empty state when there are no items, and an optional "see more" footer link.
4. Folds each extension's item count into the generic `StatEntry[]` passed to `ProfileTab`/`MembershipTab` (`{ key: slotId, label, value: items.length }`) — so a product's real usage shows up in Profile/Membership stats without the core ever knowing what it's counting.

This is a pure rendering contract: the extension slot never receives identity, organization, membership, or entitlement context directly from the account shell today (no adapter method takes them as arguments). A host's own `ExtensionAdapter.get()` closure is expected to already have that context (e.g. captured from the same session/principal used to construct `AccountAdapters` in the first place) — the shell does not need to thread it through separately, since one host process constructs both.

## What an extension section must NOT do

- **Must not own a duplicate user profile.** No extension adapter returns identity fields (email, display name) — those live only in `ProfileAdapter`.
- **Must not fabricate entitlement.** If a product wants to gate what an extension shows based on membership/entitlement, that gating happens in the host's own adapter implementation (before calling `.get()`), not in the shared `ExtensionTab` renderer.
- **Must not assume routing.** `href` values are host-supplied absolute or relative URLs; the package never constructs a route.
- **Must not become a second core tab.** Extension tabs are always additive and always keyed `ext:*`; they cannot claim a `CoreTabKey`.

## Legacy compatibility: `activity` / `echoes`

`ActivityAdapter` and `EchoesAdapter` (and their components, `ActivityTab`/`EchoesTab`, now in `packages/account/src/extensions/`) are kept, unchanged, as a deprecated pair of single-purpose optional adapters — this is what the forked source had, and removing it outright would be an unnecessary breaking change during an ownership transfer whose explicit instruction was to preserve the existing public API. `AvatarKAccount` synthesizes an `ext:activity`/`ext:echoes` tab for these automatically if present and no explicit `extensions` entry already claims that slot id.

**New hosts should not use `activity`/`echoes`.** A product migrating onto this package (see `docs/migrations/`) registers its own `ExtensionAdapter`s instead — e.g. PrometheusK supplies one adapter with `slotId: 'living-echo'` and one with `slotId: 'practice-activity'`, rather than fitting its domain into the generic-but-PrometheusK-shaped `echoes`/`activity` pair.

## Example: registering an extension

```ts
const livingEchoExtension: ExtensionAdapter = {
  slotId: 'living-echo',
  label: 'Living Echo',
  async get() {
    const echoes = await fetchMyEchoes()
    return {
      data: {
        items: echoes.map(e => ({ id: e.id, title: e.name, status: e.status, href: `/my/echo/${e.id}` })),
        emptyMessage: 'No authored Echoes yet.',
        emptyActionHref: '/create/echo',
        emptyActionLabel: 'Create Your Echo →',
        footerHref: '/my/echo',
        footerLabel: 'View your Living Echo →',
      },
    }
  },
}
```

## Per-product extension domains (reference, not implemented by this phase)

See mission Part 10 and the individual migration guides under `docs/migrations/` for the full list per product (PrometheusK: Living Echo, Practice Activity, Authoring, Borrowed Practices; GameK: Game Profile, Navigator, World Progress; ArenaK: Invitations, Challenges, Events, Recognition, Organizer Access; StreamK: Watch History, Saved Stories, Playback Preferences, Publisher Access; CinemaK: Watch History, Saved Films, Premieres, Screenings, Festival/Industry Access, Contributor Credits, Production/Distribution Rights; StudioK: Creator Access, Workspaces, Collaborators, Publishing Rights; Atlas: Projects, Sources, Research Access; SetpointK: Physiological Profile, SPI, Connected Data Sources, Measurements & Biomarkers, Personal Baseline, Consent & Data Sharing, Research Participation, Care-Team Connections). Each of these becomes one or more `ExtensionAdapter` registrations in that product's own host code — none of them are implemented inside `packages/account` itself.

**SetpointK note:** physiological/health-adjacent extension data carries stronger consent requirements than this generic mechanism enforces on its own (see `docs/PRIVACY_DATA_CONTROL_MODEL.md`). Signing in must never imply permission to view another person's physiological data — that authorization check belongs entirely in SetpointK's own `ExtensionAdapter.get()` implementation before any `ExtensionItem` is returned; the shared `ExtensionTab` renderer has no consent logic of its own.
