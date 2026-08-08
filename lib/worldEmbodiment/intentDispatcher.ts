import { isWellFormedInteractionIntent } from "@avatark/world-embodiment-contracts"
import type { InteractionIntent } from "@avatark/world-embodiment-contracts"
import { validateInteractionIntent } from "@avatark/world-embodiment-runtime"
import { InvalidWorldTransitionError } from "@avatark/living-world-runtime"
import { enterLivingWorld, leaveLivingWorld, recordLivingWorldReflection, visitLivingWorldLocation } from "../runtimeKernel/orchestrator.ts"
import type { RuntimeKernel } from "../runtimeKernel/orchestrator.ts"
import { LIVING_VRINDAVAN_DEFINITION } from "../livingWorldRuntime/vrindavanDefinition.ts"
import { resolveLivingSystemsSnapshot } from "../livingSystems/orchestrator.ts"

const PRODUCT_ID = "avatark"

export interface DispatchResult {
  ok: boolean
  error?: string
}

// Sprint 8, Phase 9/13: the ONE place a renderer's InteractionIntent
// crosses into the Host. Every branch below calls an EXISTING Sprint 5
// lib/runtimeKernel/orchestrator.ts operation -- this function adds no
// new mutation path alongside them, it only adds a typed front door and
// a structural pre-check. Illegal navigation is rejected by the SAME
// authority it always was: visitLivingWorldLocation's own call into
// @avatark/living-world-runtime still throws InvalidWorldTransitionError
// for a move the world's own graph doesn't authorize, caught here exactly
// like the existing /api/account/living-worlds route already catches it.
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
      return { ok: true }

    case "select-encounter": {
      // Deliberately no mutation: Sprint 7 modeled encounters as
      // affordances, never events with a persisted "selected"
      // consequence. This branch only validates the encounter is
      // CURRENTLY available before acknowledging -- an honest reflection
      // of what exists, not a fabricated success.
      if (!kernel.livingWorld) return { ok: false, error: "no living world runtime configured" }
      const snapshot = await resolveLivingSystemsSnapshot({ userId: intent.userId, locationId: intent.locationId, livingWorldRuntime: kernel.livingWorld, experienceRegistry: kernel.registry })
      const available = snapshot.availableEncounters.some((e) => e.ruleId === intent.ruleId)
      return available ? { ok: true } : { ok: false, error: `encounter "${intent.ruleId}" is not currently available at "${intent.locationId}"` }
    }
  }
}
