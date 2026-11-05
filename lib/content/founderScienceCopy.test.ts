import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { FOUNDER_SCIENCE_COPY, FOUNDER_SCIENCE_COPY_SHA256, type FounderScienceCopyId } from './founderScienceCopy.ts'
import { parseFoundationContent } from './markdown.ts'

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

// AVK-FOUNDER-SCIENCE-02 approved-fs02-register.json `sha` values, pinned here independently of the
// generated module so an edit to both a string and its local hash still fails.
const REGISTER_SHA256: Record<string, string> = {
  'AVK-FS-FI-01': '23ae45f425f70190f749315697c51cea6da1e32d0d4da8ae9fd079aa25edbf19',
  'AVK-FS-FI-02': '6e32419c8e29ebfb48bd72a71c54257985d47d8dcfd67e354104786e08bd347b',
  'AVK-FS-FI-03': '881e82a25bdfa592e6eff5953aadbbb4636fb2a35217c9324c3647605b5fe785',
  'AVK-FS-FI-04': '17e9e473c5db5409ea705db96c3f252a95fab3b41884f9e21710ac8b4088f4d6',
  'AVK-FS-FI-05': '0a7fffe880b01d027d97202391cf796117cbdd79241a94a1e47f1225638b5b5b',
  'AVK-FS-FT-01': '836699294ae8207a90b8cc7faf9b1100555f23807156fc42d845515f2c22d563',
  'AVK-FS-FT-10': '8f8472a2f6ec348bfc7577a035c7f34a04c62f0c757b54687e1175236dcf393b',
  'AVK-FS-FT-11': 'c365d9bc369ed4c909295f74b388f1d785636f65f610dcc3e8d1430ad7607ec3',
  'AVK-FS-FT-20': '58ddc02a0e3ff998e6c876b090e0998fb06684d8e394a434f89bbb289b62b338',
  'AVK-FS-FT-21': 'd8c9643670607edd4c66b562a8dbda6abecbcf8a290f84c3a6f7c2234b762411',
  'AVK-FS-FT-30': '03d7caf78a24e3bf2ad2c4e3b055e96dfb9bb744ff9b65fabb9540bd67c46580',
  'AVK-FS-FT-31': '7cdb877acacf5820d826a978e99ab1fa1b3bb558800aa0443cc18542162ba613',
  'AVK-FS-FT-40': '73b6e48a1b552d112502d37a7b7870436efc5ea1de0bca58ccf12d6ae15d3a0c',
  'AVK-FS-FT-41': 'ef0d99d4ef366dfe287554bd1321bb5faea48f3db3feaa633a0d47b510e55fae',
  'AVK-FS-FT-50': '2b065c7c9ce466e5ebcad757987d5d660ee4c9ea708bc62c43444b53334738ba',
  'AVK-FS-FT-51': '3b1f5dec960683aca994d8c2999a515b792f706f37d39d985e9e8d08955dc5cf',
  'AVK-FS-FC-01': 'a8e76c15b988025c845cff32f94949cfd7e8eafcd29d2cab0b1ddce2a1094f24',
  'AVK-FS-FC-02': '11246462c35dd235e0d1f66223b2c8b13fe201df0848ac81dcf0e5d5f0d6c051',
  'AVK-FS-FM-01': '52a0f9b65b278850b53aad23136b5d574299e8fb92311304346d19736b7e9cce',
  'AVK-FS-FM-02': '6dc17f9e35e8cf098619956e0c7e45b0edee36aaa7b6adf689bd12a7a6ccef93',
  'AVK-FS-FM-03': '625e906fa7a29757dafc19d74eb4acbbad66f6ecc31d2dddff36fb62cae9a26e',
  'AVK-FS-FM-10': '0d4768c5ab5f3ae50a2fed224dc865fed3010a1d08a3f207982fcd3b6f346a14',
  'AVK-FS-FM-11': '35309f987127cf7945adfa4bfdc416cfd956f13001695e848d7d8f028902f925',
  'AVK-FS-FM-20': '03867aea70acaf4c5dce37a76cf5a04dab1716d6ff70bf03761c439daa8be984',
  'AVK-FS-FM-21': 'c61c7d3172357f8ce2e32e77fda89605c45f995979aacb341581d0bd3cd3ef56',
  'AVK-FS-FM-30': '729bb48d0f86a9e240a9839bf8c50f62f7ed973338514432666cf53c5d30c9ca',
  'AVK-FS-FM-31': '7eb556db263fe007be063b26ccdd446424d1d01b90ce2cb963206a6bc0a12781',
  'AVK-FS-FM-40': '163e44b102626149bbbfb058eee4fcfa7748b40949629e0a1a4ff058f3bb548b',
  'AVK-FS-FM-41': 'c421d1d525754e544dcf7bb274d7b60a9c7607e90043c855edea18fdef74f1ff',
  'AVK-FS-FM-50': '939fd1e8dad6c25fbe085806b416b9da21a9d0ce7cab20914ab30b66cb32980d',
  'AVK-FS-FM-51': '32f185ed22da5d524cc6b8725f9a1ca2f2d91b8cf0f3d73b1462ae32d0efab26',
  'AVK-FS-FM-52': '7d31847ddb406c2932123f2eafa11e375ddb329703f7b60744e6a40c6dd60eef',
  'AVK-FS-FM-53': '0cf44ad6a37b9e1277d0f05dfffe1a1957202991b7f20901ed03cb4d2ae0ab11',
  'AVK-FS-FM-54': 'e94e253743f41d7b9cdd0344d8f6340eef5ac4b68bd17fb6e642c77d0a4bc578',
  'AVK-FS-FM-55': 'aae3c4b7f214176f60f923358b667466ce1405412ba75e550cbc7f131a169e4f',
  'AVK-FS-CI-01': 'b60ec80d3d8a7f3bf1703339419632ded0cd40ee405f8ebfc80e83a84049e1c5',
  'AVK-FS-CI-02': '226042f491fe4c3a29c9a9c650e4a4e078ad83d5f61c6ad30f2261cb5790a5e1',
  'AVK-FS-CI-11': '2c2a986316491d05f878087eba881426319ba809d5b3ccc47094b01cd0a0b08c',
  'AVK-FS-CI-21': '531eb5571a488c4da271ce0d5e12df9588d21c902f72387856332fd3b2ac0fba',
  'AVK-FS-CI-31': '3b9a225650a2406abafc7561e6b2a895316d5bda943e11a2e406e0ebc9445283',
  'AVK-FS-CI-41': '7bfed6094552b8d99f56439acebf5893f1ae3e6d046593d325479997d23b97cc',
  'AVK-FS-CI-50-R': '09fd72d980e299e0dffdaf5c0dccb80f179e3d6e1d9b9ad4600e8d6aeb99d89c',
  'AVK-FS-CI-51': 'f0b3885323cc8c38cc0bd697018f6c7187f457e865ec4f7c8b7a102451c2bdd6',
}

// Canon axis labels reused as reading labels (rendered from canon.md, single source).
const AXIS_LABEL_SHA256: Record<string, string> = {
  'AVK-FS-CI-10': '76abcfebd8866c4f304b0f7f9e139432e8e71c3a8abf8ed4f4108a28da615737',
  'AVK-FS-CI-20': '834459084c92274c56c465ca9ced3c595a01a74dc85f6b5b63151b741f882521',
  'AVK-FS-CI-30': 'c91217be093ab3d9bc1ce3917ed89c8c74d60bada735eea6ca2fa9fb9c3931a3',
  'AVK-FS-CI-40': '6d0a88373d20612e1079406f030d37344dea876647172c1e60c8a2acbef56788',
}

test('every Founder Science string matches its register SHA-256', () => {
  const ids = Object.keys(FOUNDER_SCIENCE_COPY) as FounderScienceCopyId[]
  assert.deepEqual([...ids].sort(), Object.keys(REGISTER_SHA256).sort())
  for (const id of ids) {
    assert.equal(sha(FOUNDER_SCIENCE_COPY[id]), REGISTER_SHA256[id], id)
    assert.equal(FOUNDER_SCIENCE_COPY_SHA256[id], REGISTER_SHA256[id], id)
  }
})

test('owner refinements: superseded wording is absent', () => {
  const all = Object.values(FOUNDER_SCIENCE_COPY).join('\n')
  assert.ok(!all.includes('Both are still being built.'))
  assert.ok(!('AVK-FS-FC-03' in FOUNDER_SCIENCE_COPY))
  assert.ok(!('AVK-FS-CI-50' in FOUNDER_SCIENCE_COPY))
  assert.ok(!all.includes('philosophical and literary inspirations'))
  const note = FOUNDER_SCIENCE_COPY['AVK-FS-CI-50-R']
  assert.ok(note.includes('Indian philosophical, religious and epic traditions'))
  assert.ok(note.includes('Greek myth and literary traditions'))
})

test('Founder Science copy does not carry U-03 homepage wording', () => {
  const all = Object.values(FOUNDER_SCIENCE_COPY).join('\n')
  for (const bad of ['Imagine. Create. Discover. Continue.', 'Adaptive Becoming', 'Mahabharata', 'Research Center']) {
    assert.ok(!all.includes(bad), bad)
  }
})

test('reading labels are the Canon axis labels, unchanged', () => {
  const canon = parseFoundationContent(readFileSync(path.join(process.cwd(), 'content', 'foundation', 'canon.md'), 'utf-8'))
  const labels = canon.sections.map((s) => s.heading)
  assert.deepEqual(labels.map(sha), Object.values(AXIS_LABEL_SHA256))
})
