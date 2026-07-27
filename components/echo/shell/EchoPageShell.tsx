import type { ReactNode } from "react";

// Shared density + alignment shell for Echo consumer pages. The outer
// container here is deliberately IDENTICAL to EchoHeader's and
// EchoContextNav's own (`mx-auto max-w-6xl px-6`) -- that match is what
// keeps every page's left/right edge aligned with the nav bars above it
// at every viewport width. Previously each route picked its own
// independent max-width (1180/1040/800/560px, each separately centered),
// which is why sibling pages visually misaligned with the header and
// with each other on wide viewports: two independently-centered boxes of
// different widths do not share a left edge unless their widths match.
//
// Never sets min-height on nested content -- a sparse page is allowed to
// be short; this shell does not stretch it to fill the viewport.
export type EchoTopPadding = "standard" | "compact";

const TOP_PADDING_CLASS: Record<EchoTopPadding, string> = {
  standard: "pt-10 sm:pt-14",
  compact: "pt-10 sm:pt-12",
};

// Inner reading-column caps for pages that want a narrower single column
// (forms, decision lists, long-form copy) instead of the full shell
// width. Applied directly with NO mx-auto/centering of their own -- a
// capped-width block element with no auto margins still starts flush at
// its parent's left edge, so it stays aligned with the header/nav rather
// than re-centering itself in the middle of the (wider) shell.
export const ECHO_READING_WIDTH_CLASS = {
  form: "max-w-md",
  narrow: "max-w-xl",
  editorial: "max-w-2xl",
} as const;

export function EchoPageShell({
  topPadding = "standard",
  layout = "stack",
  className = "",
  contentClassName = "",
  children,
}: {
  topPadding?: EchoTopPadding;
  /** "stack": shell provides the flex-col + section-gap wrapper (default). "plain": shell only constrains width; caller owns inner layout. */
  layout?: "stack" | "plain";
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <main
      className={`flex flex-1 flex-col pb-12 sm:pb-16 ${TOP_PADDING_CLASS[topPadding]} ${className}`}
      style={{ background: "var(--midnight)", color: "var(--paper)" }}
    >
      <div
        className={`mx-auto flex w-full max-w-6xl flex-col px-6 ${
          layout === "stack" ? "gap-10 sm:gap-12" : ""
        } ${contentClassName}`}
      >
        {children}
      </div>
    </main>
  );
}
