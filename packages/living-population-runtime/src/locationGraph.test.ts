import { test } from "node:test"
import assert from "node:assert/strict"
import { buildUndirectedLocationGraph, reachableNeighbors } from "./locationGraph.ts"

test("a directed edge list becomes reachable in both directions", () => {
  const graph = buildUndirectedLocationGraph([{ from: "a", to: "b" }, { from: "b", to: "c" }])
  assert.deepEqual(reachableNeighbors(graph, "a"), ["b"])
  assert.deepEqual(reachableNeighbors(graph, "b").sort(), ["a", "c"])
  assert.deepEqual(reachableNeighbors(graph, "c"), ["b"])
})

test("a location with no edges has no reachable neighbors, not an error", () => {
  const graph = buildUndirectedLocationGraph([{ from: "a", to: "b" }])
  assert.deepEqual(reachableNeighbors(graph, "isolated"), [])
})

test("duplicate edges do not duplicate neighbor entries", () => {
  const graph = buildUndirectedLocationGraph([{ from: "a", to: "b" }, { from: "a", to: "b" }])
  assert.deepEqual(reachableNeighbors(graph, "a"), ["b"])
})
