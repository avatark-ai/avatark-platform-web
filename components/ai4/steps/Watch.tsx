import { StepFrame } from "@/components/ai4/StepFrame";

// No real video source -- the demo must never depend on a CMS field or an
// external media URL resolving on conference Wi-Fi (see app/watch-first,
// which already shows a "no story is live" fallback when that data is
// missing). This is a self-contained cinematic frame: a static gradient
// with a slow breathing glow standing in for "a story is playing."
export function Watch() {
  return (
    <StepFrame kicker="01 · Watch" title="The screen goes dark. The story does not end.">
      <div
        className="relative flex aspect-video w-full max-w-2xl items-center justify-center overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--surface-line)", background: "linear-gradient(160deg, color-mix(in srgb, var(--gold) 10%, var(--midnight)) 0%, var(--midnight) 65%)" }}
      >
        <span
          aria-hidden="true"
          className="motion-breathe absolute h-28 w-28 rounded-full"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--gold) 35%, transparent) 0%, transparent 72%)" }}
        />
        <span
          aria-hidden="true"
          className="relative flex h-14 w-14 items-center justify-center rounded-full border-2"
          style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 14%, transparent)" }}
        >
          <span
            className="ml-1 h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent"
            style={{ borderLeftColor: "var(--paper)" }}
          />
        </span>
      </div>
      <p className="max-w-[560px] text-base leading-7 sm:text-lg" style={{ color: "var(--text-dim)" }}>
        A life. A struggle. A choice, rendered with care. Every AvatarK story starts the way any story does — you watch.
      </p>
    </StepFrame>
  );
}
