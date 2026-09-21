import type { InterpretationProvenance, InterpreterIdentity } from "./types.ts"

// Provenance dimensions this Phase A package cannot yet populate truthfully.
// Real World History integration is Phase B of STK-WO-009 -- listing the gap
// explicitly means a downstream consumer can detect "not yet available"
// instead of mistaking an absent field for "checked and found nothing."
export const NOT_YET_INTEGRATED_PROVENANCE: readonly string[] = ["worldHistoryLineage"]

export function buildProvenance(
  interpreterIdentity: InterpreterIdentity,
  inputSchemaVersion: string,
  sourceEvidenceIds: readonly string[],
): InterpretationProvenance {
  return {
    interpreterIdentity,
    inputSchemaVersion,
    sourceEvidenceIds,
    notYetIntegrated: NOT_YET_INTEGRATED_PROVENANCE,
  }
}
