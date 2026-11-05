import { guardExcludedSegment } from '@/lib/release/guards'
import type { Metadata } from "next";
import { STORIES_HREF } from "@/lib/echo/links";
import { CommunityEmptyState, CommunitySectionShell } from "@/components/echo/community/CommunitySectionShell";

export const metadata: Metadata = {
  title: "Events — Community — Echo",
  description: "Live or scheduled moments for practice, reflection, conversation, or witness.",
};

export default function EventsPage() {
  guardExcludedSegment() // AVK-PROD-03A L2: excluded page code never runs in the institutional scope
  return (
    <CommunitySectionShell
      title="Events"
      purpose="Live or scheduled moments for practice, reflection, conversation, or witness."
    >
      <CommunityEmptyState body="No events are scheduled yet." ctaLabel="Explore stories" ctaHref={STORIES_HREF} />
    </CommunitySectionShell>
  );
}
