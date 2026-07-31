import type { AppearanceModeDescriptor, ProductAccent } from './types.ts'

export const APPEARANCE_MODE_REGISTRY: AppearanceModeDescriptor[] = [
  { mode: 'system', state: 'complete', label: 'Match system' },
  { mode: 'dark', state: 'complete', label: 'Dark' },
  // Light and high-contrast are not yet functionally complete across the
  // canonical account/auth UI -- do not expose them in consumer-facing mode
  // pickers until promoted to `complete`.
  { mode: 'light', state: 'internal', label: 'Light (internal)' },
  { mode: 'high-contrast', state: 'planned', label: 'High contrast (planned)' },
]

export const DEFAULT_APPEARANCE_MODE = 'system'

// One accent token per ecosystem product, per mission Part 7. Purely a
// design token name/description -- actual CSS custom-property values are a
// product-app concern, not this package's.
export const PRODUCT_ACCENTS: ProductAccent[] = [
  { productId: 'avatark', accentName: 'gold', description: 'AvatarK canonical gold accent.' },
  { productId: 'prometheusk', accentName: 'amber-fire', description: 'PrometheusK amber/fire accent.' },
  { productId: 'gamek', accentName: 'gamek-electric-gold', description: 'GameK gold/electric accent.' },
  { productId: 'arenak', accentName: 'recognition', description: 'ArenaK recognition accent.' },
  { productId: 'streamk', accentName: 'media', description: 'StreamK media accent.' },
  { productId: 'cinemak', accentName: 'cinematic', description: 'CinemaK cinematic accent.' },
  { productId: 'studiok', accentName: 'creation', description: 'StudioK creation accent.' },
  { productId: 'atlas', accentName: 'knowledge-research', description: 'Atlas knowledge/research accent.' },
  { productId: 'setpointk', accentName: 'physiological-intelligence', description: 'SetpointK physiological/intelligence accent.' },
]
