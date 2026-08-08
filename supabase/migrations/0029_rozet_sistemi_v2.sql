-- Rozet sistemi v2 — kökten yeniden tasarım (kullanıcı notu:
-- dokumanlar/NOT_DEFTERİ.txt, "ROZET SİSTEMİ" bölümü).
--
-- v1'in açığı: aktif gün sayımı `tarih` alanına göre yapılıyordu ve bu alan
-- sınırsız geriye dönük girilebiliyordu — bir öğrenci tek oturumda 29 farklı
-- geçmiş güne veri girip bir sonraki gerçek girişiyle anında altın rozeti
-- alabiliyordu.
--
-- v2 tasarımı:
--   * 3 bağımsız kategori (konu/soru/deneme), her biri kendi eşiklerine
--     sahip; üstte bunlardan türetilen tek bir "genel" (SG EDUCOACH) rozeti
--     — 3/3 kategori altın -> altın, 2/3 -> gümüş, 1/3 -> bronz.
--   * Rozetler KALICI DEĞİL, CANLI durum: Duolingo mantığıyla, öğrenci pas
--     geçtiğinde seviye düşebilir/sıfırlanabilir. Bu yüzden görüntüleme
--     HER ZAMAN canlı hesaplanıyor (ogrenci_rozet_durumu); saklanan tablo
--     sadece "bir önceki bilinen seviye neydi" bilgisini tutup yükseliş
--     anını (bildirim için) yakalamaya yarıyor.
--   * Geriye dönük veri girişi artık SINIRLI: konu/soru en fazla 3 gün,
--     deneme en fazla 7 gün geriye. Bu, hem tarih seçicide (client) hem
--     server action'da hem burada DB constraint'inde uygulanıyor — böylece
--     `tarih` alanına artık güvenilebiliyor, ayrı bir created_at mantığı
--     kurmaya gerek kalmadı.

-- ============ Eski şemayı temizle ============
-- student_badges boş (hiç gerçek kullanıcı rozet kazanmadı) — güvenle
-- kaldırılıyor. Eski RPC'ler (ogrenci_aktif_gun_sayisi_pencere) DROP
-- edilmiyor, sadece artık çağrılmıyor (zararsız, kullanılmayan kod).
drop table if exists public.student_badges;

-- ============ Geriye dönük tarih sınırı (DB seviyesi) ============
alter table public.konu_calismalar
  add constraint konu_calismalar_gecmis_sinir check (tarih >= current_date - 3) not valid;
alter table public.soru_cozumleri
  add constraint soru_cozumleri_gecmis_sinir check (tarih >= current_date - 3) not valid;
alter table public.denemeler
  add constraint denemeler_gecmis_sinir check (tarih >= current_date - 7) not valid;

-- ============ Yeni durum tablosu ============
-- Sadece rozet_kontrol_et() tarafından yazılır (security definer) — client
-- doğrudan yazamaz/okuyamaz, tamamen dahili bir "son bilinen seviye" önbelleği.
create table public.student_rozet_durumu (
  student_id uuid not null references public.students(id) on delete cascade,
  kategori text not null check (kategori in ('konu', 'soru', 'deneme', 'genel')),
  seviye text not null check (seviye in ('yok', 'bronz', 'gumus', 'altin')),
  guncellenme_at timestamptz not null default now(),
  primary key (student_id, kategori)
);

alter table public.student_rozet_durumu enable row level security;
-- Kasıtlı olarak hiç policy yok — okuma/yazma sadece security definer
-- RPC'ler üzerinden.

-- ============ Yardımcı: seviye sıralaması ============
create or replace function public.rozet_seviye_sirasi(p_seviye text)
returns int
language sql
immutable
as $$
  select case p_seviye when 'altin' then 3 when 'gumus' then 2 when 'bronz' then 1 else 0 end;
$$;

-- ============ Konu Çalışma seviyesi ============
-- "Duolingo" mantığı: son 30 günde, aralarında 3 günden uzun boşluk
-- olmayan en güncel "aktif gün" serisinin uzunluğuna bakılıyor. 3 günden
-- uzun süredir hiç giriş yoksa (backdating penceresi de kapandığı için artık
-- telafi edilemez) seviye anında 'yok'a düşüyor.
create or replace function public.ogrenci_konu_seviyesi(p_student_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  with gunler as (
    select distinct tarih from public.konu_calismalar
    where student_id = p_student_id and tarih between current_date - 30 and current_date
  ),
  sirali as (
    select tarih, lag(tarih) over (order by tarih) as onceki from gunler
  ),
  gruplu as (
    select tarih,
      sum(case when onceki is null or tarih - onceki > 3 then 1 else 0 end) over (order by tarih) as grup
    from sirali
  ),
  son_grup as (
    select count(*) as gun_sayisi, max(tarih) as son_tarih
    from gruplu
    where grup = (select max(grup) from gruplu)
  )
  select case
    when not exists (select 1 from son_grup) then 'yok'
    when current_date - (select son_tarih from son_grup) > 3 then 'yok'
    when (select gun_sayisi from son_grup) >= 30 then 'altin'
    when (select gun_sayisi from son_grup) >= 20 then 'gumus'
    when (select gun_sayisi from son_grup) >= 15 then 'bronz'
    else 'yok'
  end;
$$;

revoke all on function public.ogrenci_konu_seviyesi(uuid) from public;
grant execute on function public.ogrenci_konu_seviyesi(uuid) to authenticated;

-- ============ Soru Çözümü seviyesi ============
-- TYT'nin 5 çekirdek dersinde (Türkçe/Matematik/Fizik/Kimya/Biyoloji) AYRI
-- AYRI son 3 günün toplamına bakılıyor; en düşük ders eşiği geçmeden tier
-- atlanmıyor (girilmemiş ders 0 kabul edilir).
create or replace function public.ogrenci_soru_seviyesi(p_student_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  with tum_dersler as (
    select unnest(array['Türkçe', 'Matematik', 'Fizik', 'Kimya', 'Biyoloji']) as ders
  ),
  toplamlar as (
    select ders, sum(dogru + yanlis) as toplam
    from public.soru_cozumleri
    where student_id = p_student_id and tarih between current_date - 3 and current_date
    group by ders
  ),
  birlesik as (
    select td.ders, coalesce(t.toplam, 0) as toplam
    from tum_dersler td left join toplamlar t on t.ders = td.ders
  )
  select case
    when (select min(toplam) from birlesik) >= 50 then 'altin'
    when (select min(toplam) from birlesik) >= 30 then 'gumus'
    when (select min(toplam) from birlesik) >= 20 then 'bronz'
    else 'yok'
  end;
$$;

revoke all on function public.ogrenci_soru_seviyesi(uuid) from public;
grant execute on function public.ogrenci_soru_seviyesi(uuid) to authenticated;

-- ============ Deneme seviyesi ============
-- Kayan 30 günde toplam deneme girişi sayısı.
create or replace function public.ogrenci_deneme_seviyesi(p_student_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select case
    when count(*) >= 8 then 'altin'
    when count(*) >= 4 then 'gumus'
    when count(*) >= 3 then 'bronz'
    else 'yok'
  end
  from public.denemeler
  where student_id = p_student_id and tarih between current_date - 30 and current_date;
$$;

revoke all on function public.ogrenci_deneme_seviyesi(uuid) from public;
grant execute on function public.ogrenci_deneme_seviyesi(uuid) to authenticated;

-- ============ Canlı özet (görüntüleme için) ============
-- Dashboard/veli/öğretmen görünümü HER ZAMAN bunu çağırır — saklanan
-- student_rozet_durumu tablosunu DEĞİL, çünkü o sadece son giriş anındaki
-- durumu tutar ve öğrenci pas geçtiğinde otomatik güncellenmez.
create or replace function public.ogrenci_rozet_durumu(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_konu text; v_soru text; v_deneme text; v_altin_sayisi int; v_genel text;
begin
  if not (public.has_student_access(p_student_id) or public.is_ogretmen()) then
    raise exception 'Yetkisiz.';
  end if;

  v_konu := public.ogrenci_konu_seviyesi(p_student_id);
  v_soru := public.ogrenci_soru_seviyesi(p_student_id);
  v_deneme := public.ogrenci_deneme_seviyesi(p_student_id);

  v_altin_sayisi := (case when v_konu = 'altin' then 1 else 0 end)
                  + (case when v_soru = 'altin' then 1 else 0 end)
                  + (case when v_deneme = 'altin' then 1 else 0 end);
  v_genel := case v_altin_sayisi when 3 then 'altin' when 2 then 'gumus' when 1 then 'bronz' else 'yok' end;

  return jsonb_build_object('konu', v_konu, 'soru', v_soru, 'deneme', v_deneme, 'genel', v_genel);
end;
$$;

revoke all on function public.ogrenci_rozet_durumu(uuid) from public;
grant execute on function public.ogrenci_rozet_durumu(uuid) to authenticated;

-- ============ Kontrol + bildirim tetikleyici ============
-- Her veri girişinden sonra çağrılır (aynı imza, CREATE OR REPLACE —
-- migration 0023'teki "must be owner of function" tipi sorunları önlemek
-- için DROP FUNCTION kullanılmıyor). Önceki bilinen seviyeleri okuyup
-- yenileriyle karşılaştırıyor, student_rozet_durumu'nu güncelliyor, ve
-- SADECE YÜKSELENLERİ "kategori:seviye" formatında döndürüyor (düşüşler
-- sessiz — bildirim yok, sadece bir sonraki görüntülemede düşük gösterilir).
create or replace function public.rozet_kontrol_et(p_student_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_yeni_konu text; v_yeni_soru text; v_yeni_deneme text; v_yeni_genel text;
  v_eski_konu text; v_eski_soru text; v_eski_deneme text; v_eski_genel text;
  v_altin_sayisi int;
  v_yukselenler text[] := '{}';
begin
  if p_student_id <> auth.uid() then
    raise exception 'Yetkisiz.';
  end if;

  select coalesce(max(seviye) filter (where kategori = 'konu'), 'yok'),
         coalesce(max(seviye) filter (where kategori = 'soru'), 'yok'),
         coalesce(max(seviye) filter (where kategori = 'deneme'), 'yok'),
         coalesce(max(seviye) filter (where kategori = 'genel'), 'yok')
    into v_eski_konu, v_eski_soru, v_eski_deneme, v_eski_genel
  from public.student_rozet_durumu where student_id = p_student_id;

  v_yeni_konu := public.ogrenci_konu_seviyesi(p_student_id);
  v_yeni_soru := public.ogrenci_soru_seviyesi(p_student_id);
  v_yeni_deneme := public.ogrenci_deneme_seviyesi(p_student_id);

  v_altin_sayisi := (case when v_yeni_konu = 'altin' then 1 else 0 end)
                  + (case when v_yeni_soru = 'altin' then 1 else 0 end)
                  + (case when v_yeni_deneme = 'altin' then 1 else 0 end);
  v_yeni_genel := case v_altin_sayisi when 3 then 'altin' when 2 then 'gumus' when 1 then 'bronz' else 'yok' end;

  insert into public.student_rozet_durumu (student_id, kategori, seviye, guncellenme_at) values
    (p_student_id, 'konu', v_yeni_konu, now()),
    (p_student_id, 'soru', v_yeni_soru, now()),
    (p_student_id, 'deneme', v_yeni_deneme, now()),
    (p_student_id, 'genel', v_yeni_genel, now())
  on conflict (student_id, kategori) do update set seviye = excluded.seviye, guncellenme_at = excluded.guncellenme_at;

  if public.rozet_seviye_sirasi(v_yeni_konu) > public.rozet_seviye_sirasi(v_eski_konu) then
    v_yukselenler := array_append(v_yukselenler, 'konu:' || v_yeni_konu);
  end if;
  if public.rozet_seviye_sirasi(v_yeni_soru) > public.rozet_seviye_sirasi(v_eski_soru) then
    v_yukselenler := array_append(v_yukselenler, 'soru:' || v_yeni_soru);
  end if;
  if public.rozet_seviye_sirasi(v_yeni_deneme) > public.rozet_seviye_sirasi(v_eski_deneme) then
    v_yukselenler := array_append(v_yukselenler, 'deneme:' || v_yeni_deneme);
  end if;
  if public.rozet_seviye_sirasi(v_yeni_genel) > public.rozet_seviye_sirasi(v_eski_genel) then
    v_yukselenler := array_append(v_yukselenler, 'genel:' || v_yeni_genel);
  end if;

  return v_yukselenler;
end;
$$;
