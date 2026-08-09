import { isWellFormedInteractionIntent } from "@avatark/world-embodiment-contracts"
import type { InteractionIntent } from "@avatark/world-embodiment-contracts"
import { validateInteractionIntent } from "@avatark/world-embodiment-runtime"
import { InvalidWorldTransitionError } from "@avatark/living-world-runtime"
import { enterLivingWorld, leaveLivingWorld, recordLivingWorldReflection, visitLivingWorldLocation } from "../runtimeKernel/orchestrator.ts"
import type { RuntimeKernel } from "../runtimeKernel/orchestrator.ts"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { authorizeAndRecordParticipation } from "../participation/hostService.ts"
import { recordPrivateReflection } from "../privateReflection/hostService.ts"

const PRODUCT_ID = "avatark"

export interface DispatchResult {
  ok: boolean
  error?: string
}

// Sprint 8, Phase 9/13: the ONE place a renderer's InteractionIntent
// crosses into the Host. Enter/leave/visit-location/begin-reflection
// still call the EXISTING Sprint 5 lib/runtimeKernel/orchestrator.ts
// operations, unchanged -- per-user navigation/unlock progress
// (@avatark/living-world-runtime's own WorldRuntime) is a distinct,
// legitimate concern from shared-world simulation truth, not a second
// copy of it, and stays exactly as it was. Illegal navigation is
// rejected by the SAME authority it always was: visitLivingWorldLocation's
// own call into @avatark/living-world-runtime still throws
// InvalidWorldTransitionError for a move the world's own graph doesn't
// authorize, caught here exactly like the existing
// /api/account/living-worlds route already catches it.
//
// Sprint 19: `select-encounter` is the one branch that DID have two
// competing world truths -- Sprint 7's ephemeral, process-only
// `resolveLivingSystemsSnapshot` singleton, and Sprint 9-18's real,
// durable, worldInstanceId-scoped world-persistence family. It now
// converges on the durable family exclusively (lib/participation/
// hostService.ts's authorizeAndRecordParticipation) -- the singleton
// import is gone from this file, not hidden behind an adapter that kept
// both alive. See docs/SPRINT19_FINAL_REPORT.md's singleton ->
// worldInstanceId reconciliation section for why the OTHER three
// branches were judged not to have this same duplication (they never
// read SharedWorldState/entities at all) and for the real, named
// remaining debt (the production world-snapshot route and
// embodimentOrchestrator.ts still read the singleton too).
//
// `begin-reflection` now ALSO, additively, persists the visitor's own
// private content (when `intent.content` is present) through the
// firewalled PrivateReflectionRecord store -- the existing metadata-only
// "reflection.created" registry event is unchanged and still fires
// unconditionally.
export async function dispatchInteractionIntent(intent: unknown, kernel: RuntimeKernel): Promise<DispatchResult> {
  if (!isWellFormedInteractionIntent(intent)) {
    return { ok: false, error: "intent is not well-formed" }
  }

  const structural = validateInteractionIntent(intent, LIVING_VRINDAVAN_DEFINITION)
  if (!structural.valid) {
    return { ok: false, error: structural.errors.join("; ") }
  }

  try {
    return await dispatch(intent, kernel)
  } catch (err) {
    if (err instanceof InvalidWorldTransitionError) {
      return { ok: false, error: err.message }
    }
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

async function dispatch(intent: InteractionIntent, kernel: RuntimeKernel): Promise<DispatchResult> {
  switch (intent.type) {
    case "enter-world":
      await enterLivingWorld(kernel, { userId: intent.userId, productId: PRODUCT_ID, worldId: intent.worldId })
      return { ok: true }

    case "leave-world":
      await leaveLivingWorld(kernel, { userId: intent.userId, productId: PRODUCT_ID, worldId: intent.worldId })
      return { ok: true }

    case "visit-location":
      await visitLivingWorldLocation(kernel, { userId: intent.userId, productId: PRODUCT_ID, worldId: intent.worldId, locationId: intent.locationId })
      return { ok: true }

    case "begin-reflection":
      await recordLivingWorldReflection(kernel, { userId: intent.userId, productId: PRODUCT_ID, locationId: intent.locationId, reflectionId: intent.reflectionId })
      if (intent.content !== undefined) {
        await recordPrivateReflection(intent.worldId, intent.userId, intent.locationId, intent.reflectionId, intent.content)
      }
      return { ok: true }

    case "select-encounter": {
      // Sprint 19: converges on the durable, worldInstanceId-scoped
      // world-persistence family -- worldInstanceId is `intent.worldId`
      // itself (this product's single shared Living Vrindavan instance;
      // see docs/SPRINT19_FINAL_REPORT.md's persistence-semantics
      // section for why a 1:1 mapping is the correct, non-breaking
      // choice here, not a per-user instance). Live availability is
      // re-resolved fresh every call (never cached); a denial is an
      // honest reflection of current world state, never a fabricated
      // success -- the same posture Sprint 7/8 already held, now backed
      // by real, durable, persistence-ready state instead of a
      // process-lifetime Map.
      const outcome = await authorizeAndRecordParticipation(intent.worldId, intent.userId, intent.ruleId, intent.locationId)
      return outcome.authorization.authorized
        ? { ok: true }
        : { ok: false, error: `encounter "${intent.ruleId}" is not currently available at "${intent.locationId}"` }
    }
  }
}
