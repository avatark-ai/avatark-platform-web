// Shared allowlist guard: only ever accept a relative, same-origin path
// as a redirect target. Never redirect to an absolute or protocol-
// relative URL taken from a query parameter -- a classic open-redirect
// vulnerability class.
//
// Resolves against a fixed dummy origin instead of doing ad hoc string
// checks (rejecting only "//" and "://") -- a bare string check misses
// values like "/\evil.example.com", which the leading-"//" check lets
// through but which browsers (and Node's URL parser) still resolve to a
// different host, because backslashes are treated as path separators for
// special schemes during relative-URL resolution. Verifying the resolved
// origin actually stayed put closes that gap and any similar one.
const DUMMY_ORIGIN = 'http://localhost'

export function safeReturnPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  try {
    const resolved = new URL(raw, DUMMY_ORIGIN)
    if (resolved.origin !== DUMMY_ORIGIN) return fallback
    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallback
  }
}
