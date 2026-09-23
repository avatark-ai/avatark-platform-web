// Canonical id binding boundary (M07 §10, M09 §10).
//
//   StudioK canonical Place id  ->  runtime LocationId  ->  consumer projection placeId
//   consumer worldId            ->  runtime world id
//
// Only projection ids ever leave the platform. Runtime ids are looked up
// here and never copied into a consumer payload.
//
// M07 froze worldId = "living-forest". It did NOT freeze Launch-01 place
// ids, and no Living Forest canon exists — so every Living Forest place
// binding below is FIXTURE: canonicalPlaceId is null and the binding is
// usable only in FIXTURE_PREVIEW mode. In PRODUCTION mode a world whose
// bindings are not all CANONICAL is simply not published.

export type BindingStatus = "CANONICAL" | "FIXTURE"

/** PRODUCTION serves only CANONICAL bindings; FIXTURE_PREVIEW also serves FIXTURE ones. */
export type WorldConsumerMode = "PRODUCTION" | "FIXTURE_PREVIEW"

export interface PlaceBinding {
  /** Consumer-facing immutable id (M07 placeId). */
  projectionPlaceId: string
  slug: string
  displayName: string
  summary: string
  /** Runtime LocationId — internal only, never emitted. */
  runtimeLocationId: string
  /** StudioK canonical Place id; null where canon does not exist. */
  canonicalPlaceId: string | null
  status: BindingStatus
}

export interface WorldBinding {
  /** Consumer-facing immutable id (M07 worldId). */
  consumerWorldId: string
  slug: string
  displayName: string
  /** Runtime world id — internal only, never emitted. */
  runtimeWorldId: string
  status: BindingStatus
  places: readonly PlaceBinding[]
}

// FIXTURE-ONLY Living Forest binding. Display names/summaries are neutral
// descriptors of the kernel vertical slice's own habitat types
// (lib/livingForest/definition.ts PATCHES) — not StudioK canon.
export const LIVING_FOREST_FIXTURE_BINDING: WorldBinding = {
  consumerWorldId: "living-forest",
  slug: "living-forest",
  displayName: "Living Forest",
  runtimeWorldId: "living-forest-fixture",
  status: "FIXTURE",
  places: [
    { projectionPlaceId: "forest-clearing", slug: "clearing", displayName: "The Clearing", summary: "Clearing habitat.", runtimeLocationId: "forest-clearing", canonicalPlaceId: null, status: "FIXTURE" },
    { projectionPlaceId: "forest-stream", slug: "stream", displayName: "The Stream", summary: "Riverbank habitat.", runtimeLocationId: "forest-stream", canonicalPlaceId: null, status: "FIXTURE" },
    { projectionPlaceId: "forest-pond", slug: "pond", displayName: "The Pond", summary: "Wetland habitat.", runtimeLocationId: "forest-pond", canonicalPlaceId: null, status: "FIXTURE" },
  ],
}

export const WORLD_BINDINGS: readonly WorldBinding[] = [LIVING_FOREST_FIXTURE_BINDING]

export type BindingResolution =
  | { kind: "FOUND"; binding: WorldBinding }
  | { kind: "NOT_PUBLISHED"; binding: WorldBinding }
  | { kind: "NOT_FOUND" }

function isServable(binding: WorldBinding, mode: WorldConsumerMode): boolean {
  if (mode === "FIXTURE_PREVIEW") return true
  return binding.status === "CANONICAL" && binding.places.every((p) => p.status === "CANONICAL" && p.canonicalPlaceId !== null)
}

/**
 * Resolves a CONSUMER world id. Runtime aliases (e.g. "living-forest-fixture")
 * are never accepted as consumer identity: they resolve to NOT_FOUND.
 */
export function resolveWorldBinding(
  consumerWorldId: string,
  mode: WorldConsumerMode,
  bindings: readonly WorldBinding[] = WORLD_BINDINGS,
): BindingResolution {
  const binding = bindings.find((b) => b.consumerWorldId === consumerWorldId)
  if (!binding) return { kind: "NOT_FOUND" }
  return isServable(binding, mode) ? { kind: "FOUND", binding } : { kind: "NOT_PUBLISHED", binding }
}

export function placeByRuntimeLocation(binding: WorldBinding, runtimeLocationId: string | null): PlaceBinding | null {
  if (!runtimeLocationId) return null
  return binding.places.find((p) => p.runtimeLocationId === runtimeLocationId) ?? null
}

export function placeByProjectionId(binding: WorldBinding, projectionPlaceId: string | null): PlaceBinding | null {
  if (!projectionPlaceId) return null
  return binding.places.find((p) => p.projectionPlaceId === projectionPlaceId) ?? null
}

/** Runtime identifiers that must never appear in a consumer payload for this binding. */
export function runtimeOnlyIdentifiers(binding: WorldBinding): string[] {
  const ids = new Set<string>()
  if (binding.runtimeWorldId !== binding.consumerWorldId) ids.add(binding.runtimeWorldId)
  for (const p of binding.places) if (p.runtimeLocationId !== p.projectionPlaceId) ids.add(p.runtimeLocationId)
  return [...ids]
}

/**
 * Last-line guard: throws if any runtime-only identifier escaped into a
 * serialized consumer payload. Callers turn a throw into an honest
 * unavailable response rather than emitting a leaked identity.
 */
export function assertNoRuntimeIdentityEscapes(payload: unknown, binding: WorldBinding): void {
  const json = JSON.stringify(payload)
  const leaked = runtimeOnlyIdentifiers(binding).filter((id) => json.includes(`"${id}"`) || json.includes(id))
  if (leaked.length > 0) throw new RuntimeIdentityLeakError(leaked)
}

export class RuntimeIdentityLeakError extends Error {
  readonly leaked: string[]
  constructor(leaked: string[]) {
    super(`runtime-only identifiers escaped into a consumer payload: ${leaked.join(", ")}`)
    this.leaked = leaked
    this.name = "RuntimeIdentityLeakError"
  }
}
