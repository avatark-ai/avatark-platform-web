// Host-level composition pattern for the Runtime Kernel (Sprint 3, Phase 8).
//
// This is deliberately NOT a workflow/orchestration engine -- no queue, no
// saga, no retry policy, no generic "call these N runtimes in order" DSL.
// It's the minimal, boring, explicit function needed to prove one thing:
// a host can coordinate multiple Runtime Kernel packages for a single user
// interaction by calling each one directly, in sequence, with no runtime
// ever importing or calling another runtime. See
// docs/RUNTIME_KERNEL_ARCHITECTURE.md Part 2 for the architecture this
// implements, and docs/RUNTIME_HOST_INTEGRATION.md for the full sequence
// diagram this function is the code-level counterpart of.
//
// Every runtime instance is passed in already-constructed (dependency
// injection) -- this module never constructs a runtime itself, and never
// picks a persistence backend. That's each call site's job (see
// lib/experienceRuntime/, lib/context/, etc. for the real Supabase-backed
// wiring; the reference end-to-end test in
// lib/runtimeKernel/e2eKernelFlow.test.ts uses each package's own
// in-memory reference repository instead -- it lives here, in the Host's
// lib/, never in packages/runtime-contracts, which must never import any
// runtime package at all (see Phase 10's dependency-boundary check).
import type { ContextRuntime } from "@avatark/context-runtime"
import { JourneyError, type JourneyRuntime } from "@avatark/experience-runtime"
import type { ExperienceRegistry } from "@avatark/experience-registry"
import type { WorldRuntime } from "@avatark/living-world-runtime"
import type { NarrativeRuntime } from "@avatark/narrative-runtime"

// Bundles one already-constructed instance of each Runtime Kernel package
// for a single call site to pass around. Not every field is required --
// a host that only uses Living World and Context, say, can build a
// RuntimeKernel with only those two populated and the rest omitted, and
// every helper below degrades gracefully when a given runtime is absent.
export interface RuntimeKernel {
  context?: ContextRuntime
  experience?: JourneyRuntime
  narrative?: NarrativeRuntime
  livingWorld?: WorldRuntime
  registry?: ExperienceRegistry
}

export interface EnterLivingWorldParams {
  userId: string
  productId: string
  worldId: string
}

export interface EnterLivingWorldResult {
  worldState: Awaited<ReturnType<WorldRuntime["enterWorld"]>> | null
  contextApplied: boolean
  experienceAdvanced: boolean
  eventRecorded: boolean
}

/**
 * The Runtime Kernel's reference composition: "a user enters a Living
 * World." Matches this sprint's mission example exactly --
 *
 *   Host
 *     -> Living World Runtime.enterWorld()
 *     -> Context Runtime.patchContext()
 *     -> Experience Runtime.advance()
 *     -> Experience Registry.recordEvent()
 *
 * The Host is the only caller of any runtime here -- no runtime in this
 * sequence calls another. Each step is independently optional: a host
 * that hasn't wired up Context, or a user with no active Experience, still
 * gets a correct (partial) result rather than a thrown error, because
 * "this runtime isn't in play for this user" is an expected, not
 * exceptional, condition for a kernel meant to serve many different
 * products with different runtime combinations.
 */
export async function enterLivingWorld(
  kernel: RuntimeKernel,
  params: EnterLivingWorldParams,
): Promise<EnterLivingWorldResult> {
  const { userId, productId, worldId } = params

  const worldState = kernel.livingWorld ? await kernel.livingWorld.enterWorld(userId, worldId) : null

  let contextApplied = false
  if (kernel.context) {
    const outcome = await kernel.context.setContext(
      userId,
      { currentLivingWorldId: worldId },
      { productId },
    )
    contextApplied = outcome.applied.length > 0
  }

  let experienceAdvanced = false
  if (kernel.experience) {
    try {
      await kernel.experience.advance(userId)
      experienceAdvanced = true
    } catch (err) {
      // No active Experience for this user is an expected, not
      // exceptional, condition -- Living World doesn't require one. Any
      // other error is a real failure and must propagate.
      if (!(err instanceof JourneyError)) throw err
    }
  }

  let eventRecorded = false
  if (kernel.registry) {
    await kernel.registry.recordEvent({
      type: "world.entered",
      source: { productId },
      actor: { userId },
      target: { type: "world", id: worldId },
    })
    eventRecorded = true
  }

  return { worldState, contextApplied, experienceAdvanced, eventRecorded }
}
