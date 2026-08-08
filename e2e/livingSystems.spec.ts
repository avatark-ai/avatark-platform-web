import { test, expect } from '@playwright/test'

// Sprint 7, Living Systems Foundation. Proves the core persistent-world
// behavior end to end: the shared world (season/environment) evolves
// independently of any one visitor's session, while that visitor's own
// meaningful memory survives the evolution untouched. Each test drives
// its own dev_user id (same determinism rationale as
// e2e/livingVrindavan.spec.ts) for VISITOR-scoped state -- but Living
// Systems' shared world state is process-wide, the first state in this
// app that ?dev_user= isolation doesn't reach. Every test resets it to a
// known starting point (Vasanta, tick 0) via the dev-only reset-world
// endpoint before asserting anything about season/environment, and this
// file runs serial (never parallel with itself) so concurrent tests
// never race the one shared world.
//
// Sprint 8 update: the panel this spec exercises now sources from the
// embodiment contract (WorldEmbodimentSnapshot) instead of Living
// Systems' raw WorldSnapshot -- see components/account/
// LivingSystemsSnapshotView.tsx's own header comment. Its heading text
// and environment-summary format changed accordingly (richer: atmosphere/
// water/vegetation semantics instead of raw band names); the assertions
// below were updated to match this intentional, verified change, not
// left to silently break.
test.describe.configure({ mode: 'serial' })

function uniqueDevUser(label: string): string {
  return `pw-systems-${label}-${test.info().project.name}-${Date.now()}`
}

test.beforeEach(async ({ request }) => {
  await request.post('/api/dev/account/living-vrindavan/reset-world')
})

test('a fresh visitor entering Living Vrindavan observes the World Systems panel with a season label and environment summary', async ({ page }) => {
  const devUser = uniqueDevUser('fresh-snapshot')
  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()

  await expect(page.getByRole('heading', { name: 'World Embodiment' })).toBeVisible()
  await expect(page.getByText(/Season: /)).toBeVisible()
  await expect(page.getByText(/Atmosphere: .* · Water: .* · Vegetation: /)).toBeVisible()
  await page.screenshot({ path: `screenshots/${test.info().project.name}-living-systems-fresh.png`, fullPage: true })
})

test('Phase 15: visitor enters (Vasanta), leaves, the test world clock advances to Grishma, visitor returns to the same location with the same visitor continuity and a genuinely changed shared world', async ({ page, request }) => {
  const devUser = uniqueDevUser('leave-advance-return')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await expect(page.getByText('Yamuna', { exact: true })).toBeVisible()

  // Refresh the World Systems panel now that we've moved to Yamuna, and
  // record what season it reports before leaving.
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(page.getByText(/Season: Vasanta$/)).toBeVisible()

  await page.getByRole('button', { name: 'Leave' }).click()

  // Living Systems' own simulation control -- the world advances on its
  // own, independent of this (or any) visitor's action.
  const advanceResponse = await request.post('/api/dev/account/living-vrindavan/advance-clock', { data: { ticks: 4 } })
  expect(advanceResponse.ok()).toBe(true)
  const advanceBody = await advanceResponse.json()
  expect(advanceBody.seasonId).toBe('grishma')

  // Return: resume, and the account card must show progress preserved,
  // not reset.
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Yamuna', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(page.getByText(/Season: Grīṣma$/)).toBeVisible()
  await page.screenshot({ path: `screenshots/${test.info().project.name}-living-systems-grishma-return.png`, fullPage: true })
})

test('Phase 16: two visitors observe the identical shared season/environment, but their own visitor memory (last location) stays independent', async ({ page, request }) => {
  const userA = uniqueDevUser('multi-a')
  const userB = uniqueDevUser('multi-b')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${userA}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${userB}`)
  await page.getByRole('button', { name: 'Enter' }).click()

  const snapshotA = await (await request.get(`/api/dev/account/living-vrindavan/world-snapshot?dev_user=${userA}&locationId=yamuna`)).json()
  const snapshotB = await (await request.get(`/api/dev/account/living-vrindavan/world-snapshot?dev_user=${userB}&locationId=vrindavan-entry`)).json()

  expect(snapshotA.snapshot.season).toEqual(snapshotB.snapshot.season)
  expect(snapshotA.snapshot.ecology).toEqual(snapshotB.snapshot.ecology)
  expect(snapshotA.snapshot.visitorContext.lastLocationId).toBe('yamuna')
  expect(snapshotB.snapshot.visitorContext.lastLocationId).toBe('vrindavan-entry')
})

test('reduced motion: the World Systems panel loads and functions identically with prefers-reduced-motion set', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const devUser = uniqueDevUser('reduced-motion')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByRole('heading', { name: 'World Embodiment' })).toBeVisible()
  await expect(page.getByText(/Season: Vasanta$/)).toBeVisible()
})

test('no horizontal overflow and no null/undefined text on the World Systems panel', async ({ page }) => {
  const devUser = uniqueDevUser('no-overflow')
  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(page.getByRole('heading', { name: 'World Embodiment' })).toBeVisible()

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasOverflow).toBe(false)

  const visibleText = await page.locator('main').innerText()
  expect(visibleText).not.toContain('undefined')
  expect(visibleText).not.toContain('null')
  expect(visibleText).not.toContain('NaN')
})

// Note: the real (non-dev) /api/account/living-vrindavan/world-snapshot
// route is deliberately NOT exercised here, same boundary
// playwright.config.ts's own header comment already documents for every
// other real /api/account/* route -- this environment has no Supabase
// project configured, so createClient() itself 500s before reaching the
// auth check, for every real account route alike (confirmed against the
// pre-existing /api/account/living-worlds route, not something this
// sprint's route introduced). Its auth-gating code is the same pattern
// the existing route already uses.
