import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorldRuntime, type WorldRuntime } from "./runtime.ts";
import { InMemoryWorldStateRepository } from "./repository.ts";
import { InvalidWorldTransitionError, UnknownLocationError, UnknownWorldError, WorldNotEnteredError } from "./errors.ts";
import type { WorldDefinition } from "./types.ts";

const FOREST: WorldDefinition = {
  id: "living-forest",
  name: "Living Forest",
  entryLocationId: "entry",
  locations: [
    { id: "entry", name: "Entry", order: 0 },
    { id: "second", name: "Second", order: 1, requiresLocationIds: ["entry"] },
    { id: "third", name: "Third", order: 2, requiresLocationIds: ["second"] },
  ],
  activities: [
    { id: "act-entry", locationId: "entry", name: "Orientation" },
    { id: "act-second", locationId: "second", name: "Deepen" },
    { id: "act-third", locationId: "third", name: "Integrate" },
  ],
};

const VRINDAVAN: WorldDefinition = {
  id: "living-vrindavan",
  name: "Living Vrindavan",
  entryLocationId: "entry",
  locations: [{ id: "entry", name: "Entry", order: 0 }],
  activities: [],
};

function makeClock(startMs = 0) {
  let ms = startMs;
  return () => new Date((ms += 1000)).toISOString();
}

function makeRuntime(definitions: WorldDefinition[] = [FOREST, VRINDAVAN]): WorldRuntime {
  return createWorldRuntime({ definitions, repository: new InMemoryWorldStateRepository(), now: makeClock() });
}

test("unknown world id is rejected by every operation", async () => {
  const runtime = makeRuntime();
  await assert.rejects(() => runtime.enterWorld("u1", "nope"), UnknownWorldError);
  await assert.rejects(() => runtime.getProgress("u1", "nope"), UnknownWorldError);
});

test("first entry creates active state at the entry location and unlocks it", async () => {
  const runtime = makeRuntime();
  const state = await runtime.enterWorld("u1", "living-forest");

  assert.equal(state.active, true);
  assert.equal(state.currentLocationId, "entry");
  assert.deepEqual(state.unlockedLocationIds, ["entry"]);
  assert.deepEqual(state.visitedLocationIds, ["entry"]);
  assert.equal(state.recentVisits.length, 1);
  assert.equal(state.recentVisits[0].locationId, "entry");
  assert.equal(state.lastVisitAt, state.updatedAt);
});

test("entering an unknown location throws UnknownLocationError, not a silent no-op", async () => {
  const runtime = makeRuntime();
  await assert.rejects(() => runtime.visitLocation("u1", "living-forest", "does-not-exist"), UnknownLocationError);
});

test("resume reactivates a previously-left world without changing location or recording a visit", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");
  const left = await runtime.leaveWorld("u1", "living-forest");
  assert.equal(left.active, false);
  assert.ok(left.recentVisits[0].leftAt, "leaving should close the open visit");

  const resumed = await runtime.resumeWorld("u1", "living-forest");
  assert.equal(resumed.active, true);
  assert.equal(resumed.currentLocationId, left.currentLocationId);
  assert.equal(resumed.recentVisits.length, left.recentVisits.length, "resume must not record a new visit");
});

test("resuming or leaving a world never entered throws WorldNotEnteredError", async () => {
  const runtime = makeRuntime();
  await assert.rejects(() => runtime.resumeWorld("u1", "living-forest"), WorldNotEnteredError);
  await assert.rejects(() => runtime.leaveWorld("u1", "living-forest"), WorldNotEnteredError);
});

test("visit history accumulates in recentVisits and getHistory, most recent first", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");
  await runtime.unlockLocation("u1", "living-forest", "second");
  await runtime.visitLocation("u1", "living-forest", "second");

  const state = await runtime.getState("u1", "living-forest");
  assert.deepEqual(
    state!.recentVisits.map((v) => v.locationId),
    ["second", "entry"]
  );
  assert.ok(state!.recentVisits[1].leftAt, "the earlier visit should be closed once a new one starts");

  const history = await runtime.getHistory("u1", "living-forest");
  assert.equal(history.worldId, "living-forest");
  assert.equal(history.userId, "u1");
  assert.deepEqual(
    history.visits.map((v) => v.locationId),
    ["second", "entry"]
  );
  assert.ok(history.transitions.some((t) => t.from === "entry" && t.to === "second" && t.allowed));
});

test("location unlock requires prerequisites to have been visited first", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");

  await assert.rejects(
    () => runtime.unlockLocation("u1", "living-forest", "third"),
    InvalidWorldTransitionError,
    "third requires second, which has not been visited"
  );

  await runtime.unlockLocation("u1", "living-forest", "second");
  await runtime.visitLocation("u1", "living-forest", "second");
  const state = await runtime.unlockLocation("u1", "living-forest", "third");
  assert.ok(state.unlockedLocationIds.includes("third"));
});

test("invalid transitions: visiting a locked location throws and is recorded as a rejected transition", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");

  await assert.rejects(() => runtime.visitLocation("u1", "living-forest", "third"), InvalidWorldTransitionError);

  const history = await runtime.getHistory("u1", "living-forest");
  const rejected = history.transitions.find((t) => t.to === "third" && !t.allowed);
  assert.ok(rejected, "the rejected transition must still be recorded in history");

  const state = await runtime.getState("u1", "living-forest");
  assert.equal(state!.currentLocationId, "entry", "a rejected transition must not move the current location");
});

test("setCurrentLocation moves the pointer without recording a visit; recordVisit records a visit without moving the pointer", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");
  await runtime.unlockLocation("u1", "living-forest", "second");

  const moved = await runtime.setCurrentLocation("u1", "living-forest", "second");
  assert.equal(moved.currentLocationId, "second");
  assert.equal(moved.visitedLocationIds.includes("second"), false);

  const visited = await runtime.recordVisit("u1", "living-forest", "second");
  assert.equal(visited.currentLocationId, "second", "recordVisit must not change the pointer set by setCurrentLocation");
  assert.ok(visited.visitedLocationIds.includes("second"));
});

test("world isolation: state in one world never leaks into another for the same user", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");
  await runtime.unlockLocation("u1", "living-forest", "second");
  await runtime.visitLocation("u1", "living-forest", "second");

  const vrindavanState = await runtime.getState("u1", "living-vrindavan");
  assert.equal(vrindavanState, null, "entering/visiting living-forest must not create state in living-vrindavan");

  await runtime.enterWorld("u1", "living-vrindavan");
  const forestState = await runtime.getState("u1", "living-forest");
  assert.deepEqual(forestState!.visitedLocationIds.sort(), ["entry", "second"]);
});

test("user isolation: two users in the same world have independent state", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("alice", "living-forest");
  await runtime.unlockLocation("alice", "living-forest", "second");
  await runtime.visitLocation("alice", "living-forest", "second");

  const bobState = await runtime.getState("bob", "living-forest");
  assert.equal(bobState, null, "alice's progress must not be visible under bob's userId");

  const bobEntered = await runtime.enterWorld("bob", "living-forest");
  assert.deepEqual(bobEntered.visitedLocationIds, ["entry"]);

  const aliceState = await runtime.getState("alice", "living-forest");
  assert.deepEqual(aliceState!.visitedLocationIds.sort(), ["entry", "second"]);
});

test("empty state: a user who never entered gets null/zeroed/empty reads, never fabricated data", async () => {
  const runtime = makeRuntime();

  assert.equal(await runtime.getState("ghost", "living-forest"), null);

  const progress = await runtime.getProgress("ghost", "living-forest");
  assert.deepEqual(progress, { visitedLocationCount: 0, totalLocationCount: 3, unlockedLocationCount: 0, percentComplete: 0 });

  const history = await runtime.getHistory("ghost", "living-forest");
  assert.deepEqual(history.visits, []);
  assert.deepEqual(history.transitions, []);

  assert.deepEqual(await runtime.getAvailableActivities("ghost", "living-forest"), []);
  assert.equal(await runtime.getNextSuggestedActivity("ghost", "living-forest"), null);
});

test("progress calculation reflects visited/unlocked counts and rounds percentComplete", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");

  let progress = await runtime.getProgress("u1", "living-forest");
  assert.deepEqual(progress, { visitedLocationCount: 1, totalLocationCount: 3, unlockedLocationCount: 1, percentComplete: 33 });

  await runtime.unlockLocation("u1", "living-forest", "second");
  await runtime.visitLocation("u1", "living-forest", "second");
  await runtime.unlockLocation("u1", "living-forest", "third");
  await runtime.visitLocation("u1", "living-forest", "third");

  progress = await runtime.getProgress("u1", "living-forest");
  assert.deepEqual(progress, { visitedLocationCount: 3, totalLocationCount: 3, unlockedLocationCount: 3, percentComplete: 100 });
});

test("getAvailableActivities only returns activities at unlocked locations; getNextSuggestedActivity prefers the current location", async () => {
  const runtime = makeRuntime();
  await runtime.enterWorld("u1", "living-forest");

  let available = await runtime.getAvailableActivities("u1", "living-forest");
  assert.deepEqual(available.map((a) => a.id), ["act-entry"]);

  let next = await runtime.getNextSuggestedActivity("u1", "living-forest");
  assert.equal(next?.id, "act-entry");

  await runtime.unlockLocation("u1", "living-forest", "second");
  await runtime.visitLocation("u1", "living-forest", "second");

  available = await runtime.getAvailableActivities("u1", "living-forest");
  assert.deepEqual(available.map((a) => a.id).sort(), ["act-entry", "act-second"]);

  next = await runtime.getNextSuggestedActivity("u1", "living-forest");
  assert.equal(next?.id, "act-second", "should prefer an activity at the current location");
});
