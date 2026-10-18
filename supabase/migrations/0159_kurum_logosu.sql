-- Kullanıcı kararı (18.10.2026): her kurumun kendi logosu. WhatsApp duyuru
-- kartlarında yuvarlak olarak kullanılır (bkz. WhatsappDuyuruStudyosu).
-- Logo herkese açık bir depoda durur (kartı çizen tarayıcı okuyabilsin);
-- yükleme yalnız sunucuda, service-role ile ve kurum müdürü doğrulandıktan
-- sonra yapılır — bu yüzden depoya ayrıca yazma politikası açılmaz.
alter table public.schools add column if not exists logo_url text;

comment on column public.schools.logo_url is
  'Kurum logosunun herkese açık adresi (kurum-logolari deposu). WhatsApp duyuru kartlarında yuvarlak kullanılır.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kurum-logolari', 'kurum-logolari', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
