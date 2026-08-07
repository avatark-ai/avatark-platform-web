import type { NarrativeNextView } from "./runtime.ts"

export type NarrativeViewerLineKind = "narration" | "choice-prompt" | "choice-option" | "paused" | "completed"

export interface NarrativeViewerLine {
  kind: NarrativeViewerLineKind
  text: string
}

/**
 * Thin reference renderer for tests/manual inspection only -- turns a
 * NarrativeNextView into plain text lines. Not a product UI: no
 * styling, no asset playback, nothing StreamK/CinemaK would ship.
 */
export function renderNarrativeView(view: NarrativeNextView): NarrativeViewerLine[] {
  if (view.status === "completed" || !view.beat) {
    return [{ kind: "completed", text: "This narrative is complete." }]
  }
  if (view.status === "paused") {
    return [{ kind: "paused", text: "This narrative is paused." }]
  }

  const beat = view.beat
  if (beat.kind === "choice") {
    const lines: NarrativeViewerLine[] = [{ kind: "choice-prompt", text: `Beat "${beat.id}": choose one --` }]
    for (const choice of view.availableChoices) {
      lines.push({ kind: "choice-option", text: `  [${choice.id}] ${choice.label}` })
    }
    return lines
  }

  return [{ kind: "narration", text: `Beat "${beat.id}" (${beat.kind}).` }]
}
