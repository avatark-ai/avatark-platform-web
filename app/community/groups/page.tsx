import type { Metadata } from "next";
import { DISCOVER_HREF } from "@/lib/echo/links";
import { CommunityEmptyState, CommunitySectionShell } from "@/components/echo/community/CommunitySectionShell";

export const metadata: Metadata = {
  title: "Groups — Community — Echo",
  description: "Small communities formed around a practice, transition, institution, or common question.",
};

export default function GroupsPage() {
  return (
    <CommunitySectionShell
      title="Groups"
      purpose="Small communities formed around a practice, transition, institution, or common question."
    >
      <CommunityEmptyState
        body="You have not joined a group yet."
        ctaLabel="Discover Echoes"
        ctaHref={`${DISCOVER_HREF}?view=echoes`}
      />
    </CommunitySectionShell>
  );
}
