import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { WORLDK_CONDITIONAL_COPY, WORLDK_CANON_CHECKED } from './fixtures/worldkConditionalCopy.nonpublic-fixture.ts'
import { parseFoundationContent } from './markdown.ts'

// AVK-FOUNDER-LIVING-WORLDS-02: WorldK canon C-1/C-2 conditional-copy enforcement.
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')
const root = process.cwd()

test('fixture text is pinned (CC brief text for FL-406-CC-1/2; 02A register for LW-12-R)', () => {
  const pins: Record<string, string> = {
    'AVK-FLW-FL-406-CC-1': 'dcf442444dee97af59e297b58bf05b67f9f3cd565aee08d83c37ddb653f9c49a',
    'AVK-FLW-FL-406-CC-2': '452fa3f50ff436dd8a0a183d8005f8ee23272db56da8a9ea51de2d5e36f2b763',
    'AVK-FLW-LW-12-R': '755c791a51836cb8f30f718d6d355b52b0aef3098b41a671dca2adce25a3a945',
  }
  assert.deepEqual(WORLDK_CONDITIONAL_COPY.map((e) => e.id), Object.keys(pins))
  for (const e of WORLDK_CONDITIONAL_COPY) {
    assert.equal(sha(e.text), e.sha256, e.id)
    assert.equal(e.sha256, pins[e.id], e.id)
  }
})

test('every conditional entry stays withheld while the checked canon lacks C-1/C-2', () => {
  assert.equal(WORLDK_CANON_CHECKED.c1Recorded, false)
  assert.equal(WORLDK_CANON_CHECKED.c2Recorded, false)
  for (const e of WORLDK_CONDITIONAL_COPY) assert.equal(e.status, 'WITHHELD_PENDING_WORLDK_CANON', e.id)
  const byId = Object.fromEntries(WORLDK_CONDITIONAL_COPY.map((e) => [e.id, e]))
  assert.ok(byId['AVK-FLW-FL-406-CC-1'].text.includes('Forest Intelligence & Research Center'))
  assert.ok(byId['AVK-FLW-FL-406-CC-2'].text.includes('Mahabharata'))
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return []
    const p = path.join(dir, name)
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(tsx?|mjs|js|md|json)$/.test(name) ? [p] : []
  })
}

test('no conditional text, and no import of the fixture, exists in any public source', () => {
  const files = ['app', 'components', 'lib', 'content', 'packages', 'public']
    .flatMap((d) => sourceFiles(path.join(root, d)))
    .filter((f) => !f.endsWith('.test.ts') && !f.includes(`${path.sep}fixtures${path.sep}`))
  assert.ok(files.length > 50)
  for (const file of files) {
    const text = readFileSync(file, 'utf-8')
    assert.ok(!text.includes('worldkConditionalCopy'), `${file} imports the non-public fixture`)
    for (const e of WORLDK_CONDITIONAL_COPY) assert.ok(!text.includes(e.text), `${file} contains ${e.id}`)
    for (const term of ['Forest Intelligence', 'Research Center', 'Mahabharata', 'contemporary gateway']) {
      assert.ok(!text.includes(term), `${file} contains "${term}"`)
    }
  }
})

test('the fixture slots into the Founder Letter at its registered insertion point', () => {
  // Local-only composition proof: what a later, authorized gate would publish.
  const raw = readFileSync(path.join(root, 'content', 'foundation', 'founder-letter.md'), 'utf-8')
  const fl405 = 'That is why AvatarK is building Persistent Living Worlds:'
  const at = raw.indexOf('\n\n', raw.indexOf(fl405))
  const cc = WORLDK_CONDITIONAL_COPY.filter((e) => e.id.startsWith('AVK-FLW-FL-406-CC'))
  const composed = raw.slice(0, at) + cc.map((e) => '\n\n' + e.text).join('') + raw.slice(at)
  const future = parseFoundationContent(composed).sections.find((s) => s.heading === 'Future')!
  const i = future.paragraphs.findIndex((p) => p.startsWith(fl405))
  assert.equal(future.paragraphs[i + 1], cc[0].text)
  assert.equal(future.paragraphs[i + 2], cc[1].text)
  assert.ok(future.paragraphs[i + 3].startsWith('I want to be precise about where this stands.'))
  assert.deepEqual((future.subheadings ?? []).map((s) => s.id), ['why-living-worlds'])
  assert.deepEqual(future.pullQuotes, [future.paragraphs.length - 1])
})
