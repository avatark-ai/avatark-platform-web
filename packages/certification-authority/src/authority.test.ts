import assert from "node:assert/strict"
import { test } from "node:test"
import { certifyInterpretationCandidate } from "@avatark/narrative-interpretation"
import type { CertifiedInterpretation } from "@avatark/narrative-interpretation"
import { createCertificationAuthority } from "./authority.ts"
import type { AuthenticatedInvoker, InvokeCertificationResult } from "./authority.ts"
import { computeSubjectDigest, verifyRecordAttestation } from "./attestation.ts"
import { CERTIFICATION_INVOCATION_CAPABILITIES } from "./policies.ts"
import { verifyAttestedEvidence } from "./verify.ts"
import { COMPILER_IDENTITY, contentEpisodeFor, episodeCandidateFor, interpretationSubject } from "../test/realSubjects.ts"
import { ADMIN_ID, CERTIFIER_ID, TestDoubleGrantSource, TestDoubleRefusalAudit, TestDoubleRegistry, testSigner, trustFor } from "../test/testDoubles.ts"

const HUMAN: AuthenticatedInvoker = { kind: "HUMAN", userId: CERTIFIER_ID, authenticationMethod: "SUPABASE_SESSION" }

function setup(options: { grantKinds?: Array<"INTERPRETATION" | "EPISODE"> } = {}) {
  const signer = testSigner()
  const registry = new TestDoubleRegistry()
  const refusalAudit = new TestDoubleRefusalAudit()
  const grants = new TestDoubleGrantSource()
  for (const kind of options.grantKinds ?? ["INTERPRETATION", "EPISODE"]) grants.grant(CERTIFIER_ID, CERTIFICATION_INVOCATION_CAPABILITIES[kind])
  const trust = trustFor(signer)
  const authority = createCertificationAuthority({ grants, registry, refusalAudit, signer, trust })
  return { signer, registry, refusalAudit, grants, trust, authority }
}

function issued(result: InvokeCertificationResult) {
  assert.equal(result.outcome, "ISSUED", result.outcome === "REFUSED" ? `${result.category}: ${result.detail}` : "")
  if (result.outcome !== "ISSUED") throw new Error("unreachable")
  return result
}

function refused(result: InvokeCertificationResult) {
  assert.equal(result.outcome, "REFUSED")
  if (result.outcome !== "REFUSED") throw new Error("unreachable")
  return result
}

async function issueInterpretation(ctx: ReturnType<typeof setup>, subject = interpretationSubject()) {
  return issued(await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: subject }))
}

test("CA-B: calling the pure evaluator directly produces no authoritative Certification Record", () => {
  const ctx = setup()
  const subject = interpretationSubject()
  const evaluation = certifyInterpretationCandidate(subject.candidate, subject.sourceInput, subject.sourceIdentity)
  assert.equal(evaluation.decision, "CERTIFIED")
  assert.equal(ctx.registry.entries.length, 0, "no record exists: an evaluation result is not issuance")
  assert.equal("certificationRecordId" in (evaluation as object), false)
  assert.equal("attestation" in (evaluation as object), false)
})

test("CA-E: an authorized Interpretation invocation issues a signed, durable-port-committed record", async () => {
  const ctx = setup()
  const result = await issueInterpretation(ctx)
  const { record, attestation } = result.attested
  assert.equal(record.subjectKind, "INTERPRETATION")
  assert.equal(record.subjectId, (result.artifact as CertifiedInterpretation).certifiedInterpretationId)
  assert.equal(record.subjectDigest.value, computeSubjectDigest(result.artifact).value)
  assert.equal(record.state, "issued")
  assert.equal(record.upstreamCertification, null)
  assert.deepEqual(record.invoker, HUMAN)
  assert.equal(record.invocationGrant.capability, "certification.invoke.interpretation")
  assert.equal(record.invocationGrant.grantedBy, ADMIN_ID)
  assert.match(record.certificationRecordId, /^certrec_[0-9a-f-]{36}$/)
  assert.notEqual(record.certificationRecordId, record.subjectId)
  assert.equal(attestation.algorithm, "Ed25519")
  assert.equal(verifyRecordAttestation(result.attested, ctx.trust).ok, true)
  assert.equal(ctx.registry.entries.length, 1)
  assert.equal(ctx.refusalAudit.entries.length, 0)
})

test("CA-F: an authorized Episode invocation with a valid upstream record issues a record bound to that upstream", async () => {
  const ctx = setup()
  const upstream = await issueInterpretation(ctx)
  const certifiedInterpretation = upstream.artifact as CertifiedInterpretation
  const result = issued(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN,
    subjectKind: "EPISODE",
    subjectArtifact: {
      episodeCandidate: episodeCandidateFor(certifiedInterpretation),
      compilerIdentity: COMPILER_IDENTITY,
      upstreamCertificationRecordId: upstream.attested.record.certificationRecordId,
    },
  }))
  const binding = result.attested.record.upstreamCertification
  assert.ok(binding)
  assert.equal(binding.certificationRecordId, upstream.attested.record.certificationRecordId)
  assert.equal(binding.subjectId, certifiedInterpretation.certifiedInterpretationId)
  assert.deepEqual(binding.subjectDigest, upstream.attested.record.subjectDigest)
  assert.equal(result.attested.record.invocationGrant.capability, "certification.invoke.episode")
  assert.equal(verifyAttestedEvidence(result.attested, result.artifact, "EPISODE", ctx.trust).ok, true)
})

test("CA-F2: a content-bearing Episode (with proposal) certifies through the same Authority", async () => {
  const ctx = setup()
  const upstream = await issueInterpretation(ctx)
  const { episodeCandidate, sourceProposal } = contentEpisodeFor(upstream.artifact as CertifiedInterpretation)
  const result = issued(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN,
    subjectKind: "EPISODE",
    subjectArtifact: { episodeCandidate, compilerIdentity: COMPILER_IDENTITY, sourceProposal, upstreamCertificationRecordId: upstream.attested.record.certificationRecordId },
  }))
  const artifact = result.artifact as { content?: unknown; contentIdentity?: string; sourceProposalId?: string }
  assert.ok(artifact.content)
  assert.ok(artifact.sourceProposalId)
  assert.equal(result.attested.record.subjectDigest.value, computeSubjectDigest(artifact).value, "digest covers content")
  assert.equal(result.attested.record.sourceProvenance.sourceProposalId, artifact.sourceProposalId)
  const withoutContent = { ...artifact, content: { ...(artifact.content as object), title: "Changed" } }
  assert.notEqual(computeSubjectDigest(withoutContent).value, result.attested.record.subjectDigest.value, "a content change changes the digest")
})

test("CA-C: an unauthorized human is refused before the evaluator runs, with a durable refusal audit and no record", async () => {
  const ctx = setup({ grantKinds: [] })
  const subject = interpretationSubject()
  let sourceInputRead = false
  const guarded = {
    candidate: subject.candidate,
    get sourceInput() { sourceInputRead = true; return subject.sourceInput },
    sourceIdentity: subject.sourceIdentity,
  }
  const result = refused(await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: guarded }))
  assert.equal(result.category, "GRANT_DENIED")
  assert.equal(result.auditPersisted, true)
  assert.equal(sourceInputRead, false, "evaluator inputs are never touched before the grant check passes")
  assert.equal(ctx.registry.entries.length, 0)
  assert.equal(ctx.refusalAudit.entries.length, 1)
  const audit = ctx.refusalAudit.entries[0]
  assert.equal(audit.invokerUserId, CERTIFIER_ID)
  assert.equal(audit.grantResult, "DENIED")
  assert.equal(audit.refusalCategory, "GRANT_DENIED")
  assert.equal(audit.requestedSubjectKind, "INTERPRETATION")
  assert.equal(audit.requestedSubjectRef, subject.candidate.candidateId)
  assert.equal(audit.policyName, null, "policy was never reached")
  assert.equal("signature" in audit, false)
  assert.equal("certificationRecordId" in audit, false)
})

test("CA-C2: an unauthenticated invocation is refused and audited with no invoker", async () => {
  const ctx = setup()
  const result = refused(await ctx.authority.invokeCertification({ authenticatedInvoker: null, subjectKind: "INTERPRETATION", subjectArtifact: interpretationSubject() }))
  assert.equal(result.category, "UNAUTHENTICATED_INVOKER")
  assert.equal(ctx.grants.calls.length, 0, "no grant lookup without an authenticated invoker")
  assert.equal(ctx.refusalAudit.entries[0].invokerUserId, null)
  assert.equal(ctx.registry.entries.length, 0)
})

test("CA-D: a grant for the wrong subject kind is refused", async () => {
  const ctx = setup({ grantKinds: ["INTERPRETATION"] })
  const upstream = await issueInterpretation(ctx)
  const result = refused(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN,
    subjectKind: "EPISODE",
    subjectArtifact: {
      episodeCandidate: episodeCandidateFor(upstream.artifact as CertifiedInterpretation),
      compilerIdentity: COMPILER_IDENTITY,
      upstreamCertificationRecordId: upstream.attested.record.certificationRecordId,
    },
  }))
  assert.equal(result.category, "GRANT_DENIED")
  assert.deepEqual(ctx.grants.calls.at(-1), { userId: CERTIFIER_ID, capability: "certification.invoke.episode" })
  assert.equal(ctx.registry.entries.length, 1, "only the interpretation record exists")
})

test("CA-D2: a self-assigned grant is refused (grants are administrator-issued, never self-assigned)", async () => {
  const ctx = setup({ grantKinds: [] })
  ctx.grants.grant(CERTIFIER_ID, "certification.invoke.interpretation", CERTIFIER_ID)
  const result = refused(await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: interpretationSubject() }))
  assert.equal(result.category, "SELF_ASSIGNED_GRANT")
  assert.equal(ctx.registry.entries.length, 0)
})

test("CA-D3: a grant with no issuing administrator is refused", async () => {
  const ctx = setup({ grantKinds: [] })
  ctx.grants.grant(CERTIFIER_ID, "certification.invoke.interpretation", null)
  const result = refused(await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: interpretationSubject() }))
  assert.equal(result.category, "GRANT_DENIED")
})

test("CA-D4: a publish-style or unrelated grant never authorizes certification", async () => {
  const ctx = setup({ grantKinds: [] })
  ctx.grants.grant(CERTIFIER_ID, "publish")
  ctx.grants.grant(CERTIFIER_ID, "platform.capability.manage")
  const result = refused(await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: interpretationSubject() }))
  assert.equal(result.category, "GRANT_DENIED")
})

test("CA-K0: an unsupported subject kind is refused before any grant lookup", async () => {
  const ctx = setup()
  const result = refused(await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "EXPERIENCE", subjectArtifact: {} }))
  assert.equal(result.category, "UNSUPPORTED_SUBJECT_KIND")
  assert.equal(ctx.grants.calls.length, 0)
})

test("CA-EV: an evaluator refusal (tampered candidate) issues nothing and is audited with the policy reached", async () => {
  const ctx = setup()
  const subject = interpretationSubject()
  const tampered = { ...subject, candidate: { ...subject.candidate, candidateId: "f".repeat(64) } }
  const result = refused(await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: tampered }))
  assert.equal(result.category, "EVALUATOR_REFUSED")
  assert.equal(ctx.registry.entries.length, 0)
  assert.equal(ctx.refusalAudit.entries[0].policyName, "structural-provenance-identity-policy")
  assert.equal(ctx.refusalAudit.entries[0].evaluatorName, "narrative-interpretation-certification")
})

test("CA-G: an Episode with a missing or unknown upstream record id is refused", async () => {
  const ctx = setup()
  const upstream = await issueInterpretation(ctx)
  const episodeCandidate = episodeCandidateFor(upstream.artifact as CertifiedInterpretation)
  for (const upstreamCertificationRecordId of [undefined, "certrec_00000000-0000-4000-8000-000000000000"]) {
    const subjectArtifact: Record<string, unknown> = { episodeCandidate, compilerIdentity: COMPILER_IDENTITY }
    if (upstreamCertificationRecordId) subjectArtifact.upstreamCertificationRecordId = upstreamCertificationRecordId
    const result = refused(await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "EPISODE", subjectArtifact }))
    assert.equal(result.category, "PROVENANCE_MISMATCH")
  }
  assert.equal(ctx.registry.entries.length, 1)
})

test("CA-G2: a caller-supplied (reproducible) certifiedInterpretationId is never accepted as the upstream root", async () => {
  const ctx = setup()
  const subject = interpretationSubject()
  const evaluation = certifyInterpretationCandidate(subject.candidate, subject.sourceInput, subject.sourceIdentity)
  if (evaluation.decision !== "CERTIFIED") throw new Error("unreachable")
  // Never issued: anyone can reproduce this id and the artifact.
  const result = refused(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN,
    subjectKind: "EPISODE",
    subjectArtifact: {
      episodeCandidate: episodeCandidateFor(evaluation.certifiedInterpretation),
      compilerIdentity: COMPILER_IDENTITY,
      upstreamCertificationRecordId: evaluation.certifiedInterpretation.certifiedInterpretationId,
    },
  }))
  assert.equal(result.category, "PROVENANCE_MISMATCH")
  assert.equal(ctx.registry.entries.length, 0)
})

test("CA-H: an Episode whose upstream record is forged (attacker key) is refused", async () => {
  const ctx = setup()
  const attacker = setup()
  const forgedUpstream = await issueInterpretation(attacker)
  // Plant the attacker-signed record in the real Authority's registry.
  await ctx.registry.appendIssued({ attested: forgedUpstream.attested, artifact: forgedUpstream.artifact })
  const result = refused(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN,
    subjectKind: "EPISODE",
    subjectArtifact: {
      episodeCandidate: episodeCandidateFor(forgedUpstream.artifact as CertifiedInterpretation),
      compilerIdentity: COMPILER_IDENTITY,
      upstreamCertificationRecordId: forgedUpstream.attested.record.certificationRecordId,
    },
  }))
  assert.equal(result.category, "PROVENANCE_MISMATCH")
  assert.match(result.detail, /FORGED_OR_INVALID_ATTESTATION/)
})

test("CA-H2: an upstream record whose stored artifact was altered is refused", async () => {
  const ctx = setup()
  const upstream = await issueInterpretation(ctx)
  ctx.registry.entries[0].artifact = { ...(upstream.artifact as object), interpretationInputIdentity: "0".repeat(64) }
  const result = refused(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN,
    subjectKind: "EPISODE",
    subjectArtifact: {
      episodeCandidate: episodeCandidateFor(upstream.artifact as CertifiedInterpretation),
      compilerIdentity: COMPILER_IDENTITY,
      upstreamCertificationRecordId: upstream.attested.record.certificationRecordId,
    },
  }))
  assert.equal(result.category, "PROVENANCE_MISMATCH")
  assert.match(result.detail, /SUBJECT_IDENTITY_MISMATCH/)
})

test("CA-I: a valid upstream record for a DIFFERENT Interpretation cannot be substituted", async () => {
  const ctx = setup()
  const upstreamA = await issueInterpretation(ctx, interpretationSubject("place/waiting-hollow"))
  const upstreamB = await issueInterpretation(ctx, interpretationSubject("place/river-bank"))
  assert.notEqual(upstreamA.attested.record.subjectId, upstreamB.attested.record.subjectId)
  const result = refused(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN,
    subjectKind: "EPISODE",
    subjectArtifact: {
      episodeCandidate: episodeCandidateFor(upstreamA.artifact as CertifiedInterpretation),
      compilerIdentity: COMPILER_IDENTITY,
      upstreamCertificationRecordId: upstreamB.attested.record.certificationRecordId,
    },
  }))
  assert.equal(result.category, "PROVENANCE_MISMATCH")
  assert.equal(ctx.registry.entries.length, 2)
})

test("CA-I2: an Episode record id cannot serve as an upstream Interpretation record", async () => {
  const ctx = setup()
  const upstream = await issueInterpretation(ctx)
  const episodeCandidate = episodeCandidateFor(upstream.artifact as CertifiedInterpretation)
  const episode = issued(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN, subjectKind: "EPISODE",
    subjectArtifact: { episodeCandidate, compilerIdentity: COMPILER_IDENTITY, upstreamCertificationRecordId: upstream.attested.record.certificationRecordId },
  }))
  const result = refused(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN, subjectKind: "EPISODE",
    subjectArtifact: { episodeCandidate, compilerIdentity: COMPILER_IDENTITY, upstreamCertificationRecordId: episode.attested.record.certificationRecordId },
  }))
  assert.equal(result.category, "PROVENANCE_MISMATCH")
})

test("CA-DUR: no ISSUED result is returned when the durable commit fails", async () => {
  const ctx = setup()
  ctx.registry.failNextAppend = true
  const result = refused(await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: interpretationSubject() }))
  assert.equal(result.category, "ISSUANCE_NOT_DURABLE")
  assert.equal(ctx.registry.entries.length, 0)
  assert.equal(ctx.refusalAudit.entries.length, 1)
})

test("CA-MULTI: re-certifying the same subject appends a second, distinct record (append-only, never overwritten)", async () => {
  const ctx = setup()
  const first = await issueInterpretation(ctx)
  const second = await issueInterpretation(ctx)
  assert.equal(first.attested.record.subjectId, second.attested.record.subjectId)
  assert.notEqual(first.attested.record.certificationRecordId, second.attested.record.certificationRecordId)
  assert.equal((await ctx.registry.listBySubject("INTERPRETATION", first.attested.record.subjectId)).length, 2)
})

test("CA-SHAPE: unexpected subject fields and invalid invocation context are refused", async () => {
  const ctx = setup()
  const extra = refused(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: { ...interpretationSubject(), certifiedInterpretationId: "x" },
  }))
  assert.equal(extra.category, "INVALID_SUBJECT")
  const context = refused(await ctx.authority.invokeCertification({
    authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: interpretationSubject(), invocationContext: { publish: true },
  }))
  assert.equal(context.category, "INVALID_INVOCATION_CONTEXT")
  const ok = await issueInterpretation(ctx)
  assert.deepEqual(ok.attested.record.sourceContext, { projectId: null, worldId: null })
})

test("CA-AUDIT: a refusal audit never persists oversized attacker-controlled content", async () => {
  const ctx = setup({ grantKinds: [] })
  const huge = "x".repeat(100_000)
  await ctx.authority.invokeCertification({ authenticatedInvoker: HUMAN, subjectKind: "INTERPRETATION", subjectArtifact: { candidate: { candidateId: huge }, sourceInput: huge, sourceIdentity: huge } })
  const audit = ctx.refusalAudit.entries[0]
  assert.equal(audit.requestedSubjectRef, null, "oversized ref is dropped, not stored")
  assert.ok(JSON.stringify(audit).length < 2000)
})
