begin;
-- Keep existing and pre-provisioned accounts, including their suspension state.
alter table public.users
  add column account_status text not null default 'approved'
    check (account_status in ('pending','approved','denied')),
  add column declared_relation text check (declared_relation in ('proprietaire','ancien_proprietaire','ami_famille','location')),
  add column registration_request_id uuid unique,
  add constraint unapproved_account_has_no_permissions check (account_status='approved' or
    (is_disabled and not is_admin and not can_approve and "group"='public' and booking_access='none' and registration_request_id is not null));
-- Owner bookings used to be implicit. Record the existing grant before making
-- booking an independent permission.
update public.users set booking_access='granted'
where "group"='proprietaire' and booking_access<>'granted';
alter table public.access_emails drop constraint access_emails_kind_check,
  add constraint access_emails_kind_check check (kind in
    ('pending','granted','denied','registration_pending','registration_approved','registration_denied')),
  add column booking_allowed boolean;

create function public.chalet_registration_mail() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    if new.account_status='pending' then
      insert into public.access_emails(request_id,member_id,recipient_id,kind)
        select new.registration_request_id,new.id,u.id,'registration_pending' from public.users u
        where u.is_admin and not u.is_disabled and u.account_status='approved' and u.auth_user_id is not null;
    end if;
  elsif old.account_status='pending' and new.account_status in ('approved','denied') then
    insert into public.access_emails(request_id,member_id,recipient_id,kind,booking_allowed)
      values(new.registration_request_id,new.id,new.id,'registration_'||new.account_status,new.booking_access='granted');
  end if;
  return new;
end; $$;
revoke all on function public.chalet_registration_mail() from public,anon,authenticated;
create trigger chalet_registration_mail after insert or update of account_status on public.users
for each row execute function public.chalet_registration_mail();

do $$ begin
 if exists(select 1 from pg_roles where rolname='chalet_web') then
   grant update(account_status,booking_access_request_id) on public.users to chalet_web;
 end if;
end $$;
commit;
