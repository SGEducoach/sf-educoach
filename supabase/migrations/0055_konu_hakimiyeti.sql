-- Faz H1 — "Konu Hakimiyeti" veri modeli.
-- Bkz. plan: Konu Hakimiyeti fazı.
--
-- 1) Öğrencinin müfredattaki her konu için KALICI hakimiyet beyanı —
--    konu_calismalar.hedefe_yakinlik (bir ÇALIŞMA OTURUMUNUN o anki
--    değerlendirmesi) ile KARIŞTIRILMASIN diye ayrı bir tablo: bu,
--    öğrencinin "bu konuya genel olarak hakim miyim" beyanı, konu
--    başına TEK kayıt (upsert).
create table if not exists public.ogrenci_konu_hakimiyeti (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  ders text not null,
  konu text not null,
  hakimiyet_seviyesi public.hedefe_yakinlik not null,
  ogrenme_sekli text[] not null default '{}',
  tekrar_durumu text,
  guncellenme_tarihi timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id, ders, konu)
);

alter table public.ogrenci_konu_hakimiyeti drop constraint if exists ogrenci_konu_hakimiyeti_tekrar_durumu_gecerli;
alter table public.ogrenci_konu_hakimiyeti
  add constraint ogrenci_konu_hakimiyeti_tekrar_durumu_gecerli check (
    tekrar_durumu is null or tekrar_durumu in ('tekrar_edebilirim', 'yuzeysel_bakarim', 'gerek_yok')
  );

create index if not exists ogrenci_konu_hakimiyeti_student_idx on public.ogrenci_konu_hakimiyeti (student_id);

comment on table public.ogrenci_konu_hakimiyeti is
  'Öğrencinin müfredat konuları için kalıcı hakimiyet beyanı — bir çalışma oturumu loglamaktan bağımsız, konu başına tek (upsert) kayıt.';
comment on column public.ogrenci_konu_hakimiyeti.ogrenme_sekli is
  'Çoklu seçim: ''derste''|''video''|''kitap''|''dershane'' — doğrulama uygulama katmanında.';

alter table public.ogrenci_konu_hakimiyeti enable row level security;

-- Öğrenci kendi kaydını (+ bağlı veli, has_student_access ile aynı
-- desen konu_calismalar_select'te de kullanılıyor) okuyabilir; sadece
-- öğrencinin kendisi yazabilir. Öğretmen/admin bu tabloyu DOĞRUDAN
-- select edemiyor — kullanıcı kararı gereği tek erişim yolu aşağıdaki
-- (agrege/isimsiz) RPC.
drop policy if exists "ogrenci_konu_hakimiyeti_select" on public.ogrenci_konu_hakimiyeti;
create policy "ogrenci_konu_hakimiyeti_select" on public.ogrenci_konu_hakimiyeti
  for select using (public.has_student_access(student_id));

drop policy if exists "ogrenci_konu_hakimiyeti_write" on public.ogrenci_konu_hakimiyeti;
create policy "ogrenci_konu_hakimiyeti_write" on public.ogrenci_konu_hakimiyeti
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- 2) konu_zayiflik_raporu (migration 0054) genişletiliyor: log tabanlı
--    (konu_calismalar.hedefe_yakinlik) dağılımın YANINA, öğrencinin
--    kendi BEYAN ettiği hakimiyet dağılımı da ekleniyor. İki kaynak da
--    aynı (ders,konu) çiftini kapsamayabilir (biri diğerinde hiç kaydı
--    olmayan bir konu için veri içerebilir) — UNION ile birleştirilip
--    LEFT JOIN'lerle her iki sinyal de aynı satırda toplanıyor.
--    İmza/parametreler değişmedi, geriye dönük uyumlu.
create or replace function public.konu_zayiflik_raporu(p_class_id uuid default null, p_school_id uuid default null)
returns table (
  ders text,
  konu text,
  ogrenci_sayisi bigint,
  uzak_sayisi bigint,
  belirsiz_sayisi bigint,
  yakin_sayisi bigint,
  uzak_orani numeric,
  en_sik_uzak_takip_cevabi text,
  beyan_uzak_sayisi bigint,
  beyan_belirsiz_sayisi bigint,
  beyan_yakin_sayisi bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if (p_class_id is null) = (p_school_id is null) then
    raise exception 'Tam olarak bir kapsam (sınıf veya okul) belirtilmeli.';
  end if;

  if p_class_id is not null then
    if not (
      public.is_admin()
      or exists (select 1 from public.teachers t where t.id = auth.uid() and t.class_id = p_class_id)
    ) then
      raise exception 'Bu sınıfın raporunu görme yetkiniz yok.';
    end if;
  else
    if not (public.is_admin() or public.is_school_moderator(p_school_id)) then
      raise exception 'Bu okulun raporunu görme yetkiniz yok.';
    end if;
  end if;

  return query
  with kapsamdaki_ogrenciler as (
    select s.id from public.students s
    where (p_class_id is not null and s.class_id = p_class_id)
       or (p_school_id is not null and s.school_id = p_school_id)
  ),
  log_satirlar as (
    select k.student_id, k.ders, k.konu, k.hedefe_yakinlik, k.takip_cevabi
    from public.konu_calismalar k
    where k.student_id in (select id from kapsamdaki_ogrenciler)
  ),
  beyan_satirlar as (
    select h.student_id, h.ders, h.konu, h.hakimiyet_seviyesi
    from public.ogrenci_konu_hakimiyeti h
    where h.student_id in (select id from kapsamdaki_ogrenciler)
  ),
  tum_konular as (
    select ders, konu from log_satirlar
    union
    select ders, konu from beyan_satirlar
  ),
  kapsayan_ogrenci_sayisi as (
    select ders, konu, count(distinct student_id) as ogrenci_sayisi
    from (
      select student_id, ders, konu from log_satirlar
      union
      select student_id, ders, konu from beyan_satirlar
    ) birlesik
    group by ders, konu
  ),
  log_gruplu as (
    select
      ders, konu,
      count(*) filter (where hedefe_yakinlik = 'uzak') as uzak_sayisi,
      count(*) filter (where hedefe_yakinlik = 'belirsiz') as belirsiz_sayisi,
      count(*) filter (where hedefe_yakinlik = 'yakin') as yakin_sayisi
    from log_satirlar
    group by ders, konu
  ),
  beyan_gruplu as (
    select
      ders, konu,
      count(*) filter (where hakimiyet_seviyesi = 'uzak') as beyan_uzak_sayisi,
      count(*) filter (where hakimiyet_seviyesi = 'belirsiz') as beyan_belirsiz_sayisi,
      count(*) filter (where hakimiyet_seviyesi = 'yakin') as beyan_yakin_sayisi
    from beyan_satirlar
    group by ders, konu
  ),
  uzak_cevap_sayilari as (
    select ders, konu, takip_cevabi, count(*) as adet
    from log_satirlar
    where hedefe_yakinlik = 'uzak' and takip_cevabi is not null
    group by ders, konu, takip_cevabi
  ),
  uzak_cevap_siralanmis as (
    select ders, konu, takip_cevabi,
           row_number() over (partition by ders, konu order by adet desc) as sira
    from uzak_cevap_sayilari
  )
  select
    tk.ders, tk.konu,
    kos.ogrenci_sayisi,
    coalesce(lg.uzak_sayisi, 0) as uzak_sayisi,
    coalesce(lg.belirsiz_sayisi, 0) as belirsiz_sayisi,
    coalesce(lg.yakin_sayisi, 0) as yakin_sayisi,
    round(
      coalesce(lg.uzak_sayisi, 0)::numeric
      / nullif(coalesce(lg.uzak_sayisi, 0) + coalesce(lg.belirsiz_sayisi, 0) + coalesce(lg.yakin_sayisi, 0), 0),
      2
    ) as uzak_orani,
    u.takip_cevabi as en_sik_uzak_takip_cevabi,
    coalesce(bg.beyan_uzak_sayisi, 0) as beyan_uzak_sayisi,
    coalesce(bg.beyan_belirsiz_sayisi, 0) as beyan_belirsiz_sayisi,
    coalesce(bg.beyan_yakin_sayisi, 0) as beyan_yakin_sayisi
  from tum_konular tk
  join kapsayan_ogrenci_sayisi kos on kos.ders = tk.ders and kos.konu = tk.konu
  left join log_gruplu lg on lg.ders = tk.ders and lg.konu = tk.konu
  left join beyan_gruplu bg on bg.ders = tk.ders and bg.konu = tk.konu
  left join uzak_cevap_siralanmis u on u.ders = tk.ders and u.konu = tk.konu and u.sira = 1
  where kos.ogrenci_sayisi >= 3
  order by uzak_orani desc nulls last, kos.ogrenci_sayisi desc
  limit 30;
end;
$$;

revoke all on function public.konu_zayiflik_raporu(uuid, uuid) from public;
grant execute on function public.konu_zayiflik_raporu(uuid, uuid) to authenticated;
