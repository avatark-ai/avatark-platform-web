// AVK-PROD-03C-02a: the publication gate for institutional legal pages.
//
// A legal document is publishable only if every one of these holds:
//   1. contentStatus is 'COUNSEL_APPROVED';
//   2. it has a nonempty title and at least one section with content;
//   3. version, effectiveDate and approvalRef are well formed;
//   4. LEGAL_APPROVAL_REGISTER holds an entry matching its document ID, approval reference, version,
//      effective date and SHA-256 exactly. Any change to the text without a new approval therefore
//      closes the page again;
//   5. no draft or placeholder marker appears anywhere in its text.
//
// The body hash is not computed here: this module runs inside the proxy and must stay import-free.
// Instead, `sha256` is checked against canonicalLegalBody() by lib/release/legalGate.test.ts and by
// the pre-build gate scripts/check-route-inventory.ts, so a mismatched hash fails the build.
//
// Two independent layers use this gate:
//   - L1 proxy: lib/release/scope.ts adds a legal path to its allowlist only when its document is
//     publishable. Otherwise the proxy denies it with 404.
//   - L2 page: each legal page's first statement is publishableLegalDocument(key), and its second is
//     `if (!doc) notFound()`. Checked on the AST.
import { LEGAL_DOCUMENTS, LEGAL_DOCUMENT_KEYS, type LegalDocument, type LegalDocumentKey } from '../content/legalCopy.ts'

export interface LegalApproval {
  readonly documentId: LegalDocument['id']
  readonly approvalRef: string
  readonly version: string
  readonly effectiveDate: string
  readonly sha256: string
  /** Who approved, e.g. counsel firm or named counsel. */
  readonly approvedBy: string
  /** ISO date counsel approved this exact text. */
  readonly approvedOn: string
}

/**
 * Counsel approvals (CK-3), one entry per approved document version. Empty at 03C-02a: no legal text
 * has been approved. Only add an entry against a written counsel approval recorded in the gate report.
 */
export const LEGAL_APPROVAL_REGISTER: readonly LegalApproval[] = []

const APPROVAL_REF = /^CK-3:[A-Za-z0-9][A-Za-z0-9._/-]{3,63}$/
const VERSION = /^\d+\.\d+\.\d+$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SHA256 = /^[0-9a-f]{64}$/

/**
 * Case-insensitive markers that must never appear in published legal text. They cover the 03C-01
 * draft labels and decision markers, and generic placeholders.
 */
export const FORBIDDEN_LEGAL_MARKERS: readonly string[] = [
  '\u27e6', // opening decision-marker bracket used in the 03C-01 drafts
  '\u27e7', // closing bracket
  'draft',
  'not counsel approved',
  'not for publication',
  'owner:',
  'counsel:',
  'verify:',
  'todo',
  'tbd',
  'tk tk',
  'placeholder',
  'lorem',
  'ipsum',
  'xxx',
  '[[',
  ']]',
  '{{',
  '}}',
  'insert ',
  'example.com',
  'acme',
]

export type LegalRefusal =
  | 'NOT_COUNSEL_APPROVED'
  | 'EMPTY_CONTENT'
  | 'BAD_VERSION'
  | 'BAD_EFFECTIVE_DATE'
  | 'BAD_APPROVAL_REF'
  | 'BAD_SHA256'
  | 'APPROVAL_NOT_REGISTERED'
  | 'FORBIDDEN_MARKER'

/** Every string a reader can see, in document order. */
export function legalVisibleText(doc: LegalDocument): string[] {
  const out: string[] = []
  if (doc.title) out.push(doc.title)
  for (const s of doc.sections) {
    out.push(s.heading)
    for (const b of s.blocks) {
      if (b.kind === 'paragraph') out.push(b.text)
      else if (b.kind === 'list') out.push(...b.items)
      else out.push(b.label, b.address)
    }
  }
  return out
}

/** Stable serialisation that the approved SHA-256 covers: identity, version, date and all visible text. */
export function canonicalLegalBody(doc: LegalDocument): string {
  return JSON.stringify({
    id: doc.id,
    version: doc.version,
    effectiveDate: doc.effectiveDate,
    title: doc.title,
    sections: doc.sections,
  })
}

export function findForbiddenMarkers(doc: LegalDocument): string[] {
  const text = legalVisibleText(doc).join('\n').toLowerCase()
  return FORBIDDEN_LEGAL_MARKERS.filter((m) => text.includes(m))
}

const hasContent = (doc: LegalDocument) =>
  !!doc.title?.trim() &&
  doc.sections.length > 0 &&
  doc.sections.every((s) => s.heading.trim() && s.blocks.length > 0) &&
  legalVisibleText(doc).every((t) => t.trim().length > 0)

/** All reasons a document is refused; empty means publishable. */
export function legalRefusals(doc: LegalDocument, register: readonly LegalApproval[] = LEGAL_APPROVAL_REGISTER): LegalRefusal[] {
  const r: LegalRefusal[] = []
  if (doc.contentStatus !== 'COUNSEL_APPROVED') r.push('NOT_COUNSEL_APPROVED')
  if (!hasContent(doc)) r.push('EMPTY_CONTENT')
  if (!doc.version || !VERSION.test(doc.version)) r.push('BAD_VERSION')
  if (!doc.effectiveDate || !ISO_DATE.test(doc.effectiveDate) || Number.isNaN(Date.parse(doc.effectiveDate))) r.push('BAD_EFFECTIVE_DATE')
  if (!doc.approvalRef || !APPROVAL_REF.test(doc.approvalRef)) r.push('BAD_APPROVAL_REF')
  if (!doc.sha256 || !SHA256.test(doc.sha256)) r.push('BAD_SHA256')
  const registered = register.some(
    (a) =>
      a.documentId === doc.id &&
      a.approvalRef === doc.approvalRef &&
      a.version === doc.version &&
      a.effectiveDate === doc.effectiveDate &&
      a.sha256 === doc.sha256 &&
      a.approvedBy.trim().length > 0 &&
      ISO_DATE.test(a.approvedOn),
  )
  if (!registered) r.push('APPROVAL_NOT_REGISTERED')
  if (findForbiddenMarkers(doc).length > 0) r.push('FORBIDDEN_MARKER')
  return r
}

export function isLegalDocumentPublishable(doc: LegalDocument, register: readonly LegalApproval[] = LEGAL_APPROVAL_REGISTER): boolean {
  return legalRefusals(doc, register).length === 0
}

/** L2 page gate: the approved document, or null (the page then calls notFound()). */
export function publishableLegalDocument(key: LegalDocumentKey): LegalDocument | null {
  const doc = LEGAL_DOCUMENTS[key]
  return doc && isLegalDocumentPublishable(doc) ? doc : null
}

/** The three legal routes, approved or not. They are classified LEGAL in the route inventory. */
export const LEGAL_ROUTE_PATHS: readonly LegalDocument['route'][] = LEGAL_DOCUMENT_KEYS.map((k) => LEGAL_DOCUMENTS[k].route)

/** L1 proxy allowlist contribution: only the routes whose documents pass the gate. */
export const APPROVED_LEGAL_PATHS: readonly string[] = LEGAL_DOCUMENT_KEYS.filter((k) => publishableLegalDocument(k) !== null).map(
  (k) => LEGAL_DOCUMENTS[k].route,
)
