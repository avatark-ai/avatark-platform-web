// `schema_migrations` exists (see supabase/migrations/007_grants.sql's own
// comment) but is deliberately ungranted to any PostgREST-reachable role --
// "only the migration runner (connecting as the postgres superuser via the
// pooler) should ever read or write it." There is no live, in-app way to
// read a given database's actual applied-migration state; confirmed by
// grep, zero code anywhere queries schema_migrations.
//
// This constant instead reflects the highest-numbered migration file
// bundled in this deployment's repo -- an upper bound on what a given
// database *could* have applied, not a live confirmation that it has
// (avatark-platform-test, for example, currently stops at 019; see
// docs/AVATARK_PLATFORM_TEST_MIGRATION_020_RUNBOOK.md). Update by hand
// whenever a new supabase/migrations/NNN_*.sql file is added -- there is
// deliberately no filesystem read at runtime (arbitrary directory reads
// are not guaranteed to work in a deployed serverless function, and
// supabase/migrations/ is not otherwise part of the app bundle).
export const HIGHEST_BUNDLED_MIGRATION = 21
