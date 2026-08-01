// Run with: node --experimental-strip-types --test packages/account/src/publicApi.test.ts
//
// Only imports the package's JSX-free contract/testing layers directly --
// this repo's node:test convention never executes .tsx (JSX) files (Node's
// --experimental-strip-types strips types, not JSX; confirmed no other
// package in this repo, incl. @avatark/account-ui, tests its .tsx files
// this way). index.ts's re-export surface is instead checked statically
// below, without importing it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as tabs from './contracts/tabs.ts'
import { createMockAdapters } from './testing/mockAdapters.ts'
import { DATA_EXPORT_SCOPES, ACCOUNT_CLOSURE_SCOPES } from './contracts/adapters.ts'

const here = path.dirname(fileURLToPath(import.meta.url))

test('ACCOUNT_TAB_KEYS lists exactly the 10 core sections (no product-specific tabs baked in)', () => {
  assert.deepEqual(tabs.ACCOUNT_TAB_KEYS, [
    'profile', 'products', 'access', 'membership', 'organizations',
    'preferences', 'notifications', 'privacy', 'signin', 'data',
  ])
})

test('ACCOUNT_TAB_LABELS maps "signin" to the canonical "Security" label', () => {
  const signin = tabs.ACCOUNT_TAB_LABELS.find((t) => t.key === 'signin')
  assert.equal(signin?.label, 'Security')
})

test('extensionTabKey/isExtensionTabKey round-trip', () => {
  const key = tabs.extensionTabKey('living-echo')
  assert.equal(key, 'ext:living-echo')
  assert.equal(tabs.isExtensionTabKey(key), true)
  assert.equal(tabs.isExtensionTabKey('profile'), false)
})

test('createMockAdapters produces a complete, well-formed AccountAdapters object', async () => {
  const adapters = createMockAdapters()
  assert.ok(adapters.support.supportEmail)
  assert.ok(adapters.auth)
  assert.ok(adapters.profile)
  assert.ok(adapters.productAccess)
  assert.ok(adapters.membership)
  assert.ok(adapters.preferences)
  assert.ok(adapters.export)
  const profile = await adapters.profile.get()
  assert.ok(profile.data)
  assert.equal(profile.error, undefined)
})

test('createMockAdapters(omitOptional) omits every optional adapter, package must tolerate absence', () => {
  const adapters = createMockAdapters({ omitOptional: true })
  assert.equal(adapters.privacy, undefined)
  assert.equal(adapters.activity, undefined)
  assert.equal(adapters.echoes, undefined)
  assert.equal(adapters.extensions, undefined)
  assert.equal(adapters.links, undefined)
  assert.equal(adapters.gettingStarted, undefined)
})

test('extension slot mock adapter returns a well-formed ExtensionSlotContent', async () => {
  const adapters = createMockAdapters()
  assert.ok(adapters.extensions && adapters.extensions.length > 0)
  const res = await adapters.extensions![0].get()
  assert.ok(Array.isArray(res.data?.items))
})

test('membership adapter getSummary/getRoles accept a generic StatEntry[] (no hardcoded product metric names)', () => {
  const adapters = createMockAdapters()
  const stats = [{ key: 'anything', label: 'Anything', value: 3 }]
  const summary = adapters.membership.getSummary(stats)
  const roles = adapters.membership.getRoles(stats)
  assert.ok(summary.planName)
  assert.ok(Array.isArray(roles))
})

test('DataExportScope and AccountClosureScope are distinct, non-overlapping vocabularies (Part 13)', () => {
  assert.deepEqual(DATA_EXPORT_SCOPES, ['identity_profile', 'product_activity', 'reflection_or_echo', 'authored_content', 'connected_source'])
  assert.deepEqual(ACCOUNT_CLOSURE_SCOPES, ['delete_one_product_data', 'leave_organization', 'close_avatark_identity'])
  const overlap = DATA_EXPORT_SCOPES.filter((s) => (ACCOUNT_CLOSURE_SCOPES as string[]).includes(s))
  assert.deepEqual(overlap, [])
})

test('index.ts statically re-exports the full documented public API surface', () => {
  const indexSrc = readFileSync(path.join(here, 'index.ts'), 'utf8')
  const expectedExports = [
    'AvatarKAccount', 'AccountTabs', 'ACCOUNT_TAB_KEYS', 'ACCOUNT_TAB_LABELS',
    'extensionTabKey', 'isExtensionTabKey', 'ExtensionTab', 'ActivityTab', 'EchoesTab',
    'AccountAdaptersProvider', 'useAccountAdapters', 'createMockAdapters',
    'AccountTabKey', 'CoreTabKey', 'ExtensionTabKey', 'AvatarKAccountProps', 'AccountPrincipal',
    'AccountAdapters', 'ExtensionAdapter', 'ExtensionSlotContent', 'StatEntry',
    'DataExportScope', 'AccountClosureScope', 'DATA_EXPORT_SCOPES', 'ACCOUNT_CLOSURE_SCOPES',
  ]
  for (const name of expectedExports) {
    assert.ok(indexSrc.includes(name), `expected "${name}" to be re-exported from index.ts`)
  }
})
