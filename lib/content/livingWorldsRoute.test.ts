import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import {
  LIVING_WORLDS_HREF,
  LIVING_WORLDS_LEGACY_ANCHOR,
  LIVING_WORLDS_ROUTE_ENABLED,
  livingWorldsNavHref,
} from './livingWorldsRoute.ts'

const routeFile = path.join(process.cwd(), 'app', 'living-worlds', 'page.tsx')

test('route-enable constant agrees with the route file (fail-closed)', () => {
  assert.equal(LIVING_WORLDS_ROUTE_ENABLED, existsSync(routeFile))
})

test('nav href: route when enabled, legacy homepage anchor when not', () => {
  assert.equal(livingWorldsNavHref(true), '/living-worlds')
  assert.equal(livingWorldsNavHref(false), '/#living-worlds')
  assert.equal(LIVING_WORLDS_HREF, '/living-worlds')
  assert.equal(LIVING_WORLDS_LEGACY_ANCHOR, '/#living-worlds')
  for (const href of [LIVING_WORLDS_HREF, LIVING_WORLDS_LEGACY_ANCHOR]) {
    assert.ok(!/worldk|\/enter|^https?:/i.test(href), href)
  }
})
