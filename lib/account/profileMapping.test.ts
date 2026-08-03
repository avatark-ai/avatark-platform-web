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
  location_country_code: 'US',
  location_country_name: 'United States',
  location_state_code: 'CA',
  location_state_name: 'California',
  location_city: 'San Francisco',
  location_timezone: 'America/Los_Angeles',
  created_at: '2026-01-01T00:00:00.000Z',
}

test('toProfileResponse reads role/organization/location from the row, not from a hardcoded null', () => {
  const response = toProfileResponse(BASE_ROW, 'ada@example.com')
  assert.equal(response.role, 'Engineer')
  assert.equal(response.organization, 'AvatarK')
  assert.deepEqual(response.location, {
    countryCode: 'US', countryName: 'United States', stateCode: 'CA', stateName: 'California',
    city: 'San Francisco', timezone: 'America/Los_Angeles',
  })
  assert.equal(response.displayName, 'Ada')
  assert.equal(response.email, 'ada@example.com')
})

test('toProfileResponse passes through null fields as null, not undefined or a default string', () => {
  const response = toProfileResponse({ ...BASE_ROW, role: null, organization: null }, 'ada@example.com')
  assert.equal(response.role, null)
  assert.equal(response.organization, null)
})

test('toProfileResponse reports location as null when every location column is null (never a fabricated empty object)', () => {
  const response = toProfileResponse({
    ...BASE_ROW,
    location_country_code: null, location_country_name: null, location_state_code: null,
    location_state_name: null, location_city: null, location_timezone: null,
  }, 'ada@example.com')
  assert.equal(response.location, null)
})

test('toProfileUpdates maps role/organization onto the public.profiles column names', () => {
  const updates = toProfileUpdates({ role: 'Director', organization: 'PrometheusK' })
  assert.deepEqual(updates, { role: 'Director', organization: 'PrometheusK' })
})

test('toProfileUpdates maps a location object onto the six normalized columns', () => {
  const updates = toProfileUpdates({
    location: { countryCode: 'IN', countryName: 'India', stateCode: 'MH', stateName: 'Maharashtra', city: 'Mumbai', timezone: 'Asia/Kolkata' },
  })
  assert.deepEqual(updates, {
    location_country_code: 'IN', location_country_name: 'India', location_state_code: 'MH',
    location_state_name: 'Maharashtra', location_city: 'Mumbai', location_timezone: 'Asia/Kolkata',
  })
})

test('toProfileUpdates clears every location column when location is explicitly null', () => {
  const updates = toProfileUpdates({ location: null })
  assert.deepEqual(updates, {
    location_country_code: null, location_country_name: null, location_state_code: null,
    location_state_name: null, location_city: null, location_timezone: null,
  })
})

test('toProfileUpdates omits fields the caller did not send, rather than nulling them out', () => {
  const updates = toProfileUpdates({ displayName: 'Ada' })
  assert.deepEqual(updates, { display_name: 'Ada' })
  assert.ok(!('role' in updates))
  assert.ok(!('organization' in updates))
  assert.ok(!('location_country_code' in updates))
})

test('toProfileUpdates never produces a user_metadata-shaped key -- public.profiles column names only', () => {
  const updates = toProfileUpdates({
    displayName: 'Ada', bio: 'x', avatarUrl: 'y', role: 'z', organization: 'w',
    location: { countryCode: 'US', countryName: 'United States', stateCode: null, stateName: null, city: null, timezone: null },
  })
  const keys = Object.keys(updates)
  assert.deepEqual(keys.sort(), [
    'avatar_url', 'bio', 'display_name', 'location_city', 'location_country_code', 'location_country_name',
    'location_state_code', 'location_state_name', 'location_timezone', 'organization', 'role',
  ])
})
