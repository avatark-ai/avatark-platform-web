import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ECOSYSTEM_STAGE_ORDER,
  ecosystemStageForProduct,
  healthStatusFromAdapterResult,
  STAGE_OWNER,
} from "./ecosystemMap.ts";
import { INTEGRATION_STAGE_ORDER } from "./stages.ts";

test("ECOSYSTEM_STAGE_ORDER is the mission's 7-node chain", () => {
  assert.deepEqual(ECOSYSTEM_STAGE_ORDER, ["Avatar", "Echo", "Prometheus", "Living Echo", "Arena", "Stream", "Cinema"]);
});

test("ecosystemStageForProduct maps every INTEGRATION_STAGE_ORDER entry, never Avatar or Cinema", () => {
  const expected: Record<string, string> = {
    AvatarK: "Echo",
    StreamK: "Stream",
    Prometheus: "Prometheus",
    "Living Echo": "Living Echo",
    Arena: "Arena",
  };
  for (const product of INTEGRATION_STAGE_ORDER) {
    const stage = ecosystemStageForProduct(product);
    assert.equal(stage, expected[product]);
    assert.notEqual(stage, "Avatar");
    assert.notEqual(stage, "Cinema");
  }
});

test("healthStatusFromAdapterResult: not_implemented always reads as missing_contract regardless of accepted", () => {
  assert.equal(healthStatusFromAdapterResult({ accepted: false, availability: "not_implemented", message: "" }), "missing_contract");
});

test("healthStatusFromAdapterResult: available + accepted reads as ready", () => {
  assert.equal(healthStatusFromAdapterResult({ accepted: true, availability: "available", message: "" }), "ready");
});

test("healthStatusFromAdapterResult: available + not accepted reads as waiting", () => {
  assert.equal(healthStatusFromAdapterResult({ accepted: false, availability: "available", message: "" }), "waiting");
});

test("STAGE_OWNER names every ecosystem stage, never a blank", () => {
  for (const stage of ECOSYSTEM_STAGE_ORDER) {
    assert.ok(STAGE_OWNER[stage]?.length > 0, `${stage} has no owner`);
  }
});
