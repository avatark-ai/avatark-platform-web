-- AvatarK Platform — WORLDK-M14-B5: signalling route authority.
--
-- PREVIEW-CERTIFICATION ONLY. For avatark-platform-preview
-- (gxjdbfpyyrycvqzozyty) ONLY. The migration runner refuses to apply this file
-- to any other project.
--
-- Forward-only and additive over 043/044. No table, no row is ever written.
-- One read-only resolver keyed by the ALREADY-BOUND B3 authorization hash,
-- for the Platform's signalling-facing endpoint (owner B5 decision 9): the
-- signalling service never holds the visitor's browser cookie and never
-- holds a database credential. It asks the Platform, which asks this.
--
-- Returns ONLY an opaque route key (the streamer id the allocated renderer
-- registers for that RuntimeSession) and whether the authorization has been
-- attached (B4). Never a session, subject, visit, allocation, instance,
-- host or port.
--
--   admission (signalling, before playerConnected):  attached = false,
--       authorization consumed and inside the 60 s attach window (Q3), the
--       session not attached through another authorization, stream-eligible.
--   offer gate (signalling, before forwarding the renderer's offer):
--       attached = true for this authorization, same route, still eligible.
--
-- The route key is a deterministic, non-reversible digest of the session id
-- that the renderer (which learned the session id from its claim) derives
-- the same way: 'wkr1-' || first 40 hex of sha256('worldk-stream-route:v1:' || session_id).
-- It is not a credential: holding it grants nothing (attachment stays B4's).

CREATE OR REPLACE FUNCTION world_m14b5_route_key(p_session_id uuid) RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT 'wkr1-' || left(encode(sha256(convert_to('worldk-stream-route:v1:' || p_session_id::text, 'UTF8')), 'hex'), 40)
$$;

CREATE OR REPLACE FUNCTION world_stream_signalling_route(p_authorization_sha256 bytea)
RETURNS TABLE (route_key text, attached boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
#variable_conflict use_column
DECLARE
  k world_stream_capabilities;
  s world_runtime_sessions;
  t world_stream_attachments;
BEGIN
  PERFORM world_m14_assert_platform();
  IF p_authorization_sha256 IS NULL OR octet_length(p_authorization_sha256) <> 32 THEN
    RAISE EXCEPTION 'STREAM_AUTHORIZATION_INVALID' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO k FROM world_stream_capabilities WHERE authorization_sha256 = p_authorization_sha256;
  IF NOT FOUND OR k.consumed_at IS NULL THEN
    RAISE EXCEPTION 'STREAM_AUTHORIZATION_INVALID' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO s FROM world_runtime_sessions WHERE session_id = k.session_id;
  SELECT * INTO t FROM world_stream_attachments WHERE authorization_sha256 = p_authorization_sha256;
  IF FOUND THEN
    IF t.session_id <> s.session_id THEN
      RAISE EXCEPTION 'STREAM_AUTHORIZATION_BINDING_MISMATCH' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF now() >= k.consumed_at + interval '60 seconds' THEN
      RAISE EXCEPTION 'STREAM_ATTACH_WINDOW_EXPIRED' USING ERRCODE = '55000';
    END IF;
    IF EXISTS (SELECT 1 FROM world_stream_attachments a WHERE a.session_id = s.session_id) THEN
      RAISE EXCEPTION 'STREAM_ALREADY_ATTACHED' USING ERRCODE = '55000';
    END IF;
  END IF;
  IF NOT world_m14b3_session_in_world(s) THEN
    RAISE EXCEPTION 'STREAM_SESSION_NOT_ELIGIBLE' USING ERRCODE = '55000';
  END IF;
  RETURN QUERY SELECT world_m14b5_route_key(s.session_id), t.authorization_sha256 IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION world_m14b5_route_key(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_stream_signalling_route(bytea) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION world_stream_signalling_route(bytea) TO worldk_platform_entry_authority;
