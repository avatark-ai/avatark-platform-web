import type { ProductId, UserId } from "./ids.ts"

// "Adapter" already names three architecturally distinct roles across the
// five runtime branches (docs/RUNTIME_KERNEL_ARCHITECTURE.md Part 1). Rather
// than force one generic Adapter<TIn,TOut> that would hide which role is
// meant, this file defines the three roles explicitly.

// Role 1: runtime -> product, fire-and-forget notification. Matches
// JourneyAdapter.onTransition. Lives in the Runtime package as an
// interface; implementations belong to the Host, never to the runtime
// itself.
export interface NotificationAdapter<TEvent> {
  onEvent?(event: TEvent): void | Promise<void>
}

// Role 2: product -> runtime, a source of default values consulted BY the
// runtime. Matches ContextAdapter.getDefaults. Same placement rule as above.
export interface DefaultsAdapter<TFields> {
  productId: ProductId
  getDefaults(subjectId: UserId): Promise<Partial<TFields>>
}

// Role 3: host-only. Reshapes a runtime's output to match some OTHER
// package's UI contract (e.g. @avatark/account's ExtensionAdapter/
// LivingWorldsAdapter). Never implemented inside a runtime package -- a
// runtime package must never import @avatark/account, directly or
// structurally, to satisfy this shape.
export interface PresentationAdapter<TOutput> {
  get(): Promise<{ data?: TOutput; error?: string }>
}
