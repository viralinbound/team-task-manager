-- Version 2: recurring tasks.
-- When a repeating task lands in a Done column, the next one is created automatically
-- (fresh checklist, no comments, next due date) and the finished one stops repeating.

alter table public.cards
  add column if not exists repeat text check (repeat in ('daily', 'weekly', 'monthly'));

create or replace function public.next_due(d date, rule text) returns date
language plpgsql immutable as $$
declare
  n date := coalesce(d, current_date);
begin
  loop
    n := case rule when 'daily' then n + 1 when 'weekly' then n + 7 else (n + interval '1 month')::date end;
    exit when n >= current_date;
  end loop;
  return n;
end;
$$;

create or replace function public.spawn_repeat() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
begin
  if new.repeat is null or new.list_id is not distinct from old.list_id then
    return new;
  end if;
  if not exists (select 1 from lists where id = new.list_id and kind = 'done') then
    return new;
  end if;

  select id into target from lists
   where board_id = new.board_id and kind is null
   order by position limit 1;
  if target is null then
    select id into target from lists where board_id = new.board_id order by position limit 1;
  end if;

  insert into cards (board_id, list_id, position, title, description, assignee_ids, team_id, assigned_by,
                     due, priority, labels, checklist, history, client_visible, repeat, cover)
  values (
    new.board_id, target, -1, new.title, new.description, new.assignee_ids, new.team_id, new.assigned_by,
    public.next_due(new.due, new.repeat), new.priority, new.labels,
    coalesce((select jsonb_agg(i || jsonb_build_object('done', false)) from jsonb_array_elements(new.checklist) i), '[]'::jsonb),
    jsonb_build_array(jsonb_build_object('at', now(), 'userId', auth.uid(), 'text', 'repeats ' || new.repeat || ' (created automatically)')),
    new.client_visible, new.repeat, new.cover
  );

  new.repeat := null;
  return new;
end;
$$;

drop trigger if exists spawn_repeat on public.cards;
create trigger spawn_repeat
  before update of list_id on public.cards
  for each row execute function public.spawn_repeat();
