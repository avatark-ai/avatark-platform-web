import type { ExperienceEventInput, ExperienceMetadata } from "./types.ts"

// namespace.verb_phrase, lowercase, dot-separated -- deliberately permissive
// about *which* namespaces/verbs exist (see eventTypes.ts) but strict about
// *shape*, so "unknown but well-formed" event types stay welcome while
// garbage ("BadType", "no-dot-here", "") is rejected.
const EXPERIENCE_TYPE_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*(_[a-z0-9]+)*)+$/

export const MAX_METADATA_KEYS = 32
export const MAX_METADATA_VALUE_LENGTH = 512
export const MAX_METADATA_BYTES = 4096

// Deliberately broad -- catches the common secret-shaped key names rather
// than trying to detect secret-shaped *values* (impossible in general).
// This is a guardrail against accidental misuse, not a security boundary:
// callers are still responsible for never handing the registry a secret.
const SECRET_LIKE_KEY_PATTERN =
  /token|secret|password|passwd|api[_-]?key|auth(orization)?|credential|private[_-]?key|access[_-]?key|session[_-]?id/i

export class ExperienceValidationError extends Error {
  readonly issues: readonly string[]

  constructor(issues: string[]) {
    super(`Invalid experience event: ${issues.join("; ")}`)
    this.name = "ExperienceValidationError"
    this.issues = issues
  }
}

export function isWellFormedExperienceType(type: string): boolean {
  return typeof type === "string" && EXPERIENCE_TYPE_PATTERN.test(type)
}

export function validateMetadata(metadata: ExperienceMetadata): string[] {
  const issues: string[] = []
  const keys = Object.keys(metadata)

  if (keys.length > MAX_METADATA_KEYS) {
    issues.push(`metadata has ${keys.length} keys, exceeds the max of ${MAX_METADATA_KEYS}`)
  }

  for (const key of keys) {
    const value = metadata[key]
    const valueType = typeof value

    if (SECRET_LIKE_KEY_PATTERN.test(key)) {
      issues.push(`metadata key "${key}" looks like it holds a secret or session credential and is not allowed`)
    }
    if (value !== null && valueType !== "string" && valueType !== "number" && valueType !== "boolean") {
      issues.push(`metadata["${key}"] must be a string, number, boolean, or null -- no nested objects, arrays, or blobs`)
    }
    if (valueType === "string" && (value as string).length > MAX_METADATA_VALUE_LENGTH) {
      issues.push(`metadata["${key}"] string value exceeds the max length of ${MAX_METADATA_VALUE_LENGTH}`)
    }
  }

  let serializedLength = 0
  try {
    serializedLength = JSON.stringify(metadata).length
  } catch {
    issues.push("metadata is not JSON-serializable")
  }
  if (serializedLength > MAX_METADATA_BYTES) {
    issues.push(`metadata serializes to ${serializedLength} bytes, exceeds the max of ${MAX_METADATA_BYTES}`)
  }

  return issues
}

export function validateEventInput(input: ExperienceEventInput): string[] {
  const issues: string[] = []

  if (!input.type || typeof input.type !== "string") {
    issues.push("type is required")
  } else if (!isWellFormedExperienceType(input.type)) {
    issues.push(`type "${input.type}" must be lowercase and dot-namespaced, e.g. "narrative.started"`)
  }

  if (!input.source?.productId) issues.push("source.productId is required")
  if (!input.actor?.userId) issues.push("actor.userId is required")
  if (input.target && !input.target.id) issues.push("target.id is required when target is present")
  if (input.target && !input.target.type) issues.push("target.type is required when target is present")

  issues.push(...validateMetadata(input.metadata ?? {}))

  return issues
}

export function assertValidEventInput(input: ExperienceEventInput): void {
  const issues = validateEventInput(input)
  if (issues.length > 0) throw new ExperienceValidationError(issues)
}
