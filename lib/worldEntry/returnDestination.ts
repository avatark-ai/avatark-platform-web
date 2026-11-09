// WORLDK-RETURN-NAV-01: server-pinned "return to WorldK" destinations for the
// Platform handoff gateway's exit pages (LEFT, ENDED, No session, Entry
// unavailable).
//
// The destination is NEVER taken from the request: no query parameter,
// cookie, Referer, Origin or other header can influence it. It is built only
// from
//   - WORLDK_CONSUMER_ORIGIN, an https origin (no path, query, fragment,
//     credentials or port) whose hostname is on an EXACT allowlist, and
//   - the trusted world binding's slug (lib/worldConsumer/bindings.ts).
// A missing or invalid configuration yields no destination, so the page keeps
// its informational copy without a link. Nothing is ever guessed.
import type { WorldBinding } from "../worldConsumer/bindings.ts"

export const WORLDK_CONSUMER_ORIGIN_ENV = "WORLDK_CONSUMER_ORIGIN"

/** Exact hostnames only; no wildcard or suffix matching. */
export const ALLOWED_WORLDK_CONSUMER_HOSTS: readonly string[] = [
  "worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app",
]

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Returns the canonical origin, or null when the value is not an approved https origin. */
export function parseWorldKConsumerOrigin(raw: string | null | undefined, allowedHosts: readonly string[] = ALLOWED_WORLDK_CONSUMER_HOSTS): string | null {
  if (typeof raw !== "string") return null
  const value = raw.trim()
  if (value === "") return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== "https:") return null
  if (url.username !== "" || url.password !== "" || url.port !== "") return null
  // Origin only: the configured text must be exactly the origin (no path, query or fragment).
  if (value !== url.origin) return null
  if (!allowedHosts.includes(url.hostname)) return null
  return url.origin
}

/** The world's WorldK entry page, e.g. <origin>/worlds/living-forest/enter; null without a trusted binding. */
export function worldReturnHref(origin: string | null | undefined, binding: WorldBinding | null | undefined): string | null {
  if (!origin || !binding || !SLUG.test(binding.slug)) return null
  return `${origin}/worlds/${binding.slug}/enter`
}

/** The WorldK home page; null without a configured origin. */
export function worldKHomeHref(origin: string | null | undefined): string | null {
  return origin ? `${origin}/` : null
}
