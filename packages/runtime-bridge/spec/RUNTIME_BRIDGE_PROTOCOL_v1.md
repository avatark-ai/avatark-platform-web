# RuntimeBridge Protocol — v1 (normative)

Status: **FROZEN** (WORLDK-M14-B1, schemaVersion `1.0`). Packaged in M14-B2 as `@avatark/runtime-bridge`.

This document, `schemas/v1/runtime-bridge-message.schema.json` and `fixtures/v1/*.json` are the **cross-language authority**. The TypeScript in `src/` is one conforming implementation. Where it differs from this document, this document wins, and the difference is a TypeScript defect. An Unreal (C++) bridge implements this document and must pass the same fixtures.

The key words MUST, MUST NOT and MAY are normative.

## 1. Roles
- **Platform** (AvatarK Runtime Ingress): the **sole lifecycle authority**. It derives subject, visit, allocation, time, tick, place and authority. It decides whether a Visit opens, continues or closes.
- **Bridge**: a renderer runtime's adapter. It reports **facts about its own sessions** as evidence. It is never an authority.
- **Transport**: owned by the runtime adapter (HTTP endpoint, per-instance credential, timeouts, retries). The protocol defines no URL, credential format or transport.

## 2. Message
```
{ "protocol": "worldk.runtime-bridge", "schemaVersion": "<MAJOR>.<MINOR>", "event": <RendererEvent> }
```
A message and its event MUST NOT contain: `subjectId, visitId, allocationId, instanceId, occurredAt, worldTick, tick, placeId, authority, authorityKind, eventType, basis`. A receiver MUST reject such a message.

## 3. Renderer events
| kind | fields | meaning |
|---|---|---|
| RENDERER_AVAILABLE | `readiness`: STARTING \| READY | the renderer is up and asks for work |
| ALLOCATION_ACQUIRED | `sessionId` (uuid) | the renderer takes a session the Platform listed for it |
| STREAM_JOINED | `sessionId` | the visitor's stream/session is established on this renderer |
| PRESENCE_TICK | `sessionId` | the joined session is healthy |
| STREAM_LOST | `sessionId` | the media connection dropped (e.g. WebRTC) |
| VISITOR_LEFT | `sessionId` | explicit leave or session completion (including a Platform leave request) |
| RENDERER_ABANDONED | — | informational only: the renderer is going away |
| WORLD_INTERACTION | `intent` {`type`, …} | a world-simulation interaction (e.g. enter-world, leave-world, visit-location) |

## 4. Local session state (non-authoritative)
`UNCLAIMED → CLAIMED → JOINED → { DEPARTED | DROPPED | ENDED_BY_PLATFORM }`. The last three are terminal.

## 5. Mapping (the only translation to ingress operations)
| event | required local state | ingress op | body | state on success |
|---|---|---|---|---|
| RENDERER_AVAILABLE | any | poll | `{readiness}` | unchanged |
| ALLOCATION_ACQUIRED | UNCLAIMED | claim | `{sessionId}` | CLAIMED |
| STREAM_JOINED | CLAIMED | arrival | `{receiptId, sessionId, worldId}` | JOINED |
| PRESENCE_TICK | JOINED | presence | same | JOINED |
| STREAM_LOST | CLAIMED or JOINED | **disconnect** | same | DROPPED |
| VISITOR_LEFT | JOINED | departure | same | DEPARTED |
| RENDERER_ABANDONED | any | **none** | — | — |
| WORLD_INTERACTION | any | **none** | — | — |

Rules:
- Any other (event, state) pair MUST NOT produce an ingress op. That includes every event on a terminal state.
- `receiptId` MUST be a fresh uuid per receipt.
- `worldId` MUST be the value from the Platform's claim reply, never chosen by the renderer.
- Bodies MUST contain exactly the listed fields.

## 6. Lifecycle firewall
1. STREAM_LOST MUST map to `disconnect` (grace), **never** to `departure`.
2. Only VISITOR_LEFT MAY produce `departure`. Only STREAM_JOINED MAY produce `arrival`.
3. A reconnect is a **new** Platform session, created when the visitor re-enters through the Platform (its claim reply has `reconnect: true`). Its STREAM_JOINED is an `arrival` that the Platform answers `SESSION_RESUMED`: the same Visit, and no second lifecycle arrival. A bridge MUST NOT revive a DROPPED session.
4. Abandonment produces nothing. The Platform closes the Visit by presence timeout, and a bridge MUST NOT fabricate a departure.
5. WORLD_INTERACTION, including `enter-world` and `leave-world`, MUST NEVER produce an ingress op. Visitor lifecycle is exclusively the ingress/receipt path.

## 7. Replies
- **HTTP 200:**
  - presence → `VISIT_TIMED_OUT` means ENDED_BY_PLATFORM
  - departure → `ALREADY_CLOSED_*` means ENDED_BY_PLATFORM
  - otherwise, the success state from §5
- **Non-200** with error `SESSION_ENDED | VISIT_CLOSED | ALLOCATION_RELEASED | NO_OPEN_VISIT` → ENDED_BY_PLATFORM. The bridge stops acting on that session and does not argue.
- **Any other failure** (auth, 5xx, network) leaves the state unchanged. The adapter MAY retry later.
- The `disconnect` reply for a session that never joined is `GRACE_RUNNING` with `graceEndsAt: null` (no Visit exists yet). See fixture 09.

## 8. Platform facts win (reconciliation)
When a poll reply lists a session as `joined: true` and the local state is CLAIMED, the local state becomes JOINED. This covers, for example, a restarted renderer process. It never regresses a state, never leaves a terminal state, and never replaces the claim: the binding comes only from a claim reply.

## 9. Versioning
- Same MAJOR, same or older MINOR → accept.
- Same MAJOR, newer MINOR → accept, and ignore unknown fields. Unknown event kinds are still rejected.
- **Different MAJOR → RESYNC_REQUIRED.** Fail closed: do not interpret the message.
- Malformed input → reject. A receiver MUST NOT crash on any input.

## 10. Conformance
An implementation conforms if:
- every `fixtures/v1/08-versioning.json` message gets the stated result, and schema validity matches;
- every scenario fixture (`01`–`07`, `09`) produces exactly the stated op, reply outcome, state, refusal or no-op at each step, against a Platform that implements M14-A.

The AvatarK Platform executes the scenario fixtures against its real authority (`lib/worldEntry/runtimeBridge.postgres.test.ts`).
