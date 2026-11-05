// AVK-UNIFICATION-03C/03D: split an approved "Label: body" string at its first ": " without changing a word.
// Used to render AVK-FLW-LW-15-R as a heading + intro sentence (D-U03-11) from its single source.
export function splitLabel(text: string): { label: string; rest: string } | null {
  const i = text.indexOf(': ')
  return i < 0 ? null : { label: text.slice(0, i), rest: text.slice(i + 2) }
}
