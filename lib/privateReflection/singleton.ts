import { InMemoryPrivateReflectionRepository } from "@avatark/private-reflection-runtime"

// Sprint 19: module-scoped, process-lifetime private-reflection store --
// the same documented simplification every existing Host singleton
// already carries (no Postgres repository is wired up in this
// environment; see supabase/migrations/035_participation.sql for the
// prepared, unapplied real schema -- owner-only RLS, no service-role
// read path).
export const privateReflectionRepository = new InMemoryPrivateReflectionRepository()
