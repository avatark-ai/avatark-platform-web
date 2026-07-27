import type { Metadata } from "next";
import Link from "next/link";
import { CREATE_MY_ECHO_HREF, DISCOVER_HREF, START_HERE_HREF } from "@/lib/echo/links";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

export const metadata: Metadata = {
  title: "What Is an Echo? — Echo",
  description: "Not a profile. A living inheritance -- how an Echo actually works, in plain language.",
};

const STAGES = [
  {
    stage: "Life experience",
    body: "Something happens. A change, a stuck place, a decision that mattered. Nothing about it needs to be extraordinary — it only needs to be real.",
  },
  {
    stage: "Reflection",
    body: "You sit with what happened long enough to notice something in it — not a performance, just a private moment of paying attention.",
  },
  {
    stage: "Practice",
    body: "The reflection becomes something small and repeatable you can actually do — a practice, not a resolution. PrometheusK powers the practice engine underneath every Echo practice.",
  },
  {
    stage: "Evidence",
    body: "Over time, showing up to the practice leaves a real trace — not a score, not a diagnosis, just an honest record that something happened and you returned to it.",
  },
  {
    stage: "Echo",
    body: "That trace, once there's enough of it, becomes an Echo: the part of a life another person can learn from, test, practice and carry forward.",
  },
  {
    stage: "Pass Forward",
    body: "What you learned may become someone else's beginning — private practice, shared only when it's ready to help another life the way it helped yours.",
  },
] as const;

export default function WhatIsAnEchoPage() {
  return (
    <EchoPageShell layout="plain">
      <div className={`flex flex-col gap-10 sm:gap-12 ${ECHO_READING_WIDTH_CLASS.editorial}`}>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Not a profile. A living inheritance.</h1>
        <p className="max-w-xl text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          Not a résumé. Not a social feed. Not a digital copy of a person. An Echo is what another life learned,
          turned into something you can practice yourself.
        </p>
      </div>

      <ol className="flex flex-col gap-6">
        {STAGES.map((item, index) => (
          <li key={item.stage} className="flex gap-4 rounded-2xl border p-5" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
              style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold" style={{ color: "var(--paper)" }}>
                {item.stage}
              </h2>
              <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col items-start gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
        <p className="text-base leading-7" style={{ color: "var(--paper)" }}>Ready to begin your own?</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={START_HERE_HREF}
            className="rounded-full px-7 py-3 text-center text-sm font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Start Here
          </Link>
          <Link
            href={CREATE_MY_ECHO_HREF}
            className="echo-cta-secondary rounded-full border px-7 py-3 text-center text-sm font-semibold hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
          >
            Create My Echo
          </Link>
        </div>
      </div>

      <p className="text-sm">
        <Link
          href={`${DISCOVER_HREF}?view=echoes`}
          className="link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
        >
          See a real Echo in Discover
        </Link>
      </p>

      {/* The one deliberate exit from Echo on this page -- everything
          above stays inside the consumer experience. */}
      <p className="border-t pt-6 text-sm" style={{ borderColor: "var(--surface-line)", color: "var(--text-dim)" }}>
        <Link
          href="/canon"
          className="link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--text-dim)", outlineColor: "var(--gold)" }}
        >
          Learn about the AvatarK architecture →
        </Link>
      </p>
      </div>
    </EchoPageShell>
  );
}
