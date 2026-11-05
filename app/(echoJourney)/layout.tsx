import type { ReactNode } from 'react'
import { guardExcludedSegment } from '@/lib/release/guards'
import { EchoJourneyLayoutClient } from './EchoJourneyLayoutClient'

// AVK-PROD-03A (C3, L2): /today and /my/* are excluded from the institutional release scope. The
// former client layout moved unchanged to ./EchoJourneyLayoutClient.tsx so this server layout can
// fail closed (404) before any client session code is rendered.
export default function EchoJourneyLayout({ children }: { children: ReactNode }) {
  guardExcludedSegment()
  return <EchoJourneyLayoutClient>{children}</EchoJourneyLayoutClient>
}
