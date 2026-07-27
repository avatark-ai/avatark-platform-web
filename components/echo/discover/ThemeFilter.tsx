import Link from "next/link";
import { DISCOVER_HREF } from "@/lib/echo/links";

// A single scrollable row, not a sticky wall of chips (spec: "avoid a wall
// of sticky filter chips" / mobile: "simple scrollable category row").
// Server-rendered links, not client state -- filtering happens via the
// `theme` search param the page already reads. Real query-string links,
// no `#` anchor: choosing a theme is a normal navigation that preserves
// whichever view (Echoes/Practices/Collections/Topics) is currently open.
function themeHref(view: string, theme: string | null): string {
  const params = new URLSearchParams();
  params.set("view", view);
  if (theme) params.set("theme", theme);
  return `${DISCOVER_HREF}?${params.toString()}`;
}

export function ThemeFilter({ themes, active, view }: { themes: string[]; active: string | null; view: string }) {
  if (themes.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by topic">
      <Link
        href={themeHref(view, null)}
        className="shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderColor: active ? "var(--surface-line)" : "var(--gold)",
          background: active ? "transparent" : "var(--gold)",
          color: active ? "var(--paper)" : "var(--midnight)",
          outlineColor: "var(--gold)",
        }}
      >
        All
      </Link>
      {themes.map((theme) => (
        <Link
          key={theme}
          href={themeHref(view, theme)}
          className="shrink-0 rounded-full border px-4 py-1.5 text-sm capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            borderColor: active === theme ? "var(--gold)" : "var(--surface-line)",
            background: active === theme ? "var(--gold)" : "transparent",
            color: active === theme ? "var(--midnight)" : "var(--paper)",
            outlineColor: "var(--gold)",
          }}
        >
          {theme}
        </Link>
      ))}
    </div>
  );
}
