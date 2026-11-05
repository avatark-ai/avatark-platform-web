import type { ReactNode } from 'react'
import { guardExcludedSegment } from '@/lib/release/guards'
import { JourneyLayoutClient } from './JourneyLayoutClient'

// AVK-PROD-03A (C3, L2): /journey/* is excluded from the institutional release scope. The former
// client layout moved unchanged to ./JourneyLayoutClient.tsx so this server layout can fail closed
// (404) before any client session code is rendered.
export default function JourneyLayout({ children }: { children: ReactNode }) {
  guardExcludedSegment()
  return <JourneyLayoutClient>{children}</JourneyLayoutClient>
}
