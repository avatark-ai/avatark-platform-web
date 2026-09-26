# @avatark/runtime-bridge

Portable, renderer-neutral **RuntimeBridge protocol v1** (WORLDK-M14-B1, packaged in M14-B2): the contract between a renderer runtime and the AvatarK Platform Runtime Ingress.

- **Normative:** `spec/RUNTIME_BRIDGE_PROTOCOL_v1.md`, `schemas/v1/runtime-bridge-message.schema.json` and `fixtures/v1/`. These are the cross-language authority, for example for an M15 Unreal (C++) bridge.
- **TypeScript implementation:** `src/`
  - `protocol.ts`: types, `parseBridgeMessage`, `commandFor`, `stateAfterReply`, `AUTHORITY_MATRIX`, `FORBIDDEN_BRIDGE_FIELDS`, `RUNTIME_OPS`
  - `bridge.ts`: `RuntimeBridge` driver, `RuntimeBridgeTransport`, `reconcileWithWork`

**Not a lifecycle authority.** This package has no networking, credentials, URLs, database/Supabase access, identity, allocation, tickets, registration, Pixel Streaming, signalling or GPU code. A runtime adapter injects the transport:

```ts
import { RuntimeBridge } from "@avatark/runtime-bridge"
const bridge = new RuntimeBridge({ transport: { post: (op, body) => myIngressClient.post(op, body) } })
await bridge.handle({ kind: "RENDERER_AVAILABLE", readiness: "READY" })
```

The Platform's reference runtime (`lib/worldEntry/referenceRuntime.ts`) is the first adapter.
