-- 10. sınıf Matematik "Trigonometri (Dik Üçgen, Alan, Sinüs-Kosinüs Teoremi)"
-- konusuna eksik alt başlık (müfredat başvurusu a96586b1, 01.11.2026,
-- Elbistan Bist Fen Lisesi matematik öğretmeni: "ana konular eksik").
--
-- Doğrulama (tymm.meb.gov.tr, 10. sınıf 1. tema Geometrik Şekiller):
-- MAT.10.1.2 "Üçgenin yardımcı elemanlarının özellikleri ile ilgili çıkarım
-- yapabilme" iç ve dış açıortayları, kenarortayları, kenar orta dikmeleri ve
-- YÜKSEKLİKLERİ kapsar; yüksekliklerin kesim noktasının (diklik merkezi) dar,
-- geniş ve dik açılı üçgendeki konumu incelenir. Mevcut alt başlık
-- "Üçgende Kenar-Açı Bağıntıları (Kenarortay, Açıortay, Kenar Orta Dikme)"
-- yüksekliği içermiyor. Sinüs ve kosinüs teoremleri zaten var.
--
-- Ortak (bütün kurumların) Maarif listesine eklenir: hata kuruma özel değil,
-- programın kendisinde. ALT BAŞLIK ADLARI DEĞİŞTİRİLMEZ (kayıtların anahtarı,
-- bkz. 0178); yalnız yeni satır eklenir ve sıra kaydırılır. Silme yok,
-- tekrar çalıştırılabilir.
do $$
declare
  v_trig text := 'Trigonometri (Dik Üçgen, Alan, Sinüs-Kosinüs Teoremi)';
  v_yeni text := 'Üçgende Yükseklik ve Diklik Merkezi';
begin
  if not exists (select 1 from public.mufredat_alt_konular where ders = 'Matematik' and ust_konu = v_trig and alt_baslik = v_yeni) then
    -- Yardımcı elemanlar (sıra 2) ile alan (sıra 3) arasına: sonrakiler bir kayar.
    update public.mufredat_alt_konular set sira = sira + 1
     where ders = 'Matematik' and ust_konu = v_trig and sira >= 3;
    insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
    values ('Matematik', v_trig, v_yeni, 3);
  end if;
end $$;
