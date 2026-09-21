// STK-WO-009 Phase G (G10D-5 Stage 4; payload closed G10D-6 Track A):
// projects a real, content-bearing CertifiedEpisode into
// @avatark/narrative-runtime's existing NarrativeDefinition shape. One
// direction only -- nothing here ever constructs, certifies, or mutates a
// CertifiedEpisode, an EpisodeCandidate, or any Interpretation-stage
// artifact. Never modifies narrative-runtime itself (STK-WO-009's own
// explicit Phase G non-goal).
//
// PAYLOAD (G10D-6 Track A, decision PAYLOAD_EXISTING_MECHANISM_REUSABLE):
// narrative-runtime's real, unmodified NarrationBeat carries no text/prose
// field of its own -- prose is referenced externally via `refs.asset`
// (NarrativeAssetRef), a mechanism that already exists in narrative-runtime's
// own ratified shape but had never been populated or resolved by anything.
// This adapter now does both, entirely on its own side (no narrative-runtime
// change): every NarrationBeat's `refs.asset.assetId` is a deterministic
// hash of the real segmentId (see deriveRuntimeId), and resolve.ts's
// resolveEpisodeSegmentProse() maps that same id back to the real, exact
// `segment.statement` -- never a fabricated asset, never invented prose.
//
// EVIDENCE REFERENCES (G10D-6 Track A, classification
// OBSERVABILITY_REQUIRED / UI_PROVENANCE_ONLY / NOT_REQUIRED_DOWNSTREAM for
// runtime execution specifically): `EpisodeSegment.evidenceReferences` are
// deliberately NOT projected into the NarrativeDefinition. narrative-runtime
// has no evidence/World concept at all (by design -- `WorldRef` is
// explicitly unimplemented), and `NarrativeReferences.world` names a whole
// World, not a specific evidentiary fact, so mapping an evidence id into it
// would be a type misuse, not a legitimate mapping. Evidence references
// remain real, present, and traceable on the CertifiedEpisode itself (for
// provenance/certification/future UI "why is this in the episode" use) --
// they simply do not belong in the execution-only runtime layer.
import { createHash } from "node:crypto"
import { runtimeProjectabilityOf } from "@avatark/episode-compiler"
import type { CertifiedEpisode } from "@avatark/episode-compiler"
import { validateNarrativeDefinition } from "@avatark/narrative-runtime"
import type { Beat, Episode, NarrativeDefinition, Scene, Season, Transition } from "@avatark/narrative-runtime"
import type { EpisodeProjectionResult } from "./types.ts"

const PROJECTION_IDENTITY = { name: "episode-runtime-adapter", version: "0.1.0" }

// Deterministic: every runtime id is a fresh hash of the real CertifiedEpisode
// identity plus a fixed, documented namespace suffix -- never the semantic
// id reused verbatim (semantic identity and runtime identity are
// deliberately distinct namespaces, per PLT-ADR-009's "runtime execution
// does not confer semantic authority" invariant), never random. Exported
// (not package-private) so resolve.ts's asset-id derivation is proven to
// use this exact function, never a second, divergent algorithm.
export function deriveRuntimeId(certifiedEpisodeId: string, namespace: string): string {
  return createHash("sha256").update(JSON.stringify({ certifiedEpisodeId, projectionIdentity: PROJECTION_IDENTITY, namespace })).digest("hex")
}

// The one namespace prefix resolve.ts also uses -- kept here, next to
// deriveRuntimeId, so the two files can never drift apart on the asset-id
// scheme.
export const ASSET_ID_NAMESPACE_PREFIX = "prose-asset:"

// Never throws -- a non-projectable or malformed CertifiedEpisode produces
// a REJECTED result. Read-only: reads its argument, constructs new
// objects, never mutates it.
export function projectCertifiedEpisode(certifiedEpisode: unknown): EpisodeProjectionResult {
  if (certifiedEpisode === null || typeof certifiedEpisode !== "object") {
    return { decision: "REJECTED", reason: "INVALID_CERTIFIED_EPISODE", detail: "certifiedEpisode must be an object" }
  }
  const record = certifiedEpisode as Record<string, unknown>
  if (typeof record.certifiedEpisodeId !== "string" || record.certifiedEpisodeId.length === 0) {
    return { decision: "REJECTED", reason: "INVALID_CERTIFIED_EPISODE", detail: "certifiedEpisode.certifiedEpisodeId is required and must be a non-empty string" }
  }

  // fail closed -- never fabricate content to fill the gap (PLT-ADR-009
  // Amendment A5).
  if (runtimeProjectabilityOf(certifiedEpisode as CertifiedEpisode) !== "RUNTIME_PROJECTABLE") {
    return {
      decision: "REJECTED",
      reason: "NOT_RUNTIME_PROJECTABLE",
      detail: "this CertifiedEpisode carries no content (or incomplete content) -- a content-free Episode remains a valid identity/provenance envelope, but is not runtime-projectable, per PLT-ADR-009 Amendment A5",
    }
  }

  const episode = certifiedEpisode as CertifiedEpisode
  const content = episode.content
  if (content === undefined) {
    // Unreachable given the projectability check above, but never trust a
    // single check alone for a field TypeScript itself cannot narrow here.
    return { decision: "REJECTED", reason: "NOT_RUNTIME_PROJECTABLE", detail: "content is unexpectedly absent" }
  }

  const definitionId = deriveRuntimeId(episode.certifiedEpisodeId, "definition")
  const seasonId = deriveRuntimeId(episode.certifiedEpisodeId, "season")
  const episodeId = deriveRuntimeId(episode.certifiedEpisodeId, "episode")

  const scenes: Scene[] = []
  for (let index = 0; index < content.segments.length; index += 1) {
    const segment = content.segments[index]
    const sceneId = deriveRuntimeId(episode.certifiedEpisodeId, `scene:${segment.segmentId}`)
    const beatId = deriveRuntimeId(episode.certifiedEpisodeId, `beat:${segment.segmentId}`)
    const isLast = index === content.segments.length - 1
    // Linear only -- the semantic Episode carries no choice semantics
    // (EpisodeSegment has no branching concept), so no Choice/Trigger beat
    // is ever fabricated here. The next scene's id is computed the same
    // deterministic way this loop will assign it, one iteration ahead --
    // safe because it depends only on that segment's own segmentId, not on
    // anything computed during this iteration.
    const next: Transition = isLast ? { to: "end" } : { to: "scene", sceneId: deriveRuntimeId(episode.certifiedEpisodeId, `scene:${content.segments[index + 1].segmentId}`) }
    const assetId = deriveRuntimeId(episode.certifiedEpisodeId, `${ASSET_ID_NAMESPACE_PREFIX}${segment.segmentId}`)
    const beat: Beat = { id: beatId, kind: "narration", next, refs: { asset: { assetId, kind: "narrative-prose" } } }
    const scene: Scene = { id: sceneId, title: segment.label, entryBeatId: beatId, beats: [beat] }
    scenes.push(scene)
  }

  const episodeNode: Episode = { id: episodeId, title: content.title, entrySceneId: scenes[0].id, scenes }
  // Season carries no ratified semantic identity of its own for a single
  // Episode Episode->Season projection (PLT-ADR-009 decision 6: Season
  // remains Canon's own KEEP_AS_AUTHORITY sense, unconnected here) -- the
  // real Episode title is reused rather than inventing placeholder text
  // like "Season 1". This is a documented, deliberate choice, not a
  // fabrication: the value is real and traceable, only its role (also
  // labeling the wrapping Season) is an interim one.
  const season: Season = { id: seasonId, title: content.title, entryEpisodeId: episodeId, episodes: [episodeNode] }

  const definition: NarrativeDefinition = {
    id: definitionId,
    version: 1,
    title: content.title,
    entrySeasonId: seasonId,
    seasons: [season],
  }

  const validation = validateNarrativeDefinition(definition)
  if (!validation.valid) {
    return { decision: "REJECTED", reason: "RUNTIME_VALIDATION_FAILED", detail: validation.errors.join("; ") }
  }

  return { decision: "PROJECTED", definition }
}
