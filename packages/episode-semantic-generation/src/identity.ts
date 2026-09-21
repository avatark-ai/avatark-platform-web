// Deterministic identity primitives (ADR Amendment A8). Extracted into
// their own module so propose.ts and any future revision path recompute
// from the same one algorithm, never a divergent second one -- mirroring
// narrative-interpretation's own identity.ts precedent.
import { createHash } from "node:crypto"
import type { ContentOriginIdentity, EpisodeSegment, EpisodeSegmentInput } from "./types.ts"

function sha256(basis: unknown): string {
  return createHash("sha256").update(JSON.stringify(basis)).digest("hex")
}

// Stable, position-and-content-derived -- never caller-supplied, never
// random. Changes if this segment's own label/statement/evidence changes,
// AND changes if its position changes (a reorder is a content change, per
// ADR Amendment A8's "reordered segments change identity" requirement).
export function deriveSegmentId(index: number, segment: EpisodeSegmentInput, evidenceIds: readonly string[]): string {
  return sha256({ index, label: segment.label, statement: segment.statement, evidenceIds })
}

export function buildSegment(index: number, input: EpisodeSegmentInput): EpisodeSegment {
  const evidenceIds = [...(input.evidenceReferences ?? [])]
  return {
    segmentId: deriveSegmentId(index, input, evidenceIds),
    label: input.label,
    statement: input.statement,
    evidenceReferences: evidenceIds.map((evidenceId) => ({ evidenceId })),
  }
}

// The canonical, order-preserving basis for contentIdentity -- explicit
// key order (never relying on an input object's own key order), title +
// premise + the fully-built segment list (each already carrying its own
// derived segmentId, so a segment content OR order change changes this
// too). Deliberately excludes contentOriginIdentity and
// generationExecutionIdentity -- content identity answers only "is this
// the same semantic content?", independent of who/what proposed it.
export function deriveContentIdentity(title: string, premise: string, segments: readonly EpisodeSegment[]): string {
  return sha256({
    title,
    premise,
    segments: segments.map((s) => ({ label: s.label, statement: s.statement, evidenceIds: s.evidenceReferences.map((r) => r.evidenceId) })),
  })
}

// proposalId binds contentIdentity to the exact upstream
// CertifiedInterpretation and the exact content-origin identity that
// proposed it -- never a wall-clock timestamp, never a random id.
export function deriveProposalId(sourceCertifiedInterpretationId: string, contentOriginIdentity: ContentOriginIdentity, contentIdentity: string): string {
  return sha256({ sourceCertifiedInterpretationId, contentOriginIdentity, contentIdentity })
}
