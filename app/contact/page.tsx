import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { publishableLegalDocument } from '@/lib/release/legalGate'
import { LegalDocumentView } from '@/components/legal/LegalDocumentView'

// AVK-PROD-03C-02a: approval-gated institutional Contact page. Returns 404 unless the document passes
// lib/release/legalGate.ts (counsel-approved, registered, hash-matched, free of draft markers). The
// gate is the first statement of both exports (L2, checked on the AST); the proxy allowlist is L1.
export async function generateMetadata(): Promise<Metadata> {
  const doc = publishableLegalDocument('contact')
  if (!doc) notFound()
  return { title: doc.title ?? undefined }
}

export default function ContactPage() {
  const doc = publishableLegalDocument('contact')
  if (!doc) notFound()
  return <LegalDocumentView doc={doc} />
}
