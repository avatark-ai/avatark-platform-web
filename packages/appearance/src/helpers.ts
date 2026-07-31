import { APPEARANCE_MODE_REGISTRY, PRODUCT_ACCENTS, DEFAULT_APPEARANCE_MODE } from './registry.ts'
import type { AppearanceMode, AppearanceModeDescriptor, ProductAccent } from './types.ts'

// The only modes safe to render in a general-consumer appearance picker.
export function getConsumerFacingModes(): AppearanceModeDescriptor[] {
  return APPEARANCE_MODE_REGISTRY.filter((entry) => entry.state === 'complete')
}

export function isModeConsumerFacing(mode: AppearanceMode): boolean {
  return APPEARANCE_MODE_REGISTRY.some((entry) => entry.mode === mode && entry.state === 'complete')
}

// A user's stored mode preference may reference a mode that was later
// demoted (or never was consumer-facing, e.g. a stale DB value) -- resolve
// safely to the default rather than rendering an internal/planned mode.
export function resolveConsumerMode(storedMode: string | null | undefined): AppearanceMode {
  if (storedMode && isModeConsumerFacing(storedMode as AppearanceMode)) return storedMode as AppearanceMode
  return DEFAULT_APPEARANCE_MODE
}

export function getProductAccent(productId: string): ProductAccent | undefined {
  return PRODUCT_ACCENTS.find((accent) => accent.productId === productId)
}

// Script-snippet pattern for avoiding a signed-in/signed-out or
// light/dark hydration flash: an inline <script> (not a React effect) sets
// the resolved class on <html> before first paint, reading only
// document.cookie/localStorage -- no network call, no React involved.
// Wiring this into app/ layout is a later migration step (Part 16), not
// done by this package.
export const HYDRATION_SAFE_SCRIPT_SNIPPET = `
(function () {
  try {
    var stored = localStorage.getItem('avatark-appearance-mode');
    var mode = stored === 'dark' || stored === 'system' || stored === null ? stored : 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = mode === 'dark' || (mode !== 'light' && prefersDark) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-appearance', resolved);
  } catch (e) {}
})();
`.trim()
