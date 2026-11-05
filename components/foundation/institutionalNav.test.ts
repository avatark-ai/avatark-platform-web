import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { EXPLORE_LABEL, exploreItems, primaryNavItems } from './institutionalNav.ts'

const UNSAFE = /worldk|\/enter|\/worlds\/|^https?:/i
const linksSource = readFileSync(path.join(process.cwd(), 'lib', 'content', 'links.ts'), 'utf-8')

test('ENTER_ECHO_HREF is unchanged (/start); AVK-PROD-03A Scope I passes DISCOVER_ECHO_HREF (/ecosystem) to Discover Echo', () => {
  assert.match(linksSource, /export const ENTER_ECHO_HREF = '\/start'/)
  assert.match(linksSource, /export const DISCOVER_ECHO_HREF = '\/ecosystem'/)
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
  assert.deepEqual(exploreItems('/ecosystem', true), [
    { label: 'Discover Echo', href: '/ecosystem' },
    { label: 'Discover Living Worlds', href: '/living-worlds' },
    { label: 'Explore Ecosystem', href: '/ecosystem' },
  ])
  assert.deepEqual(exploreItems('/ecosystem', false), [
    { label: 'Discover Echo', href: '/ecosystem' },
    { label: 'Explore Ecosystem', href: '/ecosystem' },
  ])
})

test('no nav or Explore item targets WorldK, /enter or an external host; no Sign In inside', () => {
  for (const enabled of [true, false]) {
    for (const item of [...primaryNavItems(enabled), ...exploreItems('/ecosystem', enabled)]) {
      assert.ok(!UNSAFE.test(item.href), item.href)
      assert.notEqual(item.label, 'Sign In')
    }
  }
})
