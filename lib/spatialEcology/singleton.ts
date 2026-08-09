import { InMemoryTerritoryClaimRepository } from "@avatark/spatial-ecology-runtime"

// Sprint 16: module-scoped, process-lifetime spatial-ecology repository
// -- the same documented simplification every existing Host singleton
// already carries (no Postgres repository is wired up in this
// environment; see supabase/migrations/033_spatial_ecology.sql for the
// prepared, unapplied real schema).
export const territoryClaimRepository = new InMemoryTerritoryClaimRepository()
