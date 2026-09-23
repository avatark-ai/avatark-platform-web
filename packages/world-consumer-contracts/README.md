# @avatark/world-consumer-contracts

| | |
|---|---|
| Owner | **AvatarK Platform** |
| Consumers | WorldK and future approved consumer surfaces |
| WorldK | consumer only |
| Contract version | **1.0** (consumers accept any `1.x`) |
| Source of truth | `schemas/v1/*.schema.json`, byte-identical to the frozen `WORLDK-M07-CONSUMPTION-CONTRACT-FREEZE-01` pack (`schemas/v1/CHECKSUMS.sha256`) |

Exports typed equivalents of the frozen M07 contracts:
`PublicWorldProjection`, `VisitorWorldProjection` (incl. `SinceYouWereHere`),
`WorldEntryIntent` / `WorldEntryResult`, `NarrativeContext`, and the shared
id / freshness / significance primitives. Also exports `CONTRACT_OWNERSHIP`
and `FORBIDDEN_CONSUMER_FIELD_NAMES` (used by producer conformance tests).

Rules:
- Never change v1 semantics. Additive MINOR changes only (new optional
  fields / enum values); anything else is a new MAJOR and a new `schemas/v2`.
- No runtime, kernel, compiler or infrastructure types may be imported here.
- Producers live in the platform Host (`lib/worldConsumer/`), not in this package.
