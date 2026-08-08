import { createWorldRuntime, InMemoryWorldStateRepository, SAMPLE_WORLD_DEFINITIONS } from '@avatark/living-world-runtime'
import { LIVING_VRINDAVAN_DEFINITION } from './vrindavanDefinition.ts'

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
// World content (Sprint 5, Living Vrindavan vertical slice): four of the
// five worlds this app displays (Living Forest/Stillness/Symphony/Forge)
// remain @avatark/living-world-runtime's own generic
// SAMPLE_WORLD_DEFINITIONS fixture -- truthful placeholders, not
// upgraded this sprint. Living Vrindavan alone is swapped for
// LIVING_VRINDAVAN_DEFINITION, converted in ./vrindavanDefinition.ts from
// the StudioK-authored, Approved portable artifact vendored in
// ./vendor/ -- see that file and vendor/README.md for the full
// StudioK -> Host provenance chain. The Runtime Kernel package itself
// (@avatark/living-world-runtime) is untouched and still knows nothing
// about Krishna, Vrindavan, or any other franchise.
const WORLD_DEFINITIONS = SAMPLE_WORLD_DEFINITIONS.map((def) =>
  def.id === LIVING_VRINDAVAN_DEFINITION.id ? LIVING_VRINDAVAN_DEFINITION : def,
)

const repository = new InMemoryWorldStateRepository()

export const livingWorldRuntime = createWorldRuntime({
  definitions: WORLD_DEFINITIONS,
  repository,
})

export { WORLD_DEFINITIONS }
