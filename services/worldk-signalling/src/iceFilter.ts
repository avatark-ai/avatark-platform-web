// Relay-only disclosure control. In relay mode the browser must never learn
// the renderer's network identity, so signalling forwards to the PLAYER only
// relay candidates: non-relay a=candidate lines are stripped from the
// renderer's SDP and non-relay trickle candidates are dropped.

export function isRelayCandidate(candidate: unknown): boolean {
  const c = typeof candidate === "string" ? candidate : (candidate as { candidate?: unknown } | null)?.candidate
  return typeof c === "string" && / typ relay( |$)/.test(c)
}

export function relayOnlySdp(sdp: string): string {
  return sdp
    .split(/\r\n/)
    .filter((line) => !line.startsWith("a=candidate:") || / typ relay( |$)/.test(line))
    .join("\r\n")
}

/** Every IPv4/IPv6-looking literal in the connection-addressing lines of an SDP (c=, a=candidate, a=rtcp). */
export function sdpAddresses(sdp: string): string[] {
  const out: string[] = []
  for (const line of sdp.split(/\r\n/)) {
    if (line.startsWith("a=candidate:")) {
      const parts = line.split(" ")
      if (parts[4]) out.push(parts[4])
      const r = parts.indexOf("raddr")
      if (r > 0 && parts[r + 1]) out.push(parts[r + 1])
    }
  }
  return out
}
