-- AvatarK Platform — WORLDK-M14-B6: renderer session snapshot authority.
--
-- PREVIEW-CERTIFICATION ONLY. For avatark-platform-preview
-- (gxjdbfpyyrycvqzozyty) ONLY. The migration runner refuses to apply this file
-- to any other project.
--
-- Forward-only and additive over 040/044. No table; no row is ever written.
-- One READ-ONLY (STABLE) resolver for the Runtime Ingress `snapshot` op
-- (owner B6 decisions Q1-Q8): an authenticated renderer names ONLY a
-- sessionId; the Platform derives everything else from its own binding and
-- returns the minimum render context:
--
--   world_id          consumer world id of the session (= the instance's world)
--   reconnect         whether this RuntimeSession is a grace reconnect
--   arrival_kind      FIRST_VISIT | RETURNING   (the Visit's original entry resolution)
--   arrival_place_id  the allocation's arrival place (consumer place id)
--
-- Never an identity: no subject, visit, allocation or instance id is returned.
--
-- Authority chain (all inside this one read):
--   Platform gate -> runtime credential (valid, unrevoked, unexpired) and
--   ACTIVE instance -> world_m14_runtime_session: session bound to the
--   caller's instance, same world, its allocation on that instance ->
--   the FROZEN 044 stream-eligibility predicate, unchanged (claimed, not
--   ended, no leave requested, allocation live, instance ACTIVE, visit not
--   closed and inside presence grace).
-- Refusals raise (040 codes for credentials, SESSION_NOT_BOUND, and
-- SESSION_NOT_ELIGIBLE), so a refused read is indistinguishable from any
-- other failed ingress call and writes nothing.

CREATE OR REPLACE FUNCTION world_runtime_session_render_context(p_credential_id uuid, p_secret_sha256 bytea, p_session_id uuid)
RETURNS TABLE (world_id text, reconnect boolean, arrival_kind text, arrival_place_id text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
#variable_conflict use_column
DECLARE
  inst world_runtime_instances;
  s world_runtime_sessions;
  a world_runtime_allocations;
  v_kind text;
BEGIN
  PERFORM world_m14_assert_platform();
  inst := world_m14_authenticate_runtime(p_credential_id, p_secret_sha256);
  s := world_m14_runtime_session(inst, p_session_id);
  IF NOT world_m14b3_session_in_world(s) THEN
    RAISE EXCEPTION 'SESSION_NOT_ELIGIBLE' USING ERRCODE = '55000';
  END IF;
  SELECT * INTO a FROM world_runtime_allocations WHERE allocation_id = s.allocation_id;
  SELECT r.arrival_kind INTO v_kind FROM world_entry_resolutions r WHERE r.intent_id = a.intent_id;
  IF v_kind IS NULL OR a.arrival_place_id IS NULL THEN
    -- An eligible session always has both; anything else is not renderable.
    RAISE EXCEPTION 'SESSION_NOT_ELIGIBLE' USING ERRCODE = '55000';
  END IF;
  RETURN QUERY SELECT s.world_id, s.reconnect, v_kind, a.arrival_place_id;
END;
$$;

REVOKE ALL ON FUNCTION world_runtime_session_render_context(uuid, bytea, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION world_runtime_session_render_context(uuid, bytea, uuid) TO worldk_platform_entry_authority;
