
-- Additive: document attachment fields on wa_messages (reuses waba-images bucket for storage)
alter table public.wa_messages
  add column if not exists document_url text,
  add column if not exists document_name text;

-- waba-audio bucket exists but has zero storage policies today; add write/update/read
-- mirroring the existing waba-images policies so the panel composer can upload audio.
create policy "waba-audio authenticated write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'waba-audio');

create policy "waba-audio authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'waba-audio');

create policy "waba-audio public read"
  on storage.objects for select
  to public
  using (bucket_id = 'waba-audio' and name is not null and name <> '');

