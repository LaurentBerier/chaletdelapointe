-- Activate once the registration-aware web server and email worker are live.
begin;
create or replace function public.chalet_create_member() returns trigger
language plpgsql security definer set search_path='' as $$
declare relation text := new.raw_user_meta_data->>'declared_relation';
begin
  if new.email_confirmed_at is not null and new.email is not null and not coalesce(new.is_anonymous,false) then
    insert into public.users (auth_user_id,email,name,"group",can_approve,is_admin,
      booking_access,declared_relation,account_status,registration_request_id,is_disabled)
    values (new.id,lower(new.email),coalesce(nullif(left(btrim(new.raw_user_meta_data->>'display_name'),80),''),'Membre'),
      'public',false,false,'none',
      case when relation in ('proprietaire','ancien_proprietaire','ami_famille','location') then relation end,
      'pending',gen_random_uuid(),true)
    on conflict do nothing;
  end if;
  return new;
end; $$;
commit;
