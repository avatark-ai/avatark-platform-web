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
  // Product-local admin surface, if one is known to exist. Almost always
  // null: per the mission's data boundary, product-local administration
  // stays product-owned and this repo doesn't assume a URL it hasn't
  // confirmed.
  adminUrl: string | null
  availability: 'live' | 'coming_soon'
}

export const PLATFORM_PRODUCTS: PlatformProduct[] = [
  {
    id: 'prometheusk',
    name: 'PrometheusK',
    purpose: 'Practices, reflection, and Living Echoes',
    url: process.env.NEXT_PUBLIC_PROMETHEUSK_URL ?? 'https://prometheusk.avatark.io',
    adminUrl: null,
    availability: 'live',
  },
  {
    // Confirmed via the cross-repo integration audit (gamek-web's
    // site.config.ts links to self.avatark.ai / app.avatark.ai/gamek) --
    // not guessed.
    id: 'gamek',
    name: 'GameK',
    purpose: 'World progress and consumer game state',
    url: process.env.NEXT_PUBLIC_GAMEK_URL ?? 'https://app.avatark.ai/gamek',
    adminUrl: null,
    availability: 'coming_soon',
  },
  {
    // ArenaK (dt4m-os/apps/avatark-consumer). No confirmed public hostname
    // found during the cross-repo audit -- left null rather than guessed.
    id: 'arenak',
    name: 'ArenaK',
    purpose: 'Invitations, enrollments, challenges, leagues, rankings',
    url: process.env.NEXT_PUBLIC_ARENAK_URL ?? null,
    adminUrl: null,
    availability: 'coming_soon',
  },
  {
    id: 'streamk',
    name: 'StreamK',
    purpose: 'Streaming product (scope not yet integrated with Platform)',
    url: process.env.NEXT_PUBLIC_STREAMK_URL ?? null,
    adminUrl: null,
    availability: 'coming_soon',
  },
  {
    id: 'cinemak',
    name: 'CinemaK',
    purpose: 'Cinema product (scope not yet integrated with Platform)',
    url: process.env.NEXT_PUBLIC_CINEMAK_URL ?? null,
    adminUrl: null,
    availability: 'coming_soon',
  },
  {
    id: 'studiok',
    name: 'StudioK',
    purpose: 'Studio product (scope not yet integrated with Platform)',
    url: process.env.NEXT_PUBLIC_STUDIOK_URL ?? null,
    adminUrl: null,
    availability: 'coming_soon',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    purpose: 'Atlas product (scope not yet integrated with Platform)',
    url: process.env.NEXT_PUBLIC_ATLAS_URL ?? null,
    adminUrl: null,
    availability: 'coming_soon',
  },
  {
    id: 'setpointk',
    name: 'SetpointK',
    purpose: 'Historically Cognito-backed; not yet integrated with Platform identity',
    url: process.env.NEXT_PUBLIC_SETPOINTK_URL ?? null,
    adminUrl: null,
    availability: 'coming_soon',
  },
]
