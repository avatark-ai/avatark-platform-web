// WORLDK-M14-B5: Platform-served media player page (Preview; test video only).
//
//   GET /world-entry/stream/media     (platform-preview host; RuntimeSession cookie)
//
// The browser: B3 capability -> AUTHORIZED (same-origin) -> connects to the
// Platform-controlled signalling origin carrying ONLY its opaque
// authorization, inside the WebSocket subprotocol list (never the URL, so it
// never lands in access logs) -> answers the renderer's offer -> real WebRTC
// -> once inbound-rtp.framesDecoded > 0 AND the <video> reached "playing",
// sends ONE first-frame acknowledgement carrying the renderer's nonce over
// the renderer's data channel. It never enumerates or selects a streamer,
// renderer, instance, host or port (it sends no listStreamers/subscribe).
//
// The signalling origin is Platform configuration (WORLDK_SIGNALLING_URL).
// Without it the page answers honestly that the media plane is not
// configured. Physical signalling hosting is not frozen (owner B5-7).
import { createHash } from "node:crypto"
import { isSecretFormat } from "./credentials.ts"
import { SESSION_COOKIE } from "./gateway.ts"
import { STREAM_AUTHORIZE_PATH, STREAM_CAPABILITY_PATH } from "./streamCapability.ts"

export const MEDIA_PAGE_PATH = "/world-entry/stream/media"
export const SIGNALLING_URL_ENV = "WORLDK_SIGNALLING_URL"
export const MEDIA_DATA_CHANNEL = "worldk-media-v1"
export const PLAYER_SUBPROTOCOL = "wk-player-v1"
export const AUTHZ_SUBPROTOCOL_PREFIX = "wk-authz."

export interface MediaPageDeps {
  db: unknown | null
  signallingUrl: string | undefined
}

/** A ws:// or wss:// origin (no path, query or credentials), or null. */
export function signallingOrigin(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw)
    if ((u.protocol !== "wss:" && u.protocol !== "ws:") || u.username || u.password || u.search || u.hash || (u.pathname !== "/" && u.pathname !== "")) return null
    if (u.protocol === "ws:" && u.hostname !== "localhost" && u.hostname !== "127.0.0.1") return null
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

export function mediaPageScript(signalling: string): string {
  return `(function(){var S=${JSON.stringify(signalling)},o=document.getElementById("out"),v=document.getElementById("v"),b=document.getElementById("go");function st(s,t){o.dataset.state=s;o.textContent=t}
b.addEventListener("click",function(){b.disabled=true;st("AUTHORIZING","Authorizing\\u2026");var h={"content-type":"application/json"};
fetch(${JSON.stringify(STREAM_CAPABILITY_PATH)},{method:"POST",headers:h,body:"{}",credentials:"same-origin",cache:"no-store"}).then(function(r){if(r.status!==201)throw 0;return r.json()}).then(function(c){return fetch(${JSON.stringify(STREAM_AUTHORIZE_PATH)},{method:"POST",headers:h,body:JSON.stringify({capability:c.capability,worldId:c.worldId}),credentials:"same-origin",cache:"no-store"})}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(a){connect(a.authorization)}).catch(function(){st("REFUSED","Not authorized. You need to be entering the world to connect.");b.disabled=false})});
function connect(authz){var ws=new WebSocket(S,[${JSON.stringify(PLAYER_SUBPROTOCOL)},${JSON.stringify(AUTHZ_SUBPROTOCOL_PREFIX)}+authz]);authz=null;var pc=null,dc=null,nonce=null,playing=false,sent=false,pend=[];
function send(m){if(ws.readyState===1)ws.send(JSON.stringify(m))}
function check(){if(sent||!nonce||!playing||!pc||!dc||dc.readyState!=="open")return;pc.getStats().then(function(s){var fd=0;s.forEach(function(r){if(r.type==="inbound-rtp"&&r.kind==="video")fd=r.framesDecoded||0});if(fd>0&&!sent){sent=true;dc.send(JSON.stringify({t:"first-frame",n:nonce}));st("STREAMING","Streaming. Preview test video: no world is rendered.")}else if(!sent)setTimeout(check,200)})}
v.addEventListener("playing",function(){playing=true;check()});
ws.onmessage=function(ev){var m;try{m=JSON.parse(ev.data)}catch(e){return}
if(m.type==="config"){pc=new RTCPeerConnection(m.peerConnectionOptions||{});pc.ontrack=function(e){v.srcObject=e.streams&&e.streams[0]?e.streams[0]:new MediaStream([e.track]);v.play().catch(function(){})};pc.onicecandidate=function(e){if(e.candidate)send({type:"iceCandidate",candidate:e.candidate.toJSON()})};pc.ondatachannel=function(e){if(e.channel.label!==${JSON.stringify(MEDIA_DATA_CHANNEL)})return;dc=e.channel;dc.onmessage=function(x){var d;try{d=JSON.parse(x.data)}catch(e){return}if(d&&d.t==="nonce"&&typeof d.n==="string"&&!nonce){nonce=d.n;check()}}};pc.onconnectionstatechange=function(){o.dataset.pc=pc.connectionState}}
else if(m.type==="offer"&&pc){pc.setRemoteDescription({type:"offer",sdp:m.sdp}).then(function(){return pc.createAnswer()}).then(function(a){return pc.setLocalDescription(a)}).then(function(){send({type:"answer",sdp:pc.localDescription.sdp});pend.forEach(function(c){pc.addIceCandidate(c).catch(function(){})});pend=[];st("CONNECTING","Connecting\\u2026")})}
else if(m.type==="iceCandidate"&&pc){if(pc.remoteDescription)pc.addIceCandidate(m.candidate).catch(function(){});else pend.push(m.candidate)}
else if(m.type==="ping")send({type:"pong",time:m.time})};
ws.onclose=function(){st(sent?"ENDED":"REFUSED",sent?"The stream ended.":"Not connected.");if(pc)pc.close()};st("SIGNALLING","Connecting\\u2026")}})();`
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie")
  if (!raw) return null
  for (const part of raw.split(";")) {
    const i = part.indexOf("=")
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim()
  }
  return null
}

export function mediaPageHeaders(signalling: string, script: string): Record<string, string> {
  const hash = createHash("sha256").update(script, "utf8").digest("base64")
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": `default-src 'none'; script-src 'sha256-${hash}'; connect-src 'self' ${signalling}; media-src 'self' blob: mediastream:; style-src 'unsafe-inline'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`,
  }
}

export async function handleMediaPage(request: Request, deps: MediaPageDeps): Promise<Response> {
  const shell = (body: string, status: number, headers: Record<string, string>) =>
    new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>World stream (preview)</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;color:#1d2b22;background:#f6f4ee}video{width:100%;background:#111;border-radius:6px}button{font:inherit;padding:.5rem 1rem}.meta{color:#55635a;font-size:.9rem}</style>
</head><body>${body}</body></html>`, { status, headers })
  const plain = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" }
  const view = readCookie(request, SESSION_COOKIE)
  if (!deps.db || !isSecretFormat(view)) return shell(`<h1>No world session</h1><p>Go back to WorldK and choose Enter.</p>`, 404, plain)
  const signalling = signallingOrigin(deps.signallingUrl)
  if (!signalling) return shell(`<h1>Stream unavailable</h1><p>The media plane is not configured for this preview.</p>`, 503, plain)
  const script = mediaPageScript(signalling)
  return shell(
    `<h1>World stream (preview)</h1><video id="v" muted autoplay playsinline></video><p><button id="go" type="button">Connect</button></p>` +
      `<p id="out" role="status" aria-live="polite" data-state="IDLE"></p><p class="meta">${esc("Preview media plane: a test video, not the world.")}</p><script>${script}</script>`,
    200,
    mediaPageHeaders(signalling, script),
  )
}
