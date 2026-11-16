begin;
-- is_admin remains the protected super administrator flag. Existing committee
-- members keep their review rights; this separate role is granted explicitly.
alter table public.users add column is_reservation_admin boolean not null default false,
  add constraint reservation_admin_requires_approved_account
    check (not is_reservation_admin or (account_status = 'approved' and not is_admin));
do $$ begin
  if exists (select from pg_roles where rolname='chalet_web') then
    grant update(is_reservation_admin) on public.users to chalet_web;
  end if;
end $$;
commit;
