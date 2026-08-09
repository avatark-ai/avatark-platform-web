import {
  InMemoryFamiliarityRepository,
  InMemoryGroupMembershipRepository,
  InMemoryHomeRangeRepository,
  InMemoryRelationshipRepository,
  InMemorySeparationRepository,
} from "@avatark/social-ecology-runtime"

// Sprint 12: module-scoped, process-lifetime social-ecology
// repositories -- the same documented simplification every existing
// Host singleton already carries (no Postgres repository is wired up
// in this environment; see supabase/migrations/029_social_ecology.sql
// for the prepared, unapplied real schema). Deliberately separate from
// every other sprint's own singletons (lib/livingPopulation/singleton.ts,
// lib/worldMemory/singleton.ts) -- social ecology is its own domain.
export const relationshipRepository = new InMemoryRelationshipRepository()
export const groupMembershipRepository = new InMemoryGroupMembershipRepository()
export const familiarityRepository = new InMemoryFamiliarityRepository()
export const homeRangeRepository = new InMemoryHomeRangeRepository()
export const separationRepository = new InMemorySeparationRepository()
