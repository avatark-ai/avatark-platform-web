import { createWorldRuntime, InMemoryWorldStateRepository, SAMPLE_WORLD_DEFINITIONS } from '@avatark/living-world-runtime'

// Sprint 4 (Runtime Host Integration): a module-scoped, process-lifetime
// WorldRuntime instance. This is a known, documented simplification, not
// a design decision to hide: @avatark/living-world-runtime has no
// Postgres-backed repository yet (no migration exists for it, and this
// sprint's own instructions don't ask for one) -- unlike
// @avatark/experience-runtime and @avatark/context-runtime, which are
// backed by real Supabase repositories per-request. Module scope means
// state survives across requests within one running Node process (true
// in local dev and this sprint's own Playwright validation) but resets on
// every deploy/restart and is not shared across serverless instances --
// see docs/RUNTIME_HOST_INTEGRATION.md's "remaining gaps before GameK
// integration" for the real-persistence follow-up this implies.
//
// World content: the five worlds this app already displays (Living
// Forest/Vrindavan/Stillness/Symphony/Forge) are @avatark/living-world-runtime's
// own SAMPLE_WORLD_DEFINITIONS -- reused directly, not forked or
// duplicated, per this sprint's explicit "do not fork/duplicate" rule.
const repository = new InMemoryWorldStateRepository()

export const livingWorldRuntime = createWorldRuntime({
  definitions: SAMPLE_WORLD_DEFINITIONS,
  repository,
})

export { SAMPLE_WORLD_DEFINITIONS }
