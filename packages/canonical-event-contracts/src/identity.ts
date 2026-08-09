// Sprint 18, Phase 0 §5: identity must not depend on a renderer object,
// Unreal actor, UI route, DB row identity alone, LLM-generated
// identifier, visitor session, or world tick alone. Reuses the fields
// StudioK vendoring already produces for every other artifact kind
// (`manifest.json`'s `artifactId` + checksum) -- no new authoring
// surface, no new identity scheme.
//
// This sprint's own honest deferral (see docs/SPRINT18_FINAL_REPORT.md):
// no real `*.canonical-events.json` StudioK artifact exists yet
// (Phase 0's own STOP gate #5), so `definitionContentHash` here is
// computed by the Host layer from the Host-authored
// `CanonicalEventDefinition` object itself (the same sha256-over-
// stable-JSON discipline every other content-derived id in this
// codebase already uses), not read from a vendored manifest entry. Once
// a real artifact exists, only the Host layer's own hash SOURCE changes
// -- this identity shape does not.
export interface CanonicalEventIdentity {
  /** Stable, StudioK-authored slug once a real artifact exists; today a
   * Host-authored id, e.g. "canonical-event-govardhan-lifting". Once
   * assigned, never reassigned or renumbered. */
  canonicalEventId: string
  /** Content hash binding this identity to an EXACT definition body --
   * never a version number alone, so a re-author that changes the
   * definition without bumping a version cannot silently redefine
   * identity underneath an already-activated event. */
  definitionContentHash: string
}
