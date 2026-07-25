import type { StoryRecord } from "@/lib/content/echo";

export function StoryCard({ story }: { story: StoryRecord }) {
  return (
    <div
      className="flex flex-col gap-2 rounded-md border p-5"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
    >
      <p className="text-base font-semibold" style={{ color: "var(--paper)" }}>
        {story.title}
      </p>
      <p className="line-clamp-2 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {story.description}
      </p>
      <p className="text-xs uppercase tracking-wide" style={{ color: story.mediaUrl ? "var(--gold)" : "var(--text-dim)" }}>
        {story.mediaUrl ? story.duration : "Preview — not yet playable"}
      </p>
    </div>
  );
}
