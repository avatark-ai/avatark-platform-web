// WORLDK-M14-A5: automatic presence expiry — the schedule for the EXISTING
// authoritative sweep.
//
// The only lifecycle engine is 040's world_presence_sweep(limit). This module
// just defines a pg_cron job that calls it. The job is owned by the Platform
// entry authority credential (worldk_platform_entry_preview), so the sweep
// runs under the same session gate it already enforces
// (world_m14_assert_platform). No secret lives in the job or the database.
//
// Frozen operational parameters (see the M14-A5 report):
//   heartbeat 15 s and grace 120 s come from world_entry_policies (040), not here.
//   The sweep runs every 30 s, so worst-case closure is about 150 s after the last presence.
//   Each run is bounded: at most PRESENCE_SWEEP_LIMIT visits and a 20 s statement timeout.
//   A missed or failed run is simply retried at the next tick. Expiry is also
//   applied lazily by later presence/arrival/entry for the same subject, so
//   scheduler downtime delays closure but can never corrupt it.
import type pg from "pg"

export const AUTHORITY_CREDENTIAL_ROLE = "worldk_platform_entry_preview"
export const PRESENCE_SWEEP_JOB = "worldk-presence-sweep"
export const PRESENCE_SWEEP_INTERVAL = "30 seconds"
export const PRESENCE_SWEEP_LIMIT = 100
export const PRESENCE_SWEEP_STATEMENT_TIMEOUT = "20s"

export function presenceSweepCommand(limit: number = PRESENCE_SWEEP_LIMIT): string {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("sweep limit must be an integer in 1..500")
  return `SET statement_timeout = '${PRESENCE_SWEEP_STATEMENT_TIMEOUT}'; SET ROLE worldk_platform_entry_authority; SELECT world_presence_sweep(${limit});`
}

/** Idempotently (re)schedules the sweep job AS the connected authority credential; returns the job id. */
export async function schedulePresenceSweep(client: pg.Client, interval: string = PRESENCE_SWEEP_INTERVAL, limit: number = PRESENCE_SWEEP_LIMIT): Promise<number> {
  if (!/^([1-5]?[0-9] seconds|[0-9*/,\- ]+)$/.test(interval)) throw new Error("unsupported schedule")
  const who = (await client.query("SELECT current_user AS u, session_user AS s")).rows[0]
  if (who.u !== AUTHORITY_CREDENTIAL_ROLE || who.s !== AUTHORITY_CREDENTIAL_ROLE) throw new Error(`the sweep job must be owned by ${AUTHORITY_CREDENTIAL_ROLE}`)
  const r = await client.query("SELECT cron.schedule($1, $2, $3) AS jobid", [PRESENCE_SWEEP_JOB, interval, presenceSweepCommand(limit)])
  return Number(r.rows[0].jobid)
}

export async function unschedulePresenceSweep(client: pg.Client): Promise<boolean> {
  const exists = (await client.query("SELECT 1 FROM cron.job WHERE jobname = $1", [PRESENCE_SWEEP_JOB])).rowCount
  if (!exists) return false
  await client.query("SELECT cron.unschedule($1)", [PRESENCE_SWEEP_JOB])
  return true
}

export interface SweepJobStatus {
  job: { jobid: number; schedule: string; active: boolean; username: string; command: string } | null
  runs: { status: string; start: string; end: string | null; message: string }[]
}

/** Observability: the job and its most recent runs (pg_cron's own run log). */
export async function presenceSweepStatus(client: pg.Client, runs = 10): Promise<SweepJobStatus> {
  const j = (await client.query("SELECT jobid, schedule, active, username, command FROM cron.job WHERE jobname = $1", [PRESENCE_SWEEP_JOB])).rows[0]
  if (!j) return { job: null, runs: [] }
  const r = await client.query(
    "SELECT status, start_time, end_time, return_message FROM cron.job_run_details WHERE jobid = $1 ORDER BY start_time DESC LIMIT $2",
    [j.jobid, runs],
  )
  return {
    job: { jobid: Number(j.jobid), schedule: j.schedule, active: j.active, username: j.username, command: j.command },
    runs: r.rows.map((x) => ({ status: x.status, start: new Date(x.start_time).toISOString(), end: x.end_time ? new Date(x.end_time).toISOString() : null, message: x.return_message })),
  }
}
