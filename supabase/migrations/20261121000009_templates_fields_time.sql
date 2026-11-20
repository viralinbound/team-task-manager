-- Version 2, batch 2: saved project templates, custom fields, time tracking.

-- ---------------------------------------------------------------- saved templates
-- A snapshot of a project's columns, tasks (titles, details, subtasks, labels, priority)
-- and custom fields, to start new projects from.
create table if not exists public.project_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  blurb text not null default '',
  lists jsonb not null default '[]',
  cards jsonb not null default '[]',
  fields jsonb not null default '[]',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.project_templates enable row level security;
create policy "staff read templates" on public.project_templates for select to authenticated using (public.is_staff());
create policy "staff save templates" on public.project_templates for insert to authenticated with check (public.is_staff() and created_by = auth.uid());
create policy "owner or admin edits templates" on public.project_templates for update to authenticated using (public.is_admin() or created_by = auth.uid());
create policy "owner or admin deletes templates" on public.project_templates for delete to authenticated using (public.is_admin() or created_by = auth.uid());

-- ---------------------------------------------------------------- custom fields
-- Field definitions live on the project; each task stores its values keyed by field id.
alter table public.boards add column if not exists fields jsonb not null default '[]';
alter table public.cards add column if not exists custom jsonb not null default '{}';

-- ---------------------------------------------------------------- time tracking
-- Internal only: clients never see time entries.
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  minutes integer not null check (minutes between 1 and 1440),
  note text not null default '' check (length(note) <= 500),
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists time_entries_board on public.time_entries (board_id, spent_on);
create index if not exists time_entries_user on public.time_entries (user_id, spent_on);
alter table public.time_entries enable row level security;

create policy "staff read time" on public.time_entries for select to authenticated using (public.is_staff() and public.can_see_board(board_id));
create policy "log own time" on public.time_entries for insert to authenticated with check (
  user_id = auth.uid()
  and public.is_staff()
  and public.can_see_card(card_id)
  and exists (select 1 from public.cards c where c.id = card_id and c.board_id = time_entries.board_id)
);
create policy "remove own time" on public.time_entries for delete to authenticated using (user_id = auth.uid() or public.is_admin());

alter publication supabase_realtime add table public.project_templates, public.time_entries;
