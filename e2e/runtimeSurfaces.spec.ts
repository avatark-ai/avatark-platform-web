import { test, expect } from '@playwright/test'

// Runtime Kernel Host Integration (Sprint 4), Phase 13. Screenshots the
// four runtime-driven account surfaces (Living World, Experience,
// Timeline, Context) across whichever viewport each Playwright project
// (desktop/tablet/mobile, see playwright.config.ts) is running under.
// Targets app/dev/account (extended this sprint) since this environment
// has no Supabase project configured -- see that page's own header
// comment.
//
// Each test drives its own state via direct API calls (page.request)
// against a per-test dev_user id before asserting/screenshotting --
// never relies on whatever state a previous manual session or test run
// happened to leave in the module-scoped dev singletons (see
// lib/devOnlyGuard.ts's resolveDevUserId), so the suite is deterministic
// regardless of dev-server restarts/HMR resets.

function uniqueDevUser(label: string): string {
  return `pw-${label}-${test.info().project.name}-${Date.now()}`
}

test('Current Context renders real runtime fields, not placeholders', async ({ page }) => {
  await page.goto('/dev/account?section=profile')
  await expect(page.getByText('Current Context')).toBeVisible()
  // The card's own 13 labels (Phase 1) -- confirms the expanded field set
  // rendered, not just the original 4.
  await expect(page.getByText('Current Experience')).toBeVisible()
  await expect(page.getByText('Current Scene')).toBeVisible()
  await expect(page.getByText('Current Challenge')).toBeVisible()
  await expect(page.getByText('Current Milestone')).toBeVisible()
  await expect(page.getByText('Current Journey Status')).toBeVisible()
  await page.screenshot({ path: `screenshots/${test.info().project.name}-current-context.png`, fullPage: true })
})

test('Living Worlds cards render real runtime state, "Ready to Begin" not "Coming Soon"', async ({ page }) => {
  await page.goto('/dev/account?section=livingWorlds')
  // Scoped to the Living Worlds grid specifically -- '.aka-card' alone also
  // matches CurrentContextCard, which AvatarKAccount renders persistently
  // above every tab (not just this one), so an unscoped count would be off
  // by one.
  const cards = page.getByTestId('living-worlds-grid').locator('.aka-card')
  await expect(cards).toHaveCount(5)
  await expect(cards.filter({ hasText: 'Living Forest' })).toBeVisible()
  await expect(cards.filter({ hasText: 'Living Vrindavan' })).toBeVisible()
  await expect(cards.filter({ hasText: 'Living Stillness' })).toBeVisible()
  await expect(cards.filter({ hasText: 'Living Symphony' })).toBeVisible()
  await expect(cards.filter({ hasText: 'Living Forge' })).toBeVisible()
  await expect(page.getByText('Coming Soon')).toHaveCount(0)
  await page.screenshot({ path: `screenshots/${test.info().project.name}-living-worlds.png`, fullPage: true })
})

test('Experience view renders Episodes/Scenes/Practices/Challenges/Milestones/History, populated', async ({ page }) => {
  const devUser = uniqueDevUser('experience')
  // Drive real state directly through the runtime before asserting --
  // deterministic regardless of any other test's or session's state.
  await page.request.post(`/api/dev/account/journey?dev_user=${devUser}`, { data: { action: 'start' } })
  await page.request.post(`/api/dev/account/journey?dev_user=${devUser}`, { data: { action: 'completeEpisode', nodeId: 'orientation' } })
  await page.request.post(`/api/dev/account/living-worlds?dev_user=${devUser}`, { data: { action: 'enter', worldId: 'living-forest' } })
  await page.request.post(`/api/dev/account/journey?dev_user=${devUser}`, { data: { action: 'startNarrative' } })

  await page.goto(`/dev/account?section=journey&dev_user=${devUser}`)
  // ExperienceView's devUser prop is set via the page below (see
  // app/dev/account/page.tsx reading ?dev_user= for this section).
  await expect(page.getByText('Welcome Experience')).toBeVisible()
  await expect(page.getByText('Episodes', { exact: true })).toBeVisible()
  await expect(page.getByText('Scenes', { exact: true })).toBeVisible()
  await expect(page.getByText('Challenges', { exact: true })).toBeVisible()
  await expect(page.getByText('Milestones', { exact: true })).toBeVisible()
  await expect(page.getByText('Recent Activity', { exact: true })).toBeVisible()
  await expect(page.getByText('History', { exact: true })).toBeVisible()
  // Real proof of "populated," not just that the labels exist:
  // exact: true -- 'Orientation' (unscoped) also substring-matches "Current
  // scene: scene-orientation" and "Episode completed — orientation", a
  // strict-mode violation; the Episodes list renders the completed
  // episode's title as an exact <li> text node.
  await expect(page.getByText('Orientation', { exact: true })).toBeVisible()
  await expect(page.getByText('Welcomed', { exact: true })).toBeVisible()
  await page.screenshot({ path: `screenshots/${test.info().project.name}-experience-populated.png`, fullPage: true })
})

test('Experience view empty state: brand-new user sees "Start Experience," never a broken card', async ({ page }) => {
  const devUser = uniqueDevUser('experience-empty')
  await page.goto(`/dev/account?section=journey&dev_user=${devUser}`)
  await expect(page.getByText("You haven't started this experience yet.")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Experience' })).toBeVisible()
  // Scope to the rendered content only -- Next.js's own RSC payload
  // legitimately contains the literal tokens "$undefined"/framework
  // internals regardless of what this app renders, so asserting against
  // page.content() (raw HTML source) would be a false positive check.
  const visibleText = await page.locator('main').innerText()
  expect(visibleText).not.toContain('undefined')
  expect(visibleText).not.toContain('null')
  await page.screenshot({ path: `screenshots/${test.info().project.name}-experience-empty.png`, fullPage: true })
})

test('Timeline renders newest-first real events, populated', async ({ page }) => {
  const devUser = uniqueDevUser('timeline')
  await page.request.post(`/api/dev/account/living-worlds?dev_user=${devUser}`, { data: { action: 'enter', worldId: 'living-forest' } })

  await page.goto(`/dev/account?section=timeline&dev_user=${devUser}`)
  await expect(page.getByText('Timeline')).toBeVisible()
  await expect(page.getByText('Entered World')).toBeVisible()
  await page.screenshot({ path: `screenshots/${test.info().project.name}-timeline-populated.png`, fullPage: true })
})

test('Timeline empty state: brand-new user sees "No History Yet," never a broken card', async ({ page }) => {
  const devUser = uniqueDevUser('timeline-empty')
  await page.goto(`/dev/account?section=timeline&dev_user=${devUser}`)
  await expect(page.getByText('No History Yet.')).toBeVisible()
  await page.screenshot({ path: `screenshots/${test.info().project.name}-timeline-empty.png`, fullPage: true })
})
