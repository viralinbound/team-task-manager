-- Let system jobs (no signed-in user, e.g. a client being deleted and its people unlinked)
-- update profiles. Signed-in non-admins still cannot change role, teams, company or email.
create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
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
