begin;
alter table public.users
  add column has_password boolean not null default false,
  add column booking_access text not null default 'none'
    check (booking_access in ('none','pending','granted','denied')),
  add column booking_access_requested_at timestamptz;

-- Only copy the presence of a password. Auth credentials stay in the Auth schema.
create or replace function public.chalet_sync_password_flag() returns trigger
language plpgsql security definer set search_path = '' as $$
declare present boolean := nullif(new.encrypted_password, '') is not null;
begin
 -- GoTrue can create a random, unusable-by-the-member password while verifying
 -- an invitation. Only a change after confirmation establishes their password.
 if new.email_confirmed_at is null then return new; end if;
 if tg_op='UPDATE' then
   if old.email_confirmed_at is not null then
     if new.encrypted_password is not distinct from old.encrypted_password then return new; end if;
   elsif new.invited_at is not null then return new;
   end if;
 elsif new.invited_at is not null then return new;
 end if;
 update public.users set has_password=present
 where auth_user_id=new.id and has_password is distinct from present;
 return new;
end; $$;
revoke all on function public.chalet_sync_password_flag() from public, anon, authenticated;
-- On confirmation, chalet_confirmed_member runs first (alphabetical trigger order).
create trigger chalet_sync_password_flag after insert or update of encrypted_password,email_confirmed_at
on auth.users for each row execute function public.chalet_sync_password_flag();
-- An older invitation alone is not evidence of a user-chosen password.
update public.users u set has_password=(nullif(a.encrypted_password,'') is not null
 and (a.invited_at is null or exists (
   select 1 from auth.sessions s join auth.mfa_amr_claims m on m.session_id=s.id
   where s.user_id=a.id and m.authentication_method='password'
 )))
from auth.users a where a.id=u.auth_user_id;
do $$ begin
 if exists(select 1 from pg_roles where rolname='chalet_web') then
   grant update(booking_access,booking_access_requested_at) on public.users to chalet_web;
 end if;
end $$;
commit;
