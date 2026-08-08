import { test } from "node:test";
import assert from "node:assert/strict";
import { LIVING_VRINDAVAN_DEFINITION, LIVING_VRINDAVAN_PROVENANCE } from "./vrindavanDefinition.ts";

// Proves the StudioK artifact -> Runtime WorldDefinition conversion is
// correct, not just that it loads. The artifact itself was already
// schema-validated in studiok-specifications (STK-SPEC-002); this test's
// job is the Host-side translation logic in vrindavanDefinition.ts.

test("loads the vendored StudioK artifact with the authorized world identity", () => {
  assert.equal(LIVING_VRINDAVAN_DEFINITION.id, "living-vrindavan");
  assert.equal(LIVING_VRINDAVAN_DEFINITION.name, "Living Vrindavan");
  assert.equal(LIVING_VRINDAVAN_DEFINITION.entryLocationId, "vrindavan-entry");
  assert.match(LIVING_VRINDAVAN_DEFINITION.description ?? "", /Krishna/);
});

test("carries exactly the four authorized locations, no more, no fewer", () => {
  const ids = LIVING_VRINDAVAN_DEFINITION.locations.map((l) => l.id).sort();
  assert.deepEqual(ids, ["govardhan-path", "kadamba-grove", "vrindavan-entry", "yamuna"]);
});

test("derives order by breadth-first distance from the entry location", () => {
  const orderOf = (id: string) => LIVING_VRINDAVAN_DEFINITION.locations.find((l) => l.id === id)!.order;
  assert.equal(orderOf("vrindavan-entry"), 0);
  assert.equal(orderOf("yamuna"), 1);
  assert.equal(orderOf("kadamba-grove"), 2);
  assert.equal(orderOf("govardhan-path"), 2);
});

test("derives requiresLocationIds from the artifact's connections graph, matching the authorized topology exactly", () => {
  const requiresOf = (id: string) => LIVING_VRINDAVAN_DEFINITION.locations.find((l) => l.id === id)!.requiresLocationIds;
  assert.deepEqual(requiresOf("vrindavan-entry"), undefined);
  assert.deepEqual(requiresOf("yamuna"), ["vrindavan-entry"]);
  assert.deepEqual(requiresOf("kadamba-grove"), ["yamuna"]);
  assert.deepEqual(requiresOf("govardhan-path"), ["yamuna"]);
});

test("builds exactly one reflection-capable activity, at Yamuna only, never fabricated for the other three locations", () => {
  assert.equal(LIVING_VRINDAVAN_DEFINITION.activities.length, 1);
  const [activity] = LIVING_VRINDAVAN_DEFINITION.activities;
  assert.equal(activity.locationId, "yamuna");
  assert.equal(activity.description, "What becomes visible when you stop trying to control the current?");
  assert.equal(activity.reflectionRef?.source, "studiok-canon");
  assert.equal(activity.reflectionRef?.reflectionId, "living-vrindavan#yamuna");
});

test("provenance traces back to all five Approved Canon documents and the Approved Specification", () => {
  assert.deepEqual(LIVING_VRINDAVAN_PROVENANCE.canonDocIds, ["STK-CAN-001", "STK-CAN-002", "STK-CAN-003", "STK-CAN-004", "STK-CAN-005"]);
  assert.equal(LIVING_VRINDAVAN_PROVENANCE.specId, "STK-SPEC-002");
});
