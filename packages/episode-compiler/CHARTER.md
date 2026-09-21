# Episode Compiler — Charter

**Governed by:** `PLT-ADR-009` (Narrative Interpretation and Episode Authority), `STK-WO-009` Phases E-F.
**Status:** Foundation (Phase E) + the real Episode Candidate contract and its own certification transition (Phase F).

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
- **Interpretation certification.** This package never calls
  `certifyInterpretationCandidate`, never certifies a
  `NarrativeInterpretationCandidate`, and never constructs a fake
  `CertifiedInterpretation`. Who or what is authorized to invoke
  Interpretation certification in a real governed review process is an
  explicitly unresolved production-governance question (`STK-WO-009`'s
  own "Human / Founders decision points") — this package does not resolve
  or bypass it. The **same** unresolved-authority pattern applies one
  stage downstream to this package's own Episode certification (below):
  `certifyEpisodeCandidate` never invokes itself automatically, and who is
  authorized to invoke it in a real review process is equally unresolved.

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

## What EpisodeCandidate is (Phase F)

`EpisodeCandidate` (`compileEpisodeCandidate()`) is the real, governed
semantic output `STK-WO-009`'s own Phase F exit criteria requires: a
structural/provenance-only candidate, derived independently from the same
`CertifiedInterpretation` input `EpisodeCompilationFoundation` (Phase E)
already consumes — the two are siblings over the same governed input, not
a pipeline; neither is the other's input (see `src/authorityBoundary.test.ts`
`T7`). It carries:

- `episodeCandidateId` — deterministic, `sha256` of the upstream certified
  identity, this compiler's own identity, and a separately-versioned
  candidate-contract identity (`EPISODE_CANDIDATE_CONTRACT_IDENTITY`) — no
  wall-clock time, no random id.
- `status: "candidate"` / `certified: false` — the same non-certified
  discriminant `NarrativeInterpretationCandidate` uses.
- `sourceCertifiedInterpretationId` / `sourceCandidateId` /
  `sourceInterpretationInputIdentity` — the exact upstream identity chain,
  copied verbatim, never reconstructed.
- `compilerIdentity`.

## What EpisodeCandidate is NOT (and why)

`CertifiedInterpretation` (Phase C/D) still carries no narrative claim,
theme, ordering, or plot — only structural/provenance content. A candidate
derived from it can therefore only be structural/provenance content too.
No scene, beat, encounter, character arc, dialogue, conflict, or dramatic
ordering was invented to fill that gap — see
`STUDIOK_UI_M1_G10D2_EPISODE_CANDIDATE_PROVENANCE_REPORT.md` in `dt4m-os`
for the full semantic-sufficiency analysis. Runtime `Scene`/`Beat` remain
`KEEP_AS_RUNTIME_REPRESENTATION`, unchanged; this package does not
introduce a semantic Scene or Beat of its own. Encounter remains
`UNRESOLVED`. `NarrativeEntity` remains `ABSENT`.

## Episode certification (Phase F)

`STK-WO-009`'s own Phase F exit criteria explicitly requires a second
governed certification transition, mirroring Phase D's Interpretation
certification exactly: `EpisodeCandidate → Certification → CertifiedEpisode`.
`certifyEpisodeCandidate()` (`src/episodeCertify.ts`) is deliberately
separate from `compileEpisodeCandidate()` (`derive(...) != certify(...)`,
proven statically) and never trusts a presented candidate's own claimed
fields — it independently recomputes a fresh one via
`compileEpisodeCandidate()` itself and compares by value. `CertifiedEpisode`
carries its own `certificationAuthorityIdentity`/`certificationPolicyIdentity`,
distinct from Interpretation's own certification identities.

## Deferred (not this package's job, not yet authorized)

Runtime projection (Phase G — `@avatark/narrative-runtime`, untouched) and
Experience/production/distribution integration (Phase H — `Experience`,
`WatchFirstEntry`, `Practice`, Writer, Story Twin, CinemaK, StreamK, all
untouched) remain fully out of scope. This charter does not document
either as implemented, because neither is.
