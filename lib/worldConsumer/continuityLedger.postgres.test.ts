// Runs the SAME ledger semantics suite against real Postgres with
// supabase/migrations/037_world_visitor_continuity.sql applied.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL pointing at a DISPOSABLE local
// database (never shared/production). Skipped — visibly — when unset.
import { test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import { PostgresContinuityLedger } from "./continuityLedger.ts"
import { runContinuityLedgerSuite } from "./continuityLedgerSuite.ts"

const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const here = path.dirname(fileURLToPath(import.meta.url))

if (!url) {
  test("postgres ledger (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) throw new Error("refusing to run: WORLD_CONSUMER_TEST_DATABASE_URL must point at a local disposable database")
  const pool = new pg.Pool({ connectionString: url, max: 2 })

  // Minimal Supabase-shaped prerequisites for migration 037 (auth.users, auth.uid(), roles).
  const ready = (async () => {
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
      END $$;
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
      DROP TABLE IF EXISTS world_visitor_continuity CASCADE;
    `)
    await pool.query(readFileSync(path.join(here, "../../supabase/migrations/037_world_visitor_continuity.sql"), "utf8"))
  })()

  const subject = async () => {
    const id = randomUUID()
    await pool.query("INSERT INTO auth.users (id) VALUES ($1)", [id])
    return id
  }

  runContinuityLedgerSuite("postgres ledger (migration 037)", async () => {
    await ready
    return { ledger: new PostgresContinuityLedger(pool), subject }
  })

  test("postgres: migration is additive and idempotent (re-applying 037 keeps rows)", async () => {
    await ready
    const ledger = new PostgresContinuityLedger(pool)
    const s = await subject()
    await ledger.recordConfirmedEntry({ worldId: "living-forest", subjectId: s, at: "2026-09-23T10:00:00.000Z", worldTick: 1, placeId: null })
    await pool.query(readFileSync(path.join(here, "../../supabase/migrations/037_world_visitor_continuity.sql"), "utf8"))
    assert.equal((await ledger.get("living-forest", s))!.visitCount, 1)
  })

  test("postgres: constraints reject a non-contract basis, a malformed world id, and an unknown subject", async () => {
    await ready
    const s = await subject()
    await assert.rejects(pool.query("INSERT INTO world_visitor_continuity (world_id, subject_id, visit_count, first_entered_at, last_entered_at, last_entered_tick, visit_open, last_seen_at, last_seen_tick, last_seen_basis) VALUES ('living-forest', $1, 1, now(), now(), 0, true, now(), 0, 'BROWSED')", [s]))
    await assert.rejects(pool.query("SELECT * FROM record_world_confirmed_entry('Living Forest', $1, now(), 0, NULL)", [s]))
    await assert.rejects(pool.query("SELECT * FROM record_world_confirmed_entry('living-forest', $1, now(), 0, NULL)", [randomUUID()]))
  })

  test("postgres: RLS lets a visitor read only their own row; clients cannot write or execute ledger functions", async () => {
    await ready
    const a = await subject()
    const b = await subject()
    const ledger = new PostgresContinuityLedger(pool)
    await ledger.recordConfirmedEntry({ worldId: "living-forest", subjectId: a, at: "2026-09-23T10:00:00.000Z", worldTick: 1, placeId: null })
    await ledger.recordConfirmedEntry({ worldId: "living-forest", subjectId: b, at: "2026-09-23T10:00:00.000Z", worldTick: 1, placeId: null })
    await pool.query("GRANT USAGE ON SCHEMA public, auth TO authenticated; GRANT SELECT ON world_visitor_continuity TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated")
    const client = await pool.connect()
    try {
      await client.query("BEGIN")
      await client.query("SET LOCAL ROLE authenticated")
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [a])
      const { rows } = await client.query("SELECT subject_id FROM world_visitor_continuity")
      assert.deepEqual(rows.map((r) => r.subject_id), [a])
      await assert.rejects(client.query("SELECT * FROM record_world_leave('living-forest', $1, now(), 2, NULL)", [a]))
      await client.query("ROLLBACK")
    } finally {
      client.release()
    }
  })

  test("postgres: close pool", async () => {
    await ready
    await pool.end()
  })
}
