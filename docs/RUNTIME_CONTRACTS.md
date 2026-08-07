# Runtime Contracts — `packages/runtime-contracts` (design only, not yet created)

**Status:** design document. No package exists at `packages/runtime-contracts` yet. Nothing here
is implemented, and nothing in this document changes the behavior of any of the five existing
runtime branches (`experience-runtime`, `living-world-runtime`, `narrative-runtime`,
`context-runtime`, `experience-registry`) — see [PLATFORM_INTEGRATION_SPRINT_1.md](./PLATFORM_INTEGRATION_SPRINT_1.md)
for the audit this design is grounded in.

## Relationship to Sprint 1's narrower proposal

Sprint 1 proposed a deliberately small `runtime-contracts` (IDs and opaque refs only), and
explicitly recommended *against* sharing Repository/Adapter/Runtime interfaces, calling that
over-abstraction given how differently the five existing shapes are built. This sprint's mission
asks for the broader set anyway (Runtime, Repository, Adapter, Snapshot, Reference, Transition,
Event, Progress, Checkpoint, State, History, Resolver, Host, Lifecycle, Version). The two aren't
contradictory once the broader set is built the right way: **every contract below is a generic,
structural shape a package's existing types can be checked against, not a forced replacement for
them.** Nothing here renames a method, changes a return type, or requires any of the five branches
to change a single line. Where a contract doesn't structurally match an existing type today (most
of them don't, exactly — different method names, missing fields), that's flagged explicitly as a
**future, additive, opt-in convergence target**, not a Sprint 2 requirement.

## Package shape

```json
{
  "name": "@avatark/runtime-contracts",
  "version": "0.1.0",
  "private": true,
  "description": "Type-only contracts for the Runtime Kernel -- no implementations, no storage, no React, no Supabase, zero dependencies.",
  "dependencies": {},
  "devDependencies": { "typescript": "^5" }
}
```

Every file below is pure `interface`/`type` — no functions with bodies, no classes, no default
values, no `crypto`/`Date`/`fetch` calls. `tsconfig.json` matches every other leaf package in this
repo (`strict`, `noEmit`, `allowImportingTsExtensions`, `moduleResolution: bundler`).

---

## 1. Identity & ID contracts (`src/ids.ts`)

```ts
export type UserId = string
export type ProductId = string   // matches @avatark/product-registry's AvatarKProduct.id
export type Timestamp = string   // ISO-8601, redefined ad-hoc in 3+ existing packages today
```

## 2. Reference (`src/reference.ts`)

Generalizes the opaque-pointer pattern found **independently, near-identically, three times**
today: `living-world-runtime`'s `WorldPracticeRef`/`WorldReflectionRef`, `narrative-runtime`'s
`PracticeRef`/`ReflectionRef`/`WorldRef`.

```ts
export interface Reference<TKind extends string = string> {
  kind: TKind
  id: string
  source?: string
}
```

Existing named ref types (kept as ergonomic aliases, not replaced — better autocomplete and error
messages than a bare generic):

```ts
export type PracticeRef = Reference<"practice">
export type ReflectionRef = Reference<"reflection">
export type WorldRef = Reference<"world">
export type EpisodeRef = Reference<"episode">
export type NarrativeRef = Reference<"narrative">
export type SceneRef = Reference<"scene">
```

**Convergence note:** today, `living-world-runtime`'s refs carry `{practiceId, source}` (field
named `practiceId`) and `narrative-runtime`'s carry `{practiceId}` (no `source`) — neither is
literally `Reference<"practice">` yet (different field name: `practiceId` vs `id`). Adopting this
shape is a Sprint 3+ rename inside those two packages, not something this contract silently
assumes is already true.

## 3. Snapshot (`src/snapshot.ts`)

A full point-in-time read of a subject's fields — modeled directly on the one real example,
`context-runtime`'s `ContextSnapshot`, which deliberately does **not** call itself "State" (see
[RUNTIME_GLOSSARY.md](./RUNTIME_GLOSSARY.md)).

```ts
export interface Snapshot<TFields> {
  subjectId: UserId
  fields: TFields
  updatedAt: Timestamp | null
}
```

## 4. State (`src/state.ts`)

The common subset of `JourneyState`/`WorldState`/`NarrativeState` — a *base shape*, not a
replacement. None of the three needs to extend this today; it exists so a sixth runtime's State
type has a documented minimum to include.

```ts
export interface State<TStatus extends string = string> {
  subjectId: UserId
  status: TStatus
  updatedAt: Timestamp
}
```

## 5. Lifecycle (`src/lifecycle.ts`)

The status vocabulary every runtime's own status type should draw from. Grounded finding:
`experience-runtime`'s `JourneyStatus` **already matches all five values exactly** — this is a real
convergence point, not a speculative one.

```ts
export type LifecyclePhase =
  | "not_started"
  | "active"
  | "paused"
  | "completed"
  | "abandoned"
```

| Existing type | Matches `LifecyclePhase`? |
|---|---|
| `JourneyStatus` (experience-runtime) | ✅ exact match, all 5 values |
| `NarrativeStatus` (narrative-runtime) | Partial — has `active`/`paused`/`completed`, missing `not_started`/`abandoned` |
| `WorldState.active: boolean` (living-world-runtime) | Coarse — only distinguishes entered-vs-not, no paused/completed/abandoned distinction at all |

No change required to any of the three. This table exists so a future runtime (or a future version
of these three) has a documented target instead of inventing a fourth vocabulary.

## 6. Transition (`src/transition.ts`)

The **thin** "something changed" shape — modeled on `JourneyTransition`/`WorldTransition`/
`NarrativeHistoryEntry`, which are structurally similar but not identical today.

```ts
export interface Transition<TType extends string = string> {
  type: TType
  at: Timestamp
  nodeId?: string
  detail?: string
}
```

## 7. Event (`src/event.ts`)

The **rich** shape — modeled on `experience-registry`'s `ExperienceEvent`, the only one of the five
branches with a typed source/actor/target/metadata and real validation. `Transition` and `Event`
are deliberately **not collapsed into one contract** — see
[RUNTIME_GLOSSARY.md](./RUNTIME_GLOSSARY.md) for why both need to keep existing.

```ts
export type EventMetadataValue = string | number | boolean | null

export interface Event<
  TType extends string = string,
  TMetadata = Record<string, EventMetadataValue>
> {
  id: string
  schemaVersion: number
  type: TType
  source: { productId: ProductId; component?: string }
  actor: { userId: UserId; role?: "user" | "system" | "admin" }
  target?: { type: string; id: string }
  metadata: TMetadata
  occurredAt: Timestamp
  recordedAt: Timestamp
  correlationId?: string
  sessionId?: string
}
```

## 8. Progress (`src/progress.ts`)

```ts
export interface Progress {
  percentComplete: number
  completedCount: number
  totalCount: number
}
```

**Convergence note:** `JourneyProgress` and `WorldProgress` both already compute
`percentComplete`. `NarrativeProgress` does **not** — it tracks position and completed-id lists but
never computes a percentage (a real, verified gap, not an assumption). Adopting this contract in
`narrative-runtime` would be a strictly additive change (add a computed field), never breaking.

## 9. History (`src/history.ts`)

```ts
export interface History<TEntry> {
  subjectId: UserId
  entries: TEntry[]
}
```

## 10. Checkpoint (`src/checkpoint.ts`) — the one genuinely new contract in this document

Every other contract here generalizes something that already exists two or more times across the
five branches. Checkpoint does not: no existing package has a named "Checkpoint" concept.
`context-runtime`'s `pushContext`/`restoreContext` (over `ContextHistoryEntry`) is the closest
existing relative — a deliberate, named save-point distinct from continuous History. This contract
is **anticipatory**, not extracted from observed duplication, and should be validated against a
second real use case (e.g., a "save before this narrative choice" checkpoint in `narrative-runtime`,
or "save before entering an irreversible World transition" in `living-world-runtime`) before any
package actually adopts it.

```ts
export interface Checkpoint<TState> {
  id: string
  subjectId: UserId
  state: TState
  label?: string
  createdAt: Timestamp
}
```

## 11. Version (`src/version.ts`)

Two distinct, independent versioning axes found in the wild — kept separate on purpose:

```ts
// Axis 1: "what shape is this persisted record" -- matches experience-registry's
// CURRENT_EXPERIENCE_SCHEMA_VERSION / ExperienceEvent.schemaVersion.
export interface Versioned {
  schemaVersion: number
}

// Axis 2: "what version of this authored content is this" -- matches
// narrative-runtime's NarrativeDefinition.version.
export interface VersionedDefinition {
  version: number
}
```

## 12. Resolver (`src/resolver.ts`)

Modeled on the one existing example, `context-runtime`'s `ContextResolver`.

```ts
export interface Resolver<TInput, TOutput> {
  resolve(input: TInput): TOutput
}
```

## 13. Repository (`src/repository.ts`)

The single-state persistence contract. **Not** a drop-in replacement for any existing Repository
interface — method names differ across all four state-holding examples today (`getState`/
`saveState` vs `get`/`save` vs `loadSnapshot`/`saveSnapshot`). This is the target convention new
repositories should follow; existing ones may add non-breaking aliasing later, never required to
rename.

```ts
export interface Repository<TState, TKey = UserId> {
  get(key: TKey): Promise<TState | null>
  save(state: TState): Promise<void>
}
```

## 14. HistoryRepository (`src/historyRepository.ts`)

Separated from `Repository` because the append-only half of persistence (history streams, event
logs) has a genuinely different shape — matches `ExperienceEventRepository`'s `insert`/`findByUser`
half, and the append/list half of `JourneyRepository`/`WorldStateRepository`/`ContextRepository`.

```ts
export interface HistoryQuery {
  limit?: number
  before?: Timestamp
  after?: Timestamp
}

export interface HistoryRepository<TEntry, TKey = UserId> {
  append(key: TKey, entry: TEntry): Promise<void>
  list(key: TKey, query?: HistoryQuery): Promise<TEntry[]>
}
```

## 15. Adapter (`src/adapter.ts`) — three roles, not one

Per [PLATFORM_INTEGRATION_SPRINT_1.md](./PLATFORM_INTEGRATION_SPRINT_1.md) §1, "Adapter" already
names three architecturally distinct roles across the five branches. Rather than force one
generic `Adapter<TIn,TOut>` that would hide which role is meant, this contract defines the three
roles explicitly:

```ts
// Role 1: runtime -> product, fire-and-forget notification.
// Matches JourneyAdapter.onTransition. Lives in the Runtime package as an
// interface; implementations belong to the Host, never to the runtime itself.
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
// LivingWorldsAdapter). Never implemented inside a runtime package -- see
// RUNTIME_KERNEL_ARCHITECTURE.md's adapter ownership matrix for the two
// places this rule is broken today and the fix.
export interface PresentationAdapter<TOutput> {
  get(): Promise<{ data?: TOutput; error?: string }>
}
```

## 16. Host (`src/host.ts`)

Names the layer between Contracts and Account in the mission's own diagram
(`Runtime → Contracts → Host Adapter → Account Package`). A minimal, explicit "who is asking"
context — so a `PresentationAdapter` implementation takes its subject as a parameter instead of
reaching for ambient/global user state, which is what actually enables "no runtime should directly
depend on account" (the dependency the mission's Phase 5 asks to avoid was never a compile-time
`import` in any of the five branches — it's this kind of implicit, parameter-free coupling that
this contract closes off).

```ts
export interface HostContext {
  productId: ProductId
  userId: UserId
}
```

## 17. Runtime (`src/runtime.ts`)

Not a shared method-signature contract — the five existing runtimes' method names are too
different to unify without renaming public APIs, which this sprint explicitly forbids. Instead,
this names the one thing all five *do* share structurally: construction from a definition +
repository + optional adapter, and a factory-shaped entry point (whether built as a class or a
factory function — both existing styles already satisfy this).

```ts
export interface RuntimeFactory<TOptions, TInstance> {
  create(options: TOptions): TInstance
}
```

Both existing construction styles already satisfy this without any change:

```ts
// Class style (experience-runtime, context-runtime) — wrap the constructor:
const journeyRuntimeFactory: RuntimeFactory<JourneyRuntimeOptions, JourneyRuntime> =
  { create: (opts) => new JourneyRuntime(opts.definition, opts.repository, opts.adapter) }

// Factory-function style (living-world-runtime, narrative-runtime) — already
// matches the shape as-is:
const worldRuntimeFactory: RuntimeFactory<CreateWorldRuntimeOptions, WorldRuntime> =
  { create: createWorldRuntime }
```

---

## Index (`src/index.ts`)

```ts
export type { UserId, ProductId, Timestamp } from "./ids.ts"
export type { Reference, PracticeRef, ReflectionRef, WorldRef, EpisodeRef, NarrativeRef, SceneRef } from "./reference.ts"
export type { Snapshot } from "./snapshot.ts"
export type { State } from "./state.ts"
export type { LifecyclePhase } from "./lifecycle.ts"
export type { Transition } from "./transition.ts"
export type { Event, EventMetadataValue } from "./event.ts"
export type { Progress } from "./progress.ts"
export type { History } from "./history.ts"
export type { Checkpoint } from "./checkpoint.ts"
export type { Versioned, VersionedDefinition } from "./version.ts"
export type { Resolver } from "./resolver.ts"
export type { Repository } from "./repository.ts"
export type { HistoryQuery, HistoryRepository } from "./historyRepository.ts"
export type { NotificationAdapter, DefaultsAdapter, PresentationAdapter } from "./adapter.ts"
export type { HostContext } from "./host.ts"
export type { RuntimeFactory } from "./runtime.ts"
```

Everything here is `export type` — enforced by construction, not just convention: a
type-only-exports index is itself a signal (and, with `isolatedModules`, a compiler-checked
guarantee) that nothing in this package can carry runtime behavior across the boundary.

## What was deliberately left out

- A shared `Adapter<TIn,TOut>` generic that erases the three roles above into one shape — rejected,
  it would hide the exact distinction Sprint 1 found was being confused.
- A single unified `Repository` interface that all five existing repositories are forced to
  implement — rejected; `narrative-runtime`'s repository legitimately has no separate history
  method (history lives inside the saved `NarrativeState` blob), a real design choice, not an
  oversight.
- Any concrete class, default value, ID-generation function, or `now()` clock — those are
  implementation, explicitly out of scope for a contracts-only package.
