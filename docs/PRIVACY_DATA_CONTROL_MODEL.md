# Privacy & Data Control Model (Mission Part 13)

Status: **platform-level privacy is real and implemented; data export/closure is a typed vocabulary, not a built system.**

## Privacy scopes: platform-level vs. product-level

The mission lists these canonical privacy scopes: profile visibility, Living Echo visibility, reflection privacy, contribution attribution, product activity sharing, personalization and recommendations, research participation, organization visibility, physiological-data sharing consent (SetpointK).

Only the *platform-universal* ones are modeled as fixed fields on `PlatformPrivacySettings` (`packages/account/src/contracts/adapters.ts`, backed today by the real `privacy_settings` table — `app/api/account/privacy/route.ts`):

| Field | Real today? |
|---|---|
| `profileVisibility` (`private/public/unlisted`) | Yes |
| `discoverable` | Yes |
| `productCommunicationsEnabled` | Yes |
| `personalizationEnabled` | Yes |
| `analyticsEnabled` | Yes |

Everything product-specific — **Living Echo visibility, reflection privacy, contribution attribution, organization visibility, physiological-data sharing consent** — is deliberately **not** hardcoded onto this shared type. The forked source did hardcode one of these (a "published Echoes visibility" section baked directly into `PrivacyTab`, taking an `echoes` prop); that was a platform-neutral-boundary violation and has been removed (see `packages/account/PROVENANCE.md`, item 4). These now flow through `PrivacyControlDefinition[]` (`PrivacySettings.productControls`) — the same generic, mechanically-rendered toggle/select list used elsewhere in this package, with zero built-in knowledge of what any control means. A product registers its own controls (e.g. PrometheusK: `{ id: 'living_echo_visibility', label: 'Living Echo visibility', type: 'select', ... }`; SetpointK: `{ id: 'physiological_data_sharing_consent', ... }`) via its own `PrivacyAdapter` implementation.

**Research participation** and **organization visibility** follow the same pattern — product/organization-scoped, not platform-universal, so they belong in `productControls` or a future organization-context privacy surface, not in `PlatformPrivacySettings`.

## Data & Export: the distinctions

`ExportAdapter` (real, implemented, `DataExportTab.tsx`) covers `exportFullAccount()` and `exportActivityCsv()` today. The mission requires distinguishing several kinds of export/removal that are not each the same operation — these are now a named, checkable vocabulary (`packages/account/src/contracts/adapters.ts`), even though most are not yet backed by an adapter method:

**`DataExportScope`** (what can be exported, separately):
`identity_profile` · `product_activity` · `reflection_or_echo` · `authored_content` · `connected_source`

**`AccountClosureScope`** (what can be removed, separately — these three are non-overlapping by design):
`delete_one_product_data` · `leave_organization` · `close_avatark_identity`

The critical rule, stated directly in the mission and enforced by keeping these as three distinct enum members rather than one: **closing a single product's data must never imply closing the whole AvatarK identity, and leaving an organization must never imply either.** No code path in this package conflates them — there is no single "delete everything" adapter method, and none is planned without an explicit scope argument.

## What is real vs. contract-only

- Real: `PlatformPrivacySettings` (5 fields), `exportFullAccount`, `exportActivityCsv`, the delete-account **support-request** flow (a `mailto:` link, not self-serve deletion).
- Contract-only, no backend: `DataExportScope` and `AccountClosureScope` beyond what `ExportAdapter`'s two existing methods already do. There is no `deleteOneProductData()`, `leaveOrganization()`, or `closeAvatarKIdentity()` adapter method — implementing those is future work, not claimed here.
- This repo does not invent legal guarantees. Where a product's deletion/export obligations are policy-dependent (retention requirements, clinical/research obligations), that policy lives in the product's own terms, not in this shared contract.

## SetpointK: stronger consent boundary

Signing in must never imply permission to view another person's physiological or health-adjacent data. `physiological-data sharing consent` is not a platform-level toggle — it is SetpointK's own `productControls` entry, gated by SetpointK's own consent logic before any value is returned. The generic `PrivacyTab`/`PrivacyAdapter` mechanism has no special-cased knowledge of SetpointK and enforces nothing about consent itself; the consent check belongs entirely in SetpointK's own adapter implementation, mirroring the same boundary already established for extension slots (`docs/ACCOUNT_EXTENSION_CONTRACT.md`'s SetpointK note). SetpointK's migration guide (`docs/migrations/IDENTITY_SETPOINTK.md`) carries the dedicated sensitive-data section this requires.

## Non-goals

- No delete-account/export backend, queue, or workflow is implemented by this phase.
- No per-product privacy control is hardcoded into the shared package — every one goes through `productControls`.
- No legal retention/consent guarantee is asserted; policy-dependent behavior is explicitly marked as such, not invented.
