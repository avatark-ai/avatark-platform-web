// TEST DOUBLES ONLY. These in-memory ports exist so the Authority's ordering
// and refusal logic can be unit-tested. They are NOT certification
// persistence (PLT-ADR-015 §6: in-memory certification is non-conformant);
// durability is proven against real Postgres in
// lib/certificationAuthority/durableRegistry.integration.test.ts.
import { generateKeyPairSync } from "node:crypto"
import { createEd25519Signer, createKeyTrust } from "../src/attestation.ts"
import { CERTIFICATION_AUTHORITY_ID } from "../src/policies.ts"
import type {
  CertificationGrantSource,
  CertificationRefusalAudit,
  CertificationRefusalAuditEntry,
  CertificationRegistry,
  InvocationGrantRow,
} from "../src/ports.ts"
import type { CertificationRegistryEntry } from "../src/types.ts"

export const CERTIFIER_ID = "11111111-1111-4111-8111-111111111111"
export const ADMIN_ID = "22222222-2222-4222-8222-222222222222"

export function testSigner(keyId = "test-ephemeral-key", authorityId = CERTIFICATION_AUTHORITY_ID) {
  const { privateKey } = generateKeyPairSync("ed25519")
  return createEd25519Signer({ authorityId, keyId, privateKey })
}

export function trustFor(...signers: ReturnType<typeof testSigner>[]) {
  return createKeyTrust(signers.map((s) => ({ keyId: s.keyId, authorityId: s.authorityId, algorithm: "Ed25519" as const, publicKey: s.publicKey })))
}

export class TestDoubleRegistry implements CertificationRegistry {
  readonly entries: CertificationRegistryEntry[] = []
  failNextAppend = false
  async appendIssued(entry: CertificationRegistryEntry): Promise<void> {
    if (this.failNextAppend) {
      this.failNextAppend = false
      throw new Error("simulated commit failure")
    }
    if (this.entries.some((e) => e.attested.record.certificationRecordId === entry.attested.record.certificationRecordId)) {
      throw new Error("duplicate certification record id")
    }
    this.entries.push(structuredClone(entry))
  }
  async getByRecordId(id: string) {
    const found = this.entries.find((e) => e.attested.record.certificationRecordId === id)
    return found ? structuredClone(found) : null
  }
  async listBySubject(kind: string, subjectId: string) {
    return this.entries.filter((e) => e.attested.record.subjectKind === kind && e.attested.record.subjectId === subjectId).map((e) => structuredClone(e))
  }
}

export class TestDoubleRefusalAudit implements CertificationRefusalAudit {
  readonly entries: CertificationRefusalAuditEntry[] = []
  async appendRefusal(entry: CertificationRefusalAuditEntry): Promise<void> {
    this.entries.push(structuredClone(entry))
  }
}

/** Grants keyed by `${userId}|${capability}`. */
export class TestDoubleGrantSource implements CertificationGrantSource {
  readonly grants = new Map<string, InvocationGrantRow>()
  readonly calls: Array<{ userId: string; capability: string }> = []
  grant(userId: string, capability: string, grantedBy: string | null = ADMIN_ID): InvocationGrantRow {
    const row: InvocationGrantRow = {
      id: `grant-${this.grants.size + 1}`,
      capability,
      scopeType: "platform",
      scopeId: null,
      grantedAt: "2026-09-23T00:00:00.000Z",
      grantedBy,
    }
    this.grants.set(`${userId}|${capability}`, row)
    return row
  }
  async resolveInvocationGrant(userId: string, capability: string) {
    this.calls.push({ userId, capability })
    const row = this.grants.get(`${userId}|${capability}`)
    return row ? { granted: true as const, grant: row } : { granted: false as const, reason: "no_grant" }
  }
}
