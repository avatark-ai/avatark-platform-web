#!/usr/bin/env node
// WORLDK-M14-A operator tooling — PREVIEW ONLY. Never deployed.
//
//   node --experimental-strip-types scripts/worldk-m14-runtime-registry.ts <command> [flags]
//
// Commands (each writes an SQL file for the operator to run as the database
// owner on avatark-platform-preview, e.g. `supabase db query --linked -f`):
//
//   runtime-credential   --instance <uuid> [--register --label <l> --capacity <n>] --ttl <seconds>
//                        --credential-out <file> --sql-out <file>
//       Generates a per-instance runtime credential LOCALLY. The credential
//       (bearer) goes only to --credential-out (mode 0600, outside the repo);
//       the SQL carries only the sha256 of the secret.
//
//   platform-credential  --password-out <file> --sql-out <file>
//       Generates the Platform entry-authority DB password LOCALLY and
//       writes only its SCRAM-SHA-256 verifier into the SQL
//       (ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '<verifier>').
//       The plaintext goes only to --password-out (mode 0600).
//
//   revoke-credential    --credential <uuid> --sql-out <file>
//   revoke-instance      --instance <uuid> --sql-out <file>
//   disable-platform-credential --sql-out <file>
//
// Nothing secret is ever printed.
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { isUuid, newRuntimeCredential } from "../lib/worldEntry/credentials.ts"

const INGRESS_BASE_URL = "https://platform-preview.avatark.ai"
const WORLD = "living-forest"

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

function outsideRepo(file: string): string {
  const abs = path.resolve(file)
  if (abs.startsWith(path.resolve(process.cwd()) + path.sep)) throw new Error(`${file} must live outside the repository`)
  return abs
}

function writeSecret(file: string, content: string) {
  writeFileSync(outsideRepo(file), content, { mode: 0o600, flag: "wx" })
}

/** PostgreSQL SCRAM-SHA-256 verifier (RFC 5802 / 7677), 4096 iterations. */
export function scramVerifier(password: string, salt = randomBytes(16), iterations = 4096): string {
  const salted = pbkdf2Sync(password.normalize("NFKC"), salt, iterations, 32, "sha256")
  const clientKey = createHmac("sha256", salted).update("Client Key").digest()
  const storedKey = createHash("sha256").update(clientKey).digest()
  const serverKey = createHmac("sha256", salted).update("Server Key").digest()
  return `SCRAM-SHA-256$${iterations}:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`
}

function main() {
  const [command, ...rest] = process.argv.slice(2)
  const f = flags(rest)
  const sqlOut = f["sql-out"]
  if (!command || !sqlOut) throw new Error("usage: <runtime-credential|platform-credential|revoke-credential|revoke-instance|disable-platform-credential> ... --sql-out <file>")
  const header = `-- WORLDK-M14-A operator SQL for avatark-platform-preview (gxjdbfpyyrycvqzozyty) ONLY. Contains no secret.\n`

  if (command === "runtime-credential") {
    const instance = f.instance
    const ttl = Number(f.ttl)
    if (!isUuid(instance) || !Number.isInteger(ttl)) throw new Error("--instance <uuid> and --ttl <seconds> are required")
    const cred = newRuntimeCredential()
    let sql = header
    if (f.register === "true") {
      const label = f.label ?? "m14-reference-runtime"
      const capacity = Number(f.capacity ?? "4")
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(label) || !Number.isInteger(capacity)) throw new Error("invalid --label/--capacity")
      sql += `SELECT world_runtime_register_instance('${instance}', '${WORLD}', '${label}', ${capacity});\n`
    }
    sql += `SELECT world_runtime_issue_credential('${cred.credentialId}', '${instance}', '\\x${cred.sha256.toString("hex")}'::bytea, ${ttl}) AS expires_at;\n`
    writeSecret(f["credential-out"] ?? "", JSON.stringify({ ingressBaseUrl: INGRESS_BASE_URL, instanceId: instance, credentialId: cred.credentialId, bearer: cred.bearer }) + "\n")
    writeFileSync(sqlOut, sql, { flag: "wx" })
    process.stdout.write(`runtime credential ${cred.credentialId} for instance ${instance} written (secret not shown)\n`)
    return
  }
  if (command === "platform-credential") {
    const password = randomBytes(32).toString("base64url")
    writeSecret(f["password-out"] ?? "", password)
    writeFileSync(sqlOut, `${header}ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(password)}';\n`, { flag: "wx" })
    process.stdout.write("platform entry credential password written (not shown); SQL carries the SCRAM verifier only\n")
    return
  }
  if (command === "revoke-credential" && isUuid(f.credential)) {
    writeFileSync(sqlOut, `${header}SELECT world_runtime_revoke_credential('${f.credential}');\n`, { flag: "wx" })
    return
  }
  if (command === "revoke-instance" && isUuid(f.instance)) {
    writeFileSync(sqlOut, `${header}SELECT world_runtime_revoke_instance('${f.instance}');\n`, { flag: "wx" })
    return
  }
  if (command === "disable-platform-credential") {
    writeFileSync(sqlOut, `${header}ALTER ROLE worldk_platform_entry_preview NOLOGIN PASSWORD NULL;\n`, { flag: "wx" })
    return
  }
  throw new Error(`unknown command or missing flags: ${command}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main()
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n`)
    process.exit(1)
  }
}
