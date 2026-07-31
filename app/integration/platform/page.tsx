import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin/authz'
import { computePlatformStatus, type PlatformStatusValue } from '@/lib/integrations/platformStatus'
import { PlatformStatusClient } from './PlatformStatusClient'

// Same admin-gate as /admin (lib/admin/authz.ts's getAdminContext) --
// this route shows real query results scoped to the signed-in admin's own
// session, not secrets, but it is still an internal diagnostic surface,
// not a public one.
export default async function IntegrationPlatformPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in?return=%2Fintegration%2Fplatform')

  const ctx = await getAdminContext()
  if (!ctx) {
    return (
      <div className="mx-auto min-h-full max-w-md px-4 py-16">
        <p className="text-sm text-red-600" role="alert">
          You don&apos;t have access to the Platform Integration Lab.
        </p>
      </div>
    )
  }

  const rows = await computePlatformStatus()
  return <PlatformStatusClient rows={rows} />
}

export type { PlatformStatusValue }
