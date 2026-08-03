// Platform Admin bootstrap entry point. Deliberately lives OUTSIDE
// app/admin/** so app/admin/layout.tsx's getAdminContext() gate (which
// would 403 a user who isn't an admin yet, i.e. everyone this page is for)
// never runs here. Sign-in is still required; the real safety comes from
// the API route itself (PLATFORM_ADMIN_BOOTSTRAP_EMAIL match + "no admin
// exists yet"), not from this page.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BootstrapButton } from './BootstrapButton'

export default async function AdminBootstrapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in?return=%2Fadmin-bootstrap')

  return (
    <div className="mx-auto min-h-full max-w-md bg-white px-4 py-16 text-neutral-900">
      <h1 className="text-lg font-semibold">Platform Admin Bootstrap</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Signed in as <span className="font-medium">{user.email}</span>. This grants Platform Admin to the first
        administrator only. If a platform admin already exists, or this account isn&apos;t the configured bootstrap
        admin, this will refuse.
      </p>
      <BootstrapButton />
    </div>
  )
}
