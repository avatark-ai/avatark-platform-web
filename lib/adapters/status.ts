// Shared adapter-result vocabulary, consolidating a real inconsistency
// found across the platform's 12 adapter domains (identity, profile,
// account, product access, membership, organizations, invitations,
// journey, Living Echo, recommendations, timeline, notifications): each
// one that has any state modeling at all invented its own ad-hoc shape --
// IdentityState ({status:'loading'|'signed_out'|'signed_in'|'error'}),
// AccountPrincipal (no 'error' variant in the vendored package, one added
// locally in lib/auth/resolveClientPrincipal.ts), AdapterResult<T>
// ({data?, error?}, no loading/unavailable distinction at all), and
// AdapterDescribeResult ({accepted, availability, message}, journey's own
// shape). None of the 12 domains was migrated onto this wholesale in this
// pass -- most already have real, working, differently-shaped contracts
// with real consumers, and forcing a rewrite onto every one of them was
// judged riskier than the inconsistency itself. This module exists so a
// NEW adapter contract (this pass's OrganizationsAdapter, and any future
// one) has one real, shared vocabulary to build on, instead of inventing
// a 5th shape.
// AdapterResult<T>: what an adapter's own async method resolves to. There
// is no "loading" variant here -- by definition, if the promise resolved,
// the call is no longer in flight. "loading" only exists on the consumer
// side (a hook/component tracking a call before it resolves) -- see
// AdapterState<T> below.
export type AdapterResult<T> =
  | { status: "unauthenticated" }
  // The adapter mechanism exists but the backend/network it depends on
  // could not be reached or parsed right now -- distinct from
  // "not_supported" (the operation is intentionally absent) and from
  // "error" (a request was made and the backend answered with a failure).
  | { status: "unavailable" }
  // The operation is not implemented by this adapter/product at all --
  // a structural fact, not a transient failure. Never conflate with
  // "unavailable": a caller retrying a "not_supported" operation will
  // never succeed; retrying "unavailable" might.
  | { status: "not_supported" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T }

// AdapterState<T>: what a UI hook/component tracks across a call's
// lifetime -- AdapterResult<T> plus the one state that only exists before
// the promise resolves.
export type AdapterState<T> = { status: "loading" } | AdapterResult<T>

export function isReady<T>(state: AdapterState<T>): state is Extract<AdapterState<T>, { status: "ready" }> {
  return state.status === "ready"
}

export function isTerminalFailure<T>(state: AdapterState<T>): boolean {
  return state.status === "not_supported" || state.status === "error"
}
