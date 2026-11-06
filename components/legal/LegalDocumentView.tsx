import { InstitutionalLayout } from '@/components/foundation/InstitutionalLayout'
import { EditorialContainer } from '@/components/foundation/Container'
import type { LegalBlock, LegalDocument } from '@/lib/content/legalCopy'

// AVK-PROD-03C-02a: renders a counsel-approved legal document as plain structured text. Every string
// is a React text node (no HTML or markdown injection), and the only links are mailto: links for
// approved email blocks. It has no client JS, forms, storage or external resources. Callers must pass
// a document that already passed lib/release/legalGate.ts.
function Block({ block }: { block: LegalBlock }) {
  if (block.kind === 'paragraph') return <p className="mt-4 leading-relaxed">{block.text}</p>
  if (block.kind === 'list')
    return (
      <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  return (
    <p className="mt-4 leading-relaxed">
      {block.label}{' '}
      <a
        href={`mailto:${block.address}`}
        className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
      >
        {block.address}
      </a>
    </p>
  )
}

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <InstitutionalLayout>
      <EditorialContainer>
        <article aria-labelledby="legal-title">
          <h1 id="legal-title" className="text-4xl font-semibold leading-tight tracking-tight">
            {doc.title}
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--ink)' }}>
            Version {doc.version} · Effective <time dateTime={doc.effectiveDate ?? undefined}>{doc.effectiveDate}</time>
          </p>
          {doc.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </section>
          ))}
        </article>
      </EditorialContainer>
    </InstitutionalLayout>
  )
}
