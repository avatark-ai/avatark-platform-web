// STK-WO-009 Stage 3 (G10D-5): a pure, on-demand predicate -- never a
// stored field on CertifiedEpisode (a stored value could drift from the
// episode's own actual content; this always recomputes from the real
// object). A future Phase G calls this before attempting runtime
// projection and must fail closed on NOT_RUNTIME_PROJECTABLE rather than
// fabricate content to fill the gap (PLT-ADR-009 Amendment A5).
import type { CertifiedEpisode, RuntimeProjectability } from "./types.ts"

export function runtimeProjectabilityOf(certifiedEpisode: CertifiedEpisode): RuntimeProjectability {
  if (certifiedEpisode.content === undefined) {
    return "NOT_RUNTIME_PROJECTABLE"
  }
  const { title, segments } = certifiedEpisode.content
  if (typeof title !== "string" || title.length === 0) {
    return "NOT_RUNTIME_PROJECTABLE"
  }
  if (!Array.isArray(segments) || segments.length === 0) {
    return "NOT_RUNTIME_PROJECTABLE"
  }
  return "RUNTIME_PROJECTABLE"
}
