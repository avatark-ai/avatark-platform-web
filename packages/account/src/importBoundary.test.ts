// Run with: node --experimental-strip-types --test packages/account/src/importBoundary.test.ts
//
// Regression tests proving this package is genuinely host-neutral:
// no hardcoded PrometheusK/Living-Echo product references outside the
// explicitly-marked, API-compat-only legacy files, no imports from this
// repo's app/ tree, and no secrets/credentials.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(here, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts')) out.push(full)
  }
  return out
}

const sourceFiles = walk(path.join(pkgRoot, 'src'))

// Files allowed to reference PrometheusK/Echo vocabulary -- explicitly
// marked, deprecated, compat-only files documented in PROVENANCE.md.
const COMPAT_ALLOWLIST = new Set([
  path.join(pkgRoot, 'src/extensions/ActivityTab.tsx'),
  path.join(pkgRoot, 'src/extensions/EchoesTab.tsx'),
  path.join(pkgRoot, 'src/contracts/adapters.ts'), // defines the deprecated ActivityAdapter/EchoesAdapter/AccountEcho types + doc comments
  path.join(pkgRoot, 'src/index.ts'), // re-exports the compat types/components by name
])

test('no hardcoded PrometheusK/Living-Echo product references outside the marked compat files', () => {
  const offenders: string[] = []
  for (const file of sourceFiles) {
    if (COMPAT_ALLOWLIST.has(file)) continue
    const contents = readFileSync(file, 'utf8')
    if (/prometheusk|living-echo/i.test(contents)) offenders.push(file)
  }
  assert.deepEqual(offenders, [], `unexpected product-specific references in: ${offenders.join(', ')}`)
})

test('zero imports from this repo\'s app/ tree', () => {
  const offenders: string[] = []
  for (const file of sourceFiles) {
    const contents = readFileSync(file, 'utf8')
    if (/from\s+['"](\.\.\/)*app\//.test(contents) || /from\s+['"]@\/app\//.test(contents)) offenders.push(file)
  }
  assert.deepEqual(offenders, [])
})

test('zero imports of next/navigation or next/link (package owns no routing)', () => {
  const offenders: string[] = []
  for (const file of sourceFiles) {
    const contents = readFileSync(file, 'utf8')
    if (/from\s+['"]next\/(navigation|link|router)['"]/.test(contents)) offenders.push(file)
  }
  assert.deepEqual(offenders, [])
})

test('no hardcoded secrets, keys, or credentials', () => {
  const suspicious = /(service[_-]?role|anon[_-]?key|supabase.*key|sk-[a-zA-Z0-9]{10,}|password\s*[:=]\s*['"][^'"]+['"])/i
  const offenders: string[] = []
  for (const file of sourceFiles) {
    const contents = readFileSync(file, 'utf8')
    if (suspicious.test(contents)) offenders.push(file)
  }
  assert.deepEqual(offenders, [])
})

test('package.json declares no runtime dependencies on other AvatarK packages (host-neutral, contracts-only deps)', () => {
  const pkgJson = JSON.parse(readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'))
  assert.deepEqual(pkgJson.dependencies, {})
})
