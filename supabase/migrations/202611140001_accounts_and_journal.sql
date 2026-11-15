begin;
alter table public.users add column if not exists is_disabled boolean not null default false;

-- Only a confirmed Auth identity creates a member. Roles never come from sign-up metadata.
create or replace function public.chalet_create_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null and new.email is not null and not coalesce(new.is_anonymous,false) then
    insert into public.users (auth_user_id,email,name,"group",can_approve,is_admin)
    values (new.id,lower(new.email),coalesce(nullif(left(btrim(new.raw_user_meta_data->>'display_name'),80),''),'Membre'),'public',false,false)
    on conflict do nothing;
  end if;
  return new;
end; $$;
revoke all on function public.chalet_create_member() from public,anon,authenticated;
drop trigger if exists chalet_confirmed_member on auth.users;
create trigger chalet_confirmed_member after insert or update of email_confirmed_at on auth.users
for each row execute function public.chalet_create_member();

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  title text not null, excerpt text not null, content text not null,
  author_id uuid references public.users(id), published boolean not null default false,
  created_at timestamptz not null default now(), cover text not null default 'lac',
  tags text[] not null default '{}'
);
alter table public.blog_posts enable row level security;
revoke all on public.blog_posts from public,anon,authenticated;
do $$ begin
 if exists(select 1 from pg_roles where rolname='chalet_web') then
   grant update(name,"group",can_approve,is_disabled,updated_at) on public.users to chalet_web;
   grant update(name,description,max_guests,updated_at) on public.properties to chalet_web;
   grant select,insert,update,delete on public.blog_posts to chalet_web;
   drop policy if exists chalet_server on public.blog_posts;
   create policy chalet_server on public.blog_posts for all to chalet_web using(true) with check(true);
 end if;
end $$;
commit;
