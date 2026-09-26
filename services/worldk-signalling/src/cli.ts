// Standalone runner for local certification (Cloud Workstation). Secrets are
// read from 0600 files, never from argv or logs.
//
//   WORLDK_SIGNALLING_PLATFORM_ORIGIN   Platform origin serving /api/signalling/v1/route
//   WORLDK_SIGNALLING_KEY_FILE          the Platform's signalling-facing key
//   WORLDK_SIGNALLING_STREAMER_KEY_FILE renderer (streamer) key
//   WORLDK_SIGNALLING_PLAYER_PORT / _STREAMER_PORT / _HOST
//   WORLDK_SIGNALLING_ICE_MODE          direct | relay
//   WORLDK_TURN_URLS (comma) / WORLDK_TURN_SECRET_FILE / WORLDK_TURN_TTL_SECONDS
import { readFileSync, statSync } from "node:fs"
import { httpRouteAuthority } from "./routeAuthority.ts"
import { WorldKSignallingServer } from "./server.ts"

function secret(envName: string): string {
  const f = process.env[envName]
  if (!f) throw new Error(`${envName} is required`)
  if ((statSync(f).mode & 0o077) !== 0) throw new Error(`${envName} must be mode 0600`)
  return readFileSync(f, "utf8").trim()
}

const mode = process.env.WORLDK_SIGNALLING_ICE_MODE === "relay" ? "relay" : "direct"
const server = new WorldKSignallingServer({
  host: process.env.WORLDK_SIGNALLING_HOST ?? "127.0.0.1",
  playerPort: Number(process.env.WORLDK_SIGNALLING_PLAYER_PORT ?? 8880),
  streamerPort: Number(process.env.WORLDK_SIGNALLING_STREAMER_PORT ?? 8888),
  streamerKey: secret("WORLDK_SIGNALLING_STREAMER_KEY_FILE"),
  route: httpRouteAuthority(process.env.WORLDK_SIGNALLING_PLATFORM_ORIGIN ?? "", secret("WORLDK_SIGNALLING_KEY_FILE")),
  iceMode: mode,
  turn: mode === "relay"
    ? { urls: (process.env.WORLDK_TURN_URLS ?? "").split(",").filter(Boolean), secret: secret("WORLDK_TURN_SECRET_FILE"), ttlSeconds: Number(process.env.WORLDK_TURN_TTL_SECONDS ?? 300) }
    : null,
})
const ports = await server.listen()
process.stdout.write(`worldk-signalling listening (player ${ports.playerPort}, streamer ${ports.streamerPort}, ice ${mode})\n`)
