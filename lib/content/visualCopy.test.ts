import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { VISUAL_COPY, VISUAL_COPY_SHA256 } from './visualCopy.ts'

// AVK-VISUAL-01B (OD-V6): the two owner-approved footer group titles, exact text and pinned SHA-256.
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

test('exactly the two approved footer titles, byte-exact', () => {
  assert.deepEqual(Object.keys(VISUAL_COPY), ['AVK-VIS-FT-01', 'AVK-VIS-FT-02'])
  assert.equal(VISUAL_COPY['AVK-VIS-FT-01'], 'Institutional')
  assert.equal(VISUAL_COPY['AVK-VIS-FT-02'], 'Company / Legal')
  assert.deepEqual([...VISUAL_COPY['AVK-VIS-FT-02']].map((c) => c.codePointAt(0)!.toString(16)).slice(7, 10), ['20', '2f', '20'])
})

test('pinned hashes match', () => {
  for (const [id, text] of Object.entries(VISUAL_COPY)) {
    assert.equal(sha(text), VISUAL_COPY_SHA256[id as keyof typeof VISUAL_COPY_SHA256], id)
  }
})
