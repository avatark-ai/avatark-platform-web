// AvatarK Platform's own product registry -- deliberately NOT copied
// from PrometheusK's productCatalog.ts (that's PrometheusK-specific
// config). Real, honest data only: PrometheusK is the one genuinely
// live product with a real URL; everything else is either coming_soon
// or omitted entirely rather than guessed at.
export interface PlatformProduct {
  id: string
  name: string
  purpose: string
  url: string | null
  availability: 'live' | 'coming_soon'
}

export const PLATFORM_PRODUCTS: PlatformProduct[] = [
  {
    id: 'prometheusk',
    name: 'PrometheusK',
    purpose: 'Practices, reflection, and Living Echoes',
    url: process.env.NEXT_PUBLIC_PROMETHEUSK_URL ?? 'https://prometheusk.avatark.io',
    availability: 'live',
  },
]
