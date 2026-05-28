create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'task_status'
      and n.nspname = 'public'
  ) then
    create type public.task_status as enum (
      'pending',
      'in_progress',
      'completed'
    );
  end if;
end
$$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  original_input text,
  status public.task_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.time_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  constraint time_logs_ended_at_after_started_at
    check (ended_at is null or ended_at >= started_at),
  constraint time_logs_duration_seconds_non_negative
    check (duration_seconds is null or duration_seconds >= 0),
  constraint time_logs_completion_fields_consistent
    check (
      (ended_at is null and duration_seconds is null)
      or
      (ended_at is not null and duration_seconds is not null)
    )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create index if not exists tasks_user_id_created_at_idx
  on public.tasks(user_id, created_at);

create index if not exists tasks_user_id_status_idx
  on public.tasks(user_id, status);

create index if not exists time_logs_user_id_started_at_idx
  on public.time_logs(user_id, started_at);

create index if not exists time_logs_task_id_started_at_idx
  on public.time_logs(task_id, started_at);

create unique index if not exists time_logs_one_active_per_user_idx
  on public.time_logs(user_id)
  where ended_at is null;

alter table public.tasks enable row level security;
alter table public.time_logs enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "tasks_select_own"
on public.tasks
for select
to authenticated
using (user_id = auth.uid());

create policy "tasks_insert_own"
on public.tasks
for insert
to authenticated
with check (user_id = auth.uid());

create policy "tasks_update_own"
on public.tasks
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "tasks_delete_own"
on public.tasks
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "time_logs_select_own" on public.time_logs;
drop policy if exists "time_logs_insert_own_task" on public.time_logs;
drop policy if exists "time_logs_update_own_task" on public.time_logs;
drop policy if exists "time_logs_delete_own" on public.time_logs;

create policy "time_logs_select_own"
on public.time_logs
for select
to authenticated
using (user_id = auth.uid());

create policy "time_logs_insert_own_task"
on public.time_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks
    where tasks.id = time_logs.task_id
      and tasks.user_id = auth.uid()
  )
);

create policy "time_logs_update_own_task"
on public.time_logs
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks
    where tasks.id = time_logs.task_id
      and tasks.user_id = auth.uid()
  )
);

create policy "time_logs_delete_own"
on public.time_logs
for delete
to authenticated
using (user_id = auth.uid());

grant usage on type public.task_status to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.time_logs to authenticated;