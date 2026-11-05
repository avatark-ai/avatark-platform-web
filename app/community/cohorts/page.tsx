import { guardExcludedSegment } from '@/lib/release/guards'
import type { Metadata } from "next";
import { ENTER_INVITATION_HREF } from "@/lib/echo/links";
import { CommunityEmptyState, CommunitySectionShell } from "@/components/echo/community/CommunitySectionShell";

export const metadata: Metadata = {
  title: "Cohorts — Community — Echo",
  description: "People moving through the same practice or threshold on a shared timeline.",
};

export default function CohortsPage() {
  guardExcludedSegment() // AVK-PROD-03A L2: excluded page code never runs in the institutional scope
  return (
    <CommunitySectionShell
      title="Cohorts"
      purpose="People moving through the same practice or threshold on a shared timeline."
    >
      <CommunityEmptyState
        body="You are not part of an active cohort."
        ctaLabel="Enter an invitation"
        ctaHref={ENTER_INVITATION_HREF}
      />
    </CommunitySectionShell>
  );
}
