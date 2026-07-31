import { buildProductUrl, type ResolveDomainOptions } from "./redirect.ts";

// Deep Link Resolver -- one shared vocabulary for the six kinds of
// content-shaped link named across the ecosystem: watch, practice, echo,
// arena, studio, game. Distinct from (and not a replacement for)
// @avatark/journey's deepLinks.ts, which models this repo's own nine-step
// Entry Engine journey graph (/enter, /watch-first, /witness,
// /practice/{id}, /journey) -- that module answers "where is step X of
// *this* journey," this one answers "which product does content of kind X
// actually live on."
//
// Three of the six kinds are genuinely local to this repo's own real
// routes (watch, practice, echo); the other three are always another
// product's domain (arena, studio, game). A kind's `local` flag is the
// one thing every consumer must check before deciding whether `href` is a
// same-origin path or a foreign absolute URL -- conflating the two is
// exactly the kind of "product invents its own deep-link logic" bug this
// contract exists to prevent. See docs/DEEP_LINKS.md for the full
// rationale, including why "practice" resolves locally even though
// PrometheusK is Practices' real ecosystem owner (docs/PLATFORM_CONTRACTS.md).

export type DeepLinkKind = "watch" | "practice" | "echo" | "arena" | "studio" | "game";

export interface CrossProductDeepLink {
  kind: DeepLinkKind;
  /** The product this link's content actually belongs to. Always "avatark" for a local kind. */
  productId: string;
  /** In-repo path, always starting with "/". For a local kind this is a real, resolvable Next.js route; for a cross-product kind it's the path appended to the target product's domain. */
  path: string;
  /** True when `path` resolves to a route inside avatark-platform-web itself -- false means `href` (when non-null) is a foreign, cross-origin URL. */
  local: boolean;
  /** For a local kind, the same value as `path` (the host app decides whether to prefix its own origin). For a cross-product kind, the fully resolved absolute URL, or null if the target product's domain can't be resolved. */
  href: string | null;
}

const LOCAL_PRODUCT_ID = "avatark";

// Real, existing local routes only -- never a route this repo hasn't
// actually built. "watch" maps to /watch-first (this repo's real static
// route), not a literal "/watch/..." prefix: the mission's naming lists
// the *kind*, not a route this pass invents.
function watchPath(slug?: string | null): string {
  return slug ? `/watch-first/${encodeURIComponent(slug)}` : "/watch-first";
}

function practicePath(id: string): string {
  return `/practice/${encodeURIComponent(id)}`;
}

function echoPath(slug: string): string {
  return `/echo/${encodeURIComponent(slug)}`;
}

const CROSS_PRODUCT_TARGET: Record<Extract<DeepLinkKind, "arena" | "studio" | "game">, string> = {
  arena: "arenak",
  studio: "studiok",
  game: "gamek",
};

/**
 * Every product id that participates in the Deep Link Resolver today --
 * `LOCAL_PRODUCT_ID` (the three local kinds) plus every id named in
 * `CROSS_PRODUCT_TARGET`. Exported so a conformance checker (see
 * @avatark/bootstrap's conformance.ts) can decide whether "deep links" is
 * even an applicable dimension for a given product, rather than guessing.
 */
export const DEEP_LINK_PARTICIPANT_IDS: readonly string[] = [
  LOCAL_PRODUCT_ID,
  ...new Set(Object.values(CROSS_PRODUCT_TARGET)),
];

function crossProductLink(
  kind: Extract<DeepLinkKind, "arena" | "studio" | "game">,
  path: string,
  options: ResolveDomainOptions = {}
): CrossProductDeepLink {
  const productId = CROSS_PRODUCT_TARGET[kind];
  return {
    kind,
    productId,
    path,
    local: false,
    href: buildProductUrl(productId, path, options),
  };
}

/** /watch-first, or /watch-first/{slug} -- both real, static routes in this repo today. */
export function watchLink(slug?: string | null): CrossProductDeepLink {
  const path = watchPath(slug);
  return { kind: "watch", productId: LOCAL_PRODUCT_ID, path, local: true, href: path };
}

/** /practice/{id} -- real (app/practice/[id]), this repo's own local Practice content. Not a redirect to PrometheusK: see this file's header comment. */
export function practiceLink(id: string): CrossProductDeepLink {
  const path = practicePath(id);
  return { kind: "practice", productId: LOCAL_PRODUCT_ID, path, local: true, href: path };
}

/** /echo/{slug} -- real (app/echo/[slug]), this repo's own editorial Echo content. Never Living Echo (see docs/DEEP_LINKS.md's disambiguation). */
export function echoLink(slug: string): CrossProductDeepLink {
  const path = echoPath(slug);
  return { kind: "echo", productId: LOCAL_PRODUCT_ID, path, local: true, href: path };
}

/** ArenaK's domain + `path` (default "/"). ArenaK's real implementation is not reachable from this repo (docs/PLATFORM_CONTRACTS.md's Invitations section) -- this only ever builds the URL, it never validates the destination exists. */
export function arenaLink(path = "/", options?: ResolveDomainOptions): CrossProductDeepLink {
  return crossProductLink("arena", path, options);
}

/** StudioK's domain + `path` (default "/"). */
export function studioLink(path = "/", options?: ResolveDomainOptions): CrossProductDeepLink {
  return crossProductLink("studio", path, options);
}

/** GameK's domain + `path` (default "/"). */
export function gameLink(path = "/", options?: ResolveDomainOptions): CrossProductDeepLink {
  return crossProductLink("game", path, options);
}

const LOCAL_PREFIXES: Array<{ kind: Extract<DeepLinkKind, "watch" | "practice" | "echo">; prefix: string }> = [
  { kind: "watch", prefix: "/watch-first" },
  { kind: "practice", prefix: "/practice/" },
  { kind: "echo", prefix: "/echo/" },
];

/**
 * The inverse of watchLink/practiceLink/echoLink: given an incoming
 * pathname inside this repo, names which deep-link kind (if any) it is.
 * Local kinds only -- a cross-product kind (arena/studio/game) is
 * outbound-only from this repo's point of view, there is no incoming
 * pathname of this app's own to classify against those three.
 */
export function parseLocalDeepLinkPath(
  pathname: string
): { kind: Extract<DeepLinkKind, "watch" | "practice" | "echo">; rest: string } | null {
  for (const { kind, prefix } of LOCAL_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix)) {
      const rest = pathname.slice(prefix.length).replace(/^\//, "");
      return { kind, rest };
    }
  }
  return null;
}
