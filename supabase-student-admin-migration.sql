-- Aftab Students Book: safe additive migration for Student Self-Registration + Admin Directory.
-- Run once in Supabase Dashboard > SQL Editor after taking a database backup.
-- Does not delete, rename, or rewrite existing student rows or login accounts.

alter table public.profiles
  add column if not exists board text,
  add column if not exists class_level text,
  add column if not exists medium text,
  add column if not exists updated_at timestamptz;

-- Admin can disable/enable a student's portal access without deleting their account.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('student','admin','disabled'));

-- Ensure the existing role-protection trigger still prevents students granting themselves admin.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_aftab_admin() then
    new.role := 'student';
  end if;
  return new;
end;
$$;

-- Admins can read the whole student directory; students can read their own profile.
-- Existing policies are retained; this migration is additive and does not loosen RLS.
