begin;

alter table public.users add column booking_access_request_id uuid;
update public.users set booking_access_request_id=gen_random_uuid()
where booking_access='pending';

create table public.access_emails (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  member_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('pending','granted','denied')),
  created_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0,
  sent_at timestamptz,
  unique (request_id,kind,recipient_id)
);
create index access_emails_due on public.access_emails(next_attempt_at,created_at) where sent_at is null;
alter table public.access_emails enable row level security;
revoke all on public.access_emails from public,anon,authenticated;

-- The access change and its mail commit together, including from an older client.
create function public.chalet_access_mail() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.booking_access='pending' then
    new.booking_access_request_id := gen_random_uuid();
    insert into public.access_emails(request_id,member_id,recipient_id,kind)
      select new.booking_access_request_id,new.id,u.id,'pending' from public.users u
      where u.is_admin and not u.is_disabled and u.auth_user_id is not null;
  elsif old.booking_access='pending' and new.booking_access in ('granted','denied') then
    insert into public.access_emails(request_id,member_id,recipient_id,kind)
      values(old.booking_access_request_id,new.id,new.id,new.booking_access);
  elsif new.booking_access='none' then
    new.booking_access_request_id := null;
  end if;
  return new;
end; $$;
revoke all on function public.chalet_access_mail() from public,anon,authenticated;
create trigger chalet_access_mail before update of booking_access on public.users
for each row when (old.booking_access is distinct from new.booking_access)
execute function public.chalet_access_mail();

-- Give any requests already waiting at rollout the same notification.
insert into public.access_emails(request_id,member_id,recipient_id,kind)
 select m.booking_access_request_id,m.id,a.id,'pending' from public.users m cross join public.users a
 where m.booking_access='pending' and not m.is_disabled and m."group"<>'proprietaire'
 and a.is_admin and not a.is_disabled and a.auth_user_id is not null;

do $$ begin
  if exists(select 1 from pg_roles where rolname='chalet_web') then
    grant select,update(sent_at,next_attempt_at,attempts) on public.access_emails to chalet_web;
    create policy chalet_server on public.access_emails for all to chalet_web using(true) with check(true);
  end if;
end $$;
commit;
