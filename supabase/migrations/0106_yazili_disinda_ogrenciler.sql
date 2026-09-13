-- Kullanıcı kararı (13.09.2026): test hesapları (okul no 9999 ve 9997,
-- Elbistan Bist Fen Lisesi) öğrenci olarak kalsın, yazılı analizine
-- eklenmesin. Liste satırı silinmez — öğrencinin sınıfı/okul numarası
-- değişince tetikleyici satırı yeniden oluştururdu; işaret ise tetikleyicinin
-- dokunmadığı ayrı bir sütun, kalıcı.
alter table public.okul_ogrenci_listesi
  add column if not exists yazili_disinda boolean not null default false;

update public.okul_ogrenci_listesi
set yazili_disinda = true
where school_id = '9e0f8acd-74dd-4bde-ab72-e53d7b01dc4b' and okul_no in ('9999', '9997');

-- Kayıt fonksiyonu işaretli öğrenciyi kabul etmez; geri kalanı 0105 ile aynı.
create or replace function public.yazili_sinav_olustur(
  p_sinifid uuid, p_ders text, p_ad text, p_tarih date, p_ogretmenid uuid, p_ogrencier jsonb,
  p_temsiliogrenciids uuid[], p_temsiliogrenciskorlar jsonb, p_maxpuanlar integer[], p_kazanimlar text[], p_sorusonuclari jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sinav_id uuid;
  v_m integer;
begin
  if auth.uid() is null or auth.uid() <> p_ogretmenid then
    raise exception 'Oturum öğretmen kimliğiyle eşleşmiyor';
  end if;
  if array_length(p_maxpuanlar, 1) is distinct from array_length(p_kazanimlar, 1)
     or exists (select 1 from unnest(p_kazanimlar) as k where length(trim(k)) = 0) then
    raise exception 'Her soru için bir kazanım girilmelidir';
  end if;
  if not exists (
    select 1 from public.ogretmen_dersleri
    where teacher_id = p_ogretmenid and class_id = p_sinifid and ders = p_ders
  ) then
    raise exception 'Bu sınıf ve ders için yetkiniz yok';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_ogrencier) e
    where not exists (
      select 1 from public.okul_ogrenci_listesi l
      where l.id = (e->>'id')::uuid and l.class_id = p_sinifid and not l.yazili_disinda
    )
  ) or exists (
    select 1 from jsonb_array_elements(p_sorusonuclari) ss
    where not exists (select 1 from jsonb_array_elements(p_ogrencier) e where e->>'id' = ss->>'ogrenci_id')
  ) then
    raise exception 'Öğrenci listesi bu sınıfla eşleşmiyor';
  end if;

  insert into public.yazili_sinavlar (class_id, ogretmen_id, ad, tarih, ders)
  values (p_sinifid, p_ogretmenid, p_ad, p_tarih, p_ders)
  returning id into v_sinav_id;

  v_m := array_length(p_maxpuanlar, 1);
  insert into public.yazili_sorular (yazili_sinav_id, sira, max_puan, kazanim)
  select v_sinav_id, sira, p_maxpuanlar[sira], trim(p_kazanimlar[sira])
  from generate_series(1, v_m) as sira;

  insert into public.yazili_ogrenci_sonuclari (yazili_sinav_id, liste_ogrenci_id, ogrenci_id, toplam_puan, temsilci_mi)
  select v_sinav_id, l.id, l.student_id, (e->>'toplamPuan')::integer, l.id = any(p_temsiliogrenciids)
  from jsonb_array_elements(p_ogrencier) as e
  join public.okul_ogrenci_listesi l on l.id = (e->>'id')::uuid;

  insert into public.yazili_soru_sonuclari (yazili_sinav_id, liste_ogrenci_id, ogrenci_id, soru_id, puan, kaynak, estimation_version)
  select v_sinav_id, l.id, l.student_id, s.id, (ss->>'puan')::integer, ss->>'kaynak', ss->>'estimation_version'
  from jsonb_array_elements(p_sorusonuclari) as ss
  join public.okul_ogrenci_listesi l on l.id = (ss->>'ogrenci_id')::uuid
  join public.yazili_sorular s on s.yazili_sinav_id = v_sinav_id and s.sira = (ss->>'sira')::integer;

  return v_sinav_id;
end;
$$;
