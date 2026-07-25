import type { StoryRecord } from "@/lib/content/echo";

export function StoryCard({ story }: { story: StoryRecord }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-6"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
    >
      <div
        className="flex aspect-video items-center justify-center rounded-xl border text-xs"
        style={{ borderColor: "var(--surface-line)", background: "var(--midnight)", color: "var(--text-dim)" }}
      >
        {story.mediaUrl ? "▶" : "Preview"}
      </div>
      <p className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
        {story.title}
      </p>
      <p className="line-clamp-2 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {story.description}
      </p>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: story.mediaUrl ? "var(--gold)" : "var(--text-dim)" }}>
        {story.mediaUrl ? story.duration : "Preview — not yet playable"}
      </p>
    </div>
  );
}
