import { InMemoryLivingEntityStateRepository } from "@avatark/living-systems-runtime"
import { InMemoryEntityBehaviorStateRepository, InMemoryGroupStateRepository } from "@avatark/living-population-runtime"

// Sprint 10: module-scoped, process-lifetime population-domain
// repositories -- the same documented simplification every existing
// Host singleton already carries (no Postgres repository is wired up
// in this environment; see supabase/migrations/027_*.sql for the
// prepared, unapplied real schema).
//
// Deliberately SEPARATE from Sprint 9's own durable repositories
// (lib/worldPersistence/singleton.ts) and from Sprint 7's own
// livingEntityStateRepository (lib/livingSystems/singleton.ts) --
// population entities are a DIFFERENT roster (see
// vrindavanPopulationDefinition.ts's own header comment), never mixed
// into the vegetation roster's entity list or its ecological-lifecycle
// stepping. Reuses @avatark/living-systems-runtime's own
// InMemoryLivingEntityStateRepository class UNCHANGED for population
// entity identity/location/coarse-lifecycle -- proof that the existing
// contract is general enough for a second, independent roster without
// needing a new type.
export const populationEntityStateRepository = new InMemoryLivingEntityStateRepository()
export const entityBehaviorStateRepository = new InMemoryEntityBehaviorStateRepository()
export const groupStateRepository = new InMemoryGroupStateRepository()
