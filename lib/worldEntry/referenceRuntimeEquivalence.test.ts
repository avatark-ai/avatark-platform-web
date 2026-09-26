// WORLDK-M14-B2 behavior equivalence: the SDK-backed ReferenceRuntime against
// the FROZEN pre-B2 implementation (testing/referenceRuntime.legacy.ts).
//
// Both run the same scripted scenarios against identical deterministic
// in-memory ingress simulators with a shared fake clock. The wire traces
// (op + body, receipt ids normalized) and the emitted RuntimeEvents must be
// identical. The real-Postgres suites (entry authority, A5 schedule, A4
// liveness, B1/B2 conformance) additionally run the new runtime against the
// real 040 authority unchanged.
import { test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { ReferenceRuntime, type IngressTransport, type RuntimeEvent } from "./referenceRuntime.ts"
import { ReferenceRuntime as LegacyRuntime } from "./testing/referenceRuntime.legacy.ts"

type Sess = { sessionId: string; visitId: string; subjectId: string; worldId: string; reconnect: boolean; claimed: boolean; joined: boolean; leaveRequested: boolean; ended: boolean }

/** A deterministic model of the Runtime Ingress replies the reference runtime relies on. */
class FakeIngress {
  sessions: Sess[] = []
  unauthorized = false
  refuseNext: Partial<Record<string, { status: number; error: string }>> = {}
  trace: string[] = []
  add(over: Partial<Sess> = {}) {
    const s: Sess = { sessionId: randomUUID(), visitId: randomUUID(), subjectId: randomUUID(), worldId: "living-forest", reconnect: false, claimed: false, joined: false, leaveRequested: false, ended: false, ...over }
    this.sessions.push(s)
    return s
  }
  transport(): IngressTransport {
    return {
      post: async (op, body) => {
        this.trace.push(`${op} ${JSON.stringify(body, (k, v) => (k === "receiptId" ? "<rid>" : v))}`)
        if (this.unauthorized) return { status: 401, body: { error: "RUNTIME_UNAUTHORIZED" } }
        const refuse = this.refuseNext[op]
        if (refuse) {
          delete this.refuseNext[op]
          return { status: refuse.status, body: { error: refuse.error } }
        }
        if (op === "poll") return { status: 200, body: { heartbeatSeconds: 15, graceSeconds: 120, sessions: this.sessions.filter((s) => !s.ended).map((s) => ({ sessionId: s.sessionId, visitId: s.visitId, subjectId: s.subjectId, worldId: s.worldId, reconnect: s.reconnect, claimed: s.claimed, joined: s.joined, leaveRequested: s.leaveRequested })) } }
        const s = this.sessions.find((x) => x.sessionId === body.sessionId)
        if (!s) return { status: 403, body: { error: "SESSION_NOT_BOUND" } }
        if (s.ended) return { status: 409, body: { error: "SESSION_ENDED" } }
        switch (op) {
          case "claim":
            s.claimed = true
            return { status: 200, body: { sessionId: s.sessionId, visitId: s.visitId, subjectId: s.subjectId, worldId: s.worldId, placeId: "forest-clearing", reconnect: s.reconnect } }
          case "arrival":
            if (!s.claimed) return { status: 409, body: { error: "SESSION_NOT_CLAIMED" } }
            if (s.joined) return { status: 200, body: { outcome: "ALREADY_JOINED" } }
            s.joined = true
            return { status: 200, body: { outcome: s.reconnect ? "SESSION_RESUMED" : "VISIT_OPENED" } }
          case "presence":
            if (!s.joined) return { status: 409, body: { error: "SESSION_NOT_JOINED" } }
            return { status: 200, body: { outcome: "PRESENCE_RECORDED", leaveRequested: s.leaveRequested } }
          case "departure":
            if (!s.joined) return { status: 409, body: { error: "SESSION_NOT_JOINED" } }
            s.ended = true
            return { status: 200, body: { outcome: "VISIT_CLOSED" } }
          case "disconnect":
            s.ended = true
            return { status: 200, body: { outcome: "GRACE_RUNNING" } }
        }
        return { status: 404, body: { error: "NOT_FOUND" } }
      },
    }
  }
}

type AnyRuntime = ReferenceRuntime | LegacyRuntime
interface World { ingress: FakeIngress; events: RuntimeEvent[]; clock: { t: number }; make: (opts?: { autoJoin?: boolean; readiness?: "STARTING" | "READY" }) => AnyRuntime }

/** Runs `script` once with each implementation on identical simulators; returns both traces. */
async function compare(name: string, script: (w: World, rt: AnyRuntime) => Promise<void>, opts?: { autoJoin?: boolean; readiness?: "STARTING" | "READY" }) {
  const run = async (Impl: typeof ReferenceRuntime | typeof LegacyRuntime) => {
    const ingress = new FakeIngress()
    const events: RuntimeEvent[] = []
    const clock = { t: 1_000_000 }
    const ids: string[] = []
    // deterministic ids so both runs address the same sessions
    const make = (o?: { autoJoin?: boolean; readiness?: "STARTING" | "READY" }) => new Impl(ingress.transport(), { now: () => clock.t, onEvent: (e) => events.push(e), ...o })
    const w: World = { ingress, events, clock, make }
    const origAdd = ingress.add.bind(ingress)
    ingress.add = (over = {}) => {
      const n = ids.length
      const s = origAdd({ sessionId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, visitId: over.reconnect ? `00000000-0000-4000-9000-000000000000` : `00000000-0000-4000-9000-${String(n).padStart(12, "0")}`, subjectId: "00000000-0000-4000-a000-000000000001", ...over })
      ids.push(s.sessionId)
      return s
    }
    await script(w, make(opts))
    return { trace: ingress.trace, events }
  }
  const legacy = await run(LegacyRuntime)
  const sdk = await run(ReferenceRuntime)
  assert.ok(legacy.trace.length > 0, `${name}: the scenario exercises the wire`)
  assert.deepEqual(sdk.trace, legacy.trace, `${name}: identical wire trace`)
  assert.deepEqual(sdk.events, legacy.events, `${name}: identical runtime events`)
  return legacy
}

const tick = async (w: World, rt: AnyRuntime, n = 1, dt = 16_000) => {
  for (let i = 0; i < n; i++) {
    await rt.step()
    w.clock.t += dt
  }
}

test("equivalence: normal visit — claim, arrival, heartbeats on schedule, Platform leave request -> departure", async () => {
  const r = await compare("normal", async (w, rt) => {
    const s = w.ingress.add()
    await tick(w, rt, 1, 5_000) // claim + arrival
    await tick(w, rt, 1, 5_000) // heartbeat not yet due (5 s < 15 s)
    await tick(w, rt, 3)
    s.leaveRequested = true
    await tick(w, rt, 2)
  })
  assert.ok(r.trace.some((x) => x.startsWith("departure")))
})

test("equivalence: STARTING readiness and readiness change", async () => {
  await compare("readiness", async (w, rt) => {
    await rt.poll()
    ;(rt as ReferenceRuntime).setReadiness("READY")
    w.ingress.add()
    await tick(w, rt, 2)
  }, { readiness: "STARTING" })
})

test("equivalence: auto-join off claims without arrival; enabling it later joins", async () => {
  await compare("autoJoin", async (w, rt) => {
    w.ingress.add()
    await tick(w, rt, 2)
    ;(rt as ReferenceRuntime).setAutoJoin(true)
    await tick(w, rt, 2)
  }, { autoJoin: false })
})

test("equivalence: stream drop is a disconnect; the dropped session is left alone; reconnect session resumes", async () => {
  await compare("disconnect+reconnect", async (w, rt) => {
    const s = w.ingress.add()
    await tick(w, rt, 2)
    assert.equal(await rt.disconnect(s.sessionId), "GRACE_RUNNING")
    await tick(w, rt, 1)
    w.ingress.add({ reconnect: true })
    await tick(w, rt, 3)
  })
})

test("equivalence: suspended heartbeats (hung runtime) send no presence", async () => {
  await compare("suspended", async (w, rt) => {
    w.ingress.add()
    await tick(w, rt, 1)
    ;(rt as ReferenceRuntime).suspendHeartbeats()
    await tick(w, rt, 4)
  })
})

test("equivalence: a restarted runtime process (no memory) re-claims and heartbeats a joined session", async () => {
  await compare("restart", async (w, rt) => {
    w.ingress.add()
    await tick(w, rt, 1)
    const fresh = w.make()
    await tick(w, fresh, 3)
  })
})

test("equivalence: refusals are reported identically and retried identically", async () => {
  await compare("refusals", async (w, rt) => {
    w.ingress.add()
    w.ingress.refuseNext.claim = { status: 503, error: "UNAVAILABLE" }
    await tick(w, rt, 1)
    w.ingress.refuseNext.arrival = { status: 503, error: "UNAVAILABLE" }
    await tick(w, rt, 1)
    await tick(w, rt, 1)
    w.ingress.refuseNext.presence = { status: 503, error: "UNAVAILABLE" }
    await tick(w, rt, 2)
    w.ingress.unauthorized = true
    await tick(w, rt, 2)
    assert.equal(await rt.poll(), null)
  })
})

test("equivalence: direct calls on unknown sessions send nothing", async () => {
  const run = async (rt: AnyRuntime, ingress: FakeIngress) => {
    const x = randomUUID()
    return [await rt.join(x), await rt.heartbeat(x), await rt.leave(x), await rt.disconnect(x), ingress.trace.length]
  }
  const a = new FakeIngress()
  const b = new FakeIngress()
  assert.deepEqual(await run(new ReferenceRuntime(b.transport()), b), await run(new LegacyRuntime(a.transport()), a))
  assert.equal(b.trace.length, 0)
})
