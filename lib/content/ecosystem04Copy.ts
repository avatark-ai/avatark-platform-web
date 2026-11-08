// AVK-ECOSYSTEM-04: Growth Engines correction + StudioK card copy. Register:
// _claude_reports/AVK_ECOSYSTEM_04/tools/e04-register.json. STATUS: PROPOSED -- pending owner copy approval at
// the protected-Preview gate. Do not edit a string here without a register amendment: ecosystem04Copy.test.ts
// pins every value. A `{productId}` token is rendered as that product's name, linked only when the Scope I
// destination policy (lib/release/productDestinations.ts) allows it.

export const ECOSYSTEM_04_COPY = {
  "AVK-E04-SK-01": "Creation & Modeling Engine",
  "AVK-E04-SK-02": "The creation and modeling engine for Living Worlds — combining procedural environments, simulation, cinematic production and adaptive storytelling.",
  "AVK-E04-SK-03": "Part of DT4M, supporting Living Worlds.",
  "AVK-E04-PK-REL": "{arenak} is designed to host shared occasions for these practices.",
} as const

export type Ecosystem04CopyId = keyof typeof ECOSYSTEM_04_COPY

export const ECOSYSTEM_04_COPY_SHA256: Record<Ecosystem04CopyId, string> = {
  "AVK-E04-SK-01": "775e866ec3bb558a3f486bf19c5b151a07dade8db0303760c6aa94c51b1ba1f9",
  "AVK-E04-SK-02": "03987fbbd4fa5f5fb13f575932604c87cf98cdfaff3ba69432fd7469dcc5dadb",
  "AVK-E04-SK-03": "f6e62460229968ee5abf7465dab840ccaee13fb5f42f7ef9816121663aff4bfa",
  "AVK-E04-PK-REL": "6d6415fbe7c7b82bc06a92a8f96ecb1c58d5c091018d1a0efe60b61a34991b44",
}

// StudioK feature chips, from the AVK-ECOSYSTEM-04 §1 capability list.
export const STUDIOK_CAPABILITY_CHIPS = ['World Construction', 'Procedural Generation', 'Simulation', 'Cinematic Production'] as const

// Splits a relation line into text and `{productId}` tokens. Pure, so it runs under `node --test`.
export function splitRelationTokens(line: string): ({ text: string } | { productId: string })[] {
  const parts: ({ text: string } | { productId: string })[] = []
  let last = 0
  for (const m of line.matchAll(/\{([a-z0-9-]+)\}/g)) {
    if (m.index! > last) parts.push({ text: line.slice(last, m.index) })
    parts.push({ productId: m[1] })
    last = m.index! + m[0].length
  }
  if (last < line.length) parts.push({ text: line.slice(last) })
  return parts
}
