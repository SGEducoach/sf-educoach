-- Faz 3 (yenilikler_1.txt §4-6): Görevler alt sistemi.
--
-- Öğretmen bir öğrenciye (veya toplu olarak birden çok öğrenciye) bir görev
-- verir (gorevler + gorev_atamalari — tek görev tanımı, öğrenci başına ayrı
-- bir atama satırı). Öğrenci görevi, İLGİLİ mevcut veri giriş formundan
-- (Konu Çalışma / Soru Çözümü / Deneme) tamamlar — ayrı bir "görev tamamlama"
-- ekranı YOK, mevcut konu_calismalar/soru_cozumleri/denemeler tablolarına
-- eklenen gorev_atama_id ile bağlanıyor. Böylece rozet/analiz sistemleri
-- görev kaynaklı girişleri de otomatik olarak sayıyor.

create type public.gorev_turu as enum ('konu', 'soru', 'deneme');
create type public.gorev_durumu as enum ('bekliyor', 'tamamlandi', 'tamamlanmadi');

create table public.gorevler (
  id uuid primary key default gen_random_uuid(),
  olusturan_ogretmen_id uuid not null references public.teachers(id) on delete cascade,
  tur public.gorev_turu not null,
  ders text not null,
  konu text,
  hedef_soru_sayisi integer check (hedef_soru_sayisi is null or hedef_soru_sayisi > 0),
  hedef_dakika integer check (hedef_dakika is null or hedef_dakika > 0),
  -- Takvimde göründüğü gün + "tarih aralığı" (kullanıcı isteği): son_tarih
  -- verilmezse tarih ile aynı kabul edilir, süresi geçince (cron)
  -- tamamlanmadı işaretlenir.
  tarih date not null,
  son_tarih date not null default current_date,
  baslangic_saat time,
  bitis_saat time,
  aciklama text,
  created_at timestamptz not null default now(),
  constraint gorevler_son_tarih_sirali check (son_tarih >= tarih)
);

create table public.gorev_atamalari (
  id uuid primary key default gen_random_uuid(),
  gorev_id uuid not null references public.gorevler(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  durum public.gorev_durumu not null default 'bekliyor',
  created_at timestamptz not null default now(),
  unique (gorev_id, student_id)
);

create index on public.gorev_atamalari (student_id, durum);
create index on public.gorevler (tarih);

alter table public.gorevler enable row level security;
alter table public.gorev_atamalari enable row level security;

create policy "gorevler_select_related" on public.gorevler
  for select using (
    olusturan_ogretmen_id = auth.uid()
    or exists (select 1 from public.gorev_atamalari ga where ga.gorev_id = gorevler.id and ga.student_id = auth.uid())
    or exists (
      select 1 from public.gorev_atamalari ga
      join public.parent_students ps on ps.student_id = ga.student_id
      where ga.gorev_id = gorevler.id and ps.parent_id = auth.uid()
    )
  );
create policy "gorevler_insert_own" on public.gorevler
  for insert with check (olusturan_ogretmen_id = auth.uid());

create policy "gorev_atamalari_select_related" on public.gorev_atamalari
  for select using (
    student_id = auth.uid()
    or exists (select 1 from public.gorevler g where g.id = gorev_atamalari.gorev_id and g.olusturan_ogretmen_id = auth.uid())
    or exists (select 1 from public.parent_students ps where ps.student_id = gorev_atamalari.student_id and ps.parent_id = auth.uid())
  );
-- Öğretmen, SADECE kendi sınıfındaki veya ogretmen_dersleri ile ilişkili
-- olduğu bir sınıftaki öğrenciye görev atayabilir.
create policy "gorev_atamalari_insert_own" on public.gorev_atamalari
  for insert with check (
    exists (select 1 from public.gorevler g where g.id = gorev_atamalari.gorev_id and g.olusturan_ogretmen_id = auth.uid())
    and exists (
      select 1 from public.students s
      where s.id = gorev_atamalari.student_id
      and (
        exists (select 1 from public.teachers t where t.id = auth.uid() and t.class_id = s.class_id)
        or exists (select 1 from public.ogretmen_dersleri od where od.teacher_id = auth.uid() and od.class_id = s.class_id)
      )
    )
  );
-- Öğrenci, görevi tamamlayınca (ilgili veri giriş action'ı üzerinden) kendi
-- atama satırının durumunu güncelleyebilir.
create policy "gorev_atamalari_update_own" on public.gorev_atamalari
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());

-- Mevcut veri giriş tablolarına görev bağlantısı — dolduğunda ilgili görev
-- "tamamlandı" sayılıyor, rozet/analiz sistemleri değişmeden bu satırları
-- da otomatik kapsıyor.
alter table public.konu_calismalar add column gorev_atama_id uuid references public.gorev_atamalari(id);
alter table public.soru_cozumleri add column gorev_atama_id uuid references public.gorev_atamalari(id);
alter table public.denemeler add column gorev_atama_id uuid references public.gorev_atamalari(id);
