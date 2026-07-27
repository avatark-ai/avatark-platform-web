// The platform journey graph: AvatarK -> Echo -> Growth Engines (PrometheusK/
// GameK/AtlasK) -> ArenaK (convergence) -> StreamK -> CinemaK (expression).
// Single source of truth for RC3's "connected product intelligence" --
// GrowthEngineCard, ExpressionLayer, ConnectedProducts, and
// ContinueYourJourney all resolve their maturity/destination/launch-state/
// relationship/recommended-next data from here rather than each keeping its
// own hardcoded copy. A future growth engine or expression-layer product
// only needs a registry entry with journeyRole/journeyOrder/
// integrationStatus/nextProductIds set -- no component code changes.
import { getProductById, PRODUCT_REGISTRY, type AvatarKProduct, type IntegrationStatus, type JourneyRole } from '@avatark/product-registry'
import { resolveProductUrl } from './registry.ts'
import { ENTER_ECHO_HREF } from '../content/links.ts'
import type { PlatformStatus } from '@/components/ecosystem/StatusBadge'

export interface PlatformNode {
  id: string
  name: string
  href: string | null
  purpose: string | null
  status: PlatformStatus
  experiences: { id: string; name: string }[]
  nextIds: string[]
}

const INTEGRATION_LABELS: Record<IntegrationStatus, PlatformStatus> = {
  live: 'LIVE',
  preview: 'PREVIEW',
  'coming-online': 'COMING ONLINE',
  'in-development': 'IN DEVELOPMENT',
  vision: 'VISION',
}

// This narrative calls the product the shared registry lists as `Atlas`
// (id `atlas`, displayName "Atlas") "AtlasK" instead, to read consistently
// alongside PrometheusK/GameK/ArenaK/StreamK/CinemaK. Registry displayName
// stays the source of truth for every other consumer; only this page's
// journey graph overrides it, same rationale the pre-RC3 resolver documented.
const NARRATIVE_NAME_OVERRIDES: Record<string, string> = {
  atlas: 'AtlasK',
}

// Echo has no registry entry (it isn't built as its own product yet -- see
// lib/content/links.ts's ENTER_ECHO_HREF comment), so its node and its fan-
// out into the three Growth Engines are the one part of this graph that
// can't be read off the registry. Everything downstream of Echo comes from
// each product's own registry fields.
const ECHO_NODE: PlatformNode = {
  id: 'echo',
  name: 'Echo',
  href: ENTER_ECHO_HREF,
  purpose: 'A person’s wisdom becoming useful to another life.',
  status: 'LIVE',
  experiences: [],
  // The three Growth Engines, in the same order getGrowthEngines() returns
  // them -- Echo's fan-out is the one edge in this graph that can't be read
  // off the registry, since Echo itself has no registry entry.
  nextIds: ['prometheusk', 'gamek', 'atlas'],
}

function toPlatformNode(product: AvatarKProduct): PlatformNode {
  return {
    id: product.id,
    name: NARRATIVE_NAME_OVERRIDES[product.id] ?? product.displayName,
    href: resolveProductUrl(product),
    purpose: product.tagline ?? product.description,
    status: product.integrationStatus ? INTEGRATION_LABELS[product.integrationStatus] : 'VISION',
    experiences: product.experiences ?? [],
    nextIds: product.nextProductIds ?? [],
  }
}

export function getPlatformNode(id: string): PlatformNode | null {
  if (id === 'echo') return ECHO_NODE
  const product = getProductById(id)
  return product ? toPlatformNode(product) : null
}

// Filters + orders the registry by its position on this institutional
// narrative. Kept local rather than added to the shared package's
// helpers.ts -- "products currently on this page's journey graph" is this
// app's concern, not a portable registry query every consumer needs.
function getProductsByJourneyRole(role: JourneyRole): AvatarKProduct[] {
  return PRODUCT_REGISTRY.filter((product) => product.journeyRole === role).sort(
    (a, b) => (a.journeyOrder ?? 0) - (b.journeyOrder ?? 0)
  )
}

export function getGrowthEngines(): PlatformNode[] {
  return getProductsByJourneyRole('growth-engine').map(toPlatformNode)
}

export function getExpressionLayer(): PlatformNode[] {
  return getProductsByJourneyRole('expression').map(toPlatformNode)
}

export function getConvergenceLayer(): PlatformNode[] {
  return getProductsByJourneyRole('convergence').map(toPlatformNode)
}

interface JourneyTransition {
  sources: PlatformNode[]
  targets: PlatformNode[]
}

// Groups the graph's directed edges into human-readable transitions,
// collapsing fan-out (one source, many targets -- Echo into the three
// Growth Engines) and fan-in (many sources, one target -- the three Growth
// Engines converging on ArenaK) into single cards instead of one per edge.
// Purely derived from nextIds -- adding a product to the chain (a new
// Growth Engine, a new expression-layer step) changes this automatically.
export function getJourneyTransitions(): JourneyTransition[] {
  const order = ['echo', ...getGrowthEngines().map((n) => n.id), ...getConvergenceLayer().map((n) => n.id), ...getExpressionLayer().map((n) => n.id)]
  const nodes = new Map<string, PlatformNode>()
  for (const id of order) {
    const node = getPlatformNode(id)
    if (node) nodes.set(id, node)
  }

  const incoming = new Map<string, string[]>()
  for (const node of nodes.values()) {
    for (const targetId of node.nextIds) {
      if (!nodes.has(targetId)) continue
      incoming.set(targetId, [...(incoming.get(targetId) ?? []), node.id])
    }
  }

  const processed = new Set<string>()
  const edgeKey = (from: string, to: string) => `${from}->${to}`
  const transitions: JourneyTransition[] = []

  for (const id of order) {
    const node = nodes.get(id)
    if (!node) continue
    const outgoing = node.nextIds.filter((targetId) => nodes.has(targetId) && !processed.has(edgeKey(id, targetId)))
    if (outgoing.length === 0) continue

    if (outgoing.length > 1) {
      // Fan-out: this one source recommends several next products.
      outgoing.forEach((targetId) => processed.add(edgeKey(id, targetId)))
      transitions.push({ sources: [node], targets: outgoing.map((targetId) => nodes.get(targetId)!) })
      continue
    }

    const targetId = outgoing[0]
    const sourceIds = incoming.get(targetId) ?? [id]
    if (sourceIds.length > 1) {
      // Fan-in: several sources converge on this one target.
      sourceIds.forEach((sourceId) => processed.add(edgeKey(sourceId, targetId)))
      transitions.push({ sources: sourceIds.map((sourceId) => nodes.get(sourceId)!), targets: [nodes.get(targetId)!] })
      continue
    }

    processed.add(edgeKey(id, targetId))
    transitions.push({ sources: [node], targets: [nodes.get(targetId)!] })
  }

  return transitions
}
