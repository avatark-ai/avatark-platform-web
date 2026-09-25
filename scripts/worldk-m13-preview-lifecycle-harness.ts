#!/usr/bin/env node
// WORLDK-M13 Preview Lifecycle Harness — operator CLI.
// PREVIEW_ONLY / TEST_ONLY / AUTHORITY_SIMULATION. Never deployed.
//
//   node --experimental-strip-types scripts/worldk-m13-preview-lifecycle-harness.ts <command> [flags]
//
// Commands:
//   whoami   connect and report the session identity (no writes)
//   arrive   confirmed arrival:   --subject --visit --tick [--place] [--event] [--occurred-at]
//   depart   confirmed departure: --subject --visit --tick [--place] [--event] [--occurred-at]
//   replay   resend a previously sent event byte-for-byte: --event-in <file> --kind arrive|depart
//
// Always required: --credential-file <path>  (JSON {projectRef, host, port, database, user, password},
// mode 0600, outside any git checkout). The secret is never printed.
// --event-out <file> writes the exact event sent (no secrets) so it can be replayed.
// --world defaults to living-forest.

import { randomUUID } from "node:crypto"
import { readFileSync, statSync, writeFileSync } from "node:fs"
import pg from "pg"
import {
  assertLifecycleTarget,
  LifecycleFailure,
  previewProvenance,
  recordConfirmedArrival,
  recordConfirmedDeparture,
  type LifecycleEvent,
} from "../lib/worldConsumer/testing/previewLifecycleHarness.ts"

interface Credential {
  projectRef: string
  host: string
  port: number
  database: string
  user: string
  password: string
}

function flags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (!a.startsWith("--")) continue
    out[a.slice(2)] = argv[i + 1] ?? ""
    i++
  }
  return out
}

function loadCredential(file: string): Credential {
  const st = statSync(file)
  if ((st.mode & 0o077) !== 0) throw new LifecycleFailure("TARGET_REFUSED", "credential file must be mode 0600")
  if (process.cwd() !== "/" && file.startsWith(process.cwd())) throw new LifecycleFailure("TARGET_REFUSED", "credential file must live outside the repository")
  return JSON.parse(readFileSync(file, "utf8")) as Credential
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const f = flags(rest)
  if (!command || !f["credential-file"]) throw new Error("usage: <whoami|arrive|depart|replay> --credential-file <path> ...")
  const cred = loadCredential(f["credential-file"])
  assertLifecycleTarget({ host: cred.host, user: cred.user, projectRef: cred.projectRef }, { allowLocalDisposable: f["local-disposable"] === "yes" })

  const client = new pg.Client({
    host: cred.host,
    port: cred.port,
    database: cred.database,
    user: cred.user,
    password: cred.password,
    ssl: cred.host === "127.0.0.1" || cred.host === "localhost" ? undefined : { rejectUnauthorized: false },
    application_name: "worldk-m13-preview-lifecycle-harness",
  })
  await client.connect()
  try {
    if (command === "whoami") {
      const { rows } = await client.query("SELECT session_user::text AS session_user, current_user::text AS current_user, pg_has_role(session_user, 'worldk_lifecycle_authority', 'SET') AS may_assume_writer, pg_has_role(session_user, 'worldk_lifecycle_authority', 'USAGE') AS inherits_writer, now() AS db_now")
      console.log(JSON.stringify(rows[0]))
      return
    }

    let kind = command
    let event: LifecycleEvent
    if (command === "replay") {
      event = JSON.parse(readFileSync(f["event-in"]!, "utf8")) as LifecycleEvent
      kind = f.kind!
    } else {
      if (!f.subject || !f.visit || f.tick === undefined) throw new Error("--subject, --visit and --tick are required")
      event = {
        eventId: f.event || randomUUID(),
        worldId: f.world || "living-forest",
        subjectId: f.subject,
        visitId: f.visit,
        occurredAt: f["occurred-at"] || new Date().toISOString(),
        worldTick: Number(f.tick),
        placeId: f.place || null,
        provenance: previewProvenance({ command }),
      }
    }
    if (f["event-out"]) writeFileSync(f["event-out"], JSON.stringify(event, null, 2) + "\n", { mode: 0o600 })
    const result = kind === "arrive" ? await recordConfirmedArrival(client, event) : kind === "depart" ? await recordConfirmedDeparture(client, event) : null
    if (!result) throw new Error(`unknown command ${command}`)
    console.log(JSON.stringify({ ok: true, result }))
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  if (err instanceof LifecycleFailure) {
    console.log(JSON.stringify({ ok: false, code: err.code }))
    process.exit(2)
  }
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
