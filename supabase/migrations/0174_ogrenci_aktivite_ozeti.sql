-- Faz 1 · Adım 3 (23.10.2026): ogrenci_aktivite_ozeti RPC'si. Rehber Takip
-- Bildirimleri (0171) şu an öğrenci başına ayrı sorgularla (konu_calismalar,
-- soru_cozumleri, denemeler, gorev_atamalari) JS'te topluyor; gorev_atamalari
-- TÜM geçmişi sınırsız çekiyordu (FAZ1_KESIF_RAPORU). Bu RPC aynı özeti
-- veritabanında tek sorguda hesaplar; biriken görev kullanıcı kararıyla
-- (23.10.2026, "Görev birikmesi son 30 gün — tek sabit") yalnız SON 30
-- GÜNÜN görevlerine (gorevler.tarih) bakar.
--
-- Son hareket (konu/soru/deneme) PENCERESİZ: sessizlik hesabı en son ne
-- zaman veri girildiğini bilmek ister, 30 günlük görev penceresiyle
-- karıştırılmaz (bkz. src/lib/rehber-takip.ts sessizlik mantığı).
--
-- 0171/0172 ile aynı düzen: okuma yalnız sunucuda servis anahtarıyla
-- yapılır (admin client, yetki JS'te doğrulandıktan sonra); anon ve
-- authenticated'den EXECUTE kaldırıldı, istemciye doğrudan erişim yok.
-- Geri alma: drop function if exists public.ogrenci_aktivite_ozeti(uuid[], date);
create or replace function public.ogrenci_aktivite_ozeti(p_student_ids uuid[], p_bugun date default current_date)
returns table (
  student_id uuid,
  son_hareket date,
  acik_gorev integer,
  gorev_toplam integer
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
    select h.student_id, max(h.tarih) as son_hareket
    from (
      select student_id, tarih from public.konu_calismalar where student_id = any (p_student_ids)
      union all
      select student_id, tarih from public.soru_cozumleri where student_id = any (p_student_ids)
      union all
      select student_id, tarih from public.denemeler where student_id = any (p_student_ids)
    ) h
    group by h.student_id
  ),
  gorev as (
    select ga.student_id,
      count(*) filter (where ga.durum = 'bekliyor')::integer as acik_gorev,
      count(*)::integer as gorev_toplam
    from public.gorev_atamalari ga
    join public.gorevler g on g.id = ga.gorev_id
    where ga.student_id = any (p_student_ids)
      and g.tarih >= p_bugun - 30
    group by ga.student_id
  )
  select
    i.student_id,
    h.son_hareket,
    coalesce(gv.acik_gorev, 0) as acik_gorev,
    coalesce(gv.gorev_toplam, 0) as gorev_toplam
  from ids i
  left join hareket h on h.student_id = i.student_id
  left join gorev gv on gv.student_id = i.student_id;
$$;

-- PUBLIC'ten de kaldırılmalı: yeni fonksiyonlarda EXECUTE varsayılan olarak
-- PUBLIC'e verilir (canlıda has_student_access ACL'inde "=X/postgres");
-- yalnız anon/authenticated'den almak, onları PUBLIC üyesi olarak çağırmaktan
-- alıkoymaz. security definer + kurum kontrolü yok: yalnız servis anahtarı.
revoke all on function public.ogrenci_aktivite_ozeti(uuid[], date) from public, anon, authenticated;
grant execute on function public.ogrenci_aktivite_ozeti(uuid[], date) to service_role;

comment on function public.ogrenci_aktivite_ozeti(uuid[], date) is
  'Öğrenci aktivite özeti (0174): son hareket tarihi (pencere sınırsız) + son 30 günün görev açık/toplam sayısı. Yalnız servis anahtarıyla çağrılır.';
