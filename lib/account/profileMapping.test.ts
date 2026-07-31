import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toProfileResponse, toProfileUpdates, type ProfileRow } from './profileMapping.ts'

const BASE_ROW: ProfileRow = {
  id: 'user-1',
  display_name: 'Ada',
  bio: 'Building things.',
  avatar_url: 'https://example.com/a.png',
  role: 'Engineer',
  organization: 'AvatarK',
  location: 'Remote',
  created_at: '2026-01-01T00:00:00.000Z',
}

test('toProfileResponse reads role/organization/location from the row, not from a hardcoded null', () => {
  const response = toProfileResponse(BASE_ROW, 'ada@example.com')
  assert.equal(response.role, 'Engineer')
  assert.equal(response.organization, 'AvatarK')
  assert.equal(response.location, 'Remote')
  assert.equal(response.displayName, 'Ada')
  assert.equal(response.email, 'ada@example.com')
})

test('toProfileResponse passes through null fields as null, not undefined or a default string', () => {
  const response = toProfileResponse({ ...BASE_ROW, role: null, organization: null, location: null }, 'ada@example.com')
  assert.equal(response.role, null)
  assert.equal(response.organization, null)
  assert.equal(response.location, null)
})

test('toProfileUpdates maps role/organization/location onto the public.profiles column names', () => {
  const updates = toProfileUpdates({ role: 'Director', organization: 'PrometheusK', location: 'Remote' })
  assert.deepEqual(updates, { role: 'Director', organization: 'PrometheusK', location: 'Remote' })
})

test('toProfileUpdates omits fields the caller did not send, rather than nulling them out', () => {
  const updates = toProfileUpdates({ displayName: 'Ada' })
  assert.deepEqual(updates, { display_name: 'Ada' })
  assert.ok(!('role' in updates))
  assert.ok(!('organization' in updates))
  assert.ok(!('location' in updates))
})

test('toProfileUpdates never produces a user_metadata-shaped key -- public.profiles column names only', () => {
  const updates = toProfileUpdates({
    displayName: 'Ada', bio: 'x', avatarUrl: 'y', role: 'z', organization: 'w', location: 'v',
  })
  const keys = Object.keys(updates)
  assert.deepEqual(keys.sort(), ['avatar_url', 'bio', 'display_name', 'location', 'organization', 'role'])
})
