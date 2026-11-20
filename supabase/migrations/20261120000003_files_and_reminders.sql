-- Phase 2/3 additions: file attachments, profile photos, and daily due-date reminders.

-- ---------------------------------------------------------------- helpers

-- Can the signed-in person see this task? (Same rule as the cards policy.)
create or replace function public.can_see_card(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cards x
    where x.id = c and public.can_see_board(x.board_id) and (public.is_staff() or x.client_visible)
  )
$$;

create or replace function public.try_uuid(t text) returns uuid
language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------- buckets

-- Task files: private. Path = <board_id>/<card_id>/<file>. Downloads use short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- Profile photos: public images. Path = <user_id>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- attachments: read if you can see the task; upload into a project you can see; staff remove
create policy "read task files" on storage.objects for select to authenticated using (
  bucket_id = 'attachments' and public.can_see_card(public.try_uuid((storage.foldername(name))[2]))
);
create policy "upload task files" on storage.objects for insert to authenticated with check (
  bucket_id = 'attachments'
  and public.my_role() <> 'viewer'
  and public.can_see_board(public.try_uuid((storage.foldername(name))[1]))
);
create policy "staff remove task files" on storage.objects for delete to authenticated using (
  bucket_id = 'attachments' and public.is_staff() and public.can_see_board(public.try_uuid((storage.foldername(name))[1]))
);

-- avatars: anyone can view (public bucket); you manage only your own folder
create policy "upload own photo" on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "replace own photo" on storage.objects for update to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "remove own photo" on storage.objects for delete to authenticated using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------- due-date reminders
-- Every morning: "due tomorrow", "due today" and "overdue" (up to a week) for each assignee
-- of an open task. At most one reminder per person per task per day.

create or replace function public.notify_due() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  insert into notifications (user_id, text, href, kind, created_by)
  select
    p.id,
    case
      when c.due < current_date then 'Overdue: “' || c.title || '” was due ' || to_char(c.due, 'DD Mon')
      when c.due = current_date then 'Due today: “' || c.title || '”'
      else 'Due tomorrow: “' || c.title || '”'
    end,
    '/boards/' || c.board_id || '?card=' || c.id,
    case when c.due < current_date then 'overdue' else 'due' end,
    null
  from cards c
  join lists l on l.id = c.list_id
  cross join lateral unnest(c.assignee_ids) as a(uid)
  join profiles p on p.id = a.uid and p.role in ('admin', 'member')
  where not c.archived
    and coalesce(l.kind, '') <> 'done'
    and c.due is not null
    and c.due between current_date - 7 and current_date + 1
    and not exists (
      select 1 from notifications x
      where x.user_id = p.id
        and x.href = '/boards/' || c.board_id || '?card=' || c.id
        and x.kind in ('due', 'overdue')
        and x.created_at >= date_trunc('day', now())
    );
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Only the scheduler runs it, never a browser.
revoke execute on function public.notify_due() from public, anon, authenticated;

create extension if not exists pg_cron;

-- 03:30 UTC = 9:00 am India time
select cron.schedule('workboard-due-reminders', '30 3 * * *', $$select public.notify_due()$$);
