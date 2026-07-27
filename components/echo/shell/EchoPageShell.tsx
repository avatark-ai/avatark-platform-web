import type { ReactNode } from "react";

// Shared density tokens for Echo consumer pages -- one place that decides
// content width and page-level padding, so routes stop each picking their
// own arbitrary max-w-* and py-* values. Values follow the density spec:
// top padding 40-56px (compact: 40-48px), bottom padding 48-64px, section
// gap 36-48px. Never sets min-height on nested content -- a sparse page is
// allowed to be short; this shell does not stretch it to fill the viewport.
export type EchoContentWidth = "wide" | "standard" | "editorial" | "form";
export type EchoTopPadding = "standard" | "compact";

export const ECHO_CONTENT_WIDTH_CLASS: Record<EchoContentWidth, string> = {
  wide: "max-w-[1180px]",
  standard: "max-w-[1040px]",
  editorial: "max-w-[800px]",
  form: "max-w-[560px]",
};

const TOP_PADDING_CLASS: Record<EchoTopPadding, string> = {
  standard: "pt-10 sm:pt-14",
  compact: "pt-10 sm:pt-12",
};

export function EchoPageShell({
  width = "standard",
  topPadding = "standard",
  layout = "stack",
  className = "",
  contentClassName = "",
  children,
}: {
  width?: EchoContentWidth;
  topPadding?: EchoTopPadding;
  /** "stack": shell provides the flex-col + section-gap wrapper (default). "plain": shell only constrains width; caller owns inner layout. */
  layout?: "stack" | "plain";
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <main
      className={`flex flex-1 flex-col px-6 pb-12 sm:pb-16 ${TOP_PADDING_CLASS[topPadding]} ${className}`}
      style={{ background: "var(--midnight)", color: "var(--paper)" }}
    >
      <div
        className={`mx-auto w-full ${ECHO_CONTENT_WIDTH_CLASS[width]} ${
          layout === "stack" ? "flex flex-col gap-10 sm:gap-12" : ""
        } ${contentClassName}`}
      >
        {children}
      </div>
    </main>
  );
}
