// Sprint 6, Phase 7: the smallest robust artifact-ingestion mechanism
// appropriate to this architecture -- a deterministic, file-based
// manifest, not a package-registry service (that would be premature:
// studiok-specifications has no remote/publishing set up yet, per
// vendor/README.md). This module is the one place AvatarK can answer
// "which StudioK artifact am I executing?" and the one place a vendored
// file's integrity is actually checked, not assumed.
//
// Upgrade path, when it becomes worth it: once studiok-specifications has
// a real remote and a package-registry-style release process, this
// manifest's shape (artifactId/specId/specVersion/checksum/provenance)
// becomes the lockfile-equivalent metadata a real package manager would
// track automatically -- this module's callers (vrindavanDefinition.ts,
// experienceDefinition.ts) would not need to change, only where the bytes
// being checksummed come from.

import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

export interface ArtifactManifestEntry {
  artifactId: string
  file: string
  sourceRepo: string
  sourcePath: string
  specId: string
  specStatus: "Draft" | "Proposed" | "Approved" | "Deprecated"
  specVersion: number
  worldSchemaVersion: string
  pinnedTag: string | null
  pinnedCommit: string
  canonDocIds: string[]
  canonVersion: string
  checksumAlgorithm: "sha256"
  checksum: string
  ingestedAt: string
}

interface ArtifactManifest {
  schemaVersion: string
  artifacts: ArtifactManifestEntry[]
}

export interface IngestionResult {
  valid: boolean
  errors: string[]
  entry: ArtifactManifestEntry | undefined
}

const VENDOR_DIR = fileURLToPath(new URL("./vendor/", import.meta.url))

let manifestCache: ArtifactManifest | undefined
function loadManifest(): ArtifactManifest {
  if (!manifestCache) {
    manifestCache = JSON.parse(readFileSync(`${VENDOR_DIR}manifest.json`, "utf8")) as ArtifactManifest
  }
  return manifestCache
}

export function getManifestEntry(artifactId: string): ArtifactManifestEntry | undefined {
  return loadManifest().artifacts.find((entry) => entry.artifactId === artifactId)
}

// AvatarK's answer to "which StudioK artifact am I executing?" -- every
// vendored artifact this Host actually loads, with full provenance.
export function listExecutingArtifacts(): ArtifactManifestEntry[] {
  return loadManifest().artifacts
}

// Ingestion validation (does this vendored file match what the manifest
// claims was ingested?) + compatibility validation (is its schema version
// one this Host can actually interpret?), run together since both must
// pass before a Host adapter may trust the file at all.
export function verifyArtifactIngestion(artifactId: string, expectedWorldSchemaVersion: string): IngestionResult {
  const errors: string[] = []
  const entry = getManifestEntry(artifactId)

  if (!entry) {
    return { valid: false, errors: [`no manifest entry for artifact "${artifactId}" -- ingestion was never recorded`], entry: undefined }
  }

  if (entry.worldSchemaVersion !== expectedWorldSchemaVersion) {
    errors.push(
      `artifact "${artifactId}" was ingested at schema version "${entry.worldSchemaVersion}", ` +
        `but this Host expects "${expectedWorldSchemaVersion}" -- incompatible, refuse to load`,
    )
  }

  let raw: string
  try {
    raw = readFileSync(`${VENDOR_DIR}${entry.file}`, "utf8")
  } catch (err) {
    return { valid: false, errors: [`vendored file "${entry.file}" for artifact "${artifactId}" could not be read: ${String(err)}`], entry }
  }

  const actualChecksum = createHash(entry.checksumAlgorithm).update(raw).digest("hex")
  if (actualChecksum !== entry.checksum) {
    errors.push(
      `artifact "${artifactId}": checksum mismatch -- manifest records "${entry.checksum}", ` +
        `vendored file "${entry.file}" actually hashes to "${actualChecksum}". The file was modified ` +
        `after ingestion, or the manifest is stale. Refuse to load either way.`,
    )
  }

  return { valid: errors.length === 0, errors, entry }
}
