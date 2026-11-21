begin;
-- Delegation is independent of ownership, booking access and approval rights.
-- Existing admins retain cancellation through their role; nobody is delegated
-- automatically. Only the super-admin account endpoint can change this flag.
alter table public.users
  add column can_cancel_others boolean not null default false,
  add constraint cancellation_delegate_requires_approved_account
    check (not can_cancel_others or account_status = 'approved');
do $$ begin
  if exists (select from pg_roles where rolname = 'chalet_web') then
    grant update(can_cancel_others) on public.users to chalet_web;
  end if;
end $$;
commit;
