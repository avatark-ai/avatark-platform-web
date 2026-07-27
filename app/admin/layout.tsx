import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin/authz'
import { AdminNav } from './AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Signed-out: send to sign-in with a return path, same as /account.
  if (!user) redirect('/auth/sign-in?return=%2Fadmin')

  // Signed in but not an admin: an honest 403, not a redirect loop back to
  // sign-in (that would look like a bug, not an authorization boundary).
  const ctx = await getAdminContext()
  if (!ctx) {
    return (
      <div className="mx-auto min-h-full max-w-md bg-white px-4 py-16 text-neutral-900">
        <p className="text-sm text-red-600" role="alert">
          You don&apos;t have access to Platform Admin.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-full max-w-6xl bg-white px-4 py-8 text-neutral-900">
      <h1 className="mb-4 text-xl font-semibold">Platform Admin</h1>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  )
}
