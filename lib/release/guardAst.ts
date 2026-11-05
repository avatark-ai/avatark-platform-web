// AVK-PROD-03A (C7): TypeScript-AST helpers to locate guard positions precisely. Test-only (imported by
// lib/release/guardCoverage.test.ts); never part of the app bundle.
import ts from 'typescript'

export type GuardTarget = { name: string; firstStatement: string | null; secondStatement: string | null; bodyStart: number }

/** Default-exported page component, generateMetadata, and exported HTTP-method handlers. */
export function guardTargets(source: string, fileName = 'x.tsx'): GuardTarget[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const out: GuardTarget[] = []
  for (const st of sf.statements) {
    if (!ts.isFunctionDeclaration(st) || !st.body) continue
    const mods = ts.getModifiers(st) ?? []
    const exported = mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    const isDefault = mods.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
    const name = st.name?.text ?? 'default'
    if (!exported) continue
    if (isDefault || name === 'generateMetadata' || /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(name)) {
      const [first, second] = st.body.statements
      out.push({
        name: isDefault ? `default ${name}` : name,
        firstStatement: first ? first.getText(sf) : null,
        secondStatement: second ? second.getText(sf) : null,
        bodyStart: st.body.getStart(sf) + 1,
      })
    }
  }
  return out
}
