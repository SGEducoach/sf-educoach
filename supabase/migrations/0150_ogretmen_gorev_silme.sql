-- Öğretmen kendi verdiği görevi kaldırabilir. Görev tamamlanmış olsa bile
-- öğrencinin konu/soru/deneme kaydı kalır; yalnız görev bağlantısı ayrılır.
begin;

drop policy if exists "gorevler_delete_own_teacher" on public.gorevler;
create policy "gorevler_delete_own_teacher" on public.gorevler
  for delete to authenticated
  using (olusturan_ogretmen_id = (select auth.uid()));

alter table public.konu_calismalar
  drop constraint if exists konu_calismalar_gorev_atama_id_fkey;
alter table public.konu_calismalar
  add constraint konu_calismalar_gorev_atama_id_fkey
  foreign key (gorev_atama_id) references public.gorev_atamalari(id) on delete set null;

alter table public.soru_cozumleri
  drop constraint if exists soru_cozumleri_gorev_atama_id_fkey;
alter table public.soru_cozumleri
  add constraint soru_cozumleri_gorev_atama_id_fkey
  foreign key (gorev_atama_id) references public.gorev_atamalari(id) on delete set null;

alter table public.denemeler
  drop constraint if exists denemeler_gorev_atama_id_fkey;
alter table public.denemeler
  add constraint denemeler_gorev_atama_id_fkey
  foreign key (gorev_atama_id) references public.gorev_atamalari(id) on delete set null;

commit;
