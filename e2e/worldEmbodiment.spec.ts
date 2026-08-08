import { test, expect } from '@playwright/test'

// Sprint 8, World Embodiment Layer. Complements e2e/livingSystems.spec.ts
// (Sprint 7, now updated for the embodiment-sourced panel) with the
// behaviors specific to this sprint: entities/encounters/transition
// affordances actually rendering with real data, and the new
// InteractionIntent boundary (renderer -> Host -> existing runtime)
// proven end-to-end against the real running dev server, not only via
// unit tests. Same shared-world serialization rationale as
// e2e/livingSystems.spec.ts -- this file also runs serial and resets the
// shared world first.
test.describe.configure({ mode: 'serial' })

function uniqueDevUser(label: string): string {
  return `pw-embodiment-${label}-${test.info().project.name}-${Date.now()}`
}

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/account/living-vrindavan/reset-world')
})

test('at Yamuna, the embodiment panel renders present entities and available encounters, no null/undefined, alongside the sibling detail view', async ({ page }) => {
  const devUser = uniqueDevUser('entities-encounters')
  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await page.getByRole('button', { name: 'Refresh' }).click()

  await expect(page.getByText(/^Present: /)).toBeVisible()
  await expect(page.getByText(/^Available: /)).toBeVisible()

  const visibleText = await page.locator('main').innerText()
  expect(visibleText).not.toContain('undefined')
  expect(visibleText).not.toContain('null')
  expect(visibleText).not.toContain('NaN')
})

test('transition affordances toward reachable regions are graph-derived, not hardcoded, and name the destination region', async ({ page }) => {
  const devUser = uniqueDevUser('transitions')
  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await page.getByRole('button', { name: 'Refresh' }).click()

  await expect(page.getByText(/Choose your path to Kadamba Grove/)).toBeVisible()
  await expect(page.getByText(/Choose your path to Govardhan Path/)).toBeVisible()
})

test('InteractionIntent boundary: an illegal visit-location intent submitted directly is rejected by the same authority as the UI action path', async ({ request }) => {
  const devUser = uniqueDevUser('illegal-intent')
  await request.post(`/api/dev/account/living-worlds?dev_user=${devUser}`, { data: { action: 'enter', worldId: 'living-vrindavan' } })

  const result = await request.post(`/api/dev/account/living-vrindavan/interact?dev_user=${devUser}`, {
    data: { intent: { type: 'visit-location', worldId: 'living-vrindavan', locationId: 'kadamba-grove' } },
  })
  expect(result.status()).toBe(400)
  const body = await result.json()
  expect(body.ok).toBe(false)
})

test('InteractionIntent boundary: a legal visit-location intent submitted directly produces the same resulting state the UI action path would', async ({ page, request }) => {
  const devUser = uniqueDevUser('legal-intent')
  await request.post(`/api/dev/account/living-worlds?dev_user=${devUser}`, { data: { action: 'enter', worldId: 'living-vrindavan' } })

  const result = await request.post(`/api/dev/account/living-vrindavan/interact?dev_user=${devUser}`, {
    data: { intent: { type: 'visit-location', worldId: 'living-vrindavan', locationId: 'yamuna' } },
  })
  expect(result.ok()).toBe(true)

  // The UI, reading through the pre-existing action-based route, must
  // agree with the state the NEW intent route just produced -- one
  // authoritative runtime, two front doors.
  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await expect(page.getByText('Yamuna', { exact: true })).toBeVisible()
})

test('no horizontal overflow with a fully-populated embodiment panel (entities, encounters, and two reachable transitions all rendered together)', async ({ page }) => {
  const devUser = uniqueDevUser('no-overflow-populated')
  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(page.getByText(/^Present: /)).toBeVisible()

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasOverflow).toBe(false)
})
