import {
  InMemoryDurableWorldStateRepository,
  InMemoryDurableWorldSystemEventRepository,
  InMemoryWorldCheckpointRepository,
  InMemoryWorldInstanceRepository,
  InMemoryWorldLeaseRepository,
  InMemoryWorldLifecycleRepository,
} from "@avatark/world-persistence-runtime"
import { InMemoryProtectedNarrativeStateRepository, InMemoryVisitorWorldMemoryRepository } from "@avatark/living-systems-runtime"

// Sprint 9: module-scoped, process-lifetime durable-layer repositories --
// the SAME documented simplification every existing Host singleton
// already carries (lib/livingSystems/singleton.ts,
// lib/livingWorldRuntime/singleton.ts, lib/experienceRegistry/singleton.ts):
// no Postgres repository is wired up in this environment (no
// credentials to safely exercise one -- see
// supabase/migrations/026_living_systems_world_state.sql for the
// prepared, unapplied real schema). These reference in-memory adapters
// still enforce every Sprint 9 contract for real (optimistic
// concurrency, idempotent event append, lease conflict) -- they are not
// a weaker stand-in, just a non-durable-across-restarts one.
//
// Deliberately SEPARATE instances from lib/livingSystems/singleton.ts's
// own in-memory repositories -- Sprint 9 does not touch, wrap, or
// replace Sprint 7's existing in-memory path (Phase 0's own instruction:
// do not move responsibilities merely to make this sprint easier). A
// world instance's durable state and its Sprint 7 in-memory state are
// two independent representations of "the same world" that happen to
// both currently be in-memory in this environment; only this module's
// repositories are exercised by the new wake/advance/recover surface.
export const durableWorldStateRepository = new InMemoryDurableWorldStateRepository()
export const worldCheckpointRepository = new InMemoryWorldCheckpointRepository()
export const durableWorldSystemEventRepository = new InMemoryDurableWorldSystemEventRepository()
export const worldInstanceRepository = new InMemoryWorldInstanceRepository()
export const worldLeaseRepository = new InMemoryWorldLeaseRepository()
export const worldLifecycleRepository = new InMemoryWorldLifecycleRepository()

// Visitor meaningful-memory and protected-narrative state, durable-scoped
// by worldInstanceId -- reusing Sprint 7's own contract-satisfying
// reference adapters unmodified (Architectural Law #3/#4: both remain
// independently addressable from DurableWorldState, never folded into
// it). No `save` exists on the narrative repository's own interface,
// same as Sprint 7 -- there is no write path for this Host module to
// accidentally grow one.
export const visitorWorldMemoryRepository = new InMemoryVisitorWorldMemoryRepository()
export const protectedNarrativeStateRepository = new InMemoryProtectedNarrativeStateRepository()

// Sprint 9, Phase 2: the one WorldDefinition this environment can
// exercise end-to-end (Living Vrindavan) -- naming a definition id
// distinct from any particular instance id, without deciding whether
// AvatarK ultimately runs one global instance, many regional ones, or
// per-cohort ones (that policy decision is explicitly out of this
// sprint's scope).
export const LIVING_VRINDAVAN_DEFINITION_ID = "living-vrindavan-definition"
export const LIVING_VRINDAVAN_DEFINITION_VERSION = 1
