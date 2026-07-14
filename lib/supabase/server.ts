// Server-side Supabase client for AvatarK Platform (Server Components,
// Route Handlers, Server Actions). Reads/writes real cookies for session
// persistence -- this is what makes signed-in state work across a full
// page reload, not just within one client-side session.
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component -- middleware/proxy handles
            // the actual session refresh in that case, so this can be
            // safely ignored here.
          }
        },
      },
    }
  )
}
