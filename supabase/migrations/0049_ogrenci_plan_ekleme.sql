-- Öğrenci de aynı Görevlerim takvimine kendi planını ekleyebiliyor artık —
-- öğretmenin verdiği görevlerle AYNI gorevler/gorev_atamalari tablosunda,
-- sadece "kim oluşturdu" bilgisi öğretmen yerine öğrenci olabiliyor.
-- Öğrenci kendi planı için saat aralığı ZORUNLU (öğretmen görevlerinde hâlâ
-- opsiyonel) ve aynı gün çakışan bir saat aralığına izin verilmiyor
-- (uygulama tarafında kontrol ediliyor, bkz. gorev-actions.ts planEkle).

alter table public.gorevler alter column olusturan_ogretmen_id drop not null;
alter table public.gorevler add column olusturan_ogrenci_id uuid references public.students(id) on delete cascade;

alter table public.gorevler add constraint gorevler_olusturan_tek check (
  (olusturan_ogretmen_id is not null and olusturan_ogrenci_id is null)
  or (olusturan_ogretmen_id is null and olusturan_ogrenci_id is not null)
);
alter table public.gorevler add constraint gorevler_ogrenci_plani_saat_zorunlu check (
  olusturan_ogrenci_id is null or (baslangic_saat is not null and bitis_saat is not null)
);
alter table public.gorevler add constraint gorevler_saat_sirali check (
  baslangic_saat is null or bitis_saat is null or bitis_saat > baslangic_saat
);

-- gorevler_select_related zaten gorev_ilgili_mi() ile "bu görevin atandığı
-- öğrenci ben miyim" kontrolü yaptığı için, öğrencinin kendi oluşturduğu
-- (ve kendine atadığı) görevleri görebilmesi için ayrıca dokunmaya gerek
-- yok — sadece insert policy'leri güncelleniyor.
drop policy if exists "gorevler_insert_own" on public.gorevler;
create policy "gorevler_insert_own" on public.gorevler
  for insert with check (
    olusturan_ogretmen_id = auth.uid() or olusturan_ogrenci_id = auth.uid()
  );

drop policy if exists "gorev_atamalari_insert_own" on public.gorev_atamalari;
create policy "gorev_atamalari_insert_own" on public.gorev_atamalari
  for insert with check (
    (
      exists (select 1 from public.gorevler g where g.id = gorev_atamalari.gorev_id and g.olusturan_ogretmen_id = auth.uid())
      and exists (
        select 1 from public.students s
        where s.id = gorev_atamalari.student_id
        and (
          exists (select 1 from public.teachers t where t.id = auth.uid() and t.class_id = s.class_id)
          or exists (select 1 from public.ogretmen_dersleri od where od.teacher_id = auth.uid() and od.class_id = s.class_id)
        )
      )
    )
    or (
      student_id = auth.uid()
      and exists (select 1 from public.gorevler g where g.id = gorev_atamalari.gorev_id and g.olusturan_ogrenci_id = auth.uid())
    )
  );
