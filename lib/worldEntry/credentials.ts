// WORLDK-M14-A: bearer formats for world entry.
//
//   EntryTicket     32 random bytes, base64url (43 chars). Carried only inside
//                   the opaque handoff href; the database stores sha256 only.
//   Session view    same format. The browser's status-page capability on the
//                   Platform gateway origin (HttpOnly cookie); sha256 stored.
//   Runtime         wkrt1.<credentialId>.<secret>: a Platform-issued,
//   credential      per-instance credential (D2). The database stores sha256
//                   of the secret only and verifies it on every ingress call.
//
// Runtime identity is resolved through RuntimeAuthenticator so a later
// mTLS or cloud-workload-identity authenticator can replace the bearer
// without touching the ingress protocol: the ingress only ever needs a
// verified RuntimePrincipal.
import { createHash, randomBytes, randomUUID } from "node:crypto"

const SECRET_FORMAT = /^[A-Za-z0-9_-]{43}$/
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export const RUNTIME_CREDENTIAL_PREFIX = "wkrt1"

export function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest()
}

export function newSecret(): string {
  return randomBytes(32).toString("base64url")
}

export function isSecretFormat(value: unknown): value is string {
  return typeof value === "string" && SECRET_FORMAT.test(value)
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_FORMAT.test(value)
}

export interface IssuedSecret {
  secret: string
  sha256: Buffer
}

export function newTicket(): IssuedSecret {
  const secret = newSecret()
  return { secret, sha256: sha256(secret) }
}

export interface RuntimePrincipal {
  credentialId: string
  secretSha256: Buffer
}

export function formatRuntimeCredential(credentialId: string, secret: string): string {
  if (!isUuid(credentialId) || !isSecretFormat(secret)) throw new Error("invalid runtime credential parts")
  return `${RUNTIME_CREDENTIAL_PREFIX}.${credentialId}.${secret}`
}

export function newRuntimeCredential(): { credentialId: string; secret: string; sha256: Buffer; bearer: string } {
  const credentialId = randomUUID()
  const secret = newSecret()
  return { credentialId, secret, sha256: sha256(secret), bearer: formatRuntimeCredential(credentialId, secret) }
}

/** Parses `Authorization: Bearer wkrt1.<id>.<secret>`; null when malformed. */
export function parseRuntimeBearer(authorization: string | null | undefined): RuntimePrincipal | null {
  if (typeof authorization !== "string") return null
  const m = /^Bearer ([A-Za-z0-9_.-]{1,200})$/.exec(authorization.trim())
  if (!m) return null
  const parts = m[1].split(".")
  if (parts.length !== 3 || parts[0] !== RUNTIME_CREDENTIAL_PREFIX) return null
  const [, credentialId, secret] = parts
  if (!isUuid(credentialId) || !isSecretFormat(secret)) return null
  return { credentialId, secretSha256: sha256(secret) }
}

export interface RuntimeAuthenticator {
  /** A principal whose credential the database will verify, or null. */
  principal(headers: Headers): RuntimePrincipal | null
}

export const platformIssuedCredentialAuthenticator: RuntimeAuthenticator = {
  principal: (headers) => parseRuntimeBearer(headers.get("authorization")),
}
