import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryWorldStateRepository } from "./repository.ts";
import type { WorldState } from "./types.ts";

function makeState(userId: string, worldId: string): WorldState {
  return {
    userId,
    worldId,
    active: true,
    currentLocationId: "entry",
    visitedLocationIds: ["entry"],
    unlockedLocationIds: ["entry"],
    currentActivityId: null,
    currentPracticeRef: null,
    currentReflectionRef: null,
    recentVisits: [{ locationId: "entry", enteredAt: "2026-01-01T00:00:00.000Z" }],
    artifacts: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    lastVisitAt: "2026-01-01T00:00:00.000Z",
  };
}

test("get returns null for state that was never saved", async () => {
  const repo = new InMemoryWorldStateRepository();
  assert.equal(await repo.get("u1", "w1"), null);
});

test("save/get round-trips a state keyed by (userId, worldId)", async () => {
  const repo = new InMemoryWorldStateRepository();
  await repo.save(makeState("u1", "w1"));
  const loaded = await repo.get("u1", "w1");
  assert.equal(loaded?.userId, "u1");
  assert.equal(loaded?.worldId, "w1");
});

test("get returns a defensive copy: mutating it does not affect the stored state", async () => {
  const repo = new InMemoryWorldStateRepository();
  await repo.save(makeState("u1", "w1"));

  const loaded = await repo.get("u1", "w1");
  loaded!.visitedLocationIds.push("intruder");
  loaded!.active = false;

  const reloaded = await repo.get("u1", "w1");
  assert.deepEqual(reloaded!.visitedLocationIds, ["entry"]);
  assert.equal(reloaded!.active, true);
});

test("states are isolated per user and per world", async () => {
  const repo = new InMemoryWorldStateRepository();
  await repo.save(makeState("alice", "forest"));
  await repo.save(makeState("bob", "forest"));
  await repo.save(makeState("alice", "vrindavan"));

  assert.equal(await repo.get("bob", "vrindavan"), null);
  assert.equal((await repo.get("alice", "forest"))?.userId, "alice");
  assert.equal((await repo.get("bob", "forest"))?.userId, "bob");
});

test("listForUser returns only that user's states, across worlds", async () => {
  const repo = new InMemoryWorldStateRepository();
  await repo.save(makeState("alice", "forest"));
  await repo.save(makeState("alice", "vrindavan"));
  await repo.save(makeState("bob", "forest"));

  const aliceStates = await repo.listForUser("alice");
  assert.equal(aliceStates.length, 2);
  assert.deepEqual(
    aliceStates.map((s) => s.worldId).sort(),
    ["forest", "vrindavan"]
  );

  assert.equal((await repo.listForUser("nobody")).length, 0);
});

test("transitions are appended and retrieved per (userId, worldId), independent of state", async () => {
  const repo = new InMemoryWorldStateRepository();
  await repo.appendTransition("alice", "forest", { from: null, to: "entry", at: "t1", allowed: true });
  await repo.appendTransition("alice", "forest", { from: "entry", to: "second", at: "t2", allowed: true });
  await repo.appendTransition("bob", "forest", { from: null, to: "entry", at: "t1", allowed: true });

  const aliceTransitions = await repo.getTransitions("alice", "forest");
  assert.equal(aliceTransitions.length, 2);

  const bobTransitions = await repo.getTransitions("bob", "forest");
  assert.equal(bobTransitions.length, 1);

  assert.deepEqual(await repo.getTransitions("alice", "vrindavan"), []);
});
