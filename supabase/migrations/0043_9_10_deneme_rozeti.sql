-- 9 ve 10. sınıf deneme rozeti eşikleri düşürüldü — Branş Denemesi TYT/AYT'ye
-- göre daha seyrek/kısa olduğu için mevcut eşikler (3/4/8) bu yaş grubuna göre
-- ulaşılamaz durumdaydı (bkz. 9_10_sinif_ekleme_senaryosu.pdf 3.4, "Rozet
-- değişikliği yapılmazsa ... genç öğrencilerin rozet kazanması gereksiz zor
-- olabilir"). Kullanıcı notu: "9 ve 10.sınıf deneme rozeti, aylık 3/3 altın,
-- 3/2 gümüş, 3/1 bronz" — sistemin geri kalanıyla tutarlı kalması için
-- "aylık" burada da (diğer kategoriler gibi) kayan 30 günlük pencere olarak
-- uygulandı: 1+ deneme Bronz, 2+ Gümüş, 3+ (aylık hedefin tamamı) Altın.
-- 11-12. sınıf eşikleri (3/4/8) DEĞİŞMEDİ; bildirim akışı (rozet_kontrol_et,
-- push metinleri) da hiç dokunulmadan aynı kaldı — sadece bu fonksiyonun
-- içindeki eşik hesaplaması sınıf seviyesine göre dallandı.
create or replace function public.ogrenci_deneme_seviyesi(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_seviye text;
  v_sayi int;
begin
  select c.seviye into v_seviye
  from public.students s
  left join public.classes c on c.id = s.class_id
  where s.id = p_student_id;

  select count(*) into v_sayi
  from public.denemeler
  where student_id = p_student_id and tarih between current_date - 30 and current_date;

  if v_seviye in ('9', '10') then
    return case
      when v_sayi >= 3 then 'altin'
      when v_sayi >= 2 then 'gumus'
      when v_sayi >= 1 then 'bronz'
      else 'yok'
    end;
  end if;

  return case
    when v_sayi >= 8 then 'altin'
    when v_sayi >= 4 then 'gumus'
    when v_sayi >= 3 then 'bronz'
    else 'yok'
  end;
end;
$$;

revoke all on function public.ogrenci_deneme_seviyesi(uuid) from public;
grant execute on function public.ogrenci_deneme_seviyesi(uuid) to authenticated;
