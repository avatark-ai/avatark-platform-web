-- AvatarK Platform — WORLDK-M14-B4: renderer attachment authority.
--
-- PREVIEW-CERTIFICATION ONLY. For avatark-platform-preview
-- (gxjdbfpyyrycvqzozyty) ONLY. The migration runner refuses to apply this file
-- to any other project.
--
-- Forward-only and additive over 040/043. Owner decisions (B4):
--
--   Q1(a)  ARRIVAL keeps its meaning: actual media/world presence. A visitor
--          is never IN_WORLD merely because it was admitted. So the stream
--          must be connectable BEFORE arrival: the ONE approved B3 change is
--          the shared stream predicate (043 world_m14b3_session_in_world),
--          which now admits a RuntimeSession that its allocated runtime has
--          validly CLAIMED and that has not ended. Nothing else in 043
--          changes: its table, both entry points, the 60 s TTL, hash-only
--          storage, bindings, atomic single use, error codes and grants are
--          untouched (043's file and checksum are unchanged).
--   Q2 D1  The allocated renderer presents credential + secret + sessionId +
--          sha256(authorization) at Runtime Ingress; the Platform verifies.
--   Q3     Attach window = 60 s after the authorization's consumed_at.
--   Q4     B1 stays frozen: attach is a Runtime Ingress operation, not a
--          RendererEvent.
--   Q5     Allocation = one Visit seat on one render-capable RuntimeInstance,
--          granularity-neutral (never "one visitor = one process").
--   Q7     Revoke semantics unchanged. Q8: topology-neutral stub only.
--
-- Attach is NOT arrival and NOT lifecycle authority: it writes exactly one
-- world_stream_attachments row and nothing else (no Visit, presence,
-- session, allocation, instance, continuity or world-state write).

-- ── 1. Approved B3 predicate change (Q1(a)) ───────────────────────
--
-- Name kept so 043's entry points are untouched; its meaning is now
-- "stream-eligible". Eligible: the session is CLAIMED by its allocated
-- runtime (world_runtime_claim sets claimed_at only for the bound instance),
-- not ended, no leave requested (as in 043), its allocation not released
-- and bound to this visit, its instance ACTIVE, and the Visit either not yet
-- opened (pre-arrival: no presence row) or open, within presence grace, and
-- the 039 continuity's open visit (arrived / reconnect). A closed visit is
-- never eligible. Still read-only: never infers a timeout.

CREATE OR REPLACE FUNCTION world_m14b3_session_in_world(p_session world_runtime_sessions) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  pol world_entry_policies;
  pr world_visit_presence;
BEGIN
  IF p_session.ended_at IS NOT NULL OR p_session.leave_requested_at IS NOT NULL OR p_session.claimed_at IS NULL THEN
    RETURN false;
  END IF;
  SELECT * INTO pol FROM world_entry_policies WHERE world_id = p_session.world_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM world_runtime_allocations a
    JOIN world_runtime_instances i ON i.instance_id = a.instance_id
    WHERE a.allocation_id = p_session.allocation_id
      AND a.instance_id = p_session.instance_id
      AND a.visit_id = p_session.visit_id
      AND a.subject_id = p_session.subject_id
      AND a.world_id = p_session.world_id
      AND a.state <> 'RELEASED'
      AND i.status = 'ACTIVE'
  ) THEN
    RETURN false;
  END IF;
  SELECT * INTO pr FROM world_visit_presence WHERE visit_id = p_session.visit_id;
  IF NOT FOUND THEN
    -- Pre-arrival: claimed, visit not yet opened.
    RETURN p_session.joined_at IS NULL;
  END IF;
  RETURN pr.closed_at IS NULL
     AND pr.subject_id = p_session.subject_id
     AND pr.world_id = p_session.world_id
     AND now() <= pr.last_presence_at + make_interval(secs => pol.presence_grace_seconds)
     AND EXISTS (SELECT 1 FROM world_visitor_continuity c
                 WHERE c.world_id = pr.world_id AND c.subject_id = pr.subject_id
                   AND c.visit_open AND c.open_visit_id = p_session.visit_id);
END;
$$;

REVOKE ALL ON FUNCTION world_m14b3_session_in_world(world_runtime_sessions) FROM PUBLIC, anon, authenticated, service_role;

-- ── 2. Attachment store (hash reference only) ─────────────────────

CREATE TABLE IF NOT EXISTS world_stream_attachments (
  -- The B3 authorization this attachment consumed (043 stores it as UNIQUE).
  authorization_sha256 bytea PRIMARY KEY REFERENCES world_stream_capabilities (authorization_sha256),
  session_id uuid NOT NULL UNIQUE REFERENCES world_runtime_sessions (session_id),
  instance_id uuid NOT NULL REFERENCES world_runtime_instances (instance_id),
  attached_at timestamptz NOT NULL DEFAULT now(),
  -- = the authorization's consumed_at + 60 s (Q3), recorded for audit.
  attach_window_ends_at timestamptz NOT NULL,
  CONSTRAINT world_stream_attachments_hash CHECK (octet_length(authorization_sha256) = 32),
  CONSTRAINT world_stream_attachments_in_window CHECK (attached_at < attach_window_ends_at)
);

ALTER TABLE world_stream_attachments ENABLE ROW LEVEL SECURITY;
-- No policies.

-- ── 3. Runtime Ingress: stream_attach (allocated renderer only) ───

CREATE OR REPLACE FUNCTION world_runtime_stream_attach(p_credential_id uuid, p_secret_sha256 bytea, p_session_id uuid, p_authorization_sha256 bytea) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inst world_runtime_instances;
  s world_runtime_sessions;
  k world_stream_capabilities;
  v_window_end timestamptz;
BEGIN
  PERFORM world_m14_assert_platform();
  -- Credential invalid / revoked / expired, instance revoked: 040 codes.
  inst := world_m14_authenticate_runtime(p_credential_id, p_secret_sha256);
  IF p_authorization_sha256 IS NULL OR octet_length(p_authorization_sha256) <> 32 THEN
    RAISE EXCEPTION 'STREAM_AUTHORIZATION_INVALID' USING ERRCODE = '22023';
  END IF;
  -- The caller must be the instance the session and its allocation are bound to.
  s := world_m14_runtime_session(inst, p_session_id);
  PERFORM world_m14_lock(s.world_id, s.subject_id);
  SELECT * INTO s FROM world_runtime_sessions WHERE session_id = s.session_id;
  SELECT * INTO k FROM world_stream_capabilities WHERE authorization_sha256 = p_authorization_sha256 FOR UPDATE;
  IF NOT FOUND OR k.consumed_at IS NULL THEN
    -- Unknown, forged, or a raw capability hash (never an authorization hash).
    RAISE EXCEPTION 'STREAM_AUTHORIZATION_INVALID' USING ERRCODE = '22023';
  END IF;
  IF k.session_id <> s.session_id OR k.subject_id <> s.subject_id OR k.world_id <> s.world_id THEN
    RAISE EXCEPTION 'STREAM_AUTHORIZATION_BINDING_MISMATCH' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM world_stream_attachments t WHERE t.authorization_sha256 = p_authorization_sha256 OR t.session_id = s.session_id) THEN
    RAISE EXCEPTION 'STREAM_ALREADY_ATTACHED' USING ERRCODE = '55000';
  END IF;
  v_window_end := k.consumed_at + interval '60 seconds';
  IF now() >= v_window_end THEN
    RAISE EXCEPTION 'STREAM_ATTACH_WINDOW_EXPIRED' USING ERRCODE = '55000';
  END IF;
  IF NOT world_m14b3_session_in_world(s) THEN
    RAISE EXCEPTION 'STREAM_SESSION_NOT_ELIGIBLE' USING ERRCODE = '55000';
  END IF;
  INSERT INTO world_stream_attachments (authorization_sha256, session_id, instance_id, attached_at, attach_window_ends_at)
    VALUES (p_authorization_sha256, s.session_id, inst.instance_id, now(), v_window_end);
  RETURN jsonb_build_object('outcome', 'ATTACHED', 'sessionId', s.session_id);
END;
$$;

-- Gateway routing for the Preview STUB relay only: which of the caller's
-- (browser's) own sessions an authorization belongs to, while it can still
-- attach. Returns only the session id, to the Platform, never to a browser.
CREATE OR REPLACE FUNCTION world_stream_attachment_route(p_view_sha256 bytea, p_authorization_sha256 bytea) RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  s world_runtime_sessions;
  k world_stream_capabilities;
BEGIN
  PERFORM world_m14_assert_platform();
  SELECT * INTO s FROM world_runtime_sessions WHERE view_sha256 = p_view_sha256;
  SELECT * INTO k FROM world_stream_capabilities WHERE authorization_sha256 = p_authorization_sha256;
  IF s.session_id IS NULL OR k.capability_sha256 IS NULL OR k.consumed_at IS NULL
     OR k.session_id <> s.session_id OR now() >= k.consumed_at + interval '60 seconds' THEN
    RAISE EXCEPTION 'STREAM_AUTHORIZATION_INVALID' USING ERRCODE = '22023';
  END IF;
  RETURN s.session_id;
END;
$$;

COMMENT ON TABLE world_stream_attachments IS
  'WORLDK-M14-B4: the allocated renderer verified one B3 authorization for its bound RuntimeSession (hash only; single attach per authorization and per session). Not arrival, not lifecycle authority.';

-- ── 4. Privileges ─────────────────────────────────────────────────

REVOKE ALL ON TABLE world_stream_attachments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_stream_attach(uuid, bytea, uuid, bytea) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_stream_attachment_route(bytea, bytea) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION world_runtime_stream_attach(uuid, bytea, uuid, bytea) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_stream_attachment_route(bytea, bytea) TO worldk_platform_entry_authority;
