-- WORLDK-M14-A4 operator diagnostic — runtime liveness (READ-ONLY, Preview).
--
--   supabase db query --project-ref gxjdbfpyyrycvqzozyty --linked -f scripts/worldk-m14a4-runtime-liveness.sql
--
-- effective_state is the CURRENT truth: derived on read from advertised
-- readiness + liveness + credential validity (042). last_advertised_readiness
-- is forensic only: the runtime's last declared state, which is NOT cleared
-- when the process disappears. Never read it as "the runtime is ready".
SELECT
  instance_id,
  world_id,
  label,
  effective_state,
  is_live,
  seconds_since_last_seen,
  liveness_window_seconds,
  credential_valid,
  credential_expires_at,
  status,
  active_allocations || '/' || capacity AS allocations,
  advertised_readiness AS last_advertised_readiness,
  last_seen_at
FROM world_runtime_instance_liveness
ORDER BY world_id, is_live DESC, last_seen_at DESC NULLS LAST;
