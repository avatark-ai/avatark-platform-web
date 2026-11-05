import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EXCLUDED_ROUTE_LIST } from './routeInventory.ts'
import { guardTargets } from './guardAst.ts'

// AVK-PROD-03A (C3, L2): every excluded route carries its own server-side guard, independent of the
// proxy. A layout's notFound() alone does not stop a page's own server code (Next.js renders layouts
// and pages in parallel -- observed in the T3c no-proxy run on /admin/products), so the guard is the
// FIRST statement of every excluded page component and generateMetadata, every excluded Route Handler
// method, and every excluded top-level segment layout. Checked on the TypeScript AST.
const app = join(process.cwd(), 'app')
const pageFile = (r: string) => [join(app, r, 'page.tsx'), join(app, '(echoJourney)', r, 'page.tsx')].find(existsSync)
const routeFile = (r: string) => [join(app, r, 'route.ts')].find(existsSync)
const PAGE_GUARD = 'guardExcludedSegment()'

test('every excluded page guards its component and generateMetadata as the first statement', () => {
  let pages = 0
  let targets = 0
  for (const r of EXCLUDED_ROUTE_LIST) {
    const f = pageFile(r)
    if (!f) continue
    pages++
    const t = guardTargets(readFileSync(f, 'utf8'), f).filter((x) => x.name.startsWith('default') || x.name === 'generateMetadata')
    assert.ok(t.some((x) => x.name.startsWith('default')), `${r}: default export function`)
    for (const x of t) {
      targets++
      assert.equal(x.firstStatement, PAGE_GUARD, `${r}: ${x.name} must start with ${PAGE_GUARD}`)
    }
  }
  assert.equal(pages, 47)
  assert.equal(targets, 49)
})

test('every excluded Route Handler method returns the denial before its own logic', () => {
  let handlers = 0
  for (const r of EXCLUDED_ROUTE_LIST) {
    const f = routeFile(r)
    if (!f) continue
    for (const x of guardTargets(readFileSync(f, 'utf8'), f)) {
      if (x.name.startsWith('default')) continue
      handlers++
      assert.equal(x.firstStatement, 'const blocked = blockExcludedRoute()', `${r} ${x.name}`)
      assert.equal(x.secondStatement, 'if (blocked) return blocked', `${r} ${x.name}`)
    }
  }
  assert.equal(handlers, 15)
})

test('every excluded top-level segment has a guarding server layout', () => {
  const segments = new Set(EXCLUDED_ROUTE_LIST.map((r) => r.split('/')[1]).filter((s) => s !== 'api'))
  assert.equal(segments.size, 21) // 20 layout files: 'my' and 'today' share app/(echoJourney)/layout.tsx
  for (const seg of segments) {
    const layout = ['my', 'today'].includes(seg) ? join(app, '(echoJourney)', 'layout.tsx') : join(app, seg, 'layout.tsx')
    assert.ok(existsSync(layout), `${seg} layout`)
    const src = readFileSync(layout, 'utf8')
    assert.ok(!/^['"]use client['"]/m.test(src), `${seg} layout must be a server component`)
    const t = guardTargets(src, layout).find((x) => x.name.startsWith('default'))
    assert.equal(t?.firstStatement, PAGE_GUARD, `${seg} layout guard first`)
  }
})
