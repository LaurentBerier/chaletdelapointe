begin;
alter table public.users add column calendar_color_slot integer unique check (calendar_color_slot > 0);
create sequence public.chalet_owner_color_seq as integer owned by public.users.calendar_color_slot;
revoke all on sequence public.chalet_owner_color_seq from public, anon, authenticated;

-- Allocate once, including for owners who leave and later regain their role.
create function public.chalet_assign_owner_color() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.calendar_color_slot := nextval('public.chalet_owner_color_seq'::regclass);
  return new;
end; $$;
revoke all on function public.chalet_assign_owner_color() from public, anon, authenticated;
create trigger chalet_assign_owner_color before insert or update of "group" on public.users
  for each row when (new."group"='proprietaire' and new.calendar_color_slot is null)
  execute function public.chalet_assign_owner_color();
update public.users set calendar_color_slot=nextval('public.chalet_owner_color_seq'::regclass)
where "group"='proprietaire';
commit;
