// Canonical reference for the session-refresh middleware/proxy pattern
// this repo uses, re-exported under lib/identity/ so a product building
// its own Supabase-backed proxy has one obvious place to look. Re-exports
// rather than duplicates lib/supabase/proxy.ts's real implementation --
// this repo's own root proxy.ts is unaffected and keeps importing directly
// from lib/supabase/proxy.
//
// This is documentation-by-reference, not a cross-repo package: each
// product currently runs its own separate Supabase project (see the
// cross-product integration audit), so there is no single middleware a
// product could literally import today. Copy the pattern; don't assume a
// shared runtime dependency exists yet.
export { updateSession } from '@/lib/supabase/proxy'
