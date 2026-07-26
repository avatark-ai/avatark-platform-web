// Monospace canonical-formula treatment, reused wherever the Canon states a
// conserved relation (Operators' canonical constraint, Dynamics' dominance
// distribution and canonical constraint).
export function CanonFormula({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-3 inline-block rounded-md border px-4 py-2 font-mono text-sm"
      style={{ borderColor: 'var(--paper-line)', background: 'var(--midnight)', color: 'var(--paper)' }}
    >
      {children}
    </p>
  )
}
