// Shared allowlist guard: only ever accept a relative, same-origin path
// as a redirect target. Never redirect to an absolute or protocol-
// relative URL taken from a query parameter -- a classic open-redirect
// vulnerability class.
export function safeReturnPath(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  if (raw.startsWith('//') || raw.includes('://')) return fallback
  if (!raw.startsWith('/')) return fallback
  return raw
}
