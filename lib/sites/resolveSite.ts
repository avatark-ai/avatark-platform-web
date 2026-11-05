import { headers } from 'next/headers'
import { isInstitutionalScope } from '@/lib/release/scope'
import { findSiteByHost, type SiteId } from './registry'

// Centralizes the one host-dependent decision this app makes: whether `/`
// renders the Echo landing page or the institutional homepage. Every other
// route is unambiguously one or the other regardless of host (institutional:
// /, /founder and its sub-routes, /ecosystem, /living-worlds, /roadmap; everything else:
// Echo) -- see docs/ECHO_DOMAIN_MIGRATION.md -- so this is the only call
// site that needs to exist. Reading `headers()` opts this call path out of
// static rendering, same tradeoff any host-aware page makes.
//
// AVK-PROD-03A (C4): in the institutional release scope every host -- next.avatark.ai (an Echo
// legacy host in lib/sites/registry.ts), avatark.ai, localhost and Vercel hosts -- renders the
// institutional site. The host registry itself is unchanged for a future Scope II.
export async function resolveSite(): Promise<SiteId> {
  const headerList = await headers()
  if (isInstitutionalScope()) return 'institutional'
  const host = headerList.get('host')
  if (host) {
    const site = findSiteByHost(host)
    if (site) return site.id
  }

  // No real DNS locally or on a generic preview URL -- this override lets
  // `/` render Echo during development without needing a matching host.
  if (process.env.NEXT_PUBLIC_FORCE_SITE === 'echo') return 'echo'
  if (process.env.NEXT_PUBLIC_FORCE_SITE === 'institutional') return 'institutional'

  return 'institutional'
}
