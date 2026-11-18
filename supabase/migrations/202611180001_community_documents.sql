begin;

create table public.community_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  introduction text not null default '',
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  status text not null default 'discussion' check (status in ('discussion','adopted','archived')),
  version integer not null default 1 check(version > 0),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.community_versions (
  document_id uuid not null references public.community_documents(id) on delete cascade,
  version integer not null,
  title text not null,
  introduction text not null,
  sections jsonb not null,
  status text not null,
  edited_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  primary key(document_id, version)
);
create table public.community_messages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.community_documents(id),
  parent_id uuid references public.community_messages(id),
  author_id uuid not null references public.users(id),
  topic_title text,
  section_key text,
  section_snapshot jsonb,
  document_version integer,
  kind text not null default 'comment' check(kind in ('comment','suggestion')),
  body text not null,
  proposed_text text,
  status text not null default 'open' check(status in ('open','resolved','applied','declined')),
  applied_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz,
  check(kind <> 'suggestion' or (document_id is not null and section_key is not null and proposed_text is not null)),
  check(parent_id is null or kind = 'comment')
);
create index community_messages_document on public.community_messages(document_id,created_at);
create index community_messages_parent on public.community_messages(parent_id,created_at);
create table public.community_follows (
  thread_id uuid not null references public.community_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key(thread_id,user_id)
);
create table public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  thread_id uuid not null references public.community_messages(id) on delete cascade,
  message_id uuid not null references public.community_messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(user_id,message_id)
);
create index community_notifications_user on public.community_notifications(user_id,created_at desc);

-- The existing Express service authenticates accounts and enforces roles.
-- No browser database role may read or mutate these private discussions.
do $$ declare t text; begin
  foreach t in array array['community_documents','community_versions','community_messages','community_follows','community_notifications'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public',t);
    if exists(select from pg_roles where rolname='anon') then
      execute format('revoke all on public.%I from anon, authenticated',t);
    end if;
    if exists(select from pg_roles where rolname='chalet_web') then
      execute format('grant select,insert,update on public.%I to chalet_web',t);
      execute format('create policy chalet_server on public.%I for all to chalet_web using(true) with check(true)',t);
    end if;
  end loop;
  if exists(select from pg_roles where rolname='chalet_web') then
    grant delete on public.community_follows to chalet_web;
    revoke update on public.community_versions from chalet_web;
  end if;
end $$;
commit;
