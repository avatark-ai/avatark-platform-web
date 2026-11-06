// AVK-PROD-03C-02a: versioned legal-copy module for the institutional Privacy, Terms and Contact
// pages (Scope I).
//
// This file holds ONLY counsel-approved text. Nothing here is drafted by engineering. Working drafts
// stay outside the repository (_claude_reports/AVK_PROD_03C_01/drafts/) until counsel approves a final
// versioned text (CK-3). That text is then transcribed verbatim into `sections`, `contentStatus` becomes
// 'COUNSEL_APPROVED', `version`/`effectiveDate`/`approvalRef`/`sha256` are filled in, and a matching
// entry is added to LEGAL_APPROVAL_REGISTER in lib/release/legalGate.ts.
//
// Until all of that holds, lib/release/legalGate.ts refuses the document: the page returns 404, the
// proxy keeps the path off its allowlist, and the footer entry stays plain text.
//
// Keep this module free of runtime imports. The proxy, the pages and the node test runner all load it.

export type LegalDocumentKey = 'privacy' | 'terms' | 'contact'

export type LegalContentStatus = 'NOT_PROVIDED' | 'COUNSEL_APPROVED'

export type LegalBlock =
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'list'; readonly items: readonly string[] }
  | { readonly kind: 'email'; readonly label: string; readonly address: string }

export interface LegalSection {
  readonly heading: string
  readonly blocks: readonly LegalBlock[]
}

export interface LegalDocument {
  /** Stable document ID, independent of version. */
  readonly id: 'AVK-LEGAL-PRIVACY' | 'AVK-LEGAL-TERMS' | 'AVK-LEGAL-CONTACT'
  readonly key: LegalDocumentKey
  readonly route: '/privacy' | '/terms' | '/contact'
  readonly contentStatus: LegalContentStatus
  /** Counsel's version identifier for the approved text, e.g. '1.0.0'. */
  readonly version: string | null
  /** ISO date (YYYY-MM-DD) the approved text takes effect. */
  readonly effectiveDate: string | null
  /** Counsel approval reference, form 'CK-3:<reference>'. Must also appear in LEGAL_APPROVAL_REGISTER. */
  readonly approvalRef: string | null
  /** SHA-256 (hex) of canonicalLegalBody(doc). Checked in unit tests and the pre-build inventory gate. */
  readonly sha256: string | null
  readonly title: string | null
  readonly sections: readonly LegalSection[]
}

const notProvided = (id: LegalDocument['id'], key: LegalDocumentKey, route: LegalDocument['route']): LegalDocument => ({
  id,
  key,
  route,
  contentStatus: 'NOT_PROVIDED',
  version: null,
  effectiveDate: null,
  approvalRef: null,
  sha256: null,
  title: null,
  sections: [],
})

export const LEGAL_DOCUMENTS: Readonly<Record<LegalDocumentKey, LegalDocument>> = {
  privacy: notProvided('AVK-LEGAL-PRIVACY', 'privacy', '/privacy'),
  terms: notProvided('AVK-LEGAL-TERMS', 'terms', '/terms'),
  contact: notProvided('AVK-LEGAL-CONTACT', 'contact', '/contact'),
}

export const LEGAL_DOCUMENT_KEYS: readonly LegalDocumentKey[] = ['privacy', 'terms', 'contact']
