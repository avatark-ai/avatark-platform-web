#!/usr/bin/env node
// WORLDK-M14-A non-Unreal REFERENCE RUNTIME — operator CLI. PREVIEW ONLY.
//
//   node --experimental-strip-types scripts/worldk-m14-reference-runtime.ts run --credential-file <file> [flags]
//
// The credential file (written by worldk-m14-runtime-registry.ts, mode 0600,
// outside any checkout) holds {ingressBaseUrl, instanceId, credentialId,
// bearer}. The bearer is sent only to the Platform Runtime Ingress and is
// never printed. This process holds no database credential.
//
// Flags:
//   --readiness STARTING|READY   advertised readiness (default READY)
//   --interval <s>               poll interval (default 3)
//   --duration <s>               stop after this long (default: run until killed)
//   --disconnect-after-join      send a DISCONNECT (stream dropped) for each joined session
//   --stop-heartbeats-after-join stop presence evidence once a session has joined (runtime hang/crash)
//   --exit-after-join            exit immediately after the first join, sending nothing further (crash)
import { readFileSync, statSync } from "node:fs"
import path from "node:path"
import { httpIngressTransport, ReferenceRuntime, type RuntimeEvent } from "../lib/worldEntry/referenceRuntime.ts"

interface CredentialFile {
  ingressBaseUrl: string
  instanceId: string
  credentialId: string
  bearer: string
}

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

function load(file: string): CredentialFile {
  const abs = path.resolve(file)
  if ((statSync(abs).mode & 0o077) !== 0) throw new Error("credential file must be mode 0600")
  if (abs.startsWith(path.resolve(process.cwd()) + path.sep)) throw new Error("credential file must live outside the repository")
  const c = JSON.parse(readFileSync(abs, "utf8")) as CredentialFile
  if (new URL(c.ingressBaseUrl).host !== "platform-preview.avatark.ai") throw new Error("reference runtime talks only to the Preview Runtime Ingress")
  return c
}

const short = (id: string) => id.slice(0, 8)
const log = (e: RuntimeEvent) => {
  const at = new Date().toISOString()
  if (e.kind === "REFUSED") process.stdout.write(`${at} REFUSED ${e.op} ${e.status} ${e.error}\n`)
  else if (e.kind === "CLAIMED") process.stdout.write(`${at} CLAIMED session=${short(e.sessionId)} reconnect=${e.reconnect}\n`)
  else process.stdout.write(`${at} ${e.kind} session=${short(e.sessionId)} -> ${e.outcome}\n`)
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const f = flags(rest)
  if (command !== "run" || !f["credential-file"]) throw new Error("usage: run --credential-file <file> [flags]")
  const cred = load(f["credential-file"])
  const interval = Math.max(1, Number(f.interval ?? "3")) * 1000
  const until = f.duration ? Date.now() + Number(f.duration) * 1000 : Infinity
  const joined = new Set<string>()
  let stop = false
  const rt = new ReferenceRuntime(httpIngressTransport(cred.ingressBaseUrl, cred.bearer), {
    readiness: f.readiness === "STARTING" ? "STARTING" : "READY",
    onEvent: (e) => {
      log(e)
      if (e.kind === "ARRIVAL" && (e.outcome === "VISIT_OPENED" || e.outcome === "SESSION_RESUMED")) joined.add(e.sessionId)
    },
  })
  process.stdout.write(`${new Date().toISOString()} reference runtime instance=${short(cred.instanceId)} credential=${short(cred.credentialId)} ingress=${cred.ingressBaseUrl}\n`)
  process.on("SIGINT", () => (stop = true))
  while (!stop && Date.now() < until) {
    try {
      await rt.step()
    } catch (err) {
      process.stdout.write(`${new Date().toISOString()} ERROR ${(err as Error).message}\n`)
    }
    if (joined.size > 0) {
      if (f["exit-after-join"] === "true") {
        process.stdout.write(`${new Date().toISOString()} EXIT (simulated crash: no departure, no further presence)\n`)
        process.exit(0)
      }
      if (f["stop-heartbeats-after-join"] === "true") rt.suspendHeartbeats()
      if (f["disconnect-after-join"] === "true") for (const s of joined) await rt.disconnect(s)
      if (f["disconnect-after-join"] === "true") joined.clear()
    }
    await new Promise((r) => setTimeout(r, interval))
  }
}

main().catch((err) => {
  process.stderr.write(`${(err as Error).message}\n`)
  process.exit(1)
})
