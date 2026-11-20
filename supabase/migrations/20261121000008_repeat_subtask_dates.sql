-- Repeating tasks: move each subtask's date forward by the same amount as the task.
create or replace function public.spawn_repeat() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  target uuid;
  rule text := coalesce(old.repeat, new.repeat);
  nd date;
begin
  if rule is null or new.list_id is not distinct from old.list_id then
    return new;
  end if;
  if not exists (select 1 from lists where id = new.list_id and kind = 'done') then
    return new;
  end if;

  nd := public.next_due(new.due, rule);

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
    nd, new.priority, new.labels,
    coalesce((
      select jsonb_agg(
        i || jsonb_build_object('done', false)
          || case when i ? 'due' and new.due is not null and (i->>'due') ~ '^\d{4}-\d{2}-\d{2}$'
               then jsonb_build_object('due', to_char((i->>'due')::date + (nd - new.due), 'YYYY-MM-DD'))
               else '{}'::jsonb end
      ) from jsonb_array_elements(new.checklist) i), '[]'::jsonb),
    jsonb_build_array(jsonb_build_object('at', now(), 'userId', auth.uid(), 'text', 'repeats ' || rule || ' (created automatically)')),
    new.client_visible, rule, new.cover
  );

  new.repeat := null;
  return new;
end;
$$;

