-- SeFu Oto Program (kullanıcı isteği 13.09.2026): öğrenci günleri, zaman
-- aralıklarını ve dersleri seçer; sistem haftalık/aylık programı kurar,
-- öğrenci önizlemede düzeltip onaylar (bkz. src/lib/oto-program.ts,
-- src/app/dashboard/oto-program-actions.ts).
--
-- ogrenci_oto_programlari: onaylanan programın ayarı (günler, hafta içi /
-- hafta sonu aralıkları, dersler + ağırlık) ve dönemi — "programı sonraki
-- haftaya/aya taşı" bu kaydı kullanır. gorevler.oto_program_id: kalemin
-- hangi oto programdan geldiği — aynı döneme yeni program uygulanınca eski
-- programın bekleyen kalemleri değiştirilir, yarım kalan konular yeni
-- programın başına alınır.
--
-- Yazma yalnızca sunucu (servis anahtarı, öğrenci oturumu doğrulandıktan
-- sonra); öğrenci kendi kaydını okur.
create table if not exists public.ogrenci_oto_programlari (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  ayar jsonb not null,
  baslangic_tarihi date not null,
  bitis_tarihi date not null,
  kapsam text not null check (kapsam in ('haftalik', 'aylik')),
  created_at timestamptz not null default now(),
  check (bitis_tarihi >= baslangic_tarihi)
);

create index if not exists ogrenci_oto_programlari_ogrenci
  on public.ogrenci_oto_programlari (student_id, created_at desc);

alter table public.ogrenci_oto_programlari enable row level security;
revoke all on public.ogrenci_oto_programlari from anon;
revoke insert, update, delete, truncate, references, trigger on public.ogrenci_oto_programlari from authenticated;

create policy "ogrenci_oto_programlari_select_kendi" on public.ogrenci_oto_programlari
  for select using (student_id = auth.uid());

alter table public.gorevler
  add column if not exists oto_program_id uuid references public.ogrenci_oto_programlari(id) on delete set null;

create index if not exists gorevler_oto_program
  on public.gorevler (oto_program_id) where oto_program_id is not null;
