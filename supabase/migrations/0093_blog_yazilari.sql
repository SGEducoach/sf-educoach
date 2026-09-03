-- SeFu Blog (03.09.2026 kullanıcı isteği) — ana sayfa dışında indekslenebilir
-- sayfa olmaması SEO'da tek başına duran bir siteye yol açıyordu. Her blog
-- yazısı Google için ayrı bir sayfa: /blog/<slug>.
--
-- Görsel/dosya deseni tg_deneme_ilanlari (migration 0082) ile aynı: public
-- storage bucket + admin-only yazma. Tabloda ise TG'den farklı olarak
-- yayın durumu var — yazı taslak olarak kaydedilip sonra yayınlanabiliyor,
-- yayınlanmamış yazı public sorgularda hiç görünmüyor.

create table public.blog_yazilari (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 120),
  baslik text not null check (char_length(baslik) between 3 and 200),
  ozet text not null check (char_length(ozet) between 10 and 300),
  icerik text not null check (char_length(icerik) between 1 and 60000),
  kapak_gorseli text,
  yayinda boolean not null default false,
  yayin_tarihi timestamptz,
  olusturan_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_yazilari_yayin_idx on public.blog_yazilari (yayinda, yayin_tarihi desc);

alter table public.blog_yazilari enable row level security;

-- Blog HERKESE açık (giriş şartı yok — amaç zaten arama motorundan gelen
-- anonim trafik). Anonim ziyaretçi yalnız YAYINDA olanları görür; taslaklar
-- ve tüm yazma işlemleri admin'e kapalı kalır.
create policy "blog_yazilari_select_public" on public.blog_yazilari
  for select using (yayinda = true or public.is_admin());
create policy "blog_yazilari_insert_admin" on public.blog_yazilari
  for insert with check (public.is_admin());
create policy "blog_yazilari_update_admin" on public.blog_yazilari
  for update using (public.is_admin());
create policy "blog_yazilari_delete_admin" on public.blog_yazilari
  for delete using (public.is_admin());

-- updated_at otomatik tazelensin (yazı düzenlenince sitemap'teki
-- lastModified de doğru olsun diye).
create or replace function public.blog_yazisi_guncellenme_tarihi()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists blog_yazisi_guncellenme_trg on public.blog_yazilari;
create trigger blog_yazisi_guncellenme_trg
  before update on public.blog_yazilari
  for each row execute function public.blog_yazisi_guncellenme_tarihi();

-- Kapak görselleri için public bucket (bkz. migration 0082 aynı desen).
insert into storage.buckets (id, name, public)
values ('blog', 'blog', true)
on conflict (id) do nothing;

create policy "blog_objects_select_all" on storage.objects
  for select using (bucket_id = 'blog');
create policy "blog_objects_insert_admin" on storage.objects
  for insert with check (bucket_id = 'blog' and public.is_admin());
create policy "blog_objects_delete_admin" on storage.objects
  for delete using (bucket_id = 'blog' and public.is_admin());
