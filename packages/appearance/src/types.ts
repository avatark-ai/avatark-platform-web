// Appearance MODE is a user preference (system/dark/light/high-contrast).
// Product ACCENT is controlled by the mounted product (gold, amber, etc).
// These are deliberately separate axes -- a mode resolver never takes a
// product id, and an accent lookup never takes a user's mode. Mixing them
// into one "theme" concept is exactly what this contract prevents.
export type AppearanceMode = 'system' | 'dark' | 'light' | 'high-contrast'

// Whether a mode is safe to offer to general consumers today.
// `complete`: fully implemented, safe to expose.
// `internal`: exists for internal/dev use, not consumer-ready.
// `planned`: not yet implemented at all.
export type AppearanceModeState = 'complete' | 'internal' | 'planned'

export interface AppearanceModeDescriptor {
  mode: AppearanceMode
  state: AppearanceModeState
  label: string
}

export interface ProductAccent {
  productId: string
  accentName: string
  description: string
}

export interface AppearancePreference {
  mode: AppearanceMode
  reducedMotion: boolean
}
