begin;
alter table public.blog_posts
  add column rich_content jsonb,
  add column cover_image text,
  add column media_paths text[] not null default '{}';
create index blog_posts_media_paths on public.blog_posts using gin(media_paths);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('blog-media','blog-media',false,8388608,array['image/jpeg','image/png','image/webp','image/gif']);

-- Storage sees only a yes/no decision, never the private account/post rows.
create function public.can_upload_blog_media(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select object_name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp|gif)$'
    and split_part(object_name,'/',1) = auth.uid()::text
    and exists(select from public.users where auth_user_id=auth.uid() and account_status='approved' and not is_disabled);
$$;
create function public.can_read_blog_media(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select from public.users u where auth_user_id=auth.uid() and account_status='approved' and not is_disabled
    and (split_part(object_name,'/',1)=auth.uid()::text or is_admin or is_reservation_admin
      or exists(select from public.blog_posts p where p.author_id=u.id and p.media_paths @> array[object_name])))
  or exists(select from public.blog_posts where published and removed_at is null and media_paths @> array[object_name]);
$$;
revoke all on function public.can_upload_blog_media(text),public.can_read_blog_media(text) from public;
grant execute on function public.can_upload_blog_media(text) to authenticated;
grant execute on function public.can_read_blog_media(text) to anon,authenticated;
create policy chalet_blog_upload on storage.objects for insert to authenticated
  with check(bucket_id='blog-media' and public.can_upload_blog_media(name));
create policy chalet_blog_read on storage.objects for select to anon,authenticated
  using(bucket_id='blog-media' and public.can_read_blog_media(name));
-- Uploads use fresh immutable names: no client overwrite or delete permission.
commit;
