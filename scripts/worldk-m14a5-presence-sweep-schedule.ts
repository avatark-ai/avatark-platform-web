#!/usr/bin/env node
// WORLDK-M14-A5 operator tooling — PREVIEW ONLY. Never deployed.
//
//   node --experimental-strip-types scripts/worldk-m14a5-presence-sweep-schedule.ts <status|schedule|unschedule>
//        --credential-url-file <file>   the Platform entry-authority DB URL (mode 0600, outside the repo)
//        [--interval "30 seconds"]
//
// Connects AS the Platform entry authority credential (worldk_platform_entry_preview)
// and manages the pg_cron job that runs the EXISTING authoritative sweep
// world_presence_sweep(limit). The URL is checked by the same target guard the
// Platform uses (Preview project + entry credential only; Production refs refused).
// Requires migration 041 on the target. Nothing secret is ever printed.
import { readFileSync, statSync } from "node:fs"
import pg from "pg"
import { assertEntryAuthorityTarget } from "../lib/worldEntry/authorityDb.ts"
import { presenceSweepStatus, schedulePresenceSweep, unschedulePresenceSweep, PRESENCE_SWEEP_INTERVAL } from "../lib/worldEntry/presenceSweepSchedule.ts"

function flags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (!a.startsWith("--")) continue
    const next = argv[i + 1]
    if (next === undefined || next.startsWith("--")) out[a.slice(2)] = "true"
    else {
      out[a.slice(2)] = next
      i++
    }
  }
  return out
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const f = flags(rest)
  if (!["status", "schedule", "unschedule"].includes(command ?? "") || !f["credential-url-file"]) {
    throw new Error("usage: <status|schedule|unschedule> --credential-url-file <file> [--interval '30 seconds']")
  }
  const file = f["credential-url-file"]
  if ((statSync(file).mode & 0o077) !== 0) throw new Error("credential URL file must be mode 0600")
  const url = readFileSync(file, "utf8").trim()
  assertEntryAuthorityTarget(url)
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    if (command === "schedule") process.stdout.write(`scheduled job ${await schedulePresenceSweep(client, f.interval ?? PRESENCE_SWEEP_INTERVAL)}\n`)
    if (command === "unschedule") process.stdout.write(`unscheduled: ${await unschedulePresenceSweep(client)}\n`)
    process.stdout.write(JSON.stringify(await presenceSweepStatus(client), null, 1) + "\n")
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  process.stderr.write(`error: ${String(err?.message ?? err).replace(/postgres(ql)?:\/\/\S+/g, "[url]")}\n`)
  process.exit(1)
})
