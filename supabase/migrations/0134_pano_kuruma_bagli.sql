-- Pano kuruma bağlandı (kullanıcı isteği 02.10.2026).
--
-- "her pano kendi kurumu içinde ayrı kullanılsın. mevcut haber akışı şu an
--  sadece elbistan fen lisesi için kullanılsın, diğer kurumlar kendi
--  panolarına ayrıca müdahil olsunlar. yetkiler: admin (bütün panolar) /
--  kurum moderatörü (sadece kendi kurumu), diğer kullanıcılar salt okuyucu"
--
-- Önceki hâl: tablo kurumsuzdu, RLS `select using (true)` ile HERKESE (giriş
-- yapmamış ziyaretçi dahil) açıktı ve yazma yalnız admin'deydi. İçerik ayrıca
-- herkese açık ana sayfada da yayınlanıyordu.
--
-- Artık her satır bir kuruma ait: okuma o kurumun üyelerine, yazma admin ve
-- kurum moderatörüne. `is_school_moderator` müdürü de moderatör sayıyor
-- (sistemin başka yerlerinde de böyle) — kurum müdürü kendi panosunu
-- yönetebilir.

alter table public.tg_deneme_ilanlari
  add column if not exists school_id uuid references public.schools(id) on delete cascade;

-- Mevcut 3 ilan Elbistan Bist Fen Lisesi'nin panosuna taşınıyor. Kurum
-- bulunamazsa SESSİZCE yanlış kuruma yazmak yerine göçü durduruyoruz.
do $$
declare
  hedef uuid;
  sahipsiz int;
begin
  select id into hedef from public.schools where ad = 'Elbistan Bist Fen Lisesi' limit 1;
  if hedef is null then
    raise exception 'Elbistan Bist Fen Lisesi bulunamadi: mevcut ilanlarin hangi kuruma ait oldugu belirlenemedi';
  end if;

  update public.tg_deneme_ilanlari set school_id = hedef where school_id is null;

  select count(*) into sahipsiz from public.tg_deneme_ilanlari where school_id is null;
  if sahipsiz > 0 then
    raise exception 'Hala kurumsuz % ilan var', sahipsiz;
  end if;
end $$;

alter table public.tg_deneme_ilanlari
  alter column school_id set not null;

create index if not exists tg_deneme_ilanlari_kurum_idx
  on public.tg_deneme_ilanlari (school_id, created_at desc);

comment on column public.tg_deneme_ilanlari.school_id is
  'Panonun sahibi kurum. Okuma o kurumun üyelerine açık; yazma admin ve kurum moderatörüne (bkz. RLS).';

-- ---------- RLS ----------

-- ESKİ POLİTİKA KALDIRILIYOR: `using (true)` giriş yapmamış ziyaretçiye de
-- açıktı. Pano artık kurum içeriği.
drop policy if exists tg_deneme_ilanlari_select_all on public.tg_deneme_ilanlari;
drop policy if exists tg_deneme_ilanlari_insert_admin on public.tg_deneme_ilanlari;
drop policy if exists tg_deneme_ilanlari_delete_admin on public.tg_deneme_ilanlari;

-- Okuma: kurumun üyesi (öğrenci, öğretmen, veli, moderatör) + admin.
-- Diğer kullanıcılar için SALT OKUMA — yazma politikası onları kapsamıyor.
create policy tg_deneme_ilanlari_okuma on public.tg_deneme_ilanlari
  for select to authenticated
  using (public.kurum_uyesi_mi(school_id));

-- Yazma: admin her panoya, kurum moderatörü/müdürü yalnız kendi kurumuna.
create policy tg_deneme_ilanlari_ekleme on public.tg_deneme_ilanlari
  for insert to authenticated
  with check (public.is_admin() or public.is_school_moderator(school_id));

create policy tg_deneme_ilanlari_guncelleme on public.tg_deneme_ilanlari
  for update to authenticated
  using (public.is_admin() or public.is_school_moderator(school_id))
  with check (public.is_admin() or public.is_school_moderator(school_id));

create policy tg_deneme_ilanlari_silme on public.tg_deneme_ilanlari
  for delete to authenticated
  using (public.is_admin() or public.is_school_moderator(school_id));

revoke all on public.tg_deneme_ilanlari from anon;
