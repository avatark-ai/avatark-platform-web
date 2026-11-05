// AVK-PROD-03A (C2/C3): fixed, content-free denial responses. Never echoes request data.
import { SECURITY_HEADERS } from './securityHeaders.ts'

export function denialResponse(status: 404 | 405): Response {
  const headers = new Headers({
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'private, no-store',
    'x-robots-tag': 'noindex, nofollow',
  })
  for (const h of SECURITY_HEADERS) headers.set(h.key, h.value)
  if (status === 405) headers.set('allow', 'GET, HEAD')
  return new Response(status === 404 ? 'Not Found' : 'Method Not Allowed', { status, headers })
}

/** L2 for Route Handlers: an excluded API returns 404 before any of its own logic runs. */
export function excludedInScope(institutional: boolean): Response | null {
  return institutional ? denialResponse(404) : null
}
