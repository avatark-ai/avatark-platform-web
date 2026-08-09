import type { AdaptationDomain, AdaptationEffect, AdaptationEffectRepository, AdaptationPressure, AdaptationPressureRepository, AdaptationSignalKind, AppendAdaptationEffectResult } from "@avatark/world-adaptation-contracts"

function pressureKey(domain: string, subjectId: string, kind: string): string {
  return `${domain}|${subjectId}|${kind}`
}

// Sprint 15: reference in-memory adapters -- no Postgres repository is
// wired up in this environment (see
// supabase/migrations/032_world_adaptation.sql for the prepared,
// unapplied real schema). `save` is a plain upsert-by-key, the same
// convention every other STATE (not event-stream) repository in this
// codebase already holds.
export class InMemoryAdaptationPressureRepository implements AdaptationPressureRepository {
  private readonly byWorld = new Map<string, Map<string, AdaptationPressure>>()

  async get(worldId: string, domain: AdaptationDomain, subjectId: string, kind: AdaptationSignalKind): Promise<AdaptationPressure | null> {
    return this.byWorld.get(worldId)?.get(pressureKey(domain, subjectId, kind)) ?? null
  }

  async save(pressure: AdaptationPressure): Promise<void> {
    if (!this.byWorld.has(pressure.worldId)) this.byWorld.set(pressure.worldId, new Map())
    this.byWorld.get(pressure.worldId)!.set(pressureKey(pressure.domain, pressure.subjectId, pressure.kind), pressure)
  }

  async listByWorld(worldId: string): Promise<AdaptationPressure[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])]
  }
}

// Sprint 15: append-only, idempotent by id -- the same posture
// @avatark/world-memory-contracts' own WorldEventRepository and
// @avatark/encounter-realization-contracts' own EncounterRecordRepository
// each hold for their own append-style state.
export class InMemoryAdaptationEffectRepository implements AdaptationEffectRepository {
  private readonly byWorld = new Map<string, Map<string, AdaptationEffect>>()

  async append(effect: AdaptationEffect): Promise<AppendAdaptationEffectResult> {
    if (!this.byWorld.has(effect.worldId)) this.byWorld.set(effect.worldId, new Map())
    const existing = this.byWorld.get(effect.worldId)!
    if (existing.has(effect.id)) return { status: "duplicate_ignored" }
    existing.set(effect.id, effect)
    return { status: "appended" }
  }

  async listBySubject(worldId: string, domain: AdaptationEffect["domain"], subjectId: string): Promise<AdaptationEffect[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])].filter((e) => e.domain === domain && effectSubjectId(e) === subjectId)
  }

  async listByWorld(worldId: string): Promise<AdaptationEffect[]> {
    return [...(this.byWorld.get(worldId)?.values() ?? [])]
  }
}

// Exported for Host-layer use: any consumer that needs "the subject
// this effect is about" without a domain-specific switch of its own
// (e.g. lib/worldAdaptation/hostService.ts deciding which existing
// write boundary to call).
export function effectSubjectId(effect: AdaptationEffect): string {
  switch (effect.domain) {
    case "ENTITY":
      return effect.entityId
    case "RELATIONSHIP":
      return effect.relationshipId
    case "PLACE":
      return effect.locationId
    case "GROUP":
      return effect.groupId
    case "WORLD_POSSIBILITY":
      return effect.subjectId
  }
}
