import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { EXPLORE_LABEL, exploreItems, primaryNavItems } from './institutionalNav.ts'

const UNSAFE = /worldk|\/enter|\/worlds\/|^https?:/i
const linksSource = readFileSync(path.join(process.cwd(), 'lib', 'content', 'links.ts'), 'utf-8')

test('ENTER_ECHO_HREF (passed to Explore Echo) is still /start', () => {
  assert.match(linksSource, /export const ENTER_ECHO_HREF = '\/start'/)
})

test('primary nav: owner order and hrefs (route disabled -> legacy anchor)', () => {
  assert.deepEqual(primaryNavItems(false), [
    { label: 'Foundation', href: '/foundation' },
    { label: 'Living Worlds', href: '/#living-worlds' },
    { label: 'Canon', href: '/canon' },
    { label: 'Ecosystem', href: '/ecosystem' },
    { label: 'Founder', href: '/founder' },
  ])
  assert.equal(primaryNavItems(true)[1].href, '/living-worlds')
})

test('Explore menu: three items when the route exists, Living Worlds withheld when not', () => {
  assert.equal(EXPLORE_LABEL, 'Explore')
  assert.deepEqual(exploreItems('/start', true), [
    { label: 'Explore Echo', href: '/start' },
    { label: 'Discover Living Worlds', href: '/living-worlds' },
    { label: 'Explore Ecosystem', href: '/ecosystem' },
  ])
  assert.deepEqual(exploreItems('/start', false), [
    { label: 'Explore Echo', href: '/start' },
    { label: 'Explore Ecosystem', href: '/ecosystem' },
  ])
})

test('no nav or Explore item targets WorldK, /enter or an external host; no Sign In inside', () => {
  for (const enabled of [true, false]) {
    for (const item of [...primaryNavItems(enabled), ...exploreItems('/start', enabled)]) {
      assert.ok(!UNSAFE.test(item.href), item.href)
      assert.notEqual(item.label, 'Sign In')
    }
  }
})
