// @avatark/runtime-bridge — portable, renderer-neutral RuntimeBridge protocol (WORLDK-M14-B1/B2).
//
// OWNS: protocol types, schema/version constants, renderer-fact vocabulary,
// the local bridge state machine, message validation, commandFor,
// stateAfterReply, authority/firewall constants, the JSON Schema, conformance
// fixtures and implementation-neutral test vectors.
// NEVER OWNS: Supabase/DB/service-role access, lifecycle persistence,
// continuity writes, identity, allocation, resolver, tickets, registration,
// secrets, Platform URLs, Pixel Streaming, signalling or GPU provisioning.
// Transport and credentials are injected by the runtime adapter.
//
// Normative cross-language authority: spec/RUNTIME_BRIDGE_PROTOCOL_v1.md +
// schemas/v1/*.json + fixtures/v1/*.json. This TypeScript is one implementation.
export * from "./protocol.ts"
export * from "./bridge.ts"
