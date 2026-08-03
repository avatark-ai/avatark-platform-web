import { NextResponse } from 'next/server'
import { PRODUCT_REGISTRY } from '@avatark/product-registry'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin'
import { getAdminContext } from '@/lib/admin/authz'
import { computeEnvironmentHealth } from '@/lib/admin/environment'
import { computeSystemHealth } from '@/lib/admin/systemHealth'
import { buildSystemInformationSnapshot } from '@/lib/admin/systemInformation'
import { readAllPackageVersions, readPackageVersion } from '@/lib/admin/packageVersions'

// The server, and only the server, decides visibility tier here --
// getAdminContext() re-derives it from the signed-in session's own
// platform_roles row every request. There is no request body/query param
// this route reads at all, so there is no client input that could ever
// elevate it (mission Part 9: "Client input must not elevate diagnostics
// visibility").
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const adminContext = await getAdminContext()
  const tier = adminContext ? 'admin' : 'safe'

  const authProviders = (user.identities ?? []).map((i) => i.provider)

  // Own-row RLS read, same as /api/account/organizations -- degrades to
  // "Personal" (no current organization) rather than a 500 if migration
  // 018 isn't applied in this environment.
  const { data: prefsRow } = await supabase.from('account_preferences').select('current_organization_id').eq('user_id', user.id).single()
  const currentOrganizationId: string | null = prefsRow?.current_organization_id ?? null
  let currentOrganizationName: string | null = null
  if (currentOrganizationId) {
    const { data: orgRow } = await supabase.from('organizations').select('name').eq('id', currentOrganizationId).maybeSingle()
    currentOrganizationName = orgRow?.name ?? null
  }

  const environmentHealth = computeEnvironmentHealth(process.env)[0]
  const admin = isAdminClientConfigured() ? createAdminClient() : null
  const health = await computeSystemHealth(admin, environmentHealth.state === 'healthy')

  const snapshot = buildSystemInformationSnapshot({
    tier,
    env: process.env,
    productId: 'avatark',
    productName: 'AvatarK',
    authProviders,
    currentOrganizationId,
    currentOrganizationName,
    accountPackageVersion: readPackageVersion('account'),
    authUiPackageVersion: readPackageVersion('auth-ui'),
    health,
    packageVersions: readAllPackageVersions(),
    registryProductCount: PRODUCT_REGISTRY.length,
    statusUrl: '/status',
    supportUrl: 'mailto:support@avatark.ai',
    adminUrl: '/admin',
  })

  return NextResponse.json(snapshot)
}
