// AvatarK's four primary consumer Activities (Explore/Practice/Together/
// Watch -- see docs/ARCHITECTURE_DECISION_LOG_V1.md) resolved against the
// shared @avatark/product-registry. "Activity" is a platform-shell
// presentation concept, not an ecosystem-wide product fact, so this
// mapping lives here rather than inside the frozen shared package -- same
// "derive, don't duplicate" pattern lib/products/registry.ts already uses.
import { getProductById } from '@avatark/product-registry'
import { resolveProductUrl } from '../products/registry.ts'

export type ActivityId = 'explore' | 'practice' | 'together' | 'watch'

export type ActivityAvailability = 'available' | 'beta' | 'coming_soon'

export interface ActivityCard {
  id: ActivityId
  label: string
  intent: string
  value: string
  ctaLabel: string
  productId: string
  productName: string
  href: string | null
  availability: ActivityAvailability
}

interface ActivityDefinition {
  id: ActivityId
  label: string
  intent: string
  value: string
  ctaLabel: string
  productId: string
}

// Per docs/ARCHITECTURE_DECISION_LOG_V1.md: "GameK is Explore", "PrometheusK
// is Practice", "ArenaK is Together", "StreamK is Watch". Create/StudioK is
// intentionally absent -- not a primary home card this session.
const ACTIVITY_DEFINITIONS: ActivityDefinition[] = [
  {
    id: 'explore',
    label: 'Explore',
    intent: 'See what there is to discover.',
    value: 'Wander a world and see what you find.',
    ctaLabel: 'Start exploring',
    productId: 'gamek',
  },
  {
    id: 'practice',
    label: 'Practice',
    intent: 'Work on something that matters to you.',
    value: 'A guided practice, at your own pace.',
    ctaLabel: 'Begin a practice',
    productId: 'prometheusk',
  },
  {
    id: 'together',
    label: 'Together',
    intent: 'Do it with other people.',
    value: 'Challenges, leagues, and rankings with others.',
    ctaLabel: 'Join in',
    productId: 'arenak',
  },
  {
    id: 'watch',
    label: 'Watch',
    intent: 'See what other people have made.',
    value: 'Live and on-demand video.',
    ctaLabel: 'Start watching',
    productId: 'streamk',
  },
]

// AvatarK's own onboarding funnel into Practice (/start -> intentions ->
// /enter -> signed receipt handoff, RC1-RC6, already shipped and tested) is
// an AvatarK-owned entry point, not another product's -- per
// docs/PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md Section 9, those aren't
// a registry-migration target. It stays available regardless of
// PrometheusK's own declared registry status.
const OWN_ENTRY_POINTS: Partial<Record<ActivityId, string>> = {
  practice: '/start',
}

// Presentation consequence of status+visibility, not a new registry field --
// mirrors docs/PLATFORM_PRODUCT_DISCOVERY_INTEGRATION_V1.md Section 3.5:
// live/beta+public is shown (beta gets a badge); alpha/internal or
// non-public is never shown to a first-time consumer.
function registryAvailability(status: string, visibility: string): ActivityAvailability {
  if (visibility !== 'public') return 'coming_soon'
  if (status === 'live') return 'available'
  if (status === 'beta') return 'beta'
  return 'coming_soon'
}

export function getActivityCards(): ActivityCard[] {
  return ACTIVITY_DEFINITIONS.map((def) => {
    const ownEntryPoint = OWN_ENTRY_POINTS[def.id] ?? null
    const product = getProductById(def.productId)

    if (ownEntryPoint) {
      return {
        ...def,
        productName: product?.displayName ?? def.productId,
        href: ownEntryPoint,
        availability: 'available',
      }
    }

    if (!product) {
      // Never fabricate a destination for a product that isn't in the
      // registry -- an honest coming-soon state, same discipline as every
      // other unverified destination.
      return { ...def, productName: def.productId, href: null, availability: 'coming_soon' }
    }

    const availability = registryAvailability(product.status, product.visibility)
    const destinationUrl = resolveProductUrl(product)
    const href = availability !== 'coming_soon' && destinationUrl ? destinationUrl : null

    return {
      ...def,
      productName: product.displayName,
      href,
      availability: href ? availability : 'coming_soon',
    }
  })
}
