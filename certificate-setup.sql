-- Certificate settings and admin student directory. Additive migration.
create table if not exists public.certificate_settings (
 id integer primary key default 1 check (id=1),
 center_name text not null default 'Aftab Students Book',
 contact_name text,
 phone text,
 email text,
 address text,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
alter table public.certificate_settings enable row level security;
drop policy if exists "certificate settings readable by signed in users" on public.certificate_settings;
create policy "certificate settings readable by signed in users"
on public.certificate_settings for select to authenticated using (true);
drop policy if exists "admins manage certificate settings" on public.certificate_settings;
create policy "admins manage certificate settings"
on public.certificate_settings for all to authenticated
using (public.is_aftab_admin()) with check (public.is_aftab_admin());
grant select, insert, update on public.certificate_settings to authenticated;

-- Explicit admin-only directory access; students can still read/update their own profile.
drop policy if exists "admins can view student profiles" on public.profiles;
create policy "admins can view student profiles"
on public.profiles for select to authenticated
using (public.is_aftab_admin());

