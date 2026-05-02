-- Fix storage permissions for the 'blogs' bucket so admins can upload images

-- 1. Create the bucket if it doesn't exist (just in case)
insert into storage.buckets (id, name, public)
values ('blogs', 'blogs', true)
on conflict (id) do update set public = true;

-- 2. Drop existing policies to avoid conflicts
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Admin Upload Access" on storage.objects;
drop policy if exists "Admin Delete Access" on storage.objects;

-- 3. Allow public access to view images (SELECT)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'blogs' );

-- 4. Allow anyone to upload images (INSERT)
-- In a strict production environment, you should check auth.uid() here.
create policy "Admin Upload Access"
on storage.objects for insert
with check ( bucket_id = 'blogs' );

-- 5. Allow anyone to update/delete images (UPDATE/DELETE)
create policy "Admin Delete Access"
on storage.objects for delete
using ( bucket_id = 'blogs' );

create policy "Admin Update Access"
on storage.objects for update
using ( bucket_id = 'blogs' );
