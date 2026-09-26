-- AvatarK Platform — WORLDK-M14-A4: runtime liveness observability.
--
-- PREVIEW-CERTIFICATION ONLY. For avatark-platform-preview
-- (gxjdbfpyyrycvqzozyty) ONLY. The migration runner refuses to apply this file
-- to any other project.
--
-- Forward-only and additive. A READ-ONLY VIEW and nothing else: no table,
-- column, trigger, function or grant on a lifecycle object changes, and no
-- state is written. world_entry_resolve, poll, the liveness window,
-- ENTER/LEAVE (A3) and presence expiry (A5) are untouched.
--
--   world_runtime_instances.readiness  = ADVERTISED readiness: the runtime's
--                                        last declared state (poll). It is not
--                                        cleared when the process disappears.
--   liveness                           = observed through Runtime Ingress within
--                                        world_entry_policies.instance_liveness_seconds
--                                        (every authenticated runtime call
--                                        refreshes last_seen_at).
--   effective_state                    = DERIVED here on every read, never stored.
--
-- effective_state is evaluated in precedence order:
--   REVOKED             status = 'REVOKED' (existing status value)
--   CREDENTIAL_INVALID  no unrevoked, unexpired runtime credential
--                       (mirrors the RUNTIME_CREDENTIAL_INVALID authority code)
--   OFFLINE             never observed (last_seen_at IS NULL; existing readiness value)
--   STALE               observed, but not within the liveness window, whatever
--                       it last advertised
--   STARTING / READY    live, valid credential: the advertised readiness
--
-- effective_state = 'READY' is exactly world_entry_resolve's per-instance
-- eligibility predicate (ACTIVE, READY, live, valid credential). Capacity is
-- reported separately (active_allocations / capacity) because it depends on
-- load, not on the instance's own state.
--
-- security_invoker: readers need their own privileges on the underlying
-- tables. The view grants nothing new, and is revoked from every API role.

CREATE OR REPLACE VIEW world_runtime_instance_liveness
WITH (security_invoker = true) AS
SELECT
  i.instance_id,
  i.world_id,
  i.label,
  i.status,
  i.readiness AS advertised_readiness,
  i.last_seen_at,
  CASE WHEN i.last_seen_at IS NULL THEN NULL
       ELSE floor(extract(epoch FROM (now() - i.last_seen_at)))::integer END AS seconds_since_last_seen,
  pol.instance_liveness_seconds AS liveness_window_seconds,
  (i.last_seen_at IS NOT NULL AND i.last_seen_at > now() - make_interval(secs => pol.instance_liveness_seconds)) AS is_live,
  cred.valid AS credential_valid,
  cred.expires_at AS credential_expires_at,
  i.capacity,
  (SELECT count(*) FROM world_runtime_allocations a WHERE a.instance_id = i.instance_id AND a.state <> 'RELEASED')::integer AS active_allocations,
  CASE
    WHEN i.status = 'REVOKED' THEN 'REVOKED'
    WHEN NOT cred.valid THEN 'CREDENTIAL_INVALID'
    WHEN i.last_seen_at IS NULL THEN 'OFFLINE'
    WHEN i.last_seen_at <= now() - make_interval(secs => pol.instance_liveness_seconds) THEN 'STALE'
    ELSE i.readiness
  END AS effective_state
FROM world_runtime_instances i
JOIN world_entry_policies pol ON pol.world_id = i.world_id
CROSS JOIN LATERAL (
  SELECT EXISTS (SELECT 1 FROM world_runtime_credentials k WHERE k.instance_id = i.instance_id AND k.revoked_at IS NULL AND k.expires_at > now()) AS valid,
         (SELECT max(k.expires_at) FROM world_runtime_credentials k WHERE k.instance_id = i.instance_id AND k.revoked_at IS NULL) AS expires_at
) cred;

COMMENT ON VIEW world_runtime_instance_liveness IS
  'WORLDK-M14-A4: read-only derived runtime liveness. advertised_readiness = last declared (poll); effective_state = derived on read, never stored. Operator/diagnostic use only.';

REVOKE ALL ON world_runtime_instance_liveness FROM PUBLIC, anon, authenticated, service_role;
