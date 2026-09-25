-- Kullanıcı isteği (25.09.2026): karneli deneme PDF'lerinin 1. sayfasındaki
-- puan/sıralama (sınıf-kurum-ilçe-il-genel + katılım), ders bazında sınıf/
-- kurum/genel ortalamaları ve soru soru cevaplar (öğrencinin cevabı / cevap
-- anahtarı) saklanır. Ayrıştırma: src/lib/karne-birinci-sayfa.ts.
-- Deneme başına tek satır (upsert); yapı sabit olmadığı (TYT tek puan, AYT
-- birden çok puan türü) için jsonb.
create table if not exists public.deneme_karne_ozetleri (
  deneme_id uuid primary key references public.denemeler(id) on delete cascade,
  puanlar jsonb not null default '[]'::jsonb,
  ders_ortalamalari jsonb not null default '[]'::jsonb,
  cevaplar jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.deneme_karne_ozetleri enable row level security;
revoke all on public.deneme_karne_ozetleri from anon;

-- Okuma: deneme_kazanim_sonuclari ile aynı desen (öğrencinin kendisi/velisi
-- has_student_access, aynı kurumun öğretmen/müdürü kurum_denemesini_gorebilir
-- — bkz. 0063, 0114). Yazma yalnızca service-role (deneme-pdf-actions.ts).
drop policy if exists "deneme_karne_ozetleri_select" on public.deneme_karne_ozetleri;
create policy "deneme_karne_ozetleri_select" on public.deneme_karne_ozetleri for select using (
  exists (select 1 from public.denemeler d where d.id = deneme_karne_ozetleri.deneme_id and public.has_student_access(d.student_id))
);

drop policy if exists "deneme_karne_ozetleri_select_ayni_kurum" on public.deneme_karne_ozetleri;
create policy "deneme_karne_ozetleri_select_ayni_kurum" on public.deneme_karne_ozetleri
  for select using (public.kurum_denemesini_gorebilir(deneme_id));
