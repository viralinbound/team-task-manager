-- The app clears `repeat` on the finished task in the same save that moves it to Done,
-- so read the rule from the row as it was before the move.
create or replace function public.spawn_repeat() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  rule text := coalesce(old.repeat, new.repeat);
begin
  if rule is null or new.list_id is not distinct from old.list_id then
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
    public.next_due(new.due, rule), new.priority, new.labels,
    coalesce((select jsonb_agg(i || jsonb_build_object('done', false)) from jsonb_array_elements(new.checklist) i), '[]'::jsonb),
    jsonb_build_array(jsonb_build_object('at', now(), 'userId', auth.uid(), 'text', 'repeats ' || rule || ' (created automatically)')),
    new.client_visible, rule, new.cover
  );

  new.repeat := null;
  return new;
end;
$$;

