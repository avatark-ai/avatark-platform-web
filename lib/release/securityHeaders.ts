// AVK-PROD-03A (C6): security headers for every response of the institutional release.
// Pure module: imported by next.config.ts (page/asset responses) and lib/release/denial.ts
// (proxy-generated 404/405 responses), so both paths carry the same set.
//
// CSP ships as REPORT-ONLY first (AVK-PROD-03 section 7). 'unsafe-inline' for scripts is the
// approved default for App Router inline bootstraps without nonces; connect-src is 'self' only:
// the institutional scope never talks to Supabase. HSTS is left to Vercel's default (no preload).

export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://canon.avatark.ai",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

export const SECURITY_HEADERS: readonly { key: string; value: string }[] = [
  { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

// I-1: the interim host stays out of search indexes until the apex cut-over.
export const NOINDEX_HOSTS = ['next.avatark.ai'] as const
export const NOINDEX_HEADER = { key: 'X-Robots-Tag', value: 'noindex' } as const
