// PLT-ADR-015 §5: the ONE deterministic canonical serialization shared by the
// Certification Authority (issuer) and every verifier. It is used for the
// subject digest and for the signed-record bytes.
//
// Specification: AVATARK_CANONICAL_JSON_V1
//   - Supported values: null, true/false, finite numbers, strings, arrays and
//     plain objects (prototype Object.prototype or null). Nothing else.
//   - Object keys are sorted recursively by UTF-16 code unit order (the
//     default Array.prototype.sort order), independent of insertion order.
//   - Array order is preserved. Sparse arrays are rejected.
//   - An ABSENT key is simply not emitted. A key PRESENT with the value
//     `undefined` is rejected -- never silently dropped -- so absent and
//     undefined can never collide. `null` is preserved as `null`.
//   - Rejected (throws CanonicalizationError): undefined, functions,
//     symbols, bigint, NaN, +/-Infinity, -0, Date, Map, Set, class
//     instances, symbol-keyed properties, cyclic structures.
//   - Scalars are encoded exactly as JSON.stringify encodes them; no
//     whitespace is emitted.
//   - Bytes are the UTF-8 encoding of the resulting string.
//
// For every value this profile accepts, the output is byte-identical to the
// ecosystem's existing recursive key-sorted `canonicalSerialize`
// (dt4m-os packages/contracts/src/recognition/serialize.ts, reused by
// PLT-ADR-014). This profile only adds explicit rejection of values that
// plain JSON.stringify would silently drop or coerce.

export const CANONICAL_JSON_SCHEME = "AVATARK_CANONICAL_JSON_V1" as const

export class CanonicalizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CanonicalizationError"
  }
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function encode(value: unknown, path: string, stack: Set<object>): string {
  if (value === null) return "null"
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false"
    case "string":
      return JSON.stringify(value)
    case "number":
      if (!Number.isFinite(value)) throw new CanonicalizationError(`${path}: non-finite number is not canonical JSON`)
      if (Object.is(value, -0)) throw new CanonicalizationError(`${path}: -0 is not canonical JSON`)
      return JSON.stringify(value)
    case "undefined":
      throw new CanonicalizationError(`${path}: undefined is not canonical JSON (omit the key instead)`)
    case "bigint":
    case "function":
    case "symbol":
      throw new CanonicalizationError(`${path}: ${typeof value} is not canonical JSON`)
  }

  const obj = value as object
  if (stack.has(obj)) throw new CanonicalizationError(`${path}: cyclic structure is not canonical JSON`)
  stack.add(obj)
  try {
    if (Array.isArray(obj)) {
      const parts: string[] = []
      for (let i = 0; i < obj.length; i++) {
        if (!(i in obj)) throw new CanonicalizationError(`${path}[${i}]: sparse array hole is not canonical JSON`)
        parts.push(encode(obj[i], `${path}[${i}]`, stack))
      }
      return `[${parts.join(",")}]`
    }
    if (!isPlainObject(obj)) {
      throw new CanonicalizationError(`${path}: only plain objects are canonical JSON (got ${Object.prototype.toString.call(obj)})`)
    }
    if (Object.getOwnPropertySymbols(obj).length > 0) {
      throw new CanonicalizationError(`${path}: symbol-keyed properties are not canonical JSON`)
    }
    const record = obj as Record<string, unknown>
    const keys = Object.keys(record).sort()
    const parts = keys.map((key) => `${JSON.stringify(key)}:${encode(record[key], `${path}.${key}`, stack)}`)
    return `{${parts.join(",")}}`
  } finally {
    stack.delete(obj)
  }
}

/** Canonical JSON text of `value` per AVATARK_CANONICAL_JSON_V1. Throws CanonicalizationError on unsupported input. */
export function canonicalSerialize(value: unknown): string {
  return encode(value, "$", new Set())
}

/** UTF-8 bytes of canonicalSerialize(value). */
export function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(canonicalSerialize(value), "utf8")
}
