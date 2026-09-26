// Ephemeral TURN credentials (coturn `use-auth-secret`, RFC-draft "TURN REST API").
//
//   username   = "<unix expiry>:<16 random hex>"
//   credential = base64(HMAC-SHA1(static-auth-secret, username))
//
// Minted per player connection ONLY after authorization admission, with an
// explicit TTL. Never persisted, logged or returned anywhere but the one
// peer's config message.
import { createHmac, randomBytes } from "node:crypto"

export interface TurnConfig {
  urls: string[]
  secret: string
  ttlSeconds: number
}

export interface IceServer {
  urls: string[]
  username?: string
  credential?: string
}

export function mintTurnCredential(secret: string, ttlSeconds: number, nowMs: number = Date.now()): { username: string; credential: string; expiresAt: number } {
  if (!secret || secret.length < 32) throw new Error("TURN secret too short")
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 3600) throw new Error("TURN ttl must be 30..3600 s")
  const expiresAt = Math.floor(nowMs / 1000) + ttlSeconds
  const username = `${expiresAt}:${randomBytes(8).toString("hex")}`
  const credential = createHmac("sha1", secret).update(username).digest("base64")
  return { username, credential, expiresAt }
}

export type IceMode = "direct" | "relay"

/** peerConnectionOptions for one peer: relay-only with fresh TURN credentials, or direct (local certification only). */
export function peerOptionsFor(mode: IceMode, turn: TurnConfig | null, nowMs?: number): { iceServers: IceServer[]; iceTransportPolicy?: "relay" } {
  if (mode === "direct") return { iceServers: [] }
  if (!turn) throw new Error("relay mode requires TURN configuration")
  const c = mintTurnCredential(turn.secret, turn.ttlSeconds, nowMs)
  return { iceServers: [{ urls: turn.urls, username: c.username, credential: c.credential }], iceTransportPolicy: "relay" }
}
