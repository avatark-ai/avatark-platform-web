import type { ProductId, UserId } from "./ids.ts"

// Names the layer between Contracts and Account in the Runtime Kernel
// diagram (Runtime -> Contracts -> Host Adapter -> Account Package). A
// minimal, explicit "who is asking" context, so a PresentationAdapter
// implementation takes its subject as a parameter instead of reaching for
// ambient/global user state.
export interface HostContext {
  productId: ProductId
  userId: UserId
}
