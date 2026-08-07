import { InMemoryJourneyRepository, JourneyRuntime } from '@avatark/experience-runtime'
import { AVATARK_WELCOME_JOURNEY } from './journeyDefinition.ts'

// Sprint 4 (Runtime Host Integration): dev-only, in-memory JourneyRuntime,
// used exclusively by app/dev/account (the existing unauthenticated preview
// page, same precedent as createMockAdapters()) and this sprint's Playwright
// validation. This environment has no Supabase project configured at all
// (no .env.local -- only .env.example), so the real,
// Supabase-backed runtime the production /api/account/journey route uses
// cannot run here regardless of authentication. This is a separate
// instance from that production route's per-request
// `new JourneyRuntime(AVATARK_WELCOME_JOURNEY, new SupabaseJourneyRepository(supabase))`
// -- never imported by it, never a substitute for it.
export const DEV_USER_ID = 'dev-preview-user'

const repository = new InMemoryJourneyRepository()

export const devJourneyRuntime = new JourneyRuntime(AVATARK_WELCOME_JOURNEY, repository)
