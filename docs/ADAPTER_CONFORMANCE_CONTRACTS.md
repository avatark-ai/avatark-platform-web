# Adapter conformance contracts — 12 domains

Audit method: every domain's actual current implementation was read
directly (not assumed from docs) before deciding whether to add, extend,
or merely document a contract. Full audit trail lives in this session's
research; this document is the consolidated result.

## The core finding

The 12 domains already use **four different, incompatible shapes** for
"is this data ready/loading/broken":
- `IdentityState` (`lib/identity/useIdentity.ts`) — `loading | signed_out | signed_in | error`.
- `AccountPrincipal` (vendored `@avatark/account`) — no `error` variant at
  all; this repo's own `lib/auth/resolveClientPrincipal.ts` adds a fourth,
  locally, that the vendored type doesn't declare.
- `AdapterResult<T>` (vendored `@avatark/account`'s per-concern adapters —
  profile, preferences, privacy, membership, productAccess) — `{data?,
  error?}`, no loading/unavailable distinction at all; "no user" collapses
  into "empty array", not a distinct state.
- `AdapterDescribeResult` (`lib/integrations/adapterTypes.ts`) — `{accepted,
  availability: 'available'|'not_implemented', message}`, journey/handoff
  specific.

**New, added this pass:** `lib/adapters/status.ts` — `AdapterResult<T> =
{status:'unauthenticated'} | {status:'unavailable'} |
{status:'not_supported'} | {status:'error', message} | {status:'ready',
data:T}`, plus `AdapterState<T> = {status:'loading'} | AdapterResult<T>`
for UI/hook consumers. This is **not** a retroactive rewrite of the four
existing shapes above — three of them have real, working consumers today,
and forcing a migration onto all of them was judged riskier than the
inconsistency. It is the vocabulary any **new** contract (this pass's
`OrganizationsAdapter`) builds on, so a 5th ad-hoc shape doesn't appear.
It lives at the app layer (`lib/adapters/`), not inside any `packages/*`
package, because packages must not import app-local (`@/`) code — a real
constraint confirmed during the Part 1 package-distribution audit.

## Per-domain status

| Domain | Contract | Status this pass |
|---|---|---|
| **Identity** | `packages/identity/src/types.ts`'s `IdentityProvider` (`getUser`/`verifySession`/`refreshSession`/`signOut`/`accountUrl`/`signOutUrl`) | Already real, already has a working implementation (`lib/identity/supabaseIdentityProvider.ts`) and a distinct state type (`IdentityState`). Left unchanged — mature. |
| **Profile** | Vendored `@avatark/account`'s `ProfileAdapter` (`get`/`update`, `AdapterResult<AccountProfile>`) | Cannot modify the vendored package's contract shape from this repo (canonical source lives in `prometheusk-web`). This repo's concrete binding (`app/api/account/profile/route.ts`, `lib/account/profileMapping.ts`) was fixed this session (Part 4) so all six canonical fields round-trip through `public.profiles` instead of three being silently dropped. |
| **Account** | Vendored `@avatark/account`'s `AccountAdapters` bag | Same external-package constraint as Profile. This repo's binding (`lib/account/adapters.ts`) intentionally omits `activity`/`echoes` (no Living Echo data at Platform level) rather than stubbing them — already the correct "not_supported via omission" pattern this pass's `OrganizationsAdapter` also uses. |
| **Product access** | Vendored `@avatark/account`'s `ProductAccessAdapter.list()` | External-package constraint. Concrete binding (`lib/account/adapters.ts`) computes entitlement synchronously from the product registry — no loading/error state needed since there's no network call in this path today. |
| **Membership** | Vendored `@avatark/account`'s `MembershipAdapter` + `@avatark/membership`'s plan vocabulary | External-package constraint for the adapter shape; `@avatark/membership` itself (this repo's package) is intentionally minimal (plan-tier vocabulary only, explicitly documented as not duplicating the vendored `MembershipSummary`/`ProductRelationship` types) — left as-is. |
| **Organizations** | **New: `lib/organizations/adapter.ts`'s `OrganizationsAdapter`** | Real missing-boundary fix — before this pass there was no adapter abstraction at all; every admin page called Supabase directly, inline. New contract (`listForUser`/`get`/`listMembers` required, `create`/`addMember`/`removeMember` optional) uses the new shared `AdapterResult<T>`. Domain types (`Organization`, `OrganizationMember`) added to `@avatark/organizations` (portable, no app-local imports). In-memory reference adapters + conformance tests: `lib/organizations/inMemoryAdapter.ts`, `lib/organizations/adapter.test.ts`. |
| **Invitations** | `packages/invitations/src/types.ts`'s `InvitationResolver` (`resolve(token)`) | Already real, already has a concrete local implementation (`lib/invitations/echoResolver.ts`) and tests (`packages/invitations/src/localResolver.test.ts`). Left unchanged. **Naming collision flagged, not fixed**: `packages/organizations/src/invitations.ts` independently defines its own, differently-valued `InvitationStatus` type for org invitations — same name, unrelated domain, different table. Renaming either risks a wider blast radius than this pass's scope justifies; flagging it here is the deliberate choice. |
| **Journey** | `lib/integrations/adapterTypes.ts`'s `IntegrationAdapter<T>` (`describeHandoff`) | Already the most mature contract in the repo — real implementations for all four boundary crossings (StreamK, PrometheusK, Living Echo, ArenaK), real tests. Left unchanged. |
| **Living Echo** | Two different, same-named adapters | **Flagged, not merged**: `packages/living-echo/src/types.ts`'s `LivingEchoAdapter.getSummary()` (a data-fetch contract, zero implementations, explicitly a placeholder) is a different thing from `lib/integrations/livingEchoAdapter.ts`'s `IntegrationAdapter<PrometheusToLivingEchoHandoff>` (a real, working handoff-boundary describer). Merging them would conflate "fetch a Living Echo summary" with "describe whether a handoff boundary is crossable" — two genuinely different operations that happen to share a domain name. Left as two distinct contracts, documented here so the collision is a known fact, not a latent trap. |
| **Recommendations** | `packages/recommendations/src/types.ts`'s `RecommendationAdapter.list()` | Explicitly a placeholder with zero consumers (confirmed by repo-wide grep). Not implemented this pass — there is no real recommendation engine anywhere in the ecosystem yet to build a genuine adapter against; an in-memory adapter here would only prove the type-checker works, not anything about real substitutability. Left as documented target vocabulary. |
| **Timeline** | `packages/timeline/src/types.ts`'s `TimelineAdapter` (`list`/`append`) | Same as Recommendations — placeholder, zero consumers, not implemented. |
| **Notifications** | `packages/notifications/src/types.ts`'s `NotificationAdapter` (`publish`/`getPreference`) | Same as Recommendations/Timeline — placeholder, zero consumers, not implemented. The one real, live thing adjacent to it (`notifications_enabled` boolean in `account_preferences`) already goes through the Preferences adapter (`AdapterResult<T>`, external package), not through this contract. |

## Why Recommendations/Timeline/Notifications were not given in-memory adapters

The mission asked for conformance tests proving "a product adapter can be
substituted without changing shared UI or package behavior." For a domain
with a real implementation and a real consumer (Organizations, this pass),
an in-memory adapter substituted for the real one is a meaningful proof —
the consumer code genuinely doesn't know or care which one it's talking
to. For a domain with **zero** implementations and **zero** consumers
anywhere in the ecosystem (Recommendations, Timeline, Notifications), an
in-memory adapter would only prove that a fake satisfies a type signature
nobody depends on yet — not a demonstration of substitutability, since
there is no real second implementation (or real consumer) to substitute
*against*. Building one now would be exactly the kind of "report a mock as
an integration" the mission explicitly warns against elsewhere (Part 7).
These three contracts remain real, checkable, unimplemented target shapes
— accurately represented as such, not padded out with a demonstration that
would overstate their readiness.

## Conformance test evidence

`lib/organizations/adapter.test.ts` (6 tests, all passing):
- The same consumer function (`describeUserOrganizations`) produces
  identical results against two structurally different conformant
  adapters (`createInMemoryOrganizationsAdapter`, a mutable one, and
  `createReadOnlyOrganizationsAdapter`, which omits every optional
  mutation method entirely) — real substitutability, not just matching
  types.
- Privacy boundary: a user never sees another user's organization.
- Missing data resolves to an explicit `ready`/empty-array or `error`
  state, never a silent default or a thrown exception.
- Optional operations may be `undefined` rather than implemented as a
  no-op — proven by asserting `readOnly.create === undefined` at runtime,
  not just by the type allowing it.
