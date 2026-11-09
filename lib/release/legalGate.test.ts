import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { LEGAL_DOCUMENTS, LEGAL_DOCUMENT_KEYS, type LegalDocument } from '../content/legalCopy.ts'
import {
  APPROVED_LEGAL_PATHS,
  LEGAL_APPROVAL_REGISTER,
  LEGAL_ROUTE_PATHS,
  canonicalLegalBody,
  findForbiddenMarkers,
  isLegalDocumentPublishable,
  legalRefusals,
  publishableLegalDocument,
  type LegalApproval,
} from './legalGate.ts'
import { decideRequest, INSTITUTIONAL_URLS } from './scope.ts'
import { classifyRoute, LEGAL_ROUTES } from './routeInventory.ts'
import { guardTargets } from './guardAst.ts'
import { checkLegalIntegrity } from '../../scripts/check-route-inventory.ts'

// AVK-PROD-03C-02a: the legal-page publication gate.
const root = process.cwd()
const sha = (d: LegalDocument) => createHash('sha256').update(canonicalLegalBody(d)).digest('hex')

// A synthetic, neutral fixture used ONLY to prove the gate can open and that each condition closes
// it. It is not legal text and is never added to LEGAL_DOCUMENTS.
function fixture(over: Partial<LegalDocument> = {}): LegalDocument {
  const base: LegalDocument = {
    id: 'AVK-LEGAL-TERMS',
    key: 'terms',
    route: '/terms',
    contentStatus: 'COUNSEL_APPROVED',
    version: '1.0.0',
    effectiveDate: '2027-01-01',
    approvalRef: 'CK-3:fixture-0001',
    sha256: null,
    title: 'Fixture Title',
    sections: [{ heading: 'Fixture heading', blocks: [{ kind: 'paragraph', text: 'Fixture paragraph.' }] }],
    ...over,
  }
  return { ...base, sha256: over.sha256 !== undefined ? over.sha256 : sha(base) }
}
const approve = (d: LegalDocument): LegalApproval[] => [
  { documentId: d.id, approvalRef: d.approvalRef!, version: d.version!, effectiveDate: d.effectiveDate!, sha256: d.sha256!, approvedBy: 'Fixture Counsel', approvedOn: '2026-12-01' },
]

test('03C-02a state: all three documents are NOT_PROVIDED, carry no text, and the register is empty', () => {
  assert.deepEqual([...LEGAL_DOCUMENT_KEYS], ['privacy', 'terms', 'contact'])
  assert.deepEqual(
    LEGAL_DOCUMENT_KEYS.map((k) => LEGAL_DOCUMENTS[k].id),
    ['AVK-LEGAL-PRIVACY', 'AVK-LEGAL-TERMS', 'AVK-LEGAL-CONTACT'],
  )
  for (const k of LEGAL_DOCUMENT_KEYS) {
    const d = LEGAL_DOCUMENTS[k]
    assert.equal(d.contentStatus, 'NOT_PROVIDED', k)
    assert.equal(d.title, null, k)
    assert.deepEqual(d.sections, [], k)
    assert.equal(d.version, null, k)
    assert.equal(d.effectiveDate, null, k)
    assert.equal(d.approvalRef, null, k)
    assert.equal(d.sha256, null, k)
  }
  assert.equal(LEGAL_APPROVAL_REGISTER.length, 0)
})

test('every unapproved document is refused: page gate null, proxy allowlist empty', () => {
  for (const k of LEGAL_DOCUMENT_KEYS) {
    assert.equal(publishableLegalDocument(k), null, k)
    assert.equal(isLegalDocumentPublishable(LEGAL_DOCUMENTS[k]), false, k)
    assert.ok(legalRefusals(LEGAL_DOCUMENTS[k]).includes('NOT_COUNSEL_APPROVED'), k)
    assert.ok(legalRefusals(LEGAL_DOCUMENTS[k]).includes('APPROVAL_NOT_REGISTERED'), k)
  }
  assert.deepEqual([...APPROVED_LEGAL_PATHS], [])
})

test('L1 proxy: /privacy, /terms and /contact are denied 404 for every method and variant', () => {
  assert.deepEqual([...LEGAL_ROUTE_PATHS], ['/privacy', '/terms', '/contact'])
  for (const p of LEGAL_ROUTE_PATHS) {
    assert.ok(!INSTITUTIONAL_URLS.includes(p), p)
    for (const v of [p, `${p}/`, p.toUpperCase(), `${p}.html`, `/%${p.charCodeAt(1).toString(16)}${p.slice(2)}`]) {
      for (const m of ['GET', 'HEAD', 'POST', 'OPTIONS']) assert.deepEqual(decideRequest(m, v), { kind: 'DENY', status: 404 }, `${m} ${v}`)
    }
  }
})

test('route inventory: the three legal routes are the LEGAL class, not ALLOW', () => {
  assert.deepEqual([...LEGAL_ROUTES], ['/privacy', '/terms', '/contact'])
  for (const p of LEGAL_ROUTES) assert.equal(classifyRoute(p), 'LEGAL')
})

test('the gate opens only for a complete, registered, hash-matched, marker-free fixture', () => {
  const ok = fixture()
  assert.deepEqual(legalRefusals(ok, approve(ok)), [])
  assert.equal(isLegalDocumentPublishable(ok, approve(ok)), true)
  assert.deepEqual(checkLegalIntegrity([ok]), [])
})

test('each missing or wrong condition closes the gate with its own reason', () => {
  const ok = fixture()
  const reg = approve(ok)
  const cases: [string, LegalDocument, readonly LegalApproval[], string][] = [
    ['not approved', { ...ok, contentStatus: 'NOT_PROVIDED' }, reg, 'NOT_COUNSEL_APPROVED'],
    ['missing approval ref', { ...ok, approvalRef: null }, reg, 'BAD_APPROVAL_REF'],
    ['empty approval ref', { ...ok, approvalRef: '' }, reg, 'BAD_APPROVAL_REF'],
    ['whitespace approval ref', { ...ok, approvalRef: 'CK-3:    ' }, reg, 'BAD_APPROVAL_REF'],
    ['wrong checkpoint', { ...ok, approvalRef: 'CK-2:fixture-0001' }, reg, 'BAD_APPROVAL_REF'],
    ['unregistered approval', ok, [], 'APPROVAL_NOT_REGISTERED'],
    ['register ref mismatch', ok, [{ ...reg[0], approvalRef: 'CK-3:other-0002' }], 'APPROVAL_NOT_REGISTERED'],
    ['register version mismatch', ok, [{ ...reg[0], version: '1.0.1' }], 'APPROVAL_NOT_REGISTERED'],
    ['register hash mismatch', ok, [{ ...reg[0], sha256: '0'.repeat(64) }], 'APPROVAL_NOT_REGISTERED'],
    ['register other document', ok, [{ ...reg[0], documentId: 'AVK-LEGAL-PRIVACY' }], 'APPROVAL_NOT_REGISTERED'],
    ['register without approver', ok, [{ ...reg[0], approvedBy: ' ' }], 'APPROVAL_NOT_REGISTERED'],
    ['missing version', { ...ok, version: null }, reg, 'BAD_VERSION'],
    ['bad date', { ...ok, effectiveDate: '2027-13-45' }, reg, 'BAD_EFFECTIVE_DATE'],
    ['missing hash', { ...ok, sha256: null }, reg, 'BAD_SHA256'],
    ['no title', { ...ok, title: null }, reg, 'EMPTY_CONTENT'],
    ['no sections', { ...ok, sections: [] }, reg, 'EMPTY_CONTENT'],
    ['empty section', { ...ok, sections: [{ heading: 'H', blocks: [] }] }, reg, 'EMPTY_CONTENT'],
    ['blank paragraph', { ...ok, sections: [{ heading: 'H', blocks: [{ kind: 'paragraph', text: '  ' }] }] }, reg, 'EMPTY_CONTENT'],
  ]
  for (const [name, doc, register, reason] of cases) {
    const r = legalRefusals(doc, register)
    assert.ok(r.includes(reason as never), `${name}: expected ${reason}, got ${JSON.stringify(r)}`)
    assert.equal(isLegalDocumentPublishable(doc, register), false, name)
  }
})

test('draft and placeholder markers close the gate even when approval and hash are consistent', () => {
  const samples = [
    'DRAFT — NOT COUNSEL APPROVED — NOT FOR PUBLICATION',
    'Operated by ⟦OWNER: exact legal entity name⟧.',
    '⟦COUNSEL: governing law⟧',
    'VERIFY: re-run audits',
    'TODO: add address',
    'Address TBD',
    'Lorem ipsum dolor sit amet.',
    'Write to [[legal mailbox]].',
    'Write to {{privacy_email}}.',
    'Placeholder text.',
    'Contact us at someone@example.com.',
  ]
  for (const text of samples) {
    const d = fixture({ sections: [{ heading: 'Section', blocks: [{ kind: 'paragraph', text }] }] })
    assert.ok(findForbiddenMarkers(d).length > 0, text)
    assert.ok(legalRefusals(d, approve(d)).includes('FORBIDDEN_MARKER'), text)
  }
  // Markers are caught in titles, headings, list items and email blocks too.
  const spots: Partial<LegalDocument>[] = [
    { title: 'Privacy Policy (draft)' },
    { sections: [{ heading: 'TBD', blocks: [{ kind: 'paragraph', text: 'x' }] }] },
    { sections: [{ heading: 'H', blocks: [{ kind: 'list', items: ['ok', 'TODO'] }] }] },
    { sections: [{ heading: 'H', blocks: [{ kind: 'email', label: 'Privacy:', address: 'privacy@example.com' }] }] },
  ]
  for (const over of spots) {
    const d = fixture(over)
    assert.ok(legalRefusals(d, approve(d)).includes('FORBIDDEN_MARKER'), JSON.stringify(over))
  }
})

test('the 03C-01 working drafts cannot pass the gate', () => {
  const dir = join(root, '..', '_claude_reports', 'AVK_PROD_03C_01', 'drafts')
  let files: string[] = []
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md'))
  } catch {
    return // drafts live outside the repository; skip when not present (e.g. CI)
  }
  assert.equal(files.length, 3)
  for (const f of files) {
    const text = readFileSync(join(dir, f), 'utf8')
    const d = fixture({ sections: [{ heading: 'Draft', blocks: [{ kind: 'paragraph', text }] }] })
    assert.ok(legalRefusals(d, approve(d)).includes('FORBIDDEN_MARKER'), f)
  }
})

test('pre-build integrity: text edited after approval fails the hash check', () => {
  const ok = fixture()
  const edited: LegalDocument = { ...ok, sections: [{ heading: 'Fixture heading', blocks: [{ kind: 'paragraph', text: 'Fixture paragraph, edited.' }] }] }
  assert.equal(isLegalDocumentPublishable(edited, approve(ok)), true, 'runtime gate alone cannot see the edit...')
  assert.equal(checkLegalIntegrity([edited]).length, 1, '...so the pre-build integrity check refuses the build')
  assert.deepEqual(checkLegalIntegrity(), [], 'committed documents are consistent')
})

test('L2 page gate is the first statement of every legal page export (AST)', () => {
  for (const k of LEGAL_DOCUMENT_KEYS) {
    const f = join(root, 'app', k, 'page.tsx')
    const t = guardTargets(readFileSync(f, 'utf8'), f)
    assert.deepEqual(t.map((x) => x.name).sort(), ['default ' + k[0].toUpperCase() + k.slice(1) + 'Page', 'generateMetadata'].sort(), k)
    for (const x of t) {
      assert.equal(x.firstStatement, `const doc = publishableLegalDocument('${k}')`, `${k} ${x.name}`)
      assert.equal(x.secondStatement, 'if (!doc) notFound()', `${k} ${x.name}`)
    }
  }
})

const LEGAL_FILES = [
  'app/privacy/page.tsx',
  'app/terms/page.tsx',
  'app/contact/page.tsx',
  'components/legal/LegalDocumentView.tsx',
  'lib/content/legalCopy.ts',
  'lib/release/legalGate.ts',
]

test('legal pages add no auth, backend, client JS, forms, storage, tracking or external resources', () => {
  const banned: [RegExp, string][] = [
    [/supabase/i, 'supabase'],
    [/@\/lib\/(account|identity|onboarding|auth)\b|@avatark\/(auth|journey|organizations|invitations)/, 'account/auth/journey import'],
    [/^['"]use client['"]/m, 'client component'],
    [/<form\b|action=|useActionState|['"]use server['"]/, 'form or server action'],
    [/localStorage|sessionStorage|document\.cookie|cookies\(\)|headers\(\)/, 'storage or cookies'],
    [/https?:\/\//, 'external URL'],
    [/analytics|gtag|posthog|sentry|<script|<iframe|<img\b|next\/image|next\/script/i, 'tracking or embedded resource'],
    [/dangerouslySetInnerHTML/, 'raw HTML'],
  ]
  for (const f of LEGAL_FILES) {
    const src = readFileSync(join(root, f), 'utf8')
    for (const [re, what] of banned) assert.ok(!re.test(src), `${f}: ${what}`)
  }
})

test('no draft legal text or decision marker is committed anywhere in app, components or lib', () => {
  const hits: string[] = []
  const walk = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(tsx?|mjs|json|md)$/.test(n) && !/\.test\.ts$/.test(n)) {
        const s = readFileSync(p, 'utf8')
        if (s.includes('⟦') || s.includes('NOT COUNSEL APPROVED') || s.includes('NOT FOR PUBLICATION') || s.includes('working draft v0.1')) hits.push(relative(root, p))
      }
    }
  }
  for (const d of ['app', 'components', 'lib']) walk(join(root, d))
  assert.deepEqual(hits, [])
})

test('footer: Privacy, Terms and Trust stay plain text in Scope I; Contact keeps its mailto', () => {
  const src = readFileSync(join(root, 'components/foundation/InstitutionalFooter.tsx'), 'utf8')
  assert.match(src, /\{ label: 'Contact', href: supportEmail \? `mailto:\$\{supportEmail\}` : null, external: true \}/)
  assert.match(src, /\{ label: 'Privacy', href: INSTITUTIONAL_SIGNIN_ENABLED && !isInstitutionalScope\(\) \? '\/account\?tab=privacy' : null \}/)
  assert.match(src, /\{ label: 'Terms', href: null \}/)
  assert.match(src, /\{ label: 'Trust', href: null \}/)
  for (const f of ['components/foundation/InstitutionalFooter.tsx', 'components/foundation/InstitutionalHeader.tsx']) {
    const s = readFileSync(join(root, f), 'utf8')
    assert.ok(!/['"`]\/(privacy|terms|contact)['"`?#]/.test(s), `${f} must not link the legal routes yet`)
  }
})

test('EchoShell treats the three legal routes as institutional-only', () => {
  const src = readFileSync(join(root, 'components/echo/shell/EchoShell.tsx'), 'utf8')
  for (const p of LEGAL_ROUTE_PATHS) assert.ok(src.includes(`pathname === "${p}"`), p)
})

test('AVK-GO-C2-RC-BUILD (OD-C2-2): Scope I hides the inert Privacy/Terms/Trust labels; Contact mailto and entity text unchanged', () => {
  const src = readFileSync(join(root, 'components/foundation/InstitutionalFooter.tsx'), 'utf8')
  assert.match(src, /const INERT_LEGAL_LABELS: ReadonlySet<string> = new Set\(\['Privacy', 'Terms', 'Trust'\]\)/)
  assert.match(src, /const companyLinks: FooterLink\[\] = isInstitutionalScope\(\)\n\s+\? allCompanyLinks\.filter\(\(l\) => !\(INERT_LEGAL_LABELS\.has\(l\.label\) && l\.href === null\)\)\n\s+: allCompanyLinks/)
  assert.match(src, /links=\{companyLinks\}/)
  assert.match(src, /© \{new Date\(\)\.getFullYear\(\)\} AvatarK/)
  // While the register is empty no legal label has an href in Scope I, so the filter removes all three.
  assert.equal(LEGAL_APPROVAL_REGISTER.length, 0)
})
