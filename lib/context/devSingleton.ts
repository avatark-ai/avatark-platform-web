import { ContextRuntime, InMemoryContextRepository } from '@avatark/context-runtime'

// Sprint 4 (Runtime Host Integration): dev-only, in-memory ContextRuntime.
// Same rationale as lib/experienceRuntime/devSingleton.ts -- this
// environment has no Supabase project configured, so the production
// /api/account/context route's SupabaseContextRepository cannot run here.
// Never imported by that route; exists solely for app/dev/account and
// Playwright.
const repository = new InMemoryContextRepository()

export const devContextRuntime = new ContextRuntime(repository)
