-- Email alerts: each person can turn instant emails and the daily digest on or off.
-- When an important notification is created, the database calls the app's email endpoint.

alter table public.profiles
  add column if not exists email_alerts boolean not null default true,
  add column if not exists email_digest boolean not null default true;

create extension if not exists pg_net;

-- Settings the browser can never read (this schema is not exposed through the API).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.config (
  key text primary key,
  value text not null
);

-- Called once by the server (service role) to point the hook at the deployed app.
create or replace function public.set_email_hook(p_url text, p_secret text) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  insert into private.config (key, value) values ('email_hook_url', p_url), ('email_hook_secret', p_secret)
  on conflict (key) do update set value = excluded.value;
end;
$$;
revoke execute on function public.set_email_hook(text, text) from public, anon, authenticated;

-- Instant emails only for things that need action now; reminders and comments go in the daily digest.
create or replace function public.email_on_notification() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare
  hook text;
  secret text;
begin
  if new.kind not in ('assigned', 'mention', 'approval', 'request') then
    return new;
  end if;
  select value into hook from private.config where key = 'email_hook_url';
  select value into secret from private.config where key = 'email_hook_secret';
  if hook is null or secret is null then
    return new;
  end if;
  perform net.http_post(
    url := hook,
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-hook-secret', secret)
  );
  return new;
end;
$$;

drop trigger if exists email_on_notification on public.notifications;
create trigger email_on_notification
  after insert on public.notifications
  for each row execute function public.email_on_notification();
