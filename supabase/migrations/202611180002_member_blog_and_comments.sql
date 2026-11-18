begin;
alter table public.blog_posts
  add column removed_at timestamptz,
  add column removed_by uuid references public.users(id),
  add column comments_locked boolean not null default false;
create table public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  parent_id uuid references public.blog_comments(id),
  author_id uuid not null references public.users(id),
  body text not null check(length(body) between 1 and 6000),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  removed_at timestamptz,
  removed_by uuid references public.users(id)
);
create index blog_comments_post on public.blog_comments(post_id,created_at);
alter table public.blog_comments enable row level security;
revoke all on public.blog_comments from public;
do $$ begin
  if exists(select from pg_roles where rolname='anon') then
    revoke all on public.blog_comments from anon, authenticated;
  end if;
  if exists(select from pg_roles where rolname='chalet_web') then
    grant select,insert,update on public.blog_comments to chalet_web;
    create policy chalet_server on public.blog_comments for all to chalet_web using(true) with check(true);
  end if;
end $$;
commit;
