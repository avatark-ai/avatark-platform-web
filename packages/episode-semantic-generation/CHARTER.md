# Episode Semantic Generation — Charter

**Governed by:** `PLT-ADR-009` Amendment (2026-09-21, G10D-5 Stage 1), `STK-WO-009` (G10D-5 Stage 1 Progress Note).
**Status:** Foundation (Stage 2) — the proposal boundary and its human content-origin path.

## What this package owns

Per the `PLT-ADR-009` amendment's A1, this package is ratified as the third
governed sibling package inside `avatark-platform-web`, alongside
`@avatark/narrative-interpretation` and `@avatark/episode-compiler`. Its
authority is narrow: given a governed `CertifiedInterpretation` and a
governed content-source input, produce a non-authoritative
`EpisodeContentProposal`. It owns proposal construction, proposal
canonicalization, proposal identity, and content-origin provenance.

## What this package does NOT own

- **World truth / World History.** No dependency on Lane-1 or
  `@avatark/narrative-ir-adapter`, directly or indirectly.
- **Narrative Interpretation authority or certification.** This package
  never derives an interpretation, never certifies one, and only ever
  *consumes* an already-produced `CertifiedInterpretation`.
- **Episode authority or Episode certification.** This package cannot
  construct an `EpisodeCandidate` or a `CertifiedEpisode` — those remain
  `@avatark/episode-compiler`'s sole authority (see its own charter). This
  package has no dependency on `@avatark/episode-compiler`, in either
  direction.
- **Runtime execution.** No dependency on `@avatark/narrative-runtime`. No
  `Scene`/`Beat` type is declared here — see `EpisodeSegment vs Scene/Beat`
  below.
- **Production/distribution/authoring surfaces.** No dependency on Writer,
  Story Twin, CinemaK, or StreamK. Those live in `dt4m-os`, a separate
  repository with no cross-repo dependency mechanism to this monorepo (per
  `PLT-ADR-009`'s own Context section) — this package represents "governed
  human content" generically, at its own domain boundary, never by
  importing `WriterEpisode` or any other downstream schema as authority.
- **Model/LLM execution.** No dependency on any model SDK. `kind: "model"`
  and `kind: "rule_engine"` are real, ratified TYPES (`ContentOriginKind`)
  with zero operational code path — see `src/authorityBoundary.test.ts`
  `SG8` for the static proof.

## The governed input boundary

Two required inputs: a real, already-produced `CertifiedInterpretation`
(validated exactly as `@avatark/episode-compiler` validates it — structural
shape plus self-consistency against the one real, known certification
authority/policy, reusing `@avatark/narrative-interpretation`'s own
exported `deriveCertifiedInterpretationId()`), and a `contentOriginIdentity`
whose `kind` must be `"human"` — the only operationally authorized origin
in this implementation gate (`PLT-ADR-009` Amendment A3).

## EpisodeSegment vs Scene/Beat

`EpisodeSegment` is the semantic Episode unit (`PLT-ADR-009` Amendment A6):
a stable, content-derived `segmentId`, a `label`, a `statement`, and zero
or more evidence references. It is deliberately not named or shaped as
`Scene`/`Beat` — those remain `@avatark/narrative-runtime`'s own runtime
execution representations, unchanged. A future Phase G owns projecting
`EpisodeSegment` into `Scene`/`Beat`; this package neither performs nor
presumes that projection.

## Evidence references

An `EpisodeSegment`'s evidence references may only name `evidenceId`s
already present in the supplied `CertifiedInterpretation`'s own
`evidenceProvenance` list. Any other id is rejected
(`UNKNOWN_EVIDENCE_REFERENCE`) — this package never fabricates a World
reference.

## Identity model

Four identities, per `PLT-ADR-009` Amendment A8, all in `src/identity.ts`:

- **`contentIdentity`** — deterministic hash of canonicalized `title` +
  `premise` + ordered segments only. Independent of who proposed it.
- **`contentOriginIdentity`** — `{ kind, name, version }`, caller-supplied
  and structurally validated.
- **`generationExecutionIdentity`** — provenance-only. For today's
  human-only origin, a fixed, deterministic constant (no execution to
  record); a future model origin's real, non-deterministic execution
  record would live here without ever participating in `contentIdentity`
  or `proposalId` derivation.
- **`proposalId`** — deterministic hash of `sourceCertifiedInterpretationId`
  + `contentOriginIdentity` + `contentIdentity`.

## Generation ≠ Certification

This package's output is explicitly a **proposal** (`status: "proposal"`),
never an `EpisodeCandidate`, never a `CertifiedEpisode`. It has no
certify-named export or internal function (`src/authorityBoundary.test.ts`
`SG6`, proven statically) — it cannot self-certify. `@avatark/episode-compiler`
remains the sole authority for folding a proposal into an `EpisodeCandidate`
and, downstream, certifying it (Stage 3, a separate implementation gate).

## Deferred (not this package's job, not yet authorized)

Integration into `@avatark/episode-compiler`'s `EpisodeCandidate`/
`CertifiedEpisode` contracts (Stage 3), runtime projection (Phase G), and
Experience/production/distribution integration (Phase H) all remain fully
out of scope for this package. This charter does not document any of them
as implemented, because none is.
