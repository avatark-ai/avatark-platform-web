#!/usr/bin/env node
// AvatarK Platform migration ledger. Directly reuses the real, proven
// pattern established and tested in prometheusk-web tonight: real SHA-256
// checksums, real drift detection, never inferring completeness from a
// single table's existence.
//
// DESIGN ONLY at this checkpoint -- not yet run against any real database.
// Explicitly refuses to run against any known non-platform-test project.
const { Client } = require('pg')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// Known project refs this script must NEVER be pointed at, per explicit
// instruction -- PrometheusK, prometheusk-test, arenak-prod, and legacy
// AvatarK production are all real, unrelated infrastructure.
const FORBIDDEN_PROJECT_REFS = [
  'bxerfgwrtwowzgahdgrj', // PrometheusK production
  'ibgalrzhwnitbgrqoesu', // prometheusk-test
  'qvwgrupvaetzcxlizccu', // legacy avatark-web production
]

function assertPlatformTestDatabase() {
  const url = process.env.PLATFORM_DATABASE_URL
  if (!url) {
    console.error('PLATFORM_DATABASE_URL is not set. Refusing to run.')
    process.exit(1)
  }
  for (const ref of FORBIDDEN_PROJECT_REFS) {
    if (url.includes(ref)) {
      console.error(`PLATFORM_DATABASE_URL references a known, unrelated project (${ref}). Refusing to run.`)
      process.exit(1)
    }
  }
  return url
}

// Expected migration order, per the checkpoint's own numbering. This list
// has repeatedly drifted behind supabase/migrations/: 010-015 (organizations,
// roles, product access, audit, and their RLS/grants), then again 017-020
// (profile role/org/location, RC1.1 preferences, avatar storage, capability
// grants) were each added to the migrations directory in a later session but
// never added here, meaning this runner could never actually apply them.
// Fixed both times to match the real files on disk; still DESIGN ONLY in the
// sense that no PLATFORM_DATABASE_URL is configured in any environment
// reachable from this repo today, so none of this has ever actually been run.
const MIGRATION_ORDER = [
  '001_extensions.sql',
  '002_profiles.sql',
  '003_account_preferences.sql',
  '004_privacy_settings.sql',
  '005_rls.sql',
  '006_auth_bootstrap.sql',
  '007_grants.sql',
  '008_privacy_consent_columns.sql',
  '009_privacy_bootstrap_fix.sql',
  '010_organizations.sql',
  '011_platform_roles.sql',
  '012_product_access.sql',
  '013_platform_audit_events.sql',
  '014_admin_rls.sql',
  '015_admin_grants.sql',
  '016_organization_invitations.sql',
  '017_profile_role_org_location.sql',
  '018_account_preferences_rc11.sql',
  '019_avatar_storage.sql',
  '020_capability_grants.sql',
  '021_organization_invitation_acceptance.sql',
  '022_profile_location_normalized.sql',
  // Runtime Kernel integration (Sprint 3): these three originally all
  // claimed migration number 023 independently on three separate
  // branches. Reconciled per docs/MERGE_PLAYBOOK.md Part 1 -- no FKs
  // exist between the three schemas, so this order is for traceability
  // only, not a correctness dependency.
  '023_experience_events.sql',
  '024_context_snapshots.sql',
  '025_journey_states.sql',
  // Sprint 9: registered for traceability only, same as 023's own
  // precedent -- NOT applied to any real database in this environment
  // (no credentials exist here to safely exercise one against).
  '026_living_systems_world_state.sql',
]

async function main() {
  const dbUrl = assertPlatformTestDatabase()
  const migrationsDir = path.join(__dirname, '..', 'migrations')
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  // Defensive fix: Supabase's Transaction Pooler (PgBouncer, transaction
  // mode) can reuse an underlying server-side connection across
  // different logical client connections. A prior script that ran
  // SET ROLE and exited early (before its own cleanup) left that role
  // active on a connection this runner then inherited -- causing a real
  // 'permission denied for schema public' failure on a later run, since
  // GRANT statements require postgres/superuser, not the inherited
  // 'authenticated' role. Resetting explicitly, unconditionally, as the
  // very first statement on every connection this runner makes.
  await client.query('RESET ROLE')
  await client.query('RESET ALL')
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    for (const file of MIGRATION_ORDER) {
      const filePath = path.join(migrationsDir, file)
      if (!fs.existsSync(filePath)) {
        console.error(`Expected migration file not found: ${file} (not yet authored)`)
        process.exit(1)
      }
      const content = fs.readFileSync(filePath, 'utf8')
      const checksum = crypto.createHash('sha256').update(content).digest('hex')
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE filename = $1', [file])
      if (existing.rows.length > 0) {
        if (existing.rows[0].checksum !== checksum) {
          console.error(`CHECKSUM DRIFT: ${file} was edited after being applied. Refusing to continue.`)
          process.exit(1)
        }
        console.log(`${file}: already applied (checksum match), skipping.`)
        continue
      }
      process.stdout.write(`Applying ${file} ... `)
      await client.query(content)
      await client.query('INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)', [file, checksum])
      console.log('OK')
    }
    console.log('Done.')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}
main()
