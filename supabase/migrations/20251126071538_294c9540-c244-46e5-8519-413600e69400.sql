-- Create storage policies for avatars bucket
-- Allow public read access to avatar images
create policy "Avatar images are publicly accessible"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatars
create policy "Users can upload their own avatars"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own avatars
create policy "Users can update their own avatars"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own avatars
create policy "Users can delete their own avatars"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );