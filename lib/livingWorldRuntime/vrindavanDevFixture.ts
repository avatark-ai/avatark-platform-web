import { createWorldInstance } from "../livingWorldHost/hostService.ts"
import type { DurableWorldState } from "@avatark/world-persistence-contracts"

// Living Vrindavan Build 01, Phase X: the first NAMED development world
// instance. This is not user-facing branding (that remains
// LIVING_VRINDAVAN_BUILD_MANIFEST.displayName, "Living Vrindavan") -- it
// is a stable, deterministic, resettable worldInstanceId for local
// development and Playwright, following the same `?world_instance_id=`
// override convention every dev-only route under
// app/api/dev/account/living-vrindavan/ already supports (e.g.
// persistence/state's own real precedent). No shortcut around the real
// persistence model is taken: this id is provisioned through the exact
// same `createWorldInstance` facade (Sprint 20) every other worldInstanceId
// in this codebase uses.
export const LIVING_VRINDAVAN_DEV_INSTANCE_ID = "living-vrindavan-dev-001"

// Deterministic and resettable in development: calling this again for
// the SAME instance id is the real, already-proven idempotent-create
// behavior (`createWorldInstance` returns the identical seed for an
// existing instance, per docs/LIVING_VRINDAVAN_BUILD_01_PART1_NOTES.md's
// own provisioning proof) -- there is no separate "reset" mutation this
// function adds. A genuine reset (discarding all durable state for this
// id) is a repository-level concern already exercised by the existing
// dev-only /api/dev/account/living-vrindavan/reset-world route's own
// pattern for the Sprint 7 singleton; this function does not duplicate
// that for the durable family, since no real dev workflow has needed it
// yet -- named here rather than silently built speculatively.
export async function ensureLivingVrindavanDevInstance(now: () => string = () => new Date().toISOString()): Promise<DurableWorldState> {
  return createWorldInstance(LIVING_VRINDAVAN_DEV_INSTANCE_ID, now)
}
