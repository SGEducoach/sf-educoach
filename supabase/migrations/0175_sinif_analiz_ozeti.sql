-- Faz 1 · Adım 5 (23.10.2026): sinif_analiz_ozeti RPC'si. Sınıf Analizi
-- (src/lib/sinif-analizi-verisi.ts) soru, konu ve görev satırlarını toplu in()
-- sorgularıyla çekip JS'te sayıyordu. PostgREST max_rows = 1000 olduğundan
-- "kurumun tamamı" seçildiğinde en büyük kurumda 1464 görev satırı sessizce
-- 1000'de kesiliyor ve görev/aktiflik sayıları yanlış çıkıyordu. Bu RPC aynı
-- sayıları veritabanında hesaplar; öğrenci başına tek satır döner.
--
-- Anlamlar eski JS koduyla BİREBİR aynı tutuldu:
--  * aktiflik / son_donem / onceki_donem: soru_cozumleri + konu_calismalar
--    satırları. Eski kod yalnız tarih >= bugün - 2*p_trend_gun satırlarını
--    çekiyordu; bu yüzden aktiflik penceresi (p_aktiflik_gun = 30) fiilen
--    28 günle sınırlıydı. Davranış değişmesin diye aynı kural korunur.
--  * gorev_*: gorev_atamalari, TÜM zamanlar (30 günlük pencere yalnız rehber
--    "biriken görev" uyarısı içindir, bkz. ogrenci_aktivite_ozeti, 0174).
--  * veri_var_mi: öğrencinin tarihten bağımsız en az bir soru çözümü ya da
--    konu çalışması var mı (deneme ayrıca JS'te hesaplanır).
--
-- 0174 ile aynı düzen: security definer, kurum kontrolü fonksiyonda YOK;
-- yalnız servis anahtarı çağırabilir (yetki JS'te doğrulandıktan sonra).
-- Geri alma: drop function if exists public.sinif_analiz_ozeti(uuid[], date, integer, integer);
create or replace function public.sinif_analiz_ozeti(
  p_student_ids uuid[],
  p_bugun date default current_date,
  p_aktiflik_gun integer default 30,
  p_trend_gun integer default 14
)
returns table (
  student_id uuid,
  aktiflik integer,
  son_donem integer,
  onceki_donem integer,
  gorev_toplam integer,
  gorev_tamamlanan integer,
  gorev_bekleyen integer,
  gorev_tamamlanmayan integer,
  veri_var_mi boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with ids as (
    select distinct t.student_id from unnest(p_student_ids) as t(student_id)
  ),
  hareket as (
    select h.student_id,
      count(*) filter (
        where h.tarih >= p_bugun - 2 * p_trend_gun and h.tarih >= p_bugun - p_aktiflik_gun
      )::integer as aktiflik,
      count(*) filter (where h.tarih >= p_bugun - p_trend_gun)::integer as son_donem,
      count(*) filter (
        where h.tarih >= p_bugun - 2 * p_trend_gun and h.tarih < p_bugun - p_trend_gun
      )::integer as onceki_donem,
      count(*)::integer as toplam_satir
    from (
      select student_id, tarih from public.soru_cozumleri where student_id = any (p_student_ids)
      union all
      select student_id, tarih from public.konu_calismalar where student_id = any (p_student_ids)
    ) h
    group by h.student_id
  ),
  gorev as (
    select ga.student_id,
      count(*)::integer as toplam,
      count(*) filter (where ga.durum = 'tamamlandi')::integer as tamamlanan,
      count(*) filter (where ga.durum = 'bekliyor')::integer as bekleyen,
      count(*) filter (where ga.durum not in ('tamamlandi', 'bekliyor'))::integer as tamamlanmayan
    from public.gorev_atamalari ga
    where ga.student_id = any (p_student_ids)
    group by ga.student_id
  )
  select
    i.student_id,
    coalesce(h.aktiflik, 0),
    coalesce(h.son_donem, 0),
    coalesce(h.onceki_donem, 0),
    coalesce(g.toplam, 0),
    coalesce(g.tamamlanan, 0),
    coalesce(g.bekleyen, 0),
    coalesce(g.tamamlanmayan, 0),
    coalesce(h.toplam_satir, 0) > 0
  from ids i
  left join hareket h on h.student_id = i.student_id
  left join gorev g on g.student_id = i.student_id;
$$;

-- PUBLIC'ten de kaldırılmalı (bkz. 0174): yeni fonksiyonlarda EXECUTE varsayılan
-- olarak PUBLIC'e verilir; yalnız anon/authenticated'den almak yetmez.
revoke all on function public.sinif_analiz_ozeti(uuid[], date, integer, integer) from public, anon, authenticated;
grant execute on function public.sinif_analiz_ozeti(uuid[], date, integer, integer) to service_role;

comment on function public.sinif_analiz_ozeti(uuid[], date, integer, integer) is
  'Sınıf analizi özeti (0175): öğrenci başına aktiflik/dönem sayıları (soru+konu), tüm zaman görev dağılımı, verisi var mı. Yalnız servis anahtarıyla çağrılır.';
