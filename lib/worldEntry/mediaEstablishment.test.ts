// WORLDK-M14-B5 unit suite: the MEDIA_ESTABLISHED state machine (frozen rules),
// driven by an injected clock so the 30 s window and 10 s debounce are exact.
import { test } from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { ICE_DISCONNECT_DEBOUNCE_MS, MEDIA_ESTABLISHMENT_WINDOW_MS, MediaEstablishment, type MediaInput, type MediaOutput } from "./mediaEstablishment.ts"

const nonce = () => randomBytes(32).toString("base64url")
const T0 = 1_000_000
function run(m: MediaEstablishment, inputs: MediaInput[]): MediaOutput[] {
  return inputs.flatMap((i) => m.input(i))
}
const all = (n: string, at = T0 + 1000): MediaInput[] => [
  { kind: "ICE_STATE", state: "connected", at },
  { kind: "DATA_CHANNEL", open: true, at },
  { kind: "RENDERER_STATS", framesSent: 30, remoteInboundSeen: true, at },
  { kind: "ACK", nonce: n, at },
]

test("frozen constants: 30 s establishment window, 10 s ICE-disconnect debounce", () => {
  assert.equal(MEDIA_ESTABLISHMENT_WINDOW_MS, 30_000)
  assert.equal(ICE_DISCONNECT_DEBOUNCE_MS, 10_000)
})

test("full composite proof -> exactly one STREAM_JOINED, in any input order", () => {
  for (const order of [[0, 1, 2, 3], [3, 2, 1, 0], [2, 0, 3, 1], [1, 3, 0, 2]]) {
    const n = nonce()
    const m = new MediaEstablishment(n, T0)
    const inputs = all(n)
    const out = run(m, order.map((i) => inputs[i]))
    assert.deepEqual(out, [{ kind: "STREAM_JOINED" }], String(order))
    assert.equal(m.phase, "JOINED")
    // repeated inputs (incl. the same correct ack) never produce a second join
    assert.deepEqual(run(m, inputs.concat(inputs)), [])
  }
})

test("every strict subset is NOT joined (WS/playerConnected/ICE connected/DC open/ack alone, no corroboration)", () => {
  const n = nonce()
  const inputs = all(n)
  for (let mask = 0; mask < 15; mask++) {
    const m = new MediaEstablishment(n, T0)
    const out = run(m, inputs.filter((_, i) => mask & (1 << i)))
    assert.deepEqual(out, [], `mask ${mask}`)
    assert.equal(m.phase, "ESTABLISHING")
  }
  // corroboration needs BOTH frames sent and an RTCP receiver report
  for (const stats of [{ framesSent: 0, remoteInboundSeen: true }, { framesSent: 10, remoteInboundSeen: false }]) {
    const m = new MediaEstablishment(n, T0)
    const out = run(m, [inputs[0], inputs[1], { kind: "RENDERER_STATS", ...stats, at: T0 + 1000 }, inputs[3]])
    assert.deepEqual(out, [], JSON.stringify(stats))
  }
})

test("a browser ack alone never bypasses the renderer: ICE disconnected or DC closed at the decisive moment -> no join", () => {
  const n = nonce()
  const m = new MediaEstablishment(n, T0)
  run(m, [{ kind: "ICE_STATE", state: "connected", at: T0 }, { kind: "DATA_CHANNEL", open: true, at: T0 }, { kind: "RENDERER_STATS", framesSent: 5, remoteInboundSeen: true, at: T0 }])
  run(m, [{ kind: "DATA_CHANNEL", open: false, at: T0 + 10 }])
  assert.deepEqual(m.input({ kind: "ACK", nonce: n, at: T0 + 20 }), [])
  assert.deepEqual(m.input({ kind: "DATA_CHANNEL", open: true, at: T0 + 30 }), [{ kind: "STREAM_JOINED" }])
})

test("wrong, malformed, cross-attachment or replayed-from-elsewhere nonce -> MEDIA_FAILED (fail closed), never joined", () => {
  const n = nonce()
  for (const bad of [nonce(), n.slice(0, 42) + (n[42] === "A" ? "B" : "A"), "", 42, null, n + "x", { n }]) {
    const m = new MediaEstablishment(n, T0)
    const out = run(m, [...all(n).slice(0, 3), { kind: "ACK", nonce: bad, at: T0 + 1000 }])
    assert.deepEqual(out, [{ kind: "MEDIA_FAILED", reason: "NONCE_INVALID" }], JSON.stringify(bad))
    assert.deepEqual(m.input({ kind: "ACK", nonce: n, at: T0 + 1001 }), [], "terminal")
  }
})

test("30 s window: completing at exactly 30 s joins; any later input fails with MEDIA_ESTABLISHMENT_TIMEOUT", () => {
  const n = nonce()
  const onTime = new MediaEstablishment(n, T0)
  assert.deepEqual(run(onTime, all(n, T0 + MEDIA_ESTABLISHMENT_WINDOW_MS)), [{ kind: "STREAM_JOINED" }])
  const late = new MediaEstablishment(n, T0)
  run(late, all(n, T0 + 1000).slice(0, 3))
  assert.deepEqual(late.input({ kind: "ACK", nonce: n, at: T0 + MEDIA_ESTABLISHMENT_WINDOW_MS + 1 }), [{ kind: "MEDIA_FAILED", reason: "MEDIA_ESTABLISHMENT_TIMEOUT" }])
  const idle = new MediaEstablishment(n, T0)
  assert.deepEqual(idle.input({ kind: "TICK", at: T0 + MEDIA_ESTABLISHMENT_WINDOW_MS + 1 }), [{ kind: "MEDIA_FAILED", reason: "MEDIA_ESTABLISHMENT_TIMEOUT" }])
  assert.equal(idle.phase, "FAILED")
})

test("before join: ICE failed/closed -> MEDIA_FAILED (no STREAM_LOST, no arrival); disconnected alone waits for the window", () => {
  const n = nonce()
  for (const [state, reason] of [["failed", "ICE_FAILED_BEFORE_JOIN"], ["closed", "ICE_CLOSED_BEFORE_JOIN"]] as const) {
    const m = new MediaEstablishment(n, T0)
    assert.deepEqual(run(m, [{ kind: "ICE_STATE", state: "connected", at: T0 }, { kind: "ICE_STATE", state, at: T0 + 5 }]), [{ kind: "MEDIA_FAILED", reason }])
  }
  const m = new MediaEstablishment(n, T0)
  assert.deepEqual(run(m, [{ kind: "ICE_STATE", state: "disconnected", at: T0 }, { kind: "TICK", at: T0 + 20_000 }]), [])
  assert.deepEqual(run(m, all(n, T0 + 21_000)), [{ kind: "STREAM_JOINED" }], "recovered inside the window")
})

test("after join: ICE failed/closed -> STREAM_LOST immediately, exactly once", () => {
  for (const [state, reason] of [["failed", "ICE_FAILED"], ["closed", "ICE_CLOSED"]] as const) {
    const n = nonce()
    const m = new MediaEstablishment(n, T0)
    run(m, all(n))
    assert.deepEqual(m.input({ kind: "ICE_STATE", state, at: T0 + 5000 }), [{ kind: "STREAM_LOST", reason }])
    assert.deepEqual(run(m, [{ kind: "ICE_STATE", state: "failed", at: T0 + 6000 }, { kind: "TICK", at: T0 + 60_000 }]), [])
    assert.equal(m.phase, "LOST")
  }
})

test("after join: ICE disconnected recovering inside 10 s -> no STREAM_LOST; beyond 10 s -> STREAM_LOST once", () => {
  const n = nonce()
  const m = new MediaEstablishment(n, T0)
  run(m, all(n))
  const d = T0 + 5000
  assert.deepEqual(m.input({ kind: "ICE_STATE", state: "disconnected", at: d }), [])
  assert.deepEqual(m.input({ kind: "TICK", at: d + ICE_DISCONNECT_DEBOUNCE_MS - 1 }), [])
  assert.deepEqual(m.input({ kind: "ICE_STATE", state: "connected", at: d + ICE_DISCONNECT_DEBOUNCE_MS - 1 }), [])
  assert.deepEqual(m.input({ kind: "TICK", at: d + 60_000 }), [], "recovered: debounce cancelled")
  // a second disconnect restarts the debounce from its own start
  const d2 = d + 70_000
  m.input({ kind: "ICE_STATE", state: "disconnected", at: d2 })
  assert.deepEqual(m.input({ kind: "ICE_STATE", state: "disconnected", at: d2 + 5000 }), [], "repeated disconnected keeps the first start")
  assert.deepEqual(m.input({ kind: "TICK", at: d2 + ICE_DISCONNECT_DEBOUNCE_MS - 1 }), [])
  assert.deepEqual(m.input({ kind: "TICK", at: d2 + ICE_DISCONNECT_DEBOUNCE_MS }), [{ kind: "STREAM_LOST", reason: "ICE_DISCONNECTED_10S" }])
  assert.deepEqual(m.input({ kind: "TICK", at: d2 + 20_000 }), [])
})

test("the window no longer applies after join; a nonce is required to be 32-byte base64url", () => {
  const n = nonce()
  const m = new MediaEstablishment(n, T0)
  run(m, all(n))
  assert.deepEqual(m.input({ kind: "TICK", at: T0 + 10 * MEDIA_ESTABLISHMENT_WINDOW_MS }), [])
  assert.deepEqual(m.input({ kind: "ACK", nonce: "wrong-after-join", at: T0 + 11 }), [], "post-join acks are inert")
  assert.equal(m.phase, "JOINED")
  assert.throws(() => new MediaEstablishment("short", T0))
})
