-- Aftab Students Book: Student Profile + Leaderboard migration.
-- Run once in Supabase SQL Editor. Additive changes only; existing student/profile data is preserved.

alter table public.profiles add column if not exists board text;
alter table public.profiles add column if not exists class_level text;
alter table public.profiles add column if not exists medium text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

drop policy if exists "admins can view student profiles" on public.profiles;
create policy "admins can view student profiles"
on public.profiles for select to authenticated
using (public.is_aftab_admin());

drop policy if exists "students update own profile" on public.profiles;
create policy "students update own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_aftab_admin() then
    raise exception 'Only an administrator can change profile roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
before update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.get_mcq_leaderboard(p_limit integer default 10)
returns table(student_name text, class_level text, total_score bigint, total_questions bigint, percentage numeric, tests_taken bigint)
language sql security definer set search_path = public
as $$
  select coalesce(nullif(p.full_name,''),'Student') as student_name,
         p.class_level,
         sum(a.score)::bigint,
         sum(a.total_questions)::bigint,
         round(100.0 * sum(a.score) / nullif(sum(a.total_questions),0), 2),
         count(*)::bigint
  from public.mcq_attempts a
  join public.profiles p on p.id = a.student_id
  join public.mcq_quizzes q on q.id = a.quiz_id
  where q.is_published = true
  group by p.id, p.full_name, p.class_level
  order by round(100.0 * sum(a.score) / nullif(sum(a.total_questions),0), 2) desc,
           sum(a.score) desc, count(*) desc
  limit greatest(1, least(coalesce(p_limit,10),50));
$$;
revoke all on function public.get_mcq_leaderboard(integer) from public;
grant execute on function public.get_mcq_leaderboard(integer) to authenticated;
