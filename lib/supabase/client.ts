// Browser-side Supabase client for AvatarK Platform. Uses the public
// anon key only -- safe to ship to the client, unlike a service-role key.
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
