-- AvatarK Platform — Context Runtime persistence
--
-- Backs @avatark/context-runtime's ContextRepository. Two tables:
--
-- context_snapshots: one row per user, the current resolved "where is
-- this user right now" answer. `fields` stores the full
-- Record<ContextFieldKey, ContextFieldValue> shape (value + source
-- metadata per field) as jsonb, exactly as the runtime models it in
-- TypeScript -- no columns per context axis, since the runtime's own
-- CONTEXT_FIELD_KEYS list is the single source of truth for which axes
-- exist, not this schema.
--
-- context_history: append-only log of every applied patch (Part of
-- pushContext()/restoreContext()/getContextHistory()). Owner can read and
-- insert their own rows; no UPDATE/DELETE policy is granted, so history
-- is immutable once written (default-deny RLS covers the rest).
CREATE TABLE IF NOT EXISTS context_snapshots (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS context_history (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  patch jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS context_history_user_id_recorded_at_idx
  ON context_history (user_id, recorded_at DESC);

ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_history ENABLE ROW LEVEL SECURITY;

-- context_snapshots: owner-only, full CRUD via one policy (same pattern
-- as account_preferences in 005_rls.sql).
DROP POLICY IF EXISTS "context_snapshots_owner_only" ON context_snapshots;
CREATE POLICY "context_snapshots_owner_only" ON context_snapshots
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- context_history: owner can read and append their own rows. No
-- UPDATE/DELETE policy -- history entries are immutable once written.
DROP POLICY IF EXISTS "context_history_select_own" ON context_history;
CREATE POLICY "context_history_select_own" ON context_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "context_history_insert_own" ON context_history;
CREATE POLICY "context_history_insert_own" ON context_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
