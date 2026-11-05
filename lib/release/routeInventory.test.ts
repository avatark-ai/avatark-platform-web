import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { readdirSync, statSync } from 'node:fs'
import { ALLOW_ROUTES, EXCLUDED_ROUTE_LIST, EXCLUDE_ROUTES, FRAMEWORK_ROUTES, classifyRoute } from './routeInventory.ts'
import { INSTITUTIONAL_PAGES } from './scope.ts'
import { checkInventory, routeFromFile } from '../../scripts/check-route-inventory.ts'

// AVK-PROD-03A (C7): T2 source-level inventory -- 14 allow + 59 exclude + framework, nothing unclassified.
const appDir = join(process.cwd(), 'app')
function routes(): string[] {
  const out: string[] = []
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) walk(p)
      else if (/^(page\.tsx|route\.ts|robots\.ts|favicon\.ico)$/.test(n)) out.push(routeFromFile(appDir, p))
    }
  }
  walk(appDir)
  return [...new Set(out)].sort()
}

test('T2: class sizes are frozen at 14 allow / 59 exclude / 4 framework', () => {
  assert.equal(ALLOW_ROUTES.length, 14)
  assert.equal(EXCLUDED_ROUTE_LIST.length, 59)
  assert.equal(new Set(EXCLUDED_ROUTE_LIST).size, 59)
  assert.equal(FRAMEWORK_ROUTES.length, 4)
  assert.deepEqual(Object.fromEntries(Object.entries(EXCLUDE_ROUTES).map(([k, v]) => [k, v.length])), {
    auth: 2, account: 4, admin: 17, identity: 2, onboarding: 1, developer: 2, integration: 1, echoApplication: 23, community: 6, roadmap: 1,
  })
})

test('T2: every source route is classified and every classified route exists', () => {
  const r = routes()
  assert.equal(r.length, 75)
  assert.deepEqual(checkInventory(r), [])
  assert.deepEqual(checkInventory([...r, '/new-unreviewed-route']), ['UNCLASSIFIED route: /new-unreviewed-route'])
})

test('T2: allow class equals the 13 fixed pages plus the plate pattern', () => {
  assert.deepEqual([...ALLOW_ROUTES].filter((r) => !r.includes('[')).sort(), [...INSTITUTIONAL_PAGES].sort())
  assert.equal(classifyRoute('/roadmap'), 'EXCLUDE')
  assert.equal(classifyRoute('/robots.txt'), 'FRAMEWORK')
  assert.equal(classifyRoute('/privacy'), null, 'legal pages are not classified until approved (03C)')
})
