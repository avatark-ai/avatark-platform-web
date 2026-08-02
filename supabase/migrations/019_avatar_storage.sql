-- AvatarK Platform — Avatar Storage
-- Real gap closed: ProfileTab.tsx has only ever accepted a pasted image
-- URL for avatar_url ("Direct file upload is a future capability — paste
-- an image URL for now."). No bucket, no storage RLS, and no path
-- convention existed anywhere in this repo before this migration — this
-- is genuinely new infrastructure, not a fix to something broken.
--
-- Design: single public bucket, path convention `{user_id}/{filename}`.
-- Public (not signed URLs) because avatar_url is already stored and
-- rendered as a plain public URL string in `profiles` (migration 002) --
-- switching to signed URLs would require also changing how avatar_url is
-- read/rendered, which is out of scope here. Owner-scoped write access
-- only, enforced by matching the first path segment against auth.uid(),
-- the same ownership pattern every owner-only RLS policy in this schema
-- already uses (see 005_rls.sql, 014_admin_rls.sql).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read: avatars are meant to be publicly visible wherever a
-- profile is shown, same as the public bucket flag above already implies.
drop policy if exists "avatar_read_public" on storage.objects;
create policy "avatar_read_public" on storage.objects
  for select using (bucket_id = 'avatars');

-- Owner-only write/update/delete: the first path segment of the object
-- name must equal the caller's own auth.uid(), so a user can only ever
-- manage objects under their own `{user_id}/...` prefix.
drop policy if exists "avatar_write_own" on storage.objects;
create policy "avatar_write_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar_update_own" on storage.objects;
create policy "avatar_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar_delete_own" on storage.objects;
create policy "avatar_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
