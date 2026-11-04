import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { APPROVED_COPY, APPROVED_COPY_SHA256, type ApprovedCopyId } from './institutionalCopy.ts'

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

// AVK-UNIFICATION-02A COPY-CHECKSUMS.md ("Renderable in U-02"), pinned independently of the
// module above so an edit to both the string and its local hash still fails here.
const REGISTER_SHA256: Record<string, string> = {
  'AVK-FR-003': '13ed4bfde52fec79423caf9902b37e535420279605c23de12a55c198541cc7d2',
  'AVK-FR-026': 'c5125041492f48df491099eab0a496dcf2cbffef92902b9913a84dc72db9322e',
  'AVK-FR-041': 'ca35055b42471830e18898e4effa1cfbf0b220bbce71dd19b86ff66b83bb26f8',
  'AVK-FR-055': '7e87dc555355dc93650013dca088535591d3f58b317b29a4c17c23c69f7a9e0b',
}

test('every approved string matches its pinned SHA-256', () => {
  for (const id of Object.keys(APPROVED_COPY) as ApprovedCopyId[]) {
    assert.equal(sha(APPROVED_COPY[id]), APPROVED_COPY_SHA256[id], id)
  }
})

test('spot-checked ids match the AVK-UNIFICATION-02A register independently', () => {
  for (const [id, h] of Object.entries(REGISTER_SHA256)) {
    assert.equal(sha(APPROVED_COPY[id as ApprovedCopyId]), h, id)
  }
})

test('the module holds exactly the 27 U-02 strings (26 PORT_U02 + FR-083-A)', () => {
  assert.equal(Object.keys(APPROVED_COPY).length, 27)
})

test('no held, retired, withdrawn or forbidden text is present', () => {
  const all = Object.values(APPROVED_COPY).join('\n')
  for (const bad of [
    'Adhi Yogi', 'Mahabharata', 'worldk.ai', '/enter', 'Sign In', 'Sign in',
    'The streaming surface for the AvatarK universe.', 'cinematic lens of AvatarK',
    'They sit alongside the four pillars', 'Not a metaphor.', 'A deployed platform.',
  ]) {
    assert.ok(!all.includes(bad), bad)
  }
})
