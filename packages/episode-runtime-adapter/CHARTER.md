# Episode Runtime Adapter — Charter

**Governed by:** `STK-WO-009` Phase G (G10D-5 Stage 4).
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

## Honest scope — what does NOT reach the runtime, and why

`@avatark/narrative-runtime`'s real, unmodified `NarrationBeat` carries no
prose/text field of its own — narrative content is referenced externally
via `refs.asset` (`NarrativeAssetRef`), and this package has no real,
persisted asset to point at. Two real fields therefore do **not** reach the
projected `NarrativeDefinition`:

- `EpisodeSegment.statement` (the actual semantic prose) — has no
  legitimate carrier in the runtime's current schema.
- `EpisodeSegment.evidenceReferences` — `NarrativeReferences`' `world`
  field names a whole `WorldRef`, not a specific evidentiary fact; using it
  to carry an evidence id would be a type misuse, not a legitimate mapping.

This is a real, evidenced limitation of the current, unmodified
`narrative-runtime` contract — not an oversight of this adapter. Closing it
requires either a real asset-persistence mechanism (out of scope here) or a
`narrative-runtime` schema change (`STK-WO-009` Phase G's own explicit
non-goal: "modifying `narrative-runtime` itself... requires its own
separate, explicitly-authorized gate"). See the G10D-5 master report's own
Phase G section for the full classification
(`PARTIAL_RUNTIME_PROJECTION_ONLY`).

## Deferred (not this package's job, not yet authorized)

Experience/production/distribution integration (Phase H — `Experience`,
`WatchFirstEntry`, `Practice`, Writer, Story Twin, CinemaK, StreamK, all
untouched) remains fully out of scope.
