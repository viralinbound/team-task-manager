-- Workboard: Phase 1 schema.
-- Who can see what is enforced here with Row Level Security, not in the browser.
--   admin  : everything
--   member : projects they are a member of
--   client : their own company's projects, client-visible tasks only, no internal comments
--   viewer : signed in but not invited yet, sees nothing

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- tables

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6d5bd0',
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  phone text not null default '',
  email text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  color text not null default '#6d5bd0',
  industry text not null default '',
  image text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'member', 'client', 'viewer')),
  title text not null default '',
  team_ids uuid[] not null default '{}',
  client_id uuid references public.clients (id) on delete set null,
  color text not null default '#1f6f5c',
  photo text,
  created_at timestamptz not null default now()
);

-- People an admin has invited. When that email signs in, they get this role.
create table public.invites (
  email text primary key,
  name text not null default '',
  role text not null check (role in ('admin', 'member', 'client', 'viewer')),
  title text not null default '',
  team_ids uuid[] not null default '{}',
  client_id uuid references public.clients (id) on delete cascade,
  color text not null default '#1f6f5c',
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.clients (id) on delete set null,
  color text not null default '#1f6f5c',
  member_ids uuid[] not null default '{}',
  cover text,
  description text,
  start_date date,
  due_date date,
  status text not null default 'active' check (status in ('active', 'on-hold', 'completed')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.board_stars (
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  primary key (user_id, board_id)
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  kind text check (kind in ('requests', 'approval', 'done')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6d5bd0'
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  list_id uuid not null references public.lists (id) on delete cascade,
  position double precision not null default 0,
  title text not null,
  description text not null default '',
  assignee_ids uuid[] not null default '{}',
  team_id uuid references public.teams (id) on delete set null,
  claimed_by uuid references public.profiles (id) on delete set null,
  assigned_by uuid references public.profiles (id) on delete set null,
  due date,
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  labels uuid[] not null default '{}',
  checklist jsonb not null default '[]',
  history jsonb not null default '[]',
  attachments jsonb not null default '[]',
  client_visible boolean not null default true,
  archived boolean not null default false,
  cover text,
  created_at timestamptz not null default now()
);

-- Comments live in their own table so internal ones can be hidden from clients by the database.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  text text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.client_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  wanted_by date,
  status text not null default 'new' check (status in ('new', 'accepted', 'declined')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null,
  href text not null default '/',
  kind text not null,
  read boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null default auth.uid(),
  text text not null,
  board_id uuid references public.boards (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index on public.lists (board_id);
create index on public.cards (board_id);
create index on public.cards (list_id);
create index on public.cards using gin (assignee_ids);
create index on public.comments (card_id);
create index on public.notifications (user_id, read);
create index on public.activity (board_id, created_at desc);
create index on public.boards using gin (member_ids);

-- ---------------------------------------------------------------- helpers
-- security definer so policies can read the caller's profile without recursing into its own policy.

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()), 'viewer')
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'admin'
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin', 'member')
$$;

create or replace function public.my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from profiles where id = auth.uid() and role = 'client'
$$;

create or replace function public.can_see_board(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from boards x
    where x.id = b
      and (
        public.is_admin()
        or (public.my_role() = 'member' and (auth.uid() = any (x.member_ids) or x.created_by = auth.uid()))
        or (public.my_role() = 'client' and x.client_id is not null and x.client_id = public.my_client_id())
      )
  )
$$;

-- ---------------------------------------------------------------- sign-up gate
-- Anyone can request a sign-in link, but only invited emails get a role.
-- The very first person to sign in becomes the admin, so a new workspace can be set up.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv invites%rowtype;
  first_admin boolean;
begin
  select * into inv from invites where lower(email) = lower(new.email);
  select not exists (select 1 from profiles where role = 'admin') into first_admin;

  insert into profiles (id, email, name, role, title, team_ids, client_id, color)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(inv.name, ''), split_part(coalesce(new.email, ''), '@', 1)),
    case when first_admin then 'admin' when inv.email is not null then inv.role else 'viewer' end,
    case when first_admin then 'Admin' else coalesce(inv.title, '') end,
    coalesce(inv.team_ids, '{}'),
    inv.client_id,
    coalesce(inv.color, '#1f6f5c')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Inviting someone who already signed in (as a viewer) upgrades them straight away.
create or replace function public.apply_invite() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles
     set role = new.role,
         name = coalesce(nullif(new.name, ''), name),
         title = new.title,
         team_ids = new.team_ids,
         client_id = new.client_id,
         color = new.color
   where lower(email) = lower(new.email);
  return new;
end;
$$;

create trigger on_invite_saved
  after insert or update on public.invites
  for each row execute function public.apply_invite();

-- People may edit their own name, title and photo, but only an admin changes roles, teams or company.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and (
    new.role is distinct from old.role
    or new.team_ids is distinct from old.team_ids
    or new.client_id is distinct from old.client_id
    or new.email is distinct from old.email
  ) then
    raise exception 'Only an admin can change role, teams, company or email';
  end if;
  return new;
end;
$$;

create trigger protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile();

-- ---------------------------------------------------------------- client review
-- Clients cannot edit tasks directly. Approving or asking for changes goes through this function,
-- which checks the task is theirs and moves it to the right column.

create or replace function public.client_review(p_card uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  c cards%rowtype;
  target uuid;
begin
  select * into c from cards where id = p_card;
  if c.id is null or not c.client_visible or public.my_role() <> 'client' or not public.can_see_board(c.board_id) then
    raise exception 'Not allowed';
  end if;

  if p_approve then
    select id into target from lists where board_id = c.board_id and kind = 'done' order by position limit 1;
  else
    select id into target from lists where board_id = c.board_id and name ilike 'in progress' order by position limit 1;
  end if;

  update cards
     set list_id = coalesce(target, list_id),
         position = -1,
         history = jsonb_build_array(jsonb_build_object(
           'at', now(), 'userId', auth.uid(),
           'text', case when p_approve then 'approved this (client)' else 'asked for changes (client)' end
         )) || history
   where id = p_card;
end;
$$;

-- ---------------------------------------------------------------- row level security

alter table public.teams enable row level security;
alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.boards enable row level security;
alter table public.board_stars enable row level security;
alter table public.lists enable row level security;
alter table public.labels enable row level security;
alter table public.cards enable row level security;
alter table public.comments enable row level security;
alter table public.client_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.activity enable row level security;

-- teams and labels: everyone signed in reads; admins manage teams, staff manage labels
create policy "read teams" on public.teams for select to authenticated using (true);
create policy "admin writes teams" on public.teams for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "read labels" on public.labels for select to authenticated using (true);
create policy "staff writes labels" on public.labels for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- clients: staff see all companies, a client sees only their own
create policy "read clients" on public.clients for select to authenticated using (public.is_staff() or id = public.my_client_id());
create policy "admin writes clients" on public.clients for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- profiles: staff see everyone; clients see staff and people from their own company
create policy "read profiles" on public.profiles for select to authenticated using (
  public.is_staff() or id = auth.uid() or role in ('admin', 'member')
  or (client_id is not null and client_id = public.my_client_id())
);
create policy "edit own profile" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- invites: admins only
create policy "admin manages invites" on public.invites for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- boards (projects)
create policy "read boards" on public.boards for select to authenticated using (public.can_see_board(id));
create policy "staff create boards" on public.boards for insert to authenticated with check (public.is_staff() and created_by = auth.uid());
create policy "members edit boards" on public.boards for update to authenticated using (
  public.is_admin() or (public.is_staff() and (auth.uid() = any (member_ids) or created_by = auth.uid()))
);
create policy "admin deletes boards" on public.boards for delete to authenticated using (public.is_admin());

-- stars are personal
create policy "own stars" on public.board_stars for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_see_board(board_id));

-- lists (columns)
create policy "read lists" on public.lists for select to authenticated using (public.can_see_board(board_id));
create policy "staff write lists" on public.lists for all to authenticated using (public.is_staff() and public.can_see_board(board_id)) with check (public.is_staff() and public.can_see_board(board_id));

-- cards (tasks): clients only see client-visible ones
create policy "read cards" on public.cards for select to authenticated using (
  public.can_see_board(board_id) and (public.is_staff() or client_visible)
);
create policy "create cards" on public.cards for insert to authenticated with check (
  public.can_see_board(board_id) and (public.is_staff() or (public.my_role() = 'client' and client_visible))
);
create policy "staff edit cards" on public.cards for update to authenticated using (public.is_staff() and public.can_see_board(board_id));
create policy "staff delete cards" on public.cards for delete to authenticated using (public.is_staff() and public.can_see_board(board_id));

-- comments: internal ones never reach clients
create policy "read comments" on public.comments for select to authenticated using (
  public.can_see_board(board_id) and (public.is_staff() or not internal)
);
create policy "write comments" on public.comments for insert to authenticated with check (
  user_id = auth.uid() and public.can_see_board(board_id) and (public.is_staff() or not internal)
);

-- client requests
create policy "read requests" on public.client_requests for select to authenticated using (public.is_staff() or client_id = public.my_client_id());
create policy "raise requests" on public.client_requests for insert to authenticated with check (
  created_by = auth.uid() and public.can_see_board(board_id) and (public.is_staff() or client_id = public.my_client_id())
);
create policy "staff update requests" on public.client_requests for update to authenticated using (public.is_staff());

-- notifications: you read and clear your own; anyone signed in (not a viewer) can notify someone
create policy "read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "clear own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "send notifications" on public.notifications for insert to authenticated with check (created_by = auth.uid() and public.my_role() <> 'viewer');

-- activity log: staff read it for projects they can see
create policy "read activity" on public.activity for select to authenticated using (
  public.is_staff() and (board_id is null or public.can_see_board(board_id))
);
create policy "write activity" on public.activity for insert to authenticated with check (user_id = auth.uid() and public.my_role() <> 'viewer');

grant execute on function public.client_review(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table
  public.boards, public.lists, public.cards, public.comments, public.notifications,
  public.client_requests, public.profiles, public.clients, public.teams, public.labels, public.board_stars;

-- ---------------------------------------------------------------- starter data
insert into public.teams (name, color) values
  ('Design', '#b4537a'), ('Development', '#3f6db3'), ('Marketing', '#b7791f'), ('Sales', '#2f7d4f');

insert into public.labels (name, color) values
  ('Website', '#3f6db3'), ('Social', '#b4537a'), ('Ads', '#b7791f'), ('SEO', '#2f7d4f'), ('Branding', '#8a5a3b'), ('Bug', '#c2410c');
