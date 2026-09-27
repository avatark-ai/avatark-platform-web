// WORLDK-M14-B6: RendererSessionSnapshot — the authenticated renderer's
// read-only view of the world for ITS OWN RuntimeSession.
//
// What this is (owner Q2, stated explicitly): for B6/M15A the world state is
// an authoritative Platform RENDERER PROJECTION over the current
// deterministic Living Forest FIXTURE fact source (WorldFactSource) — the
// same source the WorldK projections and the Runtime Ingress world tick use.
// It is NOT yet the final durable, advancing Living Forest. It is not
// WorldExperienceSnapshot, not a WorldK projection, not a browser API.
//
// Construction is EXPLICIT (owner decision): the renderer representation is
// built field by field from the embodiment; no private snapshot is built and
// stripped. The Forest builder's signature requires an identity value; it is
// given a FIXED NON-IDENTIFYING placeholder, never the subject, and the only
// place that value lands (visitorContext) is never projected.
//
// Physically non-mutating: pure functions over an immutable fact snapshot.
// Never calls wake / seed / catch-up / lease / canonical / memory paths.
import type { EmbodiedRegion, EncounterPresentation, EntityPresentation, WorldEmbodimentSnapshot } from "@avatark/world-embodiment-contracts"
import { buildForestEmbodimentSnapshot } from "../livingForest/embodiment.ts"
import { LIVING_FOREST_LOCATION_EDGES, LIVING_FOREST_WORLD_ID } from "../livingForest/definition.ts"
import { buildForestWorldSnapshot } from "../livingForest/hostService.ts"
import { placeByProjectionId, resolveWorldBinding, WORLD_BINDINGS, type WorldBinding, type WorldConsumerMode } from "../worldConsumer/bindings.ts"
import type { WorldFactSource, WorldFacts } from "../worldConsumer/facts.ts"
import type { RenderContext, RendererSnapshotPort } from "../worldEntry/runtimeIngress.ts"

export type { RenderContext }

export const RENDERER_SNAPSHOT_SCHEMA_VERSION = "1.0"
export const RENDERER_SNAPSHOT_CONTRACT = "renderer-session-snapshot"
export const RENDERER_SNAPSHOT_STALE_AFTER_MS = 60_000
/** Fixed, non-identifying value for builders whose signature demands an identity. */
export const RENDERER_PLACEHOLDER_IDENTITY = "renderer-session-view"

export interface RendererRegion {
  locationId: string
  name: string
  spatialNode: EmbodiedRegion["spatialNode"]
  environment: EmbodiedRegion["environment"]
  entities: RendererEntity[]
  encounters: RendererEncounter[]
}
export type RendererEntity = Pick<EntityPresentation, "entityId" | "archetypeId" | "locationId" | "visible" | "presentationArchetype" | "activityHint" | "animationSemantic" | "audioSemantic" | "movementSemantic" | "movementTargetLocationId" | "groupId">
export type RendererEncounter = Pick<EncounterPresentation, "ruleId" | "locationId" | "category" | "interactionAffordance">

export interface RendererSessionSnapshot {
  schemaVersion: typeof RENDERER_SNAPSHOT_SCHEMA_VERSION
  contract: typeof RENDERER_SNAPSHOT_CONTRACT
  worldId: string
  session: { sessionId: string; reconnect: boolean }
  visitor: { arrivalKind: "FIRST_VISIT" | "RETURNING"; arrivalPlaceId: string }
  embodiment: {
    worldVersion: number
    simulationTick: number
    season: { id: string; name: string }
    current: RendererRegion
    reachable: RendererRegion[]
    transitions: { toLocationId: string; affordance: string | null }[]
  }
  freshness: {
    generatedAt: string
    validAsOf: string
    staleAfter: string
    source: { worldTick: number; worldVersion: number; sourceRevision: string }
  }
}

export class RendererSnapshotUnavailable extends Error {}

/** Deep, plain JSON copy of world-presentation data that carries no visitor state by type. */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

function region(r: EmbodiedRegion): RendererRegion {
  return {
    locationId: r.locationId,
    name: r.name,
    spatialNode: plain(r.spatialNode),
    environment: plain(r.environment),
    entities: r.entities.map((e) => ({
      entityId: e.entityId, archetypeId: e.archetypeId, locationId: e.locationId, visible: e.visible,
      presentationArchetype: e.presentationArchetype, activityHint: e.activityHint, animationSemantic: e.animationSemantic,
      audioSemantic: e.audioSemantic, movementSemantic: e.movementSemantic, movementTargetLocationId: e.movementTargetLocationId, groupId: e.groupId,
    })),
    encounters: r.encounters.map((x) => ({ ruleId: x.ruleId, locationId: x.locationId, category: x.category, interactionAffordance: x.interactionAffordance })),
  }
}

/** Forest neighbours in edge-declaration order (deterministic). */
function forestNeighbours(locationId: string): string[] {
  const out: string[] = []
  for (const e of LIVING_FOREST_LOCATION_EDGES) {
    const other = e.from === locationId ? e.to : e.to === locationId ? e.from : null
    if (other && !out.includes(other)) out.push(other)
  }
  return out
}

function forestEmbodiment(facts: WorldFacts, runtimeLocationId: string): WorldEmbodimentSnapshot {
  const now = () => facts.observedAt
  const population = [...facts.populationEntities]
  const current = buildForestWorldSnapshot(facts.sharedState, population, runtimeLocationId, RENDERER_PLACEHOLDER_IDENTITY, now)
  const reachable = forestNeighbours(runtimeLocationId).map((l) => buildForestWorldSnapshot(facts.sharedState, population, l, RENDERER_PLACEHOLDER_IDENTITY, now))
  return buildForestEmbodimentSnapshot(current, reachable)
}

/**
 * Builds the renderer view for one authorized session context. Deterministic:
 * the same facts (sourceRevision) and the same context yield identical bytes
 * (generatedAt = validAsOf = facts.observedAt).
 */
export function buildRendererSessionSnapshot(sessionId: string, ctx: RenderContext, binding: WorldBinding, facts: WorldFacts): RendererSessionSnapshot {
  if (binding.consumerWorldId !== ctx.worldId || facts.runtimeWorldId !== binding.runtimeWorldId) throw new RendererSnapshotUnavailable("binding mismatch")
  if (binding.runtimeWorldId !== LIVING_FOREST_WORLD_ID) throw new RendererSnapshotUnavailable("no renderer projection for this world yet")
  const place = placeByProjectionId(binding, ctx.arrivalPlaceId)
  if (!place) throw new RendererSnapshotUnavailable("arrival place not in world")
  const e = forestEmbodiment(facts, place.runtimeLocationId)
  const source = { worldTick: facts.sharedState.clock.tick, worldVersion: facts.sharedState.worldVersion, sourceRevision: facts.sourceRevision }
  return {
    schemaVersion: RENDERER_SNAPSHOT_SCHEMA_VERSION,
    contract: RENDERER_SNAPSHOT_CONTRACT,
    worldId: ctx.worldId,
    session: { sessionId, reconnect: ctx.reconnect },
    visitor: { arrivalKind: ctx.arrivalKind, arrivalPlaceId: ctx.arrivalPlaceId },
    embodiment: {
      worldVersion: e.worldVersion,
      simulationTick: e.simulationTick,
      season: { id: e.season.id, name: e.season.name },
      current: region(e.current),
      reachable: e.reachable.map(region),
      transitions: e.transitions.map((t) => ({ toLocationId: t.toLocationId, affordance: t.affordance })),
    },
    freshness: {
      generatedAt: facts.observedAt,
      validAsOf: facts.observedAt,
      staleAfter: new Date(Date.parse(facts.observedAt) + RENDERER_SNAPSHOT_STALE_AFTER_MS).toISOString(),
      source,
    },
  }
}

/**
 * The Runtime Ingress port (composition root wires it): resolves the session
 * world's binding, loads the Platform fact source, builds and serializes.
 * ETag = the fact source's sourceRevision (owner Q7).
 */
export function createRendererSnapshotPort(deps: { mode: WorldConsumerMode; bindings?: readonly WorldBinding[]; facts: WorldFactSource }): RendererSnapshotPort {
  return {
    async build(sessionId, ctx) {
      const r = resolveWorldBinding(ctx.worldId, deps.mode, deps.bindings ?? WORLD_BINDINGS)
      if (r.kind !== "FOUND") return null
      const facts = await deps.facts.load(r.binding.runtimeWorldId)
      if (!facts) return null
      try {
        const snapshot = buildRendererSessionSnapshot(sessionId, ctx, r.binding, facts)
        return { json: JSON.stringify(snapshot), etag: `"${snapshot.freshness.source.sourceRevision}"` }
      } catch (e) {
        if (e instanceof RendererSnapshotUnavailable) return null
        throw e
      }
    },
  }
}

/** Field names that must never appear anywhere in a renderer snapshot. */
export const RENDERER_FORBIDDEN_FIELD_NAMES: readonly string[] = [
  "userId", "visitorId", "subjectId", "visitId", "allocationId", "instanceId", "runtimeInstanceId", "credentialId",
  "email", "profile", "displayName", "avatarKId",
  "visitorContext", "protectedNarrative", "priorLocationId", "lastLocationId", "visitCount", "meaningfulEncounterCount", "reflectionCount",
  "returnRecognition", "whatHasChanged", "sinceYouWereHere", "orientation", "recentWorldChanges",
  "capability", "authorization", "token", "secret", "apiKey", "serviceRoleKey", "viewSha256", "password", "bearer",
]

export function rendererForbiddenFieldsIn(value: unknown, path = "$"): string[] {
  const out: string[] = []
  if (Array.isArray(value)) value.forEach((v, i) => out.push(...rendererForbiddenFieldsIn(v, `${path}[${i}]`)))
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (RENDERER_FORBIDDEN_FIELD_NAMES.includes(k)) out.push(`${path}.${k}`)
      out.push(...rendererForbiddenFieldsIn(v, `${path}.${k}`))
    }
  }
  return out
}
