# Sprint 9, Phase 0 — Ground Truth / Ownership Report

Inspection of the actual Sprint 7/8 implementation, as it exists at the
start of Sprint 9 (`feature/sprint9-persistent-world`, branched from
`feature/sprint8-world-embodiment` @ `67b0a09`). Written *before* any
Sprint 9 code, per Phase 0's own instruction. All claims below are
grounded in file:line citations, not inference.

## Everything is in-memory, Map-backed, single-process

| Domain | Interface | In-memory impl | File |
|---|---|---|---|
| Shared world state | `SharedWorldStateRepository` | `InMemorySharedWorldStateRepository` | `packages/living-systems-runtime/src/inMemoryRepositories.ts:24` |
| Living entity state | `LivingEntityStateRepository` | `InMemoryLivingEntityStateRepository` | `inMemoryRepositories.ts:36` |
| Visitor world memory (reference repo, unused live) | `VisitorWorldMemoryRepository` | `InMemoryVisitorWorldMemoryRepository` | `inMemoryRepositories.ts:58` |
| Protected narrative (read-only) | `ProtectedNarrativeStateRepository` | `InMemoryProtectedNarrativeStateRepository` | `inMemoryRepositories.ts:80` |
| World-system events | `WorldSystemEventRepository` | `InMemoryWorldSystemEventRepository` | `inMemoryRepositories.ts:92` |
| Living World Runtime per-user state | `WorldStateRepository` | `InMemoryWorldStateRepository` | `packages/living-world-runtime/src/repository.ts:37` |
| Experience Registry | `ExperienceEventRepository` | `InMemoryExperienceEventRepository` | `packages/experience-registry/src/inMemoryRepository.ts:36` |

All wired through module-scoped Host singletons that live for the
process lifetime and reset on restart: `lib/livingSystems/singleton.ts`,
`lib/livingWorldRuntime/singleton.ts`, `lib/experienceRegistry/singleton.ts`.
`WORLD_ID = "living-vrindavan"` is a hardcoded constant
(`lib/livingSystems/singleton.ts:13`) — there is exactly one world,
one process, one in-memory row, today.

Only two domains in the whole repo have a real, *applied* Postgres
backing: `ContextRepository` (`024_context_snapshots.sql`) and
`@avatark/experience-runtime`'s journey state (`025_journey_states.sql`).
Experience Registry's schema (`023_experience_events.sql`) is proposed,
unapplied. Living Systems / World Embodiment / Living World Runtime have
**zero** schema, proposed or applied.

## What already exists that Sprint 9 must not re-invent

- **`WorldSystemEvent`** already exists and is already distinct from
  `ExperienceRegistry`'s visitor-scoped events
  (`packages/living-systems-contracts/src/systemEvent.ts:3-9`). Sprint 9
  extends this with a durable, idempotent variant — it does not replace it.
- **`advanceWorldSimulation`** (`packages/living-systems-runtime/src/simulation.ts:30`)
  is already a pure function `(SharedWorldState, LivingEntityState[], ticks,
  seed, now) -> { sharedState, entities, events }`. It is already the single
  tick-advance entry point, already deterministic, already loops internally
  for however many ticks are requested. **This is the deterministic
  catch-up mechanism Phase 4 asks for — it already exists.** Sprint 9's job
  is to call it with a wall-clock-derived tick count and persist the
  result durably, not to write a second simulation engine.
- **Repository interfaces already exist**, independent of their in-memory
  implementations, following (loosely) the aspirational `Repository<TState,
  TKey>` / `HistoryRepository<TEntry, TKey>` convention in
  `packages/runtime-contracts/src/repository.ts:8-26`. Sprint 9's new
  durable interfaces follow this same convention rather than inventing a
  third shape.
- **The renderer boundary is already closed.** `InteractionIntent` /
  `dispatchInteractionIntent` (`lib/worldEmbodiment/intentDispatcher.ts`)
  already routes every renderer-originated mutation through the existing
  Sprint 5 orchestrator; nothing new is needed for "renderer cannot mutate
  truth" — Sprint 9 must not add a second mutation path that bypasses it.
- **The four state domains are already visibly separate** end-to-end —
  `resolveLivingSystemsSnapshot` (`lib/livingSystems/orchestrator.ts:25`)
  keeps shared state, entity state, visitor memory, and protected
  narrative as four distinct parameters, never merged. Sprint 9's durable
  contracts preserve this shape rather than collapsing it.

## What genuinely does not exist yet (Sprint 9's real scope)

1. **No `WorldInstanceId`/`WorldDefinitionId` distinction anywhere** —
   confirmed via repo-wide search, zero hits. "World" is a single global
   singleton, not an instance of a definition.
2. **No durable persistence** for shared state, entity state, or events —
   all resets on process restart, by design, every sprint since Sprint 4.
3. **No checkpoint concept** — nothing captures "enough state to resume
   without replaying from tick zero."
4. **No optimistic concurrency** — `SharedWorldState.worldVersion` exists
   but is hardcoded to `1` and used only as a variation seed input
   (`packages/living-systems-runtime/src/variation.ts`), never as a
   concurrency guard.
5. **No lease/ownership concept** — nothing prevents two callers from
   both calling `advanceLivingSystemsSimulation` concurrently and racing
   `sharedWorldStateRepository.save()`.
6. **No lifecycle states** (dormant/waking/active/quiescing) — the world
   is either "the process is up" or "the process is down." Nothing models
   a state in between.
7. **No wall-clock-to-logical-tick policy** — `advanceWorldSimulation` is
   correctly wall-clock-agnostic, but nothing today computes *how many*
   ticks should elapse when a visitor returns after real time has passed;
   the only caller (`advanceLivingSystemsSimulation`) takes an explicit
   `ticks` argument from a dev route, not from elapsed wall-clock time.

## Boundary decision for Sprint 9

Sprint 9 adds a **new, additive durable layer** (`packages/world-persistence-contracts`,
`packages/world-persistence-runtime`, `lib/worldPersistence/`) that sits
*beside* the existing Sprint 7/8 in-memory singleton path, not inside it.
The existing `lib/livingSystems/singleton.ts` / `orchestrator.ts` and
`lib/worldEmbodiment/*` are left untouched — per Phase 0's own instruction
not to move responsibilities merely to make this sprint easier, and
because the existing pure functions (`advanceWorldSimulation`,
`resolveWorldSnapshot`, `resolveWorldEmbodiment`) are exactly what a
durable layer should call, unmodified. Durable repositories key by the
same `WorldId` string space already in universal use (renamed at the
persistence-contract level to `WorldInstanceId`, the same value, no
runtime rename) — see `packages/world-persistence-contracts/src/ids.ts`
for the reasoning.
