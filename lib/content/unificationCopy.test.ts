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

// U-03C PENDING strings (u03c-living-worlds-register.json): must never be in the module or on a page.
const PENDING_SHA256 = new Set([
  '325f16a6c8ed38d13e944bb4df40aebc7d74cef582f843356b8558ead38231e0', // AVK-U03-LW-02
  'afc8e6b1e187402982baf8cc65ebdd6233049e6b44eb7134c748f4c2a7aaa4c6', // AVK-U03-LW-11
  '7aa31487d8c0f99c52bc9284addf804d0b02b3859be6b08a0f7ff786905c6fa5', // AVK-U03-LW-13
  'b2ea668e3fa116c47c8f445e3e380a38d676b5e26bec587e08ec88878695815a', // AVK-U03-LW-15
  'fd214cf4f709010c5e7251168d52f5c0e4fa837082efcf59b5e5b4de0e16e280', // AVK-U03-LW-17
  'a02ae99f124c11bad157f8a92bd4af2a7282ac3e2c758dd7d43582b08b5c5e70', // AVK-U03-LW-19
  'a6f1cdc9e1ef3fcdbb1c18877aa8840f4956d304526e4dc720da4882ab443f4e', // AVK-U03-LW-21
  '28c28718dab20673a8fbfd63d744fc0373a7786d73cf677dd569487b1fdae072', // AVK-U03-LW-23
  '5d43b2c56041f134875e477032a48d880fd0ea3a4458e90c7ba4567490e2bd40', // AVK-U03-LW-31
  '5e4cf78c18ee9a9e2bc93551d921416f132718173724805dc47cca3dc8065576', // AVK-U03-LW-34
  '1afb30fc34b9c3049df5c53deb5aac2aacf98835d1e00200442d59eea7adaf70', // AVK-U03-LW-36
  'd32aaab6f16a64bd28a02ab98b3e39b719f81cd4e9c5766faa1b22c698913367', // AVK-U03-LW-38
  'e3517f165feb32bbc4688d304ecfe4d430db927372cff46466daf5d2219118bf', // AVK-U03-LW-M1
  'e834521ac0d7c0e3ff2bf5fb53a58170e871df07d8dca21f193fc119dd5d5c04', // AVK-U03-LW-M2
  '052d128f3b854453787bf129c24a1148da08da55f504b5c6ff14ed7cbe9985ed', // AVK-U03-LW-41
])

// U-03C-1 SUPERSEDED U-03A drafts (replaced by the owner-approved *-R strings): never in the module.
const SUPERSEDED_SHA256 = new Set([
  'afc8e6b1e187402982baf8cc65ebdd6233049e6b44eb7134c748f4c2a7aaa4c6', // AVK-U03-LW-11 -> AVK-U03-LW-11-R
  '7aa31487d8c0f99c52bc9284addf804d0b02b3859be6b08a0f7ff786905c6fa5', // AVK-U03-LW-13 -> AVK-U03-LW-13-R
  'b2ea668e3fa116c47c8f445e3e380a38d676b5e26bec587e08ec88878695815a', // AVK-U03-LW-15 -> AVK-U03-LW-15-R
  'fd214cf4f709010c5e7251168d52f5c0e4fa837082efcf59b5e5b4de0e16e280', // AVK-U03-LW-17 -> AVK-U03-LW-17-R
  'a02ae99f124c11bad157f8a92bd4af2a7282ac3e2c758dd7d43582b08b5c5e70', // AVK-U03-LW-19 -> AVK-U03-LW-19-R
  'a6f1cdc9e1ef3fcdbb1c18877aa8840f4956d304526e4dc720da4882ab443f4e', // AVK-U03-LW-21 -> AVK-U03-LW-21-R
  '28c28718dab20673a8fbfd63d744fc0373a7786d73cf677dd569487b1fdae072', // AVK-U03-LW-23 -> AVK-U03-LW-23-R
])

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
  // U-03C (/living-worlds), approved and rendered
  'AVK-U03-LW-01': 'b619c11d482ff38d9b88aea4f406f4033055e747138805e69235d901c2d4f17a',
  'AVK-U03-LW-30': 'd0e4ee0843deccd8e3c8561220f31ea054275757c15f52e3261d74ab811f6143',
  'AVK-U03-LW-32': '865f5e3dea4ef0e5092add51db28178946b7144f7f89204d6ac0a8804fd5baaf',
  'AVK-U03-LW-33': '699fa378b171132eb34c0ef93f0186f041abc5b33b9e9b87689158e057926274',
  'AVK-U03-LW-35': '77715bc697fc8fb7214cfa31f56b82fc68d4eb6f9f58d275f4f66d665625476b',
  'AVK-U03-LW-37': '67cf8b64b105068f24cae23584b0b01942ccc146ce9bcc5abf0b6df82c5bdf67',
  // U-03C-1 (six principles), owner-approved and rendered
  'AVK-U03-LW-10': 'd7c868a6bd2ef46382710b7b53199453b70ffa1627625c67693555cd7d573eda',
  'AVK-U03-LW-11-R': 'eaed790ec82f100da775c783e52da8c129a08f5af16614048e463177fd998858',
  'AVK-U03-LW-12': 'e9463dccf0541a9778589691543fd69249759d5de6a97cd57d6420c3e5d92baa',
  'AVK-U03-LW-14': 'c3963aedaac6c83c04cf8fb997b479c61e66b3caeecfadd2f2d4bd5b0aef1778',
  'AVK-U03-LW-16': 'c0bf75bd78bf9572596720d596bd5a20a5b9145cde0fe50dec1e783cb184d69b',
  'AVK-U03-LW-18': '6b0143d03864993fdf6922b8be1c69b93b24babb9989edd7533f9eeb680148e0',
  'AVK-U03-LW-20': '80fc402133201fbe0e4e9962a9570e741856aa8b0c033f1a20a9bcb06c68e809',
  'AVK-U03-LW-22': '73e0212c508603969fe923391867f3ae4fd4ba655b8b2818ae67f9107ee224aa',
  'AVK-U03-LW-13-R': '680dc4ae1fca1718a2645c215c582d8af56729b2b250b0f5ad1fa6783fbe6539',
  'AVK-U03-LW-15-R': '059ac30763fdce94e161ada37bd80a05a5f6bd682a0345909711e71063778e17',
  'AVK-U03-LW-17-R': '2a0f1b81aa2da9f73f32ac5164842a3225ad14a462faf85ab9699d406429bf67',
  'AVK-U03-LW-19-R': 'b10b5bd3eaa6bad218c39cfdd117ddb0ab2953e01a2952fcf39e8840dbfc4f35',
  'AVK-U03-LW-21-R': '9ad73245b689cf4c97ff86696d2efd0fc116b63d8d6a978b77a37f65f71e0b6c',
  'AVK-U03-LW-23-R': '1647880d5100682d2dedf4107a89956c4a35fcd8997261c94efc1dd5f9741366',
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

test('U-03C: no PENDING string is in the generated module', () => {
  for (const v of Object.values(UNIFICATION_COPY)) assert.ok(!PENDING_SHA256.has(sha(v)), v)
  for (const id of ['AVK-U03-LW-02', 'AVK-U03-LW-11', 'AVK-U03-LW-31', 'AVK-U03-LW-34', 'AVK-U03-LW-M1']) assert.ok(!(id in UNIFICATION_COPY), id)
})

test('U-03C-1: superseded principle drafts are not in the module; replacements are', () => {
  for (const v of Object.values(UNIFICATION_COPY)) assert.ok(!SUPERSEDED_SHA256.has(sha(v)), v)
  assert.equal(
    UNIFICATION_COPY['AVK-U03-LW-11-R'],
    'These six principles guide the environments we are designing. They describe what we are working toward, not features available to visitors today.',
  )
})
