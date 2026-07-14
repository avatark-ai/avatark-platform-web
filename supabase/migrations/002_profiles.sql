-- AvatarK Platform — Profiles
-- Represents the human. Only fields justified by @avatark/account's real
-- ProfileAdapter contract plus the checkpoint's own stated examples.
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  username text UNIQUE,
  avatar_url text,
  bio text,
  timezone text,
  locale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
