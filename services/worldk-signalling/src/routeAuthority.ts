// The signalling service's ONLY view of Platform authority: the Platform's
// signalling-facing route endpoint (045). Signalling holds no database
// credential; it presents sha256(authorization) and learns an opaque route
// key plus whether B4 attachment happened. Any non-200 is "not routable".

export interface RouteDecision {
  routeKey: string
  attached: boolean
}

export interface RouteAuthority {
  resolve(authorizationSha256Hex: string): Promise<RouteDecision | null>
}

const ROUTE_KEY = /^wkr1-[0-9a-f]{40}$/

export function httpRouteAuthority(platformOrigin: string, signallingKey: string, fetchImpl: typeof fetch = fetch): RouteAuthority {
  const base = new URL(platformOrigin)
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") throw new Error("platform origin must be https")
  const url = new URL("/api/signalling/v1/route", base)
  return {
    async resolve(h) {
      if (!/^[0-9a-f]{64}$/.test(h)) return null
      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: { authorization: `Bearer ${signallingKey}`, "content-type": "application/json" },
          body: JSON.stringify({ authorizationSha256: h }),
          redirect: "error",
        })
        if (res.status !== 200) return null
        const j = (await res.json()) as Record<string, unknown>
        if (typeof j.routeKey !== "string" || !ROUTE_KEY.test(j.routeKey) || typeof j.attached !== "boolean") return null
        return { routeKey: j.routeKey, attached: j.attached }
      } catch {
        return null
      }
    },
  }
}
