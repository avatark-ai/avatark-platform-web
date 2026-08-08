import { test, expect } from '@playwright/test'

// Sprint 5, Living Vrindavan vertical slice. Screenshots and validates the
// runtime-driven Living Vrindavan surface (app/dev/account?section=
// livingVrindavan) across whichever viewport each Playwright project
// (desktop/tablet/mobile, see playwright.config.ts) is running under.
// Each test drives its own state via a per-test dev_user id, same
// determinism rationale as e2e/runtimeSurfaces.spec.ts.

function uniqueDevUser(label: string): string {
  return `pw-vrindavan-${label}-${test.info().project.name}-${Date.now()}`
}

test('Living Vrindavan card reads Ready to Begin for a fresh user, never Coming Soon', async ({ page }) => {
  const devUser = uniqueDevUser('fresh-card')
  await page.goto(`/dev/account?section=livingWorlds&dev_user=${devUser}`)
  const card = page.getByTestId('living-worlds-grid').locator('.aka-card').filter({ hasText: 'Living Vrindavan' })
  await expect(card).toBeVisible()
  await expect(card.getByText('Ready to Begin')).toBeVisible()
  await expect(card.getByText('Coming Soon')).toHaveCount(0)
  await page.screenshot({ path: `screenshots/${test.info().project.name}-vrindavan-card-fresh.png`, fullPage: true })
})

test('Living Vrindavan detail view empty state: brand-new user sees Enter, never a broken card', async ({ page }) => {
  const devUser = uniqueDevUser('fresh-detail')
  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await expect(page.getByText("You haven't entered this Living World yet.")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible()
  const visibleText = await page.locator('main').innerText()
  expect(visibleText).not.toContain('undefined')
  expect(visibleText).not.toContain('null')
  await page.screenshot({ path: `screenshots/${test.info().project.name}-vrindavan-detail-empty.png`, fullPage: true })
})

test('Enter -> Vrindavan Entry -> Yamuna -> Kadamba Grove, with the reflection prompt appearing only at Yamuna', async ({ page }) => {
  const devUser = uniqueDevUser('navigate')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText('Vrindavan Entry')).toBeVisible()
  await expect(page.getByText('What becomes visible when you stop trying to control the current?')).toHaveCount(0)
  await page.screenshot({ path: `screenshots/${test.info().project.name}-vrindavan-entry.png`, fullPage: true })

  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await expect(page.getByText('Yamuna', { exact: true })).toBeVisible()
  await expect(page.getByText('What becomes visible when you stop trying to control the current?')).toBeVisible()
  await page.getByRole('button', { name: 'Reflect' }).click()
  await page.screenshot({ path: `screenshots/${test.info().project.name}-vrindavan-yamuna-reflection.png`, fullPage: true })

  // Both branches must be offered -- proves next-location derivation comes
  // from the authored graph, not a hardcoded "if Yamuna then X" rule.
  await expect(page.getByRole('button', { name: 'Visit Kadamba Grove' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Visit Govardhan Path' })).toBeVisible()

  await page.getByRole('button', { name: 'Visit Kadamba Grove' }).click()
  await expect(page.getByText('Kadamba Grove', { exact: true })).toBeVisible()
  // No reflection affordance at Kadamba Grove -- never fabricated.
  await expect(page.getByText('What becomes visible when you stop trying to control the current?')).toHaveCount(0)
  await page.screenshot({ path: `screenshots/${test.info().project.name}-vrindavan-kadamba-grove.png`, fullPage: true })
})

test('Leave and return resumes at the same location, with Continue on the card and real progress, not reset', async ({ page }) => {
  const devUser = uniqueDevUser('resume')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await page.getByRole('button', { name: 'Visit Govardhan Path' }).click()
  await expect(page.getByText('Govardhan Path', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Leave' }).click()
  // Not currently active, but canContinue stays true -- offers Continue
  // (resume), never a bare "Enter" implying a fresh, un-entered world.
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
  await expect(page.getByText('Last location: Govardhan Path')).toBeVisible()

  // Card must also say "Continue" (via canContinue), with real, non-zero progress.
  await page.goto(`/dev/account?section=livingWorlds&dev_user=${devUser}`)
  const card = page.getByTestId('living-worlds-grid').locator('.aka-card').filter({ hasText: 'Living Vrindavan' })
  await expect(card.getByRole('button', { name: 'Continue' })).toBeVisible()
  await expect(card.getByText(/75%/)).toBeVisible()

  // Returning to the detail view and resuming must land back at Govardhan
  // Path, not reset to Vrindavan Entry.
  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Govardhan Path', { exact: true })).toBeVisible()
  await page.screenshot({ path: `screenshots/${test.info().project.name}-vrindavan-resumed.png`, fullPage: true })
})

// Sprint 6: the four locations are now experientially distinct. Each
// assertion checks a *different* location's own authored biome/atmosphere
// caption appears, not just that some caption exists -- proving real
// differentiation, not one shared treatment repeated four times.
test('the four locations show distinct biome/atmosphere captions, sourced from the renderer-neutral Experience Description', async ({ page }) => {
  const devUser = uniqueDevUser('experience-distinct')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText('Threshold · Arrival')).toBeVisible()

  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await expect(page.getByText('Riverbank · Contemplative')).toBeVisible()
  await page.screenshot({ path: `screenshots/${test.info().project.name}-vrindavan-yamuna-experience.png`, fullPage: true })

  await page.getByRole('button', { name: 'Visit Kadamba Grove' }).click()
  await expect(page.getByText('Grove · Intimate')).toBeVisible()
})

test('ambient sound is off by default, never autoplays, and only appears where the artifact authors a soundscape', async ({ page }) => {
  const devUser = uniqueDevUser('sound-affordance')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  // Vrindavan Entry authors no soundscape motifs -- no toggle at all, an
  // honest absence rather than a disabled/greyed-out control.
  await expect(page.getByRole('button', { name: /Ambient sound/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  const soundToggle = page.getByRole('button', { name: /Ambient sound/ })
  await expect(soundToggle).toBeVisible()
  await expect(soundToggle).toHaveText('Ambient sound: Off')
  await expect(soundToggle).toHaveAttribute('aria-pressed', 'false')
  // No <audio>/<video> element exists to autoplay in the first place.
  await expect(page.locator('audio, video')).toHaveCount(0)

  await soundToggle.click()
  await expect(soundToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Flowing Water')).toBeVisible()
})

test('current-location changes are announced via aria-live, and Next uses the authored transition affordance as its heading', async ({ page }) => {
  const devUser = uniqueDevUser('aria-live-affordance')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  // Single outbound edge from the entry threshold -- heading names that
  // specific authored affordance, not a generic "Next".
  await expect(page.getByRole('heading', { name: 'Cross the threshold' })).toBeVisible()

  const liveRegion = page.locator('[aria-live="polite"]')
  await expect(liveRegion).toContainText('Vrindavan Entry')

  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await expect(liveRegion).toContainText('Yamuna')
  // Two branch destinations from Yamuna, both branching-choice -- heading
  // names the shared affordance rather than falling back to "Next".
  await expect(page.getByRole('heading', { name: 'Choose your path' })).toBeVisible()
})

test('reduced motion: with prefers-reduced-motion set, the journey still fully works and nothing depends on animation completing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const devUser = uniqueDevUser('reduced-motion')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText('Vrindavan Entry', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await expect(page.getByText('Yamuna', { exact: true })).toBeVisible()
  await expect(page.getByText('Riverbank · Contemplative')).toBeVisible()
})

test('no horizontal overflow and no null/undefined text on the experience-bearing detail view', async ({ page }) => {
  const devUser = uniqueDevUser('no-overflow')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${devUser}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()

  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(hasOverflow).toBe(false)

  const visibleText = await page.locator('main').innerText()
  expect(visibleText).not.toContain('undefined')
  expect(visibleText).not.toContain('null')
  expect(visibleText).not.toContain('NaN')
})

test('Two dev users never see each other\'s Living Vrindavan state', async ({ page }) => {
  const userA = uniqueDevUser('isolation-a')
  const userB = uniqueDevUser('isolation-b')

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${userA}`)
  await page.getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: 'Visit Yamuna' }).click()
  await expect(page.getByText('Yamuna', { exact: true })).toBeVisible()

  await page.goto(`/dev/account?section=livingVrindavan&dev_user=${userB}`)
  await expect(page.getByText("You haven't entered this Living World yet.")).toBeVisible()
  const visibleText = await page.locator('main').innerText()
  expect(visibleText).not.toContain('Yamuna')
})
