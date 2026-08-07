import { createInMemoryNarrativeRepository, createNarrativeRuntime } from '@avatark/narrative-runtime'
import { AVATARK_WELCOME_NARRATIVE } from './definition.ts'

// Sprint 4 (Runtime Host Integration): module-scoped, process-lifetime
// NarrativeRuntime instance -- same documented simplification as
// lib/livingWorldRuntime/singleton.ts (no Postgres repository exists for
// @avatark/narrative-runtime yet; this is the first app-level consumer of
// this package at all, per Sprint 3's own audit).
const repository = createInMemoryNarrativeRepository()

export const narrativeRuntime = createNarrativeRuntime({
  definition: AVATARK_WELCOME_NARRATIVE,
  repository,
})

export { AVATARK_WELCOME_NARRATIVE }
