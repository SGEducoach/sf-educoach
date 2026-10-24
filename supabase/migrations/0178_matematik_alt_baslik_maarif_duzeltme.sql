-- Matematik ortak alt başlıklarının MEB Maarif programına göre düzeltilmesi
-- (kullanıcı onayı 24.10.2026). Kaynak: tymm.meb.gov.tr Ortaöğretim Matematik
-- Dersi Öğretim Programı; ayrıntı ve karşılaştırma: docs/MATEMATIK_MAARIF_MUFREDAT_KARSILASTIRMA.md.
-- Tetikleyen: 10-D sınıf öğretmeni "açıortay-kenarortay 10. sınıf konusu" dedi;
-- MAT.10.1.2 "Üçgenin yardımcı elemanları" 10. sınıftır, veride 9. sınıf altındaydı.
--
-- ALT BAŞLIK ADLARI DEĞİŞTİRİLMEZ: ad, konu çalışması / konu hakimiyeti / ödev
-- kayıtlarının anahtarı (taşınacak satırlarda 20, 19 ve 1 hakimiyet kaydı, 5 + 4 + 1
-- ödev var). Yalnız ust_konu (ve sira) taşınır; yeni satırlar eklenir. Silme yok,
-- tekrar çalıştırılabilir.
do $$
declare
  v_trig text := 'Trigonometri (Dik Üçgen, Alan, Sinüs-Kosinüs Teoremi)';
  v_karesel text := 'Karesel, Karekök ve Rasyonel Fonksiyonlar';
begin
  -- 1) 10.1.2 Üçgenin yardımcı elemanları: 9'dan 10. sınıf konusuna.
  update public.mufredat_alt_konular
     set ust_konu = v_trig, sira = 2
   where ders = 'Matematik'
     and ust_konu = 'Üçgende Açı-Kenar Özellikleri'
     and alt_baslik = 'Üçgende Kenar-Açı Bağıntıları (Kenarortay, Açıortay, Kenar Orta Dikme)';

  -- 2) 10.1.3 Üçgenin alanındaki değişim: "Üçgende Alan Bağıntıları" 10. sınıfa.
  update public.mufredat_alt_konular
     set ust_konu = v_trig, sira = 3
   where ders = 'Matematik'
     and ust_konu = 'Üçgende Açı-Kenar Özellikleri'
     and alt_baslik = 'Üçgende Alan Bağıntıları';

  -- Trigonometri konusundaki mevcut satırların sırası: oranlar, (yardımcı elemanlar, alan), alan(trig), teoremler.
  update public.mufredat_alt_konular set sira = 4
   where ders = 'Matematik' and ust_konu = v_trig and alt_baslik = 'Üçgende Alan Bağıntısı (Trigonometrik)';
  update public.mufredat_alt_konular set sira = 5
   where ders = 'Matematik' and ust_konu = v_trig and alt_baslik = 'Sinüs Teoremi ve Kosinüs Teoremi';

  -- 3) 10.4.5 Ters fonksiyon: 11'den 10. sınıfa.
  update public.mufredat_alt_konular
     set ust_konu = v_karesel, sira = 4
   where ders = 'Matematik'
     and ust_konu = 'Fonksiyonlarda İşlemler ve Bileşke'
     and alt_baslik = 'Ters Fonksiyon';

  -- 4) Yeni satırlar (yoksa eklenir).
  -- 9.3.1: 9. sınıf üçgen konusunun gerçek içeriği (açı ve kenar bağıntıları).
  insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
  select 'Matematik', 'Üçgende Açı-Kenar Özellikleri', 'Üçgende Açı ve Kenar Bağıntıları (İç-Dış Açı, Kenar Uzunluk İlişkisi)', 1
  where not exists (select 1 from public.mufredat_alt_konular where ders = 'Matematik'
    and ust_konu = 'Üçgende Açı-Kenar Özellikleri' and alt_baslik = 'Üçgende Açı ve Kenar Bağıntıları (İç-Dış Açı, Kenar Uzunluk İlişkisi)');

  -- 9.4.4: Tales, Öklid ve Pisagor teoremleri.
  insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
  select 'Matematik', 'Geometrik Dönüşümler, Üçgende Eşlik ve Benzerlik', 'Tales, Öklid ve Pisagor Teoremleri', 4
  where not exists (select 1 from public.mufredat_alt_konular where ders = 'Matematik'
    and ust_konu = 'Geometrik Dönüşümler, Üçgende Eşlik ve Benzerlik' and alt_baslik = 'Tales, Öklid ve Pisagor Teoremleri');

  -- 10.4.1: fonksiyon olma şartları.
  insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
  select 'Matematik', v_karesel, 'Fonksiyon Olma Şartları', 5
  where not exists (select 1 from public.mufredat_alt_konular where ders = 'Matematik'
    and ust_konu = v_karesel and alt_baslik = 'Fonksiyon Olma Şartları');
end $$;
