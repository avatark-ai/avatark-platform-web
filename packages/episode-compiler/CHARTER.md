# Episode Compiler — Charter

**Governed by:** `PLT-ADR-009` (Narrative Interpretation and Episode Authority), `STK-WO-009` Phase E.
**Status:** Foundation only (Phase E). Phase F defines the real Episode Candidate contract.

## What this package owns

Per `PLT-ADR-009` decisions 2, 3, and 6, this package is ratified as the one
new, canonical semantic authority for **what a valid Episode is**, going
forward — the second of the two new sibling packages that ADR establishes
inside `avatark-platform-web` (the first being `@avatark/narrative-interpretation`).

Phase E establishes only the **foundation**: package ownership, the
governed input boundary, a deterministic compilation primitive, and
provenance continuity back to its one authorized source.

## What this package does NOT own

- **Narrative Interpretation authority.** That is
  `@avatark/narrative-interpretation`'s domain — this package never derives
  an interpretation from World evidence, never certifies a
  `NarrativeInterpretationCandidate`, and never accepts one as input.
- **World authority.** This package does not read raw Lane-1 World evidence,
  `HistoryPool`, `Occurrence`, `Consequence`, `PlaceMemory`, or any other
  Lane-1 schema, directly or indirectly. It has no dependency on
  `studiok-living-symphony-compiler` or `@avatark/narrative-ir-adapter`.
- **World mutation.** This package cannot commit a `WorldEvent`, apply a
  `Consequence`, authorize a visitor action, or write `HistoryPool` — it has
  no dependency capable of any of these, and introduces none of its own.
- **Narrative Runtime execution.** Compiling an Episode is not executing
  one. `@avatark/narrative-runtime` remains the sole executor of an
  authored `NarrativeDefinition`; this package has no dependency on it and
  imports none of its `Episode`/`Season`/`Scene`/`Beat` types as semantic
  authority.
- **Experience publishing, or production/distribution packaging.** This
  package does not touch `Experience`, `WatchFirstEntry`, `Practice`,
  Writer, Story Twin, CinemaK, or StreamK. Those are downstream
  consumers/surfaces of a future Certified Episode, never inputs to this
  package.
- **Certification.** This package never calls
  `certifyInterpretationCandidate`, never certifies anything itself, and
  never constructs a fake `CertifiedInterpretation`. Who or what is
  authorized to invoke certification in a real governed review process is
  an explicitly unresolved production-governance question (`STK-WO-009`'s
  own "Human / Founders decision points") — this package does not resolve
  or bypass it.

## The governed input boundary

The **only** authorized upstream input is a real, already-produced
`CertifiedInterpretation` (the public type exported by
`@avatark/narrative-interpretation`). A raw `NarrativeInterpretationCandidate`,
raw World evidence, or any structurally-similar uncertified object is
rejected — see `src/validation.ts` for the exact, honestly-scoped
verification this package can perform without copying certification's own
internals.

## Legacy Episode representations

Six real, pre-existing "Episode" representations were reconciled by
`PLT-ADR-009` decision 6 and are re-verified, not re-decided, by this
gate's own reconnaissance (see `STUDIOK_UI_M1_G10D1_EPISODE_COMPILER_FOUNDATION_REPORT.md`
in `dt4m-os`):

| Representation | Classification |
|---|---|
| `@avatark/narrative-runtime` `Episode` | KEEP_AS_RUNTIME_REPRESENTATION |
| Lane-1 fixture `episode` free-text label | DEPRECATE |
| `dt4m-os` `WriterEpisode` | KEEP_AS_AUTHORING_VIEW |
| `dt4m-os` Story Graph `"episode"` node | KEEP_AS_AUTHORING_VIEW |
| `StreamKPackage` `"episode"` kind | KEEP_AS_DISTRIBUTION_PACKAGE |
| `CinemaKEpisodePackage` | KEEP_AS_PRODUCTION_PACKAGE |

None of these is imported by this package as semantic authority. Encounter
remains `UNRESOLVED`. `NarrativeEntity` remains `ABSENT`.

## Phase boundary

**Phase E (this):** package foundation, governed input boundary,
deterministic compilation primitive, provenance continuity. Output:
`EpisodeCompilationFoundation` — deliberately not named or shaped as a
candidate.

**Phase F (not yet authorized):** the real Episode Candidate contract and
its own provenance. This charter does not document Phase-F behavior as
implemented, because it is not.
