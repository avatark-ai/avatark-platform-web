import assert from "node:assert/strict"
import { test } from "node:test"
import { certifyInterpretationCandidate, evidenceItemFromExpectedAbsenceFact, interpretNarrativeEvidence } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation, InterpreterIdentity, NarrativeInterpretationInput } from "@avatark/narrative-interpretation"
import { proposeEpisodeContent } from "@avatark/episode-semantic-generation"
import type { ContentOriginIdentity, EpisodeContentInput } from "@avatark/episode-semantic-generation"
import { certifyEpisodeCandidate, certifyEpisodeCandidateWithProposal, compileEpisodeCandidate, compileEpisodeCandidateWithProposal } from "@avatark/episode-compiler"
import type { CertifiedEpisode, EpisodeCompilerIdentity } from "@avatark/episode-compiler"
import { validateNarrativeDefinition } from "@avatark/narrative-runtime"
import { projectCertifiedEpisode } from "./project.ts"

const INTERPRETER_IDENTITY: InterpreterIdentity = { name: "narrative-interpretation", version: "0.1.0" }
const COMPILER_IDENTITY: EpisodeCompilerIdentity = { name: "episode-compiler", version: "0.1.0" }
const HUMAN_ORIGIN: ContentOriginIdentity = { kind: "human", name: "writer-domain-boundary", version: "1" }
const REAL_EVIDENCE_ID = "expectation-place/waiting-hollow"

function realLookingFact() {
  return {
    expectationId: REAL_EVIDENCE_ID,
    subjectId: "place/waiting-hollow",
    property: "occupancy",
    origin: "WORLD_PATTERN" as const,
    irVersion: "0.3.0",
    evidenceStateIds: [
      "expectation-place/waiting-hollow-evidence-0",
      "expectation-place/waiting-hollow-evidence-1",
      "expectation-place/waiting-hollow-evidence-2",
      "expectation-place/waiting-hollow-evidence-3",
    ],
    logicalTick: 10,
    disconfirmationCount: 1,
    artifactReference: {
      sourceId: "C-repeated-pattern-gap-perceptible-absence",
      digest: "7a823c5abc98bc21c53f4be3ea7444625ca89b7baa679731ab514ba77d84efba",
      ruleId: "runtime-requirements/occupancy-pattern",
      eventId: "place/waiting-hollow",
    },
  }
}

function realInput(): NarrativeInterpretationInput {
  return { schemaVersion: "1", evidence: [evidenceItemFromExpectedAbsenceFact(realLookingFact())] }
}

function realCertifiedInterpretation(): CertifiedInterpretation {
  const input = realInput()
  const candidate = interpretNarrativeEvidence(input, INTERPRETER_IDENTITY)
  const result = certifyInterpretationCandidate(candidate, input, INTERPRETER_IDENTITY)
  assert.equal(result.decision, "CERTIFIED")
  if (result.decision !== "CERTIFIED") throw new Error("unreachable")
  return result.certifiedInterpretation
}

function validContent(): EpisodeContentInput {
  return {
    title: "The Flute Across Yamuna",
    premise: "A quiet, repeated absence at the waiting hollow becomes noticeable.",
    segments: [
      { label: "Arrival", statement: "The visitor approaches the waiting hollow and finds it unusually still.", evidenceReferences: [REAL_EVIDENCE_ID] },
      { label: "Recognition", statement: "The pattern of absence becomes explicit rather than merely felt." },
      { label: "Departure", statement: "The visitor leaves, carrying the noticing with them." },
    ],
  }
}

function realCertifiedEpisode(content = validContent()): CertifiedEpisode {
  const certified = realCertifiedInterpretation()
  const proposalResult = proposeEpisodeContent(certified, content, HUMAN_ORIGIN)
  assert.equal(proposalResult.decision, "PROPOSED")
  if (proposalResult.decision !== "PROPOSED") throw new Error("unreachable")
  const candidateResult = compileEpisodeCandidateWithProposal(certified, COMPILER_IDENTITY, proposalResult.proposal)
  assert.equal(candidateResult.decision, "COMPILED")
  if (candidateResult.decision !== "COMPILED") throw new Error("unreachable")
  const certResult = certifyEpisodeCandidateWithProposal(candidateResult.episodeCandidate, certified, COMPILER_IDENTITY, proposalResult.proposal)
  assert.equal(certResult.decision, "CERTIFIED")
  if (certResult.decision !== "CERTIFIED") throw new Error("unreachable")
  return certResult.certifiedEpisode
}

function contentFreeCertifiedEpisode(): CertifiedEpisode {
  const certified = realCertifiedInterpretation()
  const candidateResult = compileEpisodeCandidate(certified, COMPILER_IDENTITY)
  assert.equal(candidateResult.decision, "COMPILED")
  if (candidateResult.decision !== "COMPILED") throw new Error("unreachable")
  const certResult = certifyEpisodeCandidate(candidateResult.episodeCandidate, certified, COMPILER_IDENTITY)
  assert.equal(certResult.decision, "CERTIFIED")
  if (certResult.decision !== "CERTIFIED") throw new Error("unreachable")
  return certResult.certifiedEpisode
}

// 1. semantic CertifiedEpisode projects
test("PJ1: a real, content-bearing CertifiedEpisode projects successfully", () => {
  const result = projectCertifiedEpisode(realCertifiedEpisode())
  assert.equal(result.decision, "PROJECTED")
})

// 2. content-free CertifiedEpisode fails closed
test("PJ2: a content-free CertifiedEpisode (Phase F's own shape) is rejected -- fails closed, never fabricates content", () => {
  const result = projectCertifiedEpisode(contentFreeCertifiedEpisode())
  assert.equal(result.decision, "REJECTED")
  if (result.decision !== "REJECTED") throw new Error("unreachable")
  assert.equal(result.reason, "NOT_RUNTIME_PROJECTABLE")
})

// 3. exact source CertifiedEpisode retained (traceability, not mutation)
test("PJ3: projection never mutates the supplied CertifiedEpisode", () => {
  const episode = realCertifiedEpisode()
  const before = JSON.stringify(episode)
  projectCertifiedEpisode(episode)
  assert.equal(JSON.stringify(episode), before)
})

// 4. semantic title traceable
test("PJ4: the projected definition's title, season title, and episode title are all the real, traceable content.title -- never a placeholder", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  assert.equal(result.definition.title, episode.content?.title)
  assert.equal(result.definition.seasons[0].title, episode.content?.title)
  assert.equal(result.definition.seasons[0].episodes[0].title, episode.content?.title)
})

test("PJ4b: each projected Scene's title is the real, traceable segment.label -- never \"Scene 1\"/\"Scene 2\"", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  const sceneTitles = result.definition.seasons[0].episodes[0].scenes.map((s) => s.title)
  assert.deepEqual(sceneTitles, episode.content?.segments.map((s) => s.label))
})

// 5 / 10. segment mapping / runtime IDs deterministic
test("PJ5: projecting the same CertifiedEpisode twice produces byte-identical runtime ids throughout", () => {
  const episode = realCertifiedEpisode()
  const a = projectCertifiedEpisode(episode)
  const b = projectCertifiedEpisode(episode)
  assert.equal(a.decision, "PROJECTED")
  assert.equal(b.decision, "PROJECTED")
  if (a.decision !== "PROJECTED" || b.decision !== "PROJECTED") throw new Error("unreachable")
  assert.deepEqual(a.definition, b.definition)
})

// 6/7. no placeholder Scene/Beat
test("PJ6: no scene title is a generic placeholder like \"Scene 1\"", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  for (const scene of result.definition.seasons[0].episodes[0].scenes) {
    assert.ok(!/^Scene \d+$/.test(scene.title), `scene title "${scene.title}" looks like a fabricated placeholder`)
  }
})

// 8. no invented plot -- the projection carries no field the semantic
// Episode did not itself supply (title/label only; no invented dialogue,
// theme, or plot text anywhere in the definition).
test("PJ8: the projected definition contains no string value that was not sourced from the real content.title or a real segment.label", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  const realTitle = episode.content?.title
  const realLabels = new Set(episode.content?.segments.map((s) => s.label))
  assert.equal(result.definition.title, realTitle)
  for (const scene of result.definition.seasons[0].episodes[0].scenes) {
    assert.ok(realLabels.has(scene.title), `scene title "${scene.title}" was not sourced from a real segment label`)
  }
})

// 9. no invented entity/place refs -- beats carry only a real, resolvable
// refs.asset (G10D-6 Track A); no World/entity/place reference field is
// ever populated (no legitimate carrier for those exists -- see project.ts's
// own header comment).
test("PJ9: no projected beat carries a World/entity/place reference -- only the real, resolvable refs.asset (G10D-6 Track A) is ever set", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  for (const scene of result.definition.seasons[0].episodes[0].scenes) {
    for (const beat of scene.beats) {
      const refs = (beat as { refs?: Record<string, unknown> }).refs
      assert.ok(refs !== undefined, "every narration beat must carry a real refs.asset")
      assert.deepEqual(Object.keys(refs), ["asset"])
      assert.ok(typeof refs.asset === "object" && refs.asset !== null)
    }
  }
})

// 11. deterministic transitions
test("PJ11: every non-final scene's beat transitions to the next scene by a deterministic id; the final scene transitions to end", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  const scenes = result.definition.seasons[0].episodes[0].scenes
  for (let i = 0; i < scenes.length - 1; i += 1) {
    const beat = scenes[i].beats[0]
    assert.equal(beat.kind, "narration")
    if (beat.kind !== "narration") throw new Error("unreachable")
    assert.deepEqual(beat.next, { to: "scene", sceneId: scenes[i + 1].id })
  }
  const lastBeat = scenes[scenes.length - 1].beats[0]
  assert.equal(lastBeat.kind, "narration")
  if (lastBeat.kind !== "narration") throw new Error("unreachable")
  assert.deepEqual(lastBeat.next, { to: "end" })
})

// 12. no fake choice
test("PJ12: no beat is ever kind \"choice\" or \"trigger\" -- the semantic Episode carries no branching semantics, so none is fabricated", () => {
  const episode = realCertifiedEpisode()
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  for (const scene of result.definition.seasons[0].episodes[0].scenes) {
    for (const beat of scene.beats) {
      assert.equal(beat.kind, "narration")
    }
  }
})

// 20. validateNarrativeDefinition passes for legitimate semantic Episode
test("PJ20: the projected definition passes narrative-runtime's own, unmodified validateNarrativeDefinition()", () => {
  const result = projectCertifiedEpisode(realCertifiedEpisode())
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  const validation = validateNarrativeDefinition(result.definition)
  assert.equal(validation.valid, true, validation.errors.join("; "))
})

test("PJ20b: a single-segment Episode still projects and validates (one scene, transitions straight to end)", () => {
  const episode = realCertifiedEpisode({ title: "One Segment", premise: "Minimal case.", segments: [{ label: "Only Segment", statement: "The only thing that happens." }] })
  const result = projectCertifiedEpisode(episode)
  assert.equal(result.decision, "PROJECTED")
  if (result.decision !== "PROJECTED") throw new Error("unreachable")
  assert.equal(result.definition.seasons[0].episodes[0].scenes.length, 1)
  const validation = validateNarrativeDefinition(result.definition)
  assert.equal(validation.valid, true, validation.errors.join("; "))
})

test("PJ_invalid: a structurally malformed CertifiedEpisode is rejected, never thrown", () => {
  assert.doesNotThrow(() => projectCertifiedEpisode(null))
  assert.doesNotThrow(() => projectCertifiedEpisode(undefined))
  assert.doesNotThrow(() => projectCertifiedEpisode({}))
  const result = projectCertifiedEpisode({ certifiedEpisodeId: "" })
  assert.equal(result.decision, "REJECTED")
})
