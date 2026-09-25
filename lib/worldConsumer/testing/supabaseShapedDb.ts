// Test-only: builds a Supabase-shaped database on a DISPOSABLE local
// Postgres for the WORLDK-M13 lifecycle/continuity suites.
//
// Fidelity points that matter for 039:
//   * the migration owner is a NON-superuser with CREATEROLE + BYPASSRLS
//     (Supabase's `postgres`), not the container superuser;
//   * anon / authenticated / service_role exist, service_role has
//     BYPASSRLS, and Supabase's default privileges grant every new public
//     table and function to all three (the gap 038/039 revoke explicitly);
//   * auth.users + auth.uid() (from the request.jwt.claim.sub setting, as
//     PostgREST sets it).
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const here = path.dirname(fileURLToPath(import.meta.url))
export const migrationSql = (f: string) => readFileSync(path.join(here, "../../../supabase/migrations", f), "utf8")

export const OWNER = "m13_platform_owner"
export const OWNER_PW = "m13-owner-local-only"

export function assertLocalUrl(url: string) {
  if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) throw new Error("refusing to run: test database URL must point at a local disposable database")
}

export function urlFor(base: string, db: string, user?: string, password?: string) {
  const u = new URL(base)
  u.pathname = `/${db}`
  if (user) {
    u.username = user
    u.password = password ?? ""
  }
  return u.toString()
}

/**
 * Creates `db` (dropping any previous copy), bootstraps Supabase-shaped
 * roles/schemas, and applies 037 + 038's continuity revokes + 039 as the
 * non-superuser owner. Returns open superuser and owner clients.
 */
export async function createSupabaseShapedDb(superuserUrl: string, db: string): Promise<{ su: pg.Client; owner: pg.Client }> {
  assertLocalUrl(superuserUrl)
  const admin = new pg.Client({ connectionString: superuserUrl })
  await admin.connect()
  await admin.query(`DROP DATABASE IF EXISTS ${db} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${db}`)
  await admin.end()

  const su = new pg.Client({ connectionString: urlFor(superuserUrl, db) })
  await su.connect()
  await su.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN NOINHERIT; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${OWNER}') THEN CREATE ROLE ${OWNER} LOGIN NOSUPERUSER CREATEROLE BYPASSRLS; END IF;
    END $$;
    ALTER ROLE ${OWNER} PASSWORD '${OWNER_PW}';
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
      SELECT COALESCE(nullif(current_setting('request.jwt.claim.sub', true), ''), nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
    $f$;
    GRANT USAGE ON SCHEMA auth TO ${OWNER}, anon, authenticated, service_role;
    GRANT SELECT, REFERENCES ON auth.users TO ${OWNER};
    GRANT USAGE, CREATE ON SCHEMA public TO ${OWNER};
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE ${OWNER} IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE ${OWNER} IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  `)

  const owner = new pg.Client({ connectionString: urlFor(superuserUrl, db, OWNER, OWNER_PW) })
  await owner.connect()
  await owner.query(migrationSql("037_world_visitor_continuity.sql"))
  // 038's continuity-relevant statements (the rest targets tables this fixture does not create).
  await owner.query(`
    REVOKE EXECUTE ON FUNCTION record_world_confirmed_entry(text, uuid, timestamptz, integer, text) FROM anon, authenticated;
    REVOKE EXECUTE ON FUNCTION record_world_leave(text, uuid, timestamptz, integer, text) FROM anon, authenticated;
  `)
  // A world-state table the lifecycle writer must never be able to touch.
  await owner.query("CREATE TABLE world_state_probe (world_id text PRIMARY KEY, tick integer NOT NULL); INSERT INTO world_state_probe VALUES ('living-forest', 6)")
  await owner.query(migrationSql("039_world_visitor_lifecycle_authority.sql"))
  return { su, owner }
}
