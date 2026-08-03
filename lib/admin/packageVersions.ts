// Real package.json reads -- same technique as
// lib/integrations/platformStatus.ts's own "Installed shared-package
// versions" row (not duplicated logic imported from there, since that
// module is admin-page-specific and this needs a plain reusable reader),
// extended to cover every package under packages/* rather than that
// row's narrower historical list (which silently excludes `account`,
// `bootstrap`, `appearance`, `locale` -- confirmed by grep during the
// System Information audit).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const ALL_PACKAGE_NAMES = [
  'account', 'account-ui', 'appearance', 'auth', 'auth-ui', 'bootstrap',
  'identity', 'invitations', 'journey', 'living-echo', 'locale',
  'membership', 'motion', 'navigation', 'notifications', 'organizations',
  'product-registry', 'recommendations', 'timeline',
]

export function readPackageVersion(name: string): string | null {
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'packages', name, 'package.json'), 'utf8'))
    return typeof pkg.version === 'string' ? pkg.version : null
  } catch {
    return null
  }
}

export function readAllPackageVersions(names: string[] = ALL_PACKAGE_NAMES): Record<string, string> {
  const versions: Record<string, string> = {}
  for (const name of names) {
    const version = readPackageVersion(name)
    versions[`@avatark/${name}`] = version ?? '(unreadable)'
  }
  return versions
}
