-- AvatarK Platform — WORLDK-M14-A5: automatic presence expiry (scheduler access).
--
-- PREVIEW-CERTIFICATION ONLY. For avatark-platform-preview
-- (gxjdbfpyyrycvqzozyty) ONLY. The migration runner refuses to apply this file
-- to any other project. Production scheduling is a separate owner decision.
--
-- Forward-only and additive over 040. It changes NO lifecycle object: no
-- table, function, policy, grant on a lifecycle function, or authority rule.
--
-- The existing authoritative sweep, world_presence_sweep(limit) (040), is
-- the ONLY thing the schedule runs. 040 only lets it run when session_user
-- can SET ROLE worldk_platform_entry_authority. That is the Platform entry
-- authority credential worldk_platform_entry_preview; the migration owner
-- (postgres) cannot SET it and is refused. So the schedule must be a pg_cron
-- job OWNED BY that credential. pg_cron connects as the job owner, so the
-- sweep runs under exactly the authority it already requires.
--
-- This file only:
--   1. enables pg_cron, which Supabase already preloads (no new service);
--   2. lets the authority credential create, change, remove and observe ITS
--      OWN jobs. pg_cron row security limits every non-superuser to
--      username = current_user, so it gains no new database capability: a job
--      can only do what the credential can already do in a session.
-- The job itself is created by the operator script
-- scripts/worldk-m14a5-presence-sweep-schedule.ts, connected AS the authority
-- credential. No secret is stored in the database or in the job.

CREATE EXTENSION IF NOT EXISTS pg_cron;

GRANT USAGE ON SCHEMA cron TO worldk_platform_entry_preview;
GRANT EXECUTE ON FUNCTION cron.schedule(text, text, text) TO worldk_platform_entry_preview;
GRANT EXECUTE ON FUNCTION cron.unschedule(text) TO worldk_platform_entry_preview;
GRANT SELECT ON cron.job, cron.job_run_details TO worldk_platform_entry_preview;
