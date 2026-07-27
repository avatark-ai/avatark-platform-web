import type { Metadata } from "next";
import { STORIES_HREF } from "@/lib/echo/links";
import { CommunityEmptyState, CommunitySectionShell } from "@/components/echo/community/CommunitySectionShell";

export const metadata: Metadata = {
  title: "Events — Community — Echo",
  description: "Live or scheduled moments for practice, reflection, conversation, or witness.",
};

export default function EventsPage() {
  return (
    <CommunitySectionShell
      title="Events"
      purpose="Live or scheduled moments for practice, reflection, conversation, or witness."
    >
      <CommunityEmptyState body="No events are scheduled yet." ctaLabel="Explore stories" ctaHref={STORIES_HREF} />
    </CommunitySectionShell>
  );
}
