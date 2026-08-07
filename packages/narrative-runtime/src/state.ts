import type { NarrativeFlags, Transition } from "./types.ts"

export type NarrativeStatus = "active" | "paused" | "completed"

export interface NarrativePosition {
  seasonId: string
  episodeId: string
  sceneId: string
  beatId: string
}

export interface NarrativeProgress extends NarrativePosition {
  completedBeatIds: string[]
  completedSceneIds: string[]
  completedEpisodeIds: string[]
}

export type NarrativeHistoryEventKind =
  | "started"
  | "episodeStarted"
  | "beatCompleted"
  | "choiceMade"
  | "triggerFired"
  | "sceneCompleted"
  | "episodeCompleted"
  | "narrativeCompleted"
  | "paused"
  | "resumed"

export interface NarrativeHistoryEntry {
  at: string
  kind: NarrativeHistoryEventKind
  seasonId?: string
  episodeId?: string
  sceneId?: string
  beatId?: string
  choiceId?: string
  triggerId?: string
  transition?: Transition
}

export interface NarrativeHistory {
  entries: NarrativeHistoryEntry[]
}

// One state per (userId, narrativeId) pair -- see repository.ts, which
// keys persistence on exactly that composite so one user's progress can
// never be read or overwritten by another.
export interface NarrativeState {
  userId: string
  narrativeId: string
  status: NarrativeStatus
  progress: NarrativeProgress
  flags: NarrativeFlags
  history: NarrativeHistory
  startedAt: string
  updatedAt: string
}
