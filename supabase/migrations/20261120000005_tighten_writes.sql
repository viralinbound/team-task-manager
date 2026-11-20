-- Security review fixes: what people can WRITE (reads were already correct).

-- 1. Comments must belong to a task on the same project, and one the writer can see.
drop policy if exists "write comments" on public.comments;
create policy "write comments" on public.comments for insert to authenticated with check (
  user_id = auth.uid()
  and public.can_see_card(card_id)
  and exists (select 1 from public.cards c where c.id = card_id and c.board_id = comments.board_id)
  and (public.is_staff() or not internal)
  and length(text) <= 10000
);

-- 2. Activity entries only for projects you can see (workspace-wide ones: staff only).
drop policy if exists "write activity" on public.activity;
create policy "write activity" on public.activity for insert to authenticated with check (
  user_id = auth.uid()
  and public.my_role() <> 'viewer'
  and (case when board_id is null then public.is_staff() else public.can_see_board(board_id) end)
  and length(text) <= 500
);

-- 3. Notifications: in-app links only, known kinds, sane length; clients can only notify staff.
drop policy if exists "send notifications" on public.notifications;
create policy "send notifications" on public.notifications for insert to authenticated with check (
  created_by = auth.uid()
  and public.my_role() <> 'viewer'
  and href like '/%' and href not like '//%' and href !~ '[\s\\]'
  and kind in ('assigned', 'mention', 'comment', 'due', 'overdue', 'approval', 'request', 'team')
  and length(text) <= 500
  and (
    public.is_staff()
    or exists (select 1 from public.profiles p where p.id = user_id and p.role in ('admin', 'member'))
  )
);

-- 4 + 5. Tasks: the column must be on the same project. Clients may only add unassigned,
-- client-visible tasks to the Requests column (or a project's first column if it has none).
create or replace function public.list_on_board(l uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from lists where id = l and board_id = b)
$$;

create or replace function public.client_may_add_to(l uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from lists x
    where x.id = l and x.board_id = b
      and (
        x.kind = 'requests'
        or (not exists (select 1 from lists r where r.board_id = b and r.kind = 'requests')
            and x.position = (select min(position) from lists m where m.board_id = b))
      )
  )
$$;

drop policy if exists "create cards" on public.cards;
create policy "create cards" on public.cards for insert to authenticated with check (
  public.can_see_board(board_id)
  and public.list_on_board(list_id, board_id)
  and (
    public.is_staff()
    or (
      public.my_role() = 'client'
      and client_visible
      and assignee_ids = '{}'
      and team_id is null
      and claimed_by is null
      and not archived
      and public.client_may_add_to(list_id, board_id)
    )
  )
);

drop policy if exists "staff edit cards" on public.cards;
create policy "staff edit cards" on public.cards for update to authenticated
  using (public.is_staff() and public.can_see_board(board_id))
  with check (public.is_staff() and public.can_see_board(board_id) and public.list_on_board(list_id, board_id));
