import type { ContextFieldKey } from './types.ts'

// The lowest-precedence source of context: a product's own sensible
// defaults for fields it hasn't heard anything more specific about yet.
// Registered per-product; the runtime only ever consults the adapter
// whose `productId` matches the user's currently resolved
// `currentProductId` — a product's defaults never leak into a session
// for a different product (no franchise logic, no cross-product
// inference).
export interface ContextAdapter {
  productId: string
  getDefaults(userId: string): Promise<Partial<Record<ContextFieldKey, string | null>>>
}
