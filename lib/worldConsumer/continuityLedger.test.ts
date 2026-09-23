import { randomUUID } from "node:crypto"
import { InMemoryContinuityLedger } from "./continuityLedger.ts"
import { runContinuityLedgerSuite } from "./continuityLedgerSuite.ts"

runContinuityLedgerSuite("in-memory ledger", async () => ({ ledger: new InMemoryContinuityLedger(), subject: async () => randomUUID() }))
