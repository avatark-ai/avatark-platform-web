import { NextResponse } from 'next/server'

// Safety-in-depth for every /api/dev/* route: even though these routes are
// never linked from real navigation and exist solely for app/dev/account's
// unauthenticated preview + this sprint's Playwright validation (no
// Supabase project is configured in this environment at all, so the real,
// authenticated routes can't be exercised here regardless), this guard
// makes a production deployment of this app 404 on every one of them
// rather than relying solely on "nobody links to it."
export function devRouteGuard(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return null
}
