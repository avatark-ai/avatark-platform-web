// Friendly-label + per-product grouping for capability grants — the pure
// logic behind the Access tab's "Capabilities" list (packages/account/src/
// ui/AccessTab.tsx) and behind keeping diagnostics surfaces on raw ids.
// Kept out of lib/products/accessModel.ts so it stays testable via the
// plain node test runner without going through that file's '@/' alias
// imports (see this module's own test file).
import type { CapabilityGrantRow } from './types.ts'

// Consumer-facing labels only. Deliberately small and honest: a capability
// id with no entry here still renders (as its own raw id), never as a
// blank or fabricated-sounding label — this map is additive polish, not a
// gate on whether a capability is displayable. Diagnostics surfaces
// (app/admin/**) must use grant.capability directly and never call this —
// "protected diagnostics may show raw capability identifiers" is the
// mission's explicit requirement, not an oversight if a diagnostics view
// looks unpolished.
const CAPABILITY_LABELS: Record<string, string> = {
  'platform.capability.manage': 'Manage capability grants',
}

export function friendlyCapabilityLabel(capability: string): string {
  return CAPABILITY_LABELS[capability] ?? capability
}

// Capabilities to surface under one product's Access-tab entry: an exact
// product-scope match, plus (only for the 'avatark' product entry, which
// already doubles as this platform's own "roles" home in
// computeProductAccessEntries) platform-scope grants. No other product
// entry ever shows a platform-scope grant — a platform capability does not
// imply anything about GameK, SetpointK, etc., matching the same
// non-implication rule the resolver enforces for scope matching.
export function capabilitiesForProductEntry(productId: string, grants: CapabilityGrantRow[]): string[] {
  return grants
    .filter(
      (g) =>
        (g.scopeType === 'product' && g.scopeId === productId) ||
        (g.scopeType === 'platform' && productId === 'avatark')
    )
    .map((g) => g.capability)
}
