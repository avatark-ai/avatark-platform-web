// G10D-6 Track A: resolves a NarrationBeat's `refs.asset.assetId` (as
// project.ts itself set it) back to the real, exact EpisodeSegment
// statement it names -- the other half of the existing `refs.asset`
// mechanism project.ts now populates. Lives entirely outside
// narrative-runtime; narrative-runtime itself has no resolver of its own
// and none is added to it.
//
// Never fabricates: an assetId that does not match any segment of the
// supplied CertifiedEpisode resolves to `undefined`, never a placeholder
// string. Never mutates its argument. Recomputes each candidate assetId
// with the exact same deriveRuntimeId() project.ts itself uses -- never a
// second, divergent derivation.
import type { CertifiedEpisode } from "@avatark/episode-compiler"
import { ASSET_ID_NAMESPACE_PREFIX, deriveRuntimeId } from "./project.ts"

export function resolveEpisodeSegmentProse(certifiedEpisode: CertifiedEpisode, assetId: unknown): string | undefined {
  if (typeof assetId !== "string" || assetId.length === 0) {
    return undefined
  }
  const content = certifiedEpisode.content
  if (content === undefined) {
    return undefined
  }
  for (const segment of content.segments) {
    const candidateAssetId = deriveRuntimeId(certifiedEpisode.certifiedEpisodeId, `${ASSET_ID_NAMESPACE_PREFIX}${segment.segmentId}`)
    if (candidateAssetId === assetId) {
      return segment.statement
    }
  }
  return undefined
}
