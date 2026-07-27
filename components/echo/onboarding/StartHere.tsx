import Link from "next/link";
import { ENTER_INVITATION_HREF, SIGN_IN_HREF, WATCH_FIRST_HREF } from "@/lib/echo/links";
import { EchoPageShell } from "@/components/echo/shell/EchoPageShell";

const CHOICES = [
  {
    id: "invitation",
    label: "I Have an Invitation",
    body: "Enter a code or invitation link.",
    href: ENTER_INVITATION_HREF,
  },
  {
    id: "example",
    label: "Show Me an Example",
    body: "Watch a short Echo journey.",
    href: WATCH_FIRST_HREF,
  },
  {
    id: "choose",
    label: "Help Me Choose",
    body: "Answer a few questions and receive a suggested beginning.",
    href: "/start/choose",
  },
] as const;

export function StartHere() {
  return (
    <EchoPageShell width="form" layout="plain" className="items-center" contentClassName="flex flex-col items-center gap-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          ECHO
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Welcome to Echo</h1>
        <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
          Echo helps you learn from lived experience, turn insight into practice and preserve what changes.
        </p>
        <p className="text-lg font-medium">How would you like to begin?</p>

        <ul className="flex w-full flex-col gap-3">
          {CHOICES.map((choice) => (
            <li key={choice.id}>
              <Link
                href={choice.href}
                className="flex w-full flex-col gap-1 rounded-md border px-6 py-4 text-left transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: "var(--surface-line)", background: "var(--surface)", outlineColor: "var(--gold)" }}
              >
                <span className="text-base font-semibold" style={{ color: "var(--paper)" }}>
                  {choice.label}
                </span>
                <span className="text-sm" style={{ color: "var(--text-dim)" }}>
                  {choice.body}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href={SIGN_IN_HREF}
          className="text-sm underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--text-dim)", outlineColor: "var(--gold)" }}
        >
          I already have an account
        </Link>
    </EchoPageShell>
  );
}
