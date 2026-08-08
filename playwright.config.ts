import { defineConfig } from '@playwright/test'

// Runtime Kernel Host Integration (Sprint 4), Phase 13 -- validates the
// four runtime-driven account surfaces (Current Context, Living Worlds,
// Experience, Timeline) render across desktop/tablet/mobile viewports.
// Targets app/dev/account -- the pre-existing, unauthenticated dev
// preview page (extended this sprint with real, runtime-backed
// Current Context/Living Worlds/Experience/Timeline, per the exception
// documented in that file's own header comment) -- since this
// environment has no Supabase project configured at all, so the real,
// authenticated /account page cannot be exercised end-to-end here.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'tablet', use: { viewport: { width: 834, height: 1112 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
})
