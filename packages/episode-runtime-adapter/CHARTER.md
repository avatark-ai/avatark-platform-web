# Episode Runtime Adapter — Charter

**Governed by:** `STK-WO-009` Phase G (G10D-5 Stage 4; payload closed G10D-6 Track A, no ADR change needed).
**Status:** Real, tested adapter — the honest scope below is deliberate, not a placeholder.

## What this package owns

Per `STK-WO-009` Phase G, this package projects a real, content-bearing
`CertifiedEpisode` (`@avatark/episode-compiler`) into
`@avatark/narrative-runtime`'s existing `NarrativeDefinition` execution
shape. One direction only. It owns the projection function and its own
deterministic runtime-id derivation.

## What this package does NOT own

- **Episode semantic authority.** It never constructs, certifies, or
  mutates a `CertifiedEpisode`, `EpisodeCandidate`, `EpisodeContentProposal`,
  or any Interpretation-stage artifact — no dependency on
  `@avatark/narrative-interpretation` or `@avatark/episode-semantic-generation`
  exists, direct or transitive.
- **Narrative Runtime itself.** No file in `@avatark/narrative-runtime` is
  modified. This package calls the runtime's own, unmodified
  `validateNarrativeDefinition()` and nothing else of its execution
  machinery.
- **World authority, production, or distribution.** No dependency on Lane-1,
  Writer, Story Twin, CinemaK, or StreamK.
- **Model/LLM execution.** No dependency on any model SDK.

## The projection

`projectCertifiedEpisode()` fails closed — via
`@avatark/episode-compiler`'s own `runtimeProjectabilityOf()` — on a
content-free `CertifiedEpisode` (Phase F's own, still-valid shape) rather
than fabricating content. For a real, content-bearing `CertifiedEpisode`:

- One `NarrativeDefinition` → one `Season` → one `Episode` → N `Scene`
  (one per `EpisodeSegment`, in order) → one `NarrationBeat` per `Scene`.
- Every runtime id (`definition.id`, `season.id`, `episode.id`, each
  `scene.id`/`beat.id`) is a fresh, deterministic `sha256` of the real
  `certifiedEpisodeId` plus a fixed namespace suffix — never the semantic
  id reused verbatim (a deliberately separate namespace: runtime execution
  does not confer semantic authority), never random.
- Transitions are strictly linear: each non-final scene's beat transitions
  to the next scene; the final scene transitions to `end`. No `Choice` or
  `Trigger` beat is ever constructed — the semantic Episode carries no
  branching semantics to project.
- Every title (`NarrativeDefinition.title`, `Season.title`, `Episode.title`)
  is the real `content.title`; every `Scene.title` is the real
  `segment.label`. None is ever a placeholder like `"Episode 1"` or
  `"Scene 1"`.

## Narrative payload (G10D-6 Track A — `PAYLOAD_EXISTING_MECHANISM_REUSABLE`)

`@avatark/narrative-runtime`'s real, unmodified `NarrationBeat` carries no
prose/text field of its own — narrative content is referenced externally
via `refs.asset` (`NarrativeAssetRef`), a mechanism that already exists in
`narrative-runtime`'s own ratified shape but had never been populated or
resolved by anything, in any prior gate. This package now does both,
entirely on its own side:

- `project.ts` sets a real `refs.asset.assetId` on every `NarrationBeat` —
  a deterministic `sha256` of the real `certifiedEpisodeId` and the real
  segment's own `segmentId` (same `deriveRuntimeId()` every other runtime
  id in this package already uses — no second derivation algorithm).
- `resolve.ts`'s `resolveEpisodeSegmentProse(certifiedEpisode, assetId)`
  maps that same id back to the real, exact `EpisodeSegment.statement` —
  recomputing each candidate id the identical way, never trusting a
  presented mapping. An unknown `assetId` resolves to `undefined`, never a
  fabricated string.

**No `narrative-runtime` schema change was made or needed.** This closes
the prose half of Phase G's own `PARTIAL_RUNTIME_PROJECTION_ONLY`
classification without reopening that Work Order's explicit non-goal
("modifying `narrative-runtime` itself... requires its own separate,
explicitly-authorized gate") — because nothing in `narrative-runtime` was
touched.

`EpisodeSegment.evidenceReferences` still deliberately does **not** reach
the projected `NarrativeDefinition` — classified `OBSERVABILITY_REQUIRED` /
`UI_PROVENANCE_ONLY` / `NOT_REQUIRED_DOWNSTREAM` for runtime execution
specifically (G10D-6 Track A): `narrative-runtime` has no evidence/World
concept at all by design, and `NarrativeReferences.world` names a whole
`WorldRef`, not a specific evidentiary fact — mapping an evidence id into
it would be a type misuse, not a legitimate mapping. Evidence references
remain real and present on the `CertifiedEpisode` itself, for
provenance/certification/future UI use, where they actually belong.

## Deferred (not this package's job, not yet authorized)

Experience/production/distribution integration (Phase H — `Experience`,
`WatchFirstEntry`, `Practice`, Writer, Story Twin, CinemaK, StreamK, all
untouched) remains fully out of scope for this package specifically — see
`PLT-ADR-010` and the G10D-6 completion report for how that boundary is
now being crossed.
