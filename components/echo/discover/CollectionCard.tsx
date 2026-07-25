import Link from "next/link";
import { getEchoBySlug, getPracticeBySlug, type CollectionRecord } from "@/lib/content/echo";
import { echoDetailHref, practiceDetailHref } from "@/lib/echo/links";

export function CollectionCard({ collection }: { collection: CollectionRecord }) {
  const echoes = collection.echoSlugs.map((slug) => getEchoBySlug(slug)).filter((echo) => echo !== undefined);
  const practices = collection.practiceSlugs.map((slug) => getPracticeBySlug(slug)).filter((practice) => practice !== undefined);

  return (
    <div
      className="flex flex-col gap-3 rounded-md border p-5"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
    >
      <p className="text-base font-semibold" style={{ color: "var(--paper)" }}>
        {collection.title}
      </p>
      <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {collection.description}
      </p>
      {(echoes.length > 0 || practices.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {echoes.map((echo) => (
            <Link
              key={`echo-${echo.slug}`}
              href={echoDetailHref(echo.slug)}
              className="rounded-full border px-3 py-1 text-xs transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
            >
              {echo.name}
            </Link>
          ))}
          {practices.map((practice) => (
            <Link
              key={`practice-${practice.slug}`}
              href={practiceDetailHref(practice.slug)}
              className="rounded-full border px-3 py-1 text-xs transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
            >
              {practice.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
