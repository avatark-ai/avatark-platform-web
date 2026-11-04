import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { LIVING_WORLDS_COPY, LIVING_WORLDS_COPY_SHA256, type LivingWorldsCopyId } from './livingWorldsCopy.ts'
import { APPROVED_COPY } from './institutionalCopy.ts'

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

// AVK-UNIFICATION-02A approved-editorial-register.json `sha` values, pinned here independently of
// the generated module so an edit to both a string and its local hash still fails.
const REGISTER_SHA256: Record<string, string> = {
  'AVK-FLW-FD-01': '13ed4bfde52fec79423caf9902b37e535420279605c23de12a55c198541cc7d2',
  'AVK-FLW-FD-02': 'a43f860116681362c882bd800799e2af337b758a7ef00ac85c0783c584537db7',
  'AVK-FLW-FD-03': 'cfe2699e41cf9bd65155322289e00aaccf0cede227d3803ee499da54065a8800',
  'AVK-FLW-FD-04': '2615b72ca83b6a99205a5abf5af8e3060ac0830323c8bbacd56fb59d7e9a07f9',
  'AVK-FLW-FD-05': '4c71579bb81917868f19fc3b46864ecd32679d282e7bd2bdbd99dd0ee188ce15',
  'AVK-FLW-FD-06': 'd3b69d715d43fba23a257a829d7639b18adaa116bbe39afd1082b0565e3710b3',
  'AVK-FLW-FD-07': 'c5125041492f48df491099eab0a496dcf2cbffef92902b9913a84dc72db9322e',
  'AVK-FLW-FD-08': '99d21d499276425a9320c61d585959e52da7d8ac03960374049cd334a05ac2e9',
  'AVK-FLW-LW-10': '2a7fa7d90de4c70b465161b4cc65d5286dc154c83937ea31a7a37e0eee7c274f',
  'AVK-FLW-LW-11': 'b0f7e2d9f475a9b7e054f9f21073ae06181aef5db8339f034cdc7ad6c91784e0',
  'AVK-FLW-LW-13': '5d82df00bc4e00d8eb5ceb2a4ea0032561dd74a678e9ae141c5ae13b3ce4f703',
  'AVK-FLW-LW-14': 'ffef077df96b9b9df1c0fdbf0b2da2482a19ee63ca25d563c2ba0c58324b2a43',
  'AVK-FLW-LW-15-R': '207bac8f25a3fd3df6b3d9bfdecc671d49b3b5d88ae8e536279aae3cdbc2a110',
  'AVK-FLW-LW-16': '05da728ec841b8b45aa36f5c02a861403afad18fbc76d28f5020b9bf77c36f76',
  'AVK-FLW-LW-16C': 'f7250ec316074db7697f6b5f0996a8802f3aaefd36c6e006b2667adb3de6d795',
  'AVK-FLW-LW-17': '554884adcab1bf085ab5395b414883bd5b5cec6ff6451b34ad54b51dd3a8d59c',
  'AVK-FLW-LW-18-ALT': '4860b0285771c8a50dcae0d8804db659105ca77f14d9f30efa6b115d37b9a6f2',
  'AVK-FLW-LW-19': '462b730a626734fc55ed50d28028faaea0027574fd616026c513f9fd83cd28be',
  'AVK-FLW-ST-01': '5259ae65614671c45dc0a4f34a05a2cd323dc9817543340d5459b67fda87d394',
  'AVK-FLW-ST-02': '00fdc0c33a935d23002c7bdf61108a99dc4222c208a07ca69074a52559bf56c3',
  'AVK-FLW-ST-03': '61636cdef547228389f0260d1dbb952beb8fe5632d7069d5da9a383ad3582361',
  'AVK-FLW-HM-01': 'f1de12c97ed86e04e7033ccdc05c8dea38a103d470dead0d07590c01e495986a',
  'AVK-FLW-CN-01': '3c66647d3eba6a125ed75cab5383b917eceeea0a1f3ea2649d046d6c0b98f7f5',
  'AVK-FLW-CN-02': 'c9d8e24750086045f9461bcf275daaaa0acb07d64049d50fbfc01956aa424de1',
  'AVK-FLW-EC-01': '13ed4bfde52fec79423caf9902b37e535420279605c23de12a55c198541cc7d2',
  'AVK-FLW-EC-02': 'a59c096cb4f3e9de8a8d22139bdb88a3e659554b611e9fd046dc3c7cb24d1da8',
  'AVK-FLW-EC-03': 'e37211c3393e11b4f8abc0ce9e0107725cd72802a0f11f5b2d82ab24594e77a9',
  'AVK-FLW-EC-04': '7e87dc555355dc93650013dca088535591d3f58b317b29a4c17c23c69f7a9e0b',
  'AVK-FLW-EC-05': '48a79124f33328cbb3ba2682b8f67ddba2cf010d1cb58e26aa7c6f2be586e6b8',
  'AVK-FLW-EC-06': '5259ae65614671c45dc0a4f34a05a2cd323dc9817543340d5459b67fda87d394',
  'AVK-FLW-EC-07': 'c5125041492f48df491099eab0a496dcf2cbffef92902b9913a84dc72db9322e',
  'AVK-FLW-EC-09': 'b28408688e60a5164302d81b75cde67a7320bbc81b1d0b642aa8efcc743942a4',
  'AVK-FLW-EC-10': '950980bb1f1da272f2f9ff038ee7bd25f23d07cd1f6446e6c2072cce04990c15',
}

test('every Living Worlds string matches its pinned SHA-256', () => {
  for (const id of Object.keys(LIVING_WORLDS_COPY) as LivingWorldsCopyId[]) {
    assert.equal(sha(LIVING_WORLDS_COPY[id]), LIVING_WORLDS_COPY_SHA256[id], id)
  }
})

test('every Living Worlds string matches the 02A register independently', () => {
  assert.deepEqual(Object.keys(LIVING_WORLDS_COPY).sort(), Object.keys(REGISTER_SHA256).sort())
  for (const [id, h] of Object.entries(REGISTER_SHA256)) {
    assert.equal(sha(LIVING_WORLDS_COPY[id as LivingWorldsCopyId]), h, id)
  }
})

test('reused strings are identical to their U-02 sources', () => {
  assert.equal(LIVING_WORLDS_COPY['AVK-FLW-CN-02'], APPROVED_COPY['AVK-FR-083-A'])
  assert.equal(LIVING_WORLDS_COPY['AVK-FLW-FD-07'], APPROVED_COPY['AVK-FR-026'])
  assert.equal(LIVING_WORLDS_COPY['AVK-FLW-EC-07'], APPROVED_COPY['AVK-FR-026'])
  assert.equal(LIVING_WORLDS_COPY['AVK-FLW-EC-04'], APPROVED_COPY['AVK-FR-055'])
  assert.equal(LIVING_WORLDS_COPY['AVK-FLW-FD-01'], APPROVED_COPY['AVK-FR-003'])
  assert.equal(LIVING_WORLDS_COPY['AVK-FLW-EC-10'], `${APPROVED_COPY['AVK-FR-024']} ${APPROVED_COPY['AVK-FR-025']}`)
})

test('conditional, held, withdrawn and forbidden text is absent', () => {
  const all = Object.values(LIVING_WORLDS_COPY).join('\n')
  for (const bad of [
    'Mahabharata', 'Research Center', 'Forest Intelligence', 'Adhi Yogi', 'worldk.ai', '/enter', 'Sign In',
    'The streaming surface for the AvatarK universe.', 'cinematic lens of AvatarK',
    'StreamK and CinemaK are intended to carry', 'StudioK is where AvatarK', 'each told from its own tradition',
    'leave and return', 'They are not business lines',
  ]) {
    assert.ok(!all.includes(bad), bad)
  }
})

test('the four philosophical axes and the DT4 pillars are kept apart', () => {
  // CN-01/CN-02 (Canon) name the axes' figures but never a pillar; EC-09 names a pillar but no figure.
  for (const id of ['AVK-FLW-CN-01', 'AVK-FLW-CN-02'] as const) {
    assert.ok(!/DT4[HIMC]/.test(LIVING_WORLDS_COPY[id]), id)
  }
  for (const figure of ['Adiyogi', 'Krishna', 'Rama ', 'Prometheus']) {
    assert.ok(!LIVING_WORLDS_COPY['AVK-FLW-EC-09'].includes(figure), figure)
  }
})
