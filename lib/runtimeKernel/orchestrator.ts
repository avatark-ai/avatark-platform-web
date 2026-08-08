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
 * World." Matches this sprint's mission example --
 *
 *   Host
 *     -> Living World Runtime.enterWorld()
 *     -> Context Runtime.patchContext()
 *     -> Experience Runtime.resume() (only if paused) -> .advance()
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
    // currentLocationId alongside currentLivingWorldId -- worldState is
    // already resolved above (enterWorld resumes at the user's existing
    // location, or the world's entry location for a first visit), so
    // Context can report exactly where the user is, not just which world.
    // Omitted when livingWorld itself isn't wired (worldState null): never
    // write a location Context can't actually back.
    const outcome = await kernel.context.setContext(
      userId,
      { currentLivingWorldId: worldId, ...(worldState ? { currentLocationId: worldState.currentLocationId } : {}) },
      { productId },
    )
    contextApplied = outcome.applied.length > 0
  }

  let experienceAdvanced = false
  if (kernel.experience) {
    try {
      const progress = await kernel.experience.getProgress(userId)
      // A paused Experience is resumed before advancing -- entering a
      // Living World is exactly the kind of re-engagement that should
      // pick a paused Experience back up, not leave it paused underneath
      // a now-active Living World.
      if (progress?.status === "paused") await kernel.experience.resume(userId)
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

export interface LeaveLivingWorldParams {
  userId: string
  productId: string
  worldId: string
}

export interface LeaveLivingWorldResult {
  worldState: Awaited<ReturnType<WorldRuntime["leaveWorld"]>> | null
  eventRecorded: boolean
}

/** The inverse of enterLivingWorld -- Host -> LivingWorldRuntime.leaveWorld() -> Registry.recordEvent(). */
export async function leaveLivingWorld(
  kernel: RuntimeKernel,
  params: LeaveLivingWorldParams,
): Promise<LeaveLivingWorldResult> {
  const { userId, productId, worldId } = params

  const worldState = kernel.livingWorld ? await kernel.livingWorld.leaveWorld(userId, worldId) : null

  let eventRecorded = false
  if (kernel.registry) {
    await kernel.registry.recordEvent({
      type: "world.left",
      source: { productId },
      actor: { userId },
      target: { type: "world", id: worldId },
    })
    eventRecorded = true
  }

  return { worldState, eventRecorded }
}

export interface VisitLivingWorldLocationParams {
  userId: string
  productId: string
  worldId: string
  locationId: string
}

export interface VisitLivingWorldLocationResult {
  worldState: Awaited<ReturnType<WorldRuntime["visitLocation"]>> | null
  contextApplied: boolean
  eventRecorded: boolean
}

/**
 * Location Navigation (Sprint 5, Living Vrindavan) -- Host ->
 * LivingWorldRuntime.unlockLocation() (prerequisite check; idempotent if
 * already unlocked) -> .visitLocation() -> Context.setContext() ->
 * Registry.recordEvent(). Legal transitions come entirely from whatever
 * WorldDefinition graph the caller's WorldRuntime was constructed with --
 * this function has no per-world/franchise knowledge of which locations
 * connect to which; @avatark/living-world-runtime's own
 * InvalidWorldTransitionError is what actually enforces that, by
 * checking the target location's authored requiresLocationIds against
 * this user's visited locations.
 */
export async function visitLivingWorldLocation(
  kernel: RuntimeKernel,
  params: VisitLivingWorldLocationParams,
): Promise<VisitLivingWorldLocationResult> {
  const { userId, productId, worldId, locationId } = params

  let worldState = null
  if (kernel.livingWorld) {
    await kernel.livingWorld.unlockLocation(userId, worldId, locationId)
    worldState = await kernel.livingWorld.visitLocation(userId, worldId, locationId)
  }

  let contextApplied = false
  if (kernel.context && worldState) {
    const outcome = await kernel.context.setContext(
      userId,
      { currentLocationId: worldState.currentLocationId },
      { productId },
    )
    contextApplied = outcome.applied.length > 0
  }

  let eventRecorded = false
  if (kernel.registry) {
    await kernel.registry.recordEvent({
      type: "world.location_visited",
      source: { productId },
      actor: { userId },
      target: { type: "location", id: locationId },
    })
    eventRecorded = true
  }

  return { worldState, contextApplied, eventRecorded }
}

export interface RecordLivingWorldReflectionParams {
  userId: string
  productId: string
  locationId: string
  reflectionId: string
}

export interface RecordLivingWorldReflectionResult {
  eventRecorded: boolean
}

/**
 * Reflection Point (Sprint 5, Living Vrindavan) -- records that the user
 * engaged with an authored reflection prompt at a location. Reuses the
 * Registry's existing "reflection.created" event type (already declared
 * in the Timeline's own event-label conventions) rather than inventing a
 * new namespace. Deliberately does not accept or persist any
 * user-composed reflection text -- this sprint does not build a private-
 * journal system; `reflectionId` traces back to the authoring Canon
 * document (see @avatark/living-world-runtime's WorldReflectionRef),
 * never to what a participant may have privately thought or written.
 */
export async function recordLivingWorldReflection(
  kernel: RuntimeKernel,
  params: RecordLivingWorldReflectionParams,
): Promise<RecordLivingWorldReflectionResult> {
  const { userId, productId, locationId, reflectionId } = params

  let eventRecorded = false
  if (kernel.registry) {
    await kernel.registry.recordEvent({
      type: "reflection.created",
      source: { productId },
      actor: { userId },
      target: { type: "location", id: locationId },
      metadata: { reflectionId },
    })
    eventRecorded = true
  }

  return { eventRecorded }
}
