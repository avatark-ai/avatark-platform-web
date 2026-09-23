import assert from "node:assert/strict"
import { test } from "node:test"
import { CanonicalizationError, canonicalBytes, canonicalSerialize } from "./canonicalJson.ts"

// Reference oracle: the ecosystem's existing recursive key-sorted
// canonicalSerialize (dt4m-os packages/contracts/src/recognition/serialize.ts,
// PLT-ADR-014), copied verbatim for comparison only.
function ecosystemCanonicalSerialize(value: unknown): string {
  const sortKeysDeep = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeysDeep)
    if (v !== null && typeof v === "object") {
      const sorted: Record<string, unknown> = {}
      for (const key of Object.keys(v as Record<string, unknown>).sort()) sorted[key] = sortKeysDeep((v as Record<string, unknown>)[key])
      return sorted
    }
    return v
  }
  return JSON.stringify(sortKeysDeep(value))
}

test("CJ1: object key order is independent of insertion order, recursively", () => {
  const a = { b: 1, a: { d: [3, { z: 1, y: 2 }], c: null } }
  const b = { a: { c: null, d: [3, { y: 2, z: 1 }] }, b: 1 }
  assert.equal(canonicalSerialize(a), canonicalSerialize(b))
  assert.equal(canonicalSerialize(a), '{"a":{"c":null,"d":[3,{"y":2,"z":1}]},"b":1}')
})

test("CJ2: array order is preserved", () => {
  assert.notEqual(canonicalSerialize([1, 2]), canonicalSerialize([2, 1]))
})

test("CJ3: null is preserved and distinguished from an absent key", () => {
  assert.equal(canonicalSerialize({ a: null }), '{"a":null}')
  assert.equal(canonicalSerialize({}), "{}")
  assert.notEqual(canonicalSerialize({ a: null }), canonicalSerialize({}))
})

test("CJ4: unsupported / non-JSON values are rejected, never silently dropped or coerced", () => {
  class Custom { x = 1 }
  const cyclic: Record<string, unknown> = {}
  cyclic.self = cyclic
  const cases: unknown[] = [
    undefined, { a: undefined }, [undefined], NaN, Infinity, -Infinity, -0, BigInt(1), () => 1, Symbol("s"),
    new Date(0), new Map(), new Set(), new Custom(), cyclic, { [Symbol("k")]: 1 }, [1, , 3],
  ]
  for (const value of cases) assert.throws(() => canonicalSerialize(value), CanonicalizationError)
})

test("CJ5: UTF-8 bytes are deterministic, including non-ASCII strings and key sorting by code unit", () => {
  const value = { "é": "ॐ कृष्ण", "Z": "z", "a": " " }
  assert.equal(canonicalSerialize(value), '{"Z":"z","a":" ","é":"ॐ कृष्ण"}')
  assert.deepEqual(canonicalBytes(value), Buffer.from(canonicalSerialize(value), "utf8"))
})

test("CJ6: for every accepted value, output is byte-identical to the ecosystem canonicalSerialize", () => {
  const samples: unknown[] = [
    null, true, 0, 1.5, "s", [], {}, [{ b: 2, a: 1 }], { z: [1, "2", null, { y: false }], a: { c: "", b: 0.1 } },
  ]
  for (const sample of samples) assert.equal(canonicalSerialize(sample), ecosystemCanonicalSerialize(sample))
})

test("CJ7: null-prototype objects are accepted as plain objects", () => {
  const o = Object.create(null) as Record<string, unknown>
  o.b = 1
  o.a = 2
  assert.equal(canonicalSerialize(o), '{"a":2,"b":1}')
})
