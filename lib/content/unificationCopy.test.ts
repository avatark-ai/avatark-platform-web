import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { UNIFICATION_COPY, UNIFICATION_COPY_SHA256, type UnificationCopyId } from './unificationCopy.ts'
import { APPROVED_COPY } from './institutionalCopy.ts'
import { LIVING_WORLDS_COPY } from './livingWorldsCopy.ts'
import { FOUNDER_SCIENCE_COPY } from './founderScienceCopy.ts'
import { parseFoundationContent } from './markdown.ts'

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

// AVK-UNIFICATION-03B approved-u03b-register.json sha256 values (== U-03A register), pinned here
// independently of the generated module so editing a string and its local hash together still fails.
const REGISTER_SHA256: Record<string, string> = {
  'AVK-U03-HN-01': 'df42a4d5d3537666f9ed0012c3a44999878842f8d92f2ac056e6df0ca4ac44d1',
  'AVK-U03-HN-03': '7780172200243361b7df50624840b088e1a043688ca3c74e4b6c44a644667276',
  'AVK-U03-HN-04': 'e219439281f24ad1442865ace73b5db3793c067814a7bef6bc5a8670a234ef6a',
  'AVK-U03-HN-05': '23ae45f425f70190f749315697c51cea6da1e32d0d4da8ae9fd079aa25edbf19',
  'AVK-U03-HN-06': '3b73900b8d29f963dece78edd4bd9529d855e50f2a3fcc39b3d66cd657630905',
  'AVK-U03-HN-07': '1f78f2e4730401b48a9f092af669d4cde4cd90e51bf94c145ea114b5a1c801a2',
  'AVK-U03-HN-08': '8c3094b1aebb094752893c5af61249e5962aa7ff72fb80a9b7a274077d6b3be6',
  'AVK-U03-HN-09': '4563edf4160a809a6d9688d92f44785b75e83a51ff6686a930daeaebd61dbe37',
  'AVK-U03-HH-01': 'ef2fd4c0ed5a393edeaa4aac5217469ba2bb23473c466228cade340ecc70e1d5',
  'AVK-U03-HH-02': '3939a8408e3025cb2436dfbf4f9b254d2e758d29ea4aa5476ea3b1f8cc6a6461',
  'AVK-U03-HH-03': '9facc1928033970e75bd57e93545eb1ea6215c30952bd9d0d6a07ff07aab5e38',
  'AVK-U03-HH-04': '811f4ee2534e08d610bc7809077fa736a586d332d10ef2d9403d14cb8cec43ca',
  'AVK-U03-FX-01': '7bbfe2b5c6976cfaf1d0a687e10564a0dfcd28ea90289e8f5258dd4751c2a945',
  'AVK-U03-FX-02': '8ebd07e56e4442537d524dd1271df277435a46e86e9a159eb2940c2b8bca2053',
  'AVK-U03-FX-10': '8335e4c92c40556ab31f1bc57faab0a2563d89f720a8e6740fee674ea79df3c9',
  'AVK-U03-FX-11': 'dacb71b9a5737f7258d90a9b3d26a78495dcfe6aea33dbb2e7651dfd92e496ea',
  'AVK-U03-FX-12': '8995abce4173447dc98778c25a1921919a0ef9a879e01a8bf6bafd33dfbd16fc',
  'AVK-U03-FX-20': '76a87880ae71fff102cfd9507bb09893b2dd4b24f54c38cd259967a3683bbe5e',
  'AVK-U03-WY-01': '24d437a56613392ad3ddfbf9ccff9a42586c6a4ad690278017e6ce41ab5b4563',
  'AVK-U03-WY-06': '27a2640f1d4a8051cda1e1d5020beaae578e276e5e83b8ad5b496b1075fbb326',
}

// Rendered from content/foundation/architecture.md (single source, unchanged).
const ARCHITECTURE_SHA256: Record<string, string> = {
  'AVK-U03-WY-02': 'dd8c341fc4448b3d2df23da03788a5f63957e5b1db4b6247925c007c15ba4682',
  'AVK-U03-WY-03': 'b05a0497049bb1f2570c99f7d3c25d650eb7af4acd02f8652fe43bbd62e45a58',
  'AVK-U03-WY-04': '8e78332920d897de89dbbabad3d381af969736ad94dc822a6cfdeb4e8c2412b0',
  'AVK-U03-WY-05': '281a471155fb482bc607bb22711658fe26b7391adcb5ffdcc7598c4edaed72ee',
}

// Reused approved IDs, imported from their existing modules (not regenerated).
const REUSED_SHA256: Record<string, string> = {
  'AVK-FR-003': '13ed4bfde52fec79423caf9902b37e535420279605c23de12a55c198541cc7d2',
  'AVK-FR-026': 'c5125041492f48df491099eab0a496dcf2cbffef92902b9913a84dc72db9322e',
  'AVK-FR-021': '8dee4947213c3385d49d06ca6aba964bd23a280409c8f665120f81d334d1c14b',
  'AVK-FLW-ST-01': '5259ae65614671c45dc0a4f34a05a2cd323dc9817543340d5459b67fda87d394',
  'AVK-FLW-EC-05': '48a79124f33328cbb3ba2682b8f67ddba2cf010d1cb58e26aa7c6f2be586e6b8',
}

test('every U-03B module string matches its register SHA-256', () => {
  const ids = Object.keys(UNIFICATION_COPY) as UnificationCopyId[]
  assert.deepEqual([...ids].sort(), Object.keys(REGISTER_SHA256).sort())
  for (const id of ids) {
    assert.equal(sha(UNIFICATION_COPY[id]), REGISTER_SHA256[id], id)
    assert.equal(UNIFICATION_COPY_SHA256[id], REGISTER_SHA256[id], id)
  }
})

test('owner-directed homepage strings are exact', () => {
  assert.equal(UNIFICATION_COPY['AVK-U03-HH-01'], 'Imagine. Create. Discover. Continue.')
  assert.equal(UNIFICATION_COPY['AVK-U03-HH-02'], 'Human potential. Intelligent systems. Living Worlds. Stories that endure.')
  assert.equal(UNIFICATION_COPY['AVK-U03-HH-03'], 'The Architecture of Adaptive Becoming')
  assert.equal(UNIFICATION_COPY['AVK-U03-HH-04'], 'Explore AvatarK')
  assert.equal(UNIFICATION_COPY['AVK-U03-HN-08'], 'Discover Living Worlds')
})

test('Why AvatarK strings still come from architecture.md, unchanged', () => {
  const md = parseFoundationContent(readFileSync(path.join(process.cwd(), 'content', 'foundation', 'architecture.md'), 'utf-8'))
  const hero = md.sections.find((s) => s.heading === 'Hero')
  const gap = md.sections.find((s) => s.heading === 'Gap')
  assert.ok(hero && gap)
  const rendered = [gap.fields.statement, ...hero.paragraphs]
  assert.deepEqual(rendered.map(sha), Object.values(ARCHITECTURE_SHA256))
  // The old homepage h1 stays in architecture.md (metadata/Foundation still use it); only "/" stops rendering it.
  assert.equal(hero.fields.headline, 'The Architecture of Becoming')
})

test('reused approved IDs are byte-identical in their existing modules', () => {
  const all: Record<string, string> = { ...APPROVED_COPY, ...LIVING_WORLDS_COPY }
  for (const [id, h] of Object.entries(REUSED_SHA256)) assert.equal(sha(all[id]), h, id)
})

test('U-03 copy does not duplicate or alter Founder Science wording', () => {
  const u03 = Object.values(UNIFICATION_COPY)
  // Sentence-length Founder Science strings only: one-word labels (e.g. nav "Founder" = FS-FI-01 eyebrow) may coincide.
  for (const fs of Object.values(FOUNDER_SCIENCE_COPY)) if (fs.length >= 30) assert.ok(!u03.includes(fs as never), fs)
  assert.ok(!u03.includes('From Questions to Worlds' as never))
  assert.ok(!u03.join('\n').includes('Mahabharata'))
  assert.ok(!u03.join('\n').includes('Research Center'))
})
