-- Faz H düzeltmesi — konu_zayiflik_raporu RPC'si öğretmen/müdür/admin
-- ekranlarında "column reference "ders" is ambiguous" hatası veriyordu.
--
-- Neden: fonksiyon "returns table (ders text, konu text, ...)" ile
-- tanımlı — PL/pgSQL bu dönüş sütunu isimlerini fonksiyon gövdesinde
-- ÖRTÜK DEĞİŞKEN olarak da tanır. Gövdedeki "select ders, konu from
-- log_satirlar" gibi tablo önekisiz (niteliksiz) referanslar bu yüzden
-- "PL/pgSQL değişkeni mi, tablo sütunu mu?" belirsizliğine düşüyor —
-- varsayılan `plpgsql.variable_conflict = error` ayarıyla bu doğrudan
-- hataya dönüşüyor. (0055'te bu CTE deseni yeni eklendiğinden ve önceki
-- doğrulama muhtemelen yetki kontrolüne takılıp bu kod yoluna hiç
-- girmediğinden şimdiye kadar fark edilmemiş.)
--
-- Düzeltme: fonksiyon gövdesinin en başına `#variable_conflict
-- use_column` pragma'sı eklendi — bu, adı bir sütunla çakışan her
-- niteliksiz referansı (fonksiyonun geri kalanında hiçbiri kasıtlı
-- olarak PL/pgSQL değişkenine işaret etmiyor) otomatik olarak sütun
-- lehine çözer. İmza ve mantık aynı, sadece bu tek satır eklendi.
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
#variable_conflict use_column
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
