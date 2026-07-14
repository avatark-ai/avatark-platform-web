// Shared session-refresh logic, called from the real root proxy.ts.
// Follows the official @supabase/ssr pattern: refreshing the session on
// every request is what keeps a signed-in user signed in past token
// expiry without requiring a manual re-login.
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This call is what actually refreshes an expiring session -- do not
  // remove it even though its return value looks unused.
  await supabase.auth.getUser()

  return response
}
