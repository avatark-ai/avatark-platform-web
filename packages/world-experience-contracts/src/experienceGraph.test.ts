import { test } from "node:test"
import assert from "node:assert/strict"
import { EXPERIENCE_GRAPH, isValidExperienceTransition, reachableStagesFrom } from "./experienceGraph.ts"

test("every stage named in EXPERIENCE_GRAPH is reachable from WORLD_ENTRY", () => {
  const stagesInGraph = new Set(EXPERIENCE_GRAPH.flatMap((t) => [t.from, t.to]))
  const visited = new Set<string>(["WORLD_ENTRY"])
  const frontier = ["WORLD_ENTRY"]
  while (frontier.length > 0) {
    const current = frontier.pop()!
    for (const next of reachableStagesFrom(current as never)) {
      if (!visited.has(next)) {
        visited.add(next)
        frontier.push(next)
      }
    }
  }
  for (const stage of stagesInGraph) assert.ok(visited.has(stage), `${stage} must be reachable from WORLD_ENTRY`)
})

test("the graph is not a linear scripted sequence -- ORIENTATION and CONTINUED_EXPLORATION each branch to more than one next stage", () => {
  assert.ok(reachableStagesFrom("ORIENTATION").length > 1)
  assert.ok(reachableStagesFrom("CONTINUED_EXPLORATION").length > 1)
})

test("a visitor may depart from more than one stage -- DEPARTURE is not reachable only from one scripted 'ending'", () => {
  const incomingToDeparture = EXPERIENCE_GRAPH.filter((t) => t.to === "DEPARTURE")
  assert.ok(incomingToDeparture.length > 1)
})

test("isValidExperienceTransition agrees with EXPERIENCE_GRAPH membership, both directions", () => {
  assert.equal(isValidExperienceTransition("WORLD_ENTRY", "ARRIVAL"), true)
  assert.equal(isValidExperienceTransition("ARRIVAL", "WORLD_ENTRY"), false)
  assert.equal(isValidExperienceTransition("ABSENCE", "ORIENTATION"), false)
})

test("ABSENCE only ever leads to RETURN -- the world continues on its own, the visitor's experience graph does not branch during an absence", () => {
  assert.deepEqual(reachableStagesFrom("ABSENCE"), ["RETURN"])
})

test("RETURN leads to RECOGNITION_OF_CHANGE before re-joining ORIENTATION -- a returning visitor is never silently dropped back into the graph with no acknowledgment of continuity", () => {
  assert.deepEqual(reachableStagesFrom("RETURN"), ["RECOGNITION_OF_CHANGE"])
  assert.ok(reachableStagesFrom("RECOGNITION_OF_CHANGE").includes("ORIENTATION"))
})
