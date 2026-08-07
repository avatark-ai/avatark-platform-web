import { test } from "node:test"
import assert from "node:assert/strict"
import type {
  Checkpoint,
  DefaultsAdapter,
  Event,
  History,
  HistoryRepository,
  LifecyclePhase,
  NotificationAdapter,
  PresentationAdapter,
  Progress,
  Reference,
  Repository,
  Resolver,
  RuntimeFactory,
  Snapshot,
  State,
  Transition,
  Versioned,
  VersionedDefinition,
} from "./index.ts"

// This package ships zero runtime logic -- these tests exist to prove every
// contract is satisfiable by a plain, franchise-free object literal (the
// only thing a contracts-only package can meaningfully "test"), and to
// double as living usage examples.

test("Reference is satisfied by a plain opaque pointer, any kind", () => {
  const practiceRef: Reference<"practice"> = { kind: "practice", id: "p1" }
  const worldRefWithSource: Reference<"world"> = { kind: "world", id: "w1", source: "living-world-runtime" }
  assert.equal(practiceRef.id, "p1")
  assert.equal(worldRefWithSource.source, "living-world-runtime")
})

test("Snapshot wraps arbitrary fields with a subject and an updatedAt", () => {
  const snapshot: Snapshot<{ currentWorldId: string | null }> = {
    subjectId: "user-1",
    fields: { currentWorldId: null },
    updatedAt: null,
  }
  assert.equal(snapshot.fields.currentWorldId, null)
})

test("State carries a status string, generic over the status union", () => {
  const state: State<"active" | "paused"> = { subjectId: "user-1", status: "active", updatedAt: "2026-01-01T00:00:00.000Z" }
  assert.equal(state.status, "active")
})

test("LifecyclePhase covers the 5 values JourneyStatus already matches exactly", () => {
  const phases: LifecyclePhase[] = ["not_started", "active", "paused", "completed", "abandoned"]
  assert.equal(phases.length, 5)
})

test("Transition is the thin shape; Event is the rich shape -- both satisfiable independently", () => {
  const transition: Transition<"episode_completed"> = { type: "episode_completed", at: "2026-01-01T00:00:00.000Z", nodeId: "ep1" }
  const event: Event<"episode.completed"> = {
    id: "evt-1",
    schemaVersion: 1,
    type: "episode.completed",
    source: { productId: "avatark" },
    actor: { userId: "user-1" },
    metadata: {},
    occurredAt: "2026-01-01T00:00:00.000Z",
    recordedAt: "2026-01-01T00:00:00.000Z",
  }
  assert.equal(transition.nodeId, "ep1")
  assert.equal(event.source.productId, "avatark")
})

test("Progress, History, Checkpoint, Versioned/VersionedDefinition are each satisfiable", () => {
  const progress: Progress = { percentComplete: 50, completedCount: 1, totalCount: 2 }
  const history: History<Transition> = { subjectId: "user-1", entries: [] }
  const checkpoint: Checkpoint<{ x: number }> = { id: "cp-1", subjectId: "user-1", state: { x: 1 }, createdAt: "2026-01-01T00:00:00.000Z" }
  const versioned: Versioned = { schemaVersion: 1 }
  const versionedDefinition: VersionedDefinition = { version: 1 }
  assert.equal(progress.percentComplete, 50)
  assert.deepEqual(history.entries, [])
  assert.equal(checkpoint.state.x, 1)
  assert.equal(versioned.schemaVersion, versionedDefinition.version)
})

test("Repository / HistoryRepository / Resolver / RuntimeFactory are satisfiable by trivial in-memory implementations", async () => {
  const store = new Map<string, { subjectId: string }>()
  const repo: Repository<{ subjectId: string }> = {
    get: async (key) => store.get(key) ?? null,
    save: async (state) => void store.set(state.subjectId, state),
  }
  await repo.save({ subjectId: "user-1" })
  assert.deepEqual(await repo.get("user-1"), { subjectId: "user-1" })

  const historyRepo: HistoryRepository<Transition> = {
    append: async () => {},
    list: async () => [],
  }
  assert.deepEqual(await historyRepo.list("user-1"), [])

  const resolver: Resolver<number, string> = { resolve: (n) => String(n) }
  assert.equal(resolver.resolve(42), "42")

  const factory: RuntimeFactory<{ seed: number }, { seed: number }> = { create: (opts) => opts }
  assert.deepEqual(factory.create({ seed: 1 }), { seed: 1 })
})

test("Adapter roles (Notification/Defaults/Presentation) are three distinct shapes, not one", () => {
  const notification: NotificationAdapter<Transition> = { onEvent: () => {} }
  const defaults: DefaultsAdapter<{ currentWorldId: string | null }> = {
    productId: "avatark",
    getDefaults: async () => ({ currentWorldId: null }),
  }
  const presentation: PresentationAdapter<{ label: string }> = {
    get: async () => ({ data: { label: "ok" } }),
  }
  assert.equal(typeof notification.onEvent, "function")
  assert.equal(defaults.productId, "avatark")
  assert.equal(typeof presentation.get, "function")
})
