import type { SupabaseClient } from '@supabase/supabase-js'
import type { JourneyRepository, JourneyState, JourneyTransition } from '@avatark/experience-runtime'

type JourneyStateRow = {
  subject_id: string
  journey_id: string
  status: string
  current_episode_id: string | null
  current_world_id: string | null
  active_practice_id: string | null
  completed_episode_ids: string[]
  visited_world_ids: string[]
  completed_practice_ids: string[]
  completed_reflection_ids: string[]
  completed_milestone_ids: string[]
  started_at: string
  updated_at: string
}

type JourneyTransitionRow = {
  type: string
  at: string
  node_id: string | null
  detail: string | null
}

function rowToState(row: JourneyStateRow): JourneyState {
  return {
    subjectId: row.subject_id,
    journeyId: row.journey_id,
    status: row.status as JourneyState['status'],
    currentEpisodeId: row.current_episode_id,
    currentWorldId: row.current_world_id,
    activePracticeId: row.active_practice_id,
    completedEpisodeIds: row.completed_episode_ids ?? [],
    visitedWorldIds: row.visited_world_ids ?? [],
    completedPracticeIds: row.completed_practice_ids ?? [],
    completedReflectionIds: row.completed_reflection_ids ?? [],
    completedMilestoneIds: row.completed_milestone_ids ?? [],
    startedAt: Date.parse(row.started_at),
    updatedAt: Date.parse(row.updated_at),
  }
}

function stateToRow(state: JourneyState): JourneyStateRow {
  return {
    subject_id: state.subjectId,
    journey_id: state.journeyId,
    status: state.status,
    current_episode_id: state.currentEpisodeId,
    current_world_id: state.currentWorldId,
    active_practice_id: state.activePracticeId,
    completed_episode_ids: state.completedEpisodeIds,
    visited_world_ids: state.visitedWorldIds,
    completed_practice_ids: state.completedPracticeIds,
    completed_reflection_ids: state.completedReflectionIds,
    completed_milestone_ids: state.completedMilestoneIds,
    started_at: new Date(state.startedAt).toISOString(),
    updated_at: new Date(state.updatedAt).toISOString(),
  }
}

function rowToTransition(row: JourneyTransitionRow): JourneyTransition {
  return {
    type: row.type as JourneyTransition['type'],
    at: Date.parse(row.at),
    ...(row.node_id ? { nodeId: row.node_id } : {}),
    ...(row.detail ? { detail: row.detail } : {}),
  }
}

// Real persistence for @avatark/experience-runtime's JourneyRepository
// interface, backed by migration 023's journey_states/journey_transitions
// tables. Degrades reads to "no state yet" rather than throwing when the
// migration isn't applied in an environment yet (same convention
// app/api/account/notifications/route.ts uses for account_preferences).
export class SupabaseJourneyRepository implements JourneyRepository {
  private readonly supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  async getState(subjectId: string, journeyId: string): Promise<JourneyState | null> {
    const { data, error } = await this.supabase
      .from('journey_states')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('journey_id', journeyId)
      .maybeSingle()
    if (error || !data) return null
    return rowToState(data as JourneyStateRow)
  }

  async saveState(state: JourneyState): Promise<void> {
    const { error } = await this.supabase
      .from('journey_states')
      .upsert(stateToRow(state), { onConflict: 'subject_id,journey_id' })
    if (error) throw new Error(error.message)
  }

  async appendTransition(subjectId: string, journeyId: string, transition: JourneyTransition): Promise<void> {
    const { error } = await this.supabase.from('journey_transitions').insert({
      subject_id: subjectId,
      journey_id: journeyId,
      type: transition.type,
      at: new Date(transition.at).toISOString(),
      node_id: transition.nodeId ?? null,
      detail: transition.detail ?? null,
    })
    if (error) throw new Error(error.message)
  }

  async getHistory(subjectId: string, journeyId: string): Promise<JourneyTransition[]> {
    const { data, error } = await this.supabase
      .from('journey_transitions')
      .select('type, at, node_id, detail')
      .eq('subject_id', subjectId)
      .eq('journey_id', journeyId)
      .order('at', { ascending: true })
    if (error || !data) return []
    return (data as JourneyTransitionRow[]).map(rowToTransition)
  }
}
