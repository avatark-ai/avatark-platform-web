import { test } from "node:test";
import assert from "node:assert/strict";
import { describeIntegrationHealth } from "./health.ts";
import { ECOSYSTEM_STAGE_ORDER } from "./ecosystemMap.ts";

test("describeIntegrationHealth returns exactly the 7 ecosystem stages, in order", () => {
  const health = describeIntegrationHealth();
  assert.deepEqual(
    health.map((entry) => entry.stage),
    ECOSYSTEM_STAGE_ORDER
  );
});

test("Avatar and Echo are statically ready -- the pre-existing platform layer", () => {
  const health = describeIntegrationHealth();
  assert.equal(health.find((e) => e.stage === "Avatar")?.status, "ready");
  assert.equal(health.find((e) => e.stage === "Echo")?.status, "ready");
});

test("Cinema is statically optional -- no adapter exists for it anywhere", () => {
  const health = describeIntegrationHealth();
  assert.equal(health.find((e) => e.stage === "Cinema")?.status, "optional");
});

test("Stream reads missing_contract -- streamkAdapter is always not_implemented", () => {
  const health = describeIntegrationHealth();
  assert.equal(health.find((e) => e.stage === "Stream")?.status, "missing_contract");
});

test("Prometheus reads waiting -- the-promise-to-myself has no verified PrometheusK match today", () => {
  const health = describeIntegrationHealth();
  const entry = health.find((e) => e.stage === "Prometheus");
  assert.equal(entry?.status, "waiting");
  assert.match(entry!.message, /no verified PrometheusK match/);
});

test("Living Echo reads ready -- the RC5 signed-receipt loop is real today", () => {
  const health = describeIntegrationHealth();
  assert.equal(health.find((e) => e.stage === "Living Echo")?.status, "ready");
});

test("Arena reads missing_contract -- arenaAdapter is always not_implemented", () => {
  const health = describeIntegrationHealth();
  assert.equal(health.find((e) => e.stage === "Arena")?.status, "missing_contract");
});

test("every message is non-empty -- never a fabricated silent status", () => {
  for (const entry of describeIntegrationHealth()) {
    assert.ok(entry.message.length > 0, `${entry.stage} has an empty message`);
  }
});
