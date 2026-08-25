-- Analiz Motoru / Deneme Net Dağıtımı — Faz P4: karnenin kazanım (konu
-- bazlı) dökümünü kalıcı olarak saklama + admin-küratörlü kazanım→konu
-- eşleştirmesi. Bkz. rapor: https://claude.ai/code/artifact/e720f787-7564-44c1-97c6-44a075538aa3
--
-- İki ayrı tablo (kullanıcı onayı, Soru 2): ham kazanım ölçümü
-- soru_cozumleri'ne KARIŞTIRILMIYOR (o, öğrencinin KENDİ günlük soru
-- çözüm logu — bu ise PDF'ten deterministik çıkan, öğretmen kaynaklı bir
-- ölçüm). Kazanım metni → MUFREDAT_KONULARI konu eşleştirmesi elle/admin
-- küratörlü (Soru 1) — yayınevi kazanım metinleri STANDART bir müfredat
-- taksonomisiyle birebir örtüşmüyor, otomatik/AI eşleştirme yanlış konuya
-- yanlış veri yazma riski taşıyor.

-- 1) Ham kazanım ölçümü — deneme_ders_sonuclari'nin çok daha ayrıntılı hali.
-- "ders" burada TYT_DERSLERI'nin kanonik adı DEĞİL, karnenin KENDİ ham
-- ders/alt-ders adı (örn. "Tarih-1", "Matematik-1", "Felsefe (Seçmeli)")
-- — deneme-pdf-ayristirici.ts'nin KazanimSatiri.ders alanıyla birebir.
-- Aynı (deneme_id, ders, kazanim_metni) satırı gerçek veride BİRDEN
-- FAZLA kez geçebiliyor (aynı kazanıma bağlı birden çok soru, bkz. rapor)
-- — bu yüzden benzersiz kısıt YOK, sadece indeks.
create table if not exists public.deneme_kazanim_sonuclari (
  id uuid primary key default gen_random_uuid(),
  deneme_id uuid not null references public.denemeler(id) on delete cascade,
  ders text not null,
  kazanim_metni text not null,
  soru integer not null check (soru >= 0),
  dogru integer not null check (dogru >= 0),
  yanlis integer not null check (yanlis >= 0),
  created_at timestamptz not null default now()
);

create index if not exists deneme_kazanim_sonuclari_deneme_idx on public.deneme_kazanim_sonuclari (deneme_id);

comment on table public.deneme_kazanim_sonuclari is
  'PDF karnesinden deterministik çıkarılan kazanım (müfredat konusu) bazlı S/D/Y dökümü — deneme_ders_sonuclari''nin ders-altı ayrıntısı. Şu an sadece TYT/BRANŞ için dolduruluyor (bkz. deneme-pdf-ayristirici.ts P4 notu).';

alter table public.deneme_kazanim_sonuclari enable row level security;

-- Okuma: deneme_ders_sonuclari ile BİREBİR aynı desen (has_student_access
-- + herhangi bir öğretmen). Yazma: sadece service-role (deneme-pdf-actions.ts
-- zaten admin client kullanıyor) — burada bilinçli olarak bir insert
-- politikası AÇILMIYOR, service-role RLS'i baştan atlıyor.
drop policy if exists "deneme_kazanim_sonuclari_select" on public.deneme_kazanim_sonuclari;
create policy "deneme_kazanim_sonuclari_select" on public.deneme_kazanim_sonuclari for select using (
  exists (select 1 from public.denemeler d where d.id = deneme_kazanim_sonuclari.deneme_id and public.has_student_access(d.student_id))
);

drop policy if exists "deneme_kazanim_sonuclari_select_any_teacher" on public.deneme_kazanim_sonuclari;
create policy "deneme_kazanim_sonuclari_select_any_teacher" on public.deneme_kazanim_sonuclari for select using (public.is_ogretmen());

-- 2) Admin küratörlü eşleştirme: yayınevi kazanım metni → MUFREDAT_KONULARI
-- konu adı. ders: TYT_DERSLERI'nin kanonik adı (mufredat-konulari.ts'teki
-- gibi FK değil, serbest metin eşleşmesi — aynı desen mufredat_alt_konular'da
-- da kullanıldı). Boş başlar, admin zamanla doldurur (Faz P4 kapsamı SADECE
-- veri modeli + admin arayüzü — 69 ünitede olduğu gibi içerik toptan
-- üretilmiyor, bkz. plan).
create table if not exists public.kazanim_konu_eslesmeleri (
  id uuid primary key default gen_random_uuid(),
  ders text not null,
  kazanim_metni text not null,
  konu text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (ders, kazanim_metni)
);

create index if not exists kazanim_konu_eslesmeleri_ders_idx on public.kazanim_konu_eslesmeleri (ders);

comment on table public.kazanim_konu_eslesmeleri is
  'Admin küratörlü: yayınevi kazanım metni (deneme_kazanim_sonuclari.kazanim_metni) → MUFREDAT_KONULARI konu adı eşleştirmesi. Elle doldurulur (Soru 1 kararı) — otomatik/AI eşleştirme yok.';

alter table public.kazanim_konu_eslesmeleri enable row level security;

-- Herkes (herhangi bir kimlik doğrulamalı kullanıcı) okuyabilir — Analiz
-- Motoru bu eşleşmeyi client tarafında kullanacak, mufredat_alt_konular'daki
-- "select true" deseniyle aynı (küçük, isimsiz, kişisel veri içermeyen bir
-- katalog). Sadece admin yazabilir.
drop policy if exists "kazanim_konu_eslesmeleri_select" on public.kazanim_konu_eslesmeleri;
create policy "kazanim_konu_eslesmeleri_select" on public.kazanim_konu_eslesmeleri
  for select using (true);

drop policy if exists "kazanim_konu_eslesmeleri_admin_all" on public.kazanim_konu_eslesmeleri;
create policy "kazanim_konu_eslesmeleri_admin_all" on public.kazanim_konu_eslesmeleri
  for all using (public.is_admin()) with check (public.is_admin());
