// Reuses Hero.tsx's gold-rule treatment (h-px w-16) above the quoted line,
// rather than inventing a new pull-quote visual language for this page.
export function FounderPullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="my-10">
      <div className="h-px w-16" style={{ background: 'var(--gold)' }} aria-hidden="true" />
      <p
        className="mt-6 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
        style={{ color: 'var(--ink)' }}
      >
        {children}
      </p>
    </blockquote>
  )
}
