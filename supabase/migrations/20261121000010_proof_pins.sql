-- Version 2, batch 3: design proofing. A pin is a comment placed on a spot of an image attachment.
-- x / y are fractions of the image (0..1) so pins stay put at any screen size.

create table if not exists public.proof_pins (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  attachment_id text not null,
  x real not null check (x between 0 and 1),
  y real not null check (y between 0 and 1),
  text text not null check (length(text) between 1 and 2000),
  internal boolean not null default false,
  resolved boolean not null default false,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists proof_pins_card on public.proof_pins (card_id);
alter table public.proof_pins enable row level security;

-- Same rules as comments: whoever can see the task sees its pins; internal pins stay with the team.
create policy "read pins" on public.proof_pins for select to authenticated using (
  public.can_see_card(card_id) and (public.is_staff() or not internal)
);
create policy "add pins" on public.proof_pins for insert to authenticated with check (
  user_id = auth.uid()
  and public.my_role() <> 'viewer'
  and public.can_see_card(card_id)
  and exists (select 1 from public.cards c where c.id = card_id and c.board_id = proof_pins.board_id)
  and (public.is_staff() or not internal)
);
-- Resolve / reopen: the team, or the person who placed the pin.
create policy "resolve pins" on public.proof_pins for update to authenticated
  using (public.can_see_card(card_id) and (public.is_staff() or user_id = auth.uid()))
  with check (public.can_see_card(card_id) and (public.is_staff() or (user_id = auth.uid() and not internal)));
create policy "remove pins" on public.proof_pins for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- Only the "resolved" flag may change after a pin is placed.
create or replace function public.pins_only_resolve() returns trigger
language plpgsql as $$
begin
  if new.card_id <> old.card_id or new.board_id <> old.board_id or new.attachment_id <> old.attachment_id
     or new.x <> old.x or new.y <> old.y or new.text <> old.text or new.internal <> old.internal or new.user_id <> old.user_id then
    raise exception 'Only resolved can change on a pin';
  end if;
  return new;
end;
$$;
drop trigger if exists pins_only_resolve on public.proof_pins;
create trigger pins_only_resolve before update on public.proof_pins for each row execute function public.pins_only_resolve();

alter publication supabase_realtime add table public.proof_pins;
