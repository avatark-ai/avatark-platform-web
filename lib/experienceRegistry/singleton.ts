import { ExperienceRegistry, InMemoryExperienceEventRepository } from '@avatark/experience-registry'

// Sprint 4 (Runtime Host Integration): module-scoped, process-lifetime
// ExperienceRegistry instance -- same documented simplification as
// lib/livingWorldRuntime/singleton.ts. @avatark/experience-registry's own
// migration proposal (023_experience_events.sql) exists but is
// deliberately unapplied (see docs/RUNTIME_MIGRATION_MAP.md) -- this
// sprint does not apply it or build the Postgres-backed repository that
// would consume it.
const repository = new InMemoryExperienceEventRepository()

export const experienceRegistry = new ExperienceRegistry(repository)
