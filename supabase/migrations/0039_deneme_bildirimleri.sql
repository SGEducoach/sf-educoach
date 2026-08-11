-- Toplu deneme sonucu girişinin ardından veliye/öğrenciye/sınıf öğretmenine
-- gönderilen "sonuç yüklendi" / "sonuç yüklenmedi" bildirimlerinin tekilliğini
-- takip eder. "Bildirim gönder" butonu aynı sınıf/tarih/tür için tekrar
-- tıklanırsa, durumu değişmeyen öğrenciye ikinci kez bildirim gitmesin diye
-- bu tablo referans alınıyor. Durum 'girilmedi'den 'girildi'ye yükseldiğinde
-- (sonradan sonuç girildiğinde) yeniden bildirim gönderilip satır güncellenir.
create table public.deneme_bildirimleri (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tarih date not null,
  tur public.deneme_turu not null,
  durum text not null check (durum in ('girildi', 'girilmedi')),
  gonderen_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, tarih, tur)
);

create index on public.deneme_bildirimleri (student_id, tarih, tur);

alter table public.deneme_bildirimleri enable row level security;

-- Aynı desen: admin_audit_log gibi sadece admin (server action, service-role
-- ile) okuyup yazıyor; normal kullanıcı erişimi yok.
create policy "deneme_bildirimleri_select_admin" on public.deneme_bildirimleri
  for select using (public.is_admin());

create policy "deneme_bildirimleri_insert_admin" on public.deneme_bildirimleri
  for insert with check (public.is_admin());

create policy "deneme_bildirimleri_update_admin" on public.deneme_bildirimleri
  for update using (public.is_admin()) with check (public.is_admin());
