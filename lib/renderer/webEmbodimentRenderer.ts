// Sprint 8, Phase 11: the web reference renderer's own translation of the
// renderer-neutral WorldEmbodimentSnapshot into display strings --
// everything renderer-specific (label casing, one-line summaries) lives
// here, mirroring webWorldSystemsRenderer.ts's (Sprint 7) and
// webExperienceRenderer.ts's (Sprint 6) own role. This module never reads
// simulation internals (no SharedWorldState, no LivingEntityState) --
// only the already-resolved EnvironmentPresentation/EntityPresentation/
// EncounterPresentation shapes the embodiment contract exposes.
function labelize(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export function summarizeEnvironmentPresentation(environment: {
  atmosphere: { semantic: string }
  water: { semantic: string }
  vegetation: { semantic: string }
}): string {
  return [`Atmosphere: ${labelize(environment.atmosphere.semantic)}`, `Water: ${labelize(environment.water.semantic)}`, `Vegetation: ${labelize(environment.vegetation.semantic)}`].join(" · ")
}

export function labelizeActivityHint(activityHint: string): string {
  return labelize(activityHint)
}

export function labelizeInteractionAffordance(affordance: string): string {
  return labelize(affordance)
}

// Sprint 10, Phase 16: a restrained, diagnostic-only summary of an
// entity's movement/group state -- present only for entities that carry
// it (the living-population domain); absent (undefined/null) for every
// Sprint 7/8 vegetation-roster entity, which renders exactly as before.
export function summarizeEntityBehavior(entity: { movementSemantic?: string | null; groupId?: string | null }): string | null {
  const parts: string[] = []
  if (entity.movementSemantic && entity.movementSemantic !== 'Remain') parts.push(labelize(entity.movementSemantic))
  if (entity.groupId) parts.push(`Group: ${labelize(entity.groupId)}`)
  return parts.length > 0 ? parts.join(' · ') : null
}
