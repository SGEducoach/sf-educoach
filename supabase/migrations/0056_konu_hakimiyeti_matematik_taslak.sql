-- Faz H5 — Matematik 9-10-11. sınıf alt konu TASLAĞI.
-- Bkz. plan: Konu Hakimiyeti fazı, Faz H5.
--
-- ÖNEMLİ: Bu içerik MEB 2024 Maarif Modeli çerçevesine dair genel bilgiyle
-- hazırlanan bir TASLAK — kaynak dokümanla birebir doğrulanmadı. Mevcut
-- 190 konunun kaynağı kullanıcının kendi sağladığı çerçeve programlarıydı;
-- bu alt başlıklar İSE Claude'un genel bilgisiyle üretildi. Çalıştırmadan
-- önce (veya çalıştırdıktan sonra /yonetici → Konu anlatımları →
-- Müfredat hiyerarşisi ekranından) gözden geçirip yanlış/eksik olanları
-- düzeltin/silin — gerçek öğrencilere yanlış müfredat bilgisi gitmesin.
--
-- Zaten var olan aynı (ders, ust_konu, alt_baslik) satırları tekrar
-- eklememek için "on conflict do nothing" yerine, bu tablonun benzersiz
-- kısıtı olmadığından basit bir "insert ... where not exists" deseni
-- kullanılıyor — script birden çok kez çalıştırılırsa yinelenmez.

do $$
declare
  v_satirlar jsonb := '[
    {"ust": "Üslü-Köklü Sayılar, Sayı Kümeleri, Özdeşlikler", "altlar": ["Üslü sayılar ve işlemler", "Köklü sayılar ve işlemler", "Sayı kümeleri (doğal, tam, rasyonel, irrasyonel, reel)", "Özdeşlikler ve çarpanlara ayırma"]},
    {"ust": "Doğrusal Fonksiyonlar ve Mutlak Değer Fonksiyonu", "altlar": ["Fonksiyon kavramı ve gösterimi", "Doğrusal fonksiyonlar ve grafikleri", "Mutlak değer kavramı", "Mutlak değerli fonksiyonlar ve grafikleri"]},
    {"ust": "Algoritma, Mantık Bağlaçları ve Niceleyiciler", "altlar": ["Algoritma ve akış şeması", "Önermeler ve mantık bağlaçları", "Niceleyiciler (her, bazı)", "İspat yöntemleri"]},
    {"ust": "Üçgende Açı-Kenar Özellikleri", "altlar": ["Üçgende açı özellikleri", "Üçgende kenar-açı bağıntıları (kenarortay, açıortay, kenar orta dikme)", "Üçgende alan bağıntıları", "Eşkenar, ikizkenar, dik üçgen özellikleri"]},
    {"ust": "Geometrik Dönüşümler, Üçgende Eşlik ve Benzerlik", "altlar": ["Öteleme, dönme, yansıma", "Üçgende eşlik (KKK, KAK, AKA)", "Üçgende benzerlik", "Benzerlik oranı ve uygulamaları"]},
    {"ust": "İstatistiksel Problem Kurma ve Analiz (Tek Değişken)", "altlar": ["Veri toplama ve sunma", "Merkezi eğilim ölçüleri (ortalama, medyan, mod)", "Merkezi yayılım ölçüleri (açıklık, standart sapma)", "Histogram ve kutu grafiği"]},
    {"ust": "Olasılık (Deneysel ve Teorik)", "altlar": ["Örnek uzay ve olay kavramı", "Deneysel olasılık", "Teorik olasılık", "Basit olayların olasılığı"]},
    {"ust": "Bölünebilme, OBEB-OKEK, Asal Çarpanlar", "altlar": ["Bölünebilme kuralları", "Asal sayılar ve asal çarpanlara ayırma", "OBEB ve OKEK", "Modüler aritmetik (temel düzey)"]},
    {"ust": "Karesel, Karekök ve Rasyonel Fonksiyonlar", "altlar": ["Karesel (ikinci dereceden) fonksiyonlar ve grafikleri", "Parabolün özellikleri (tepe noktası, simetri ekseni)", "Karekök fonksiyonu", "Rasyonel fonksiyonlar"]},
    {"ust": "Sayma Stratejileri ve Algoritmik Cebir", "altlar": ["Toplama ve çarpma kuralı", "Permütasyon", "Kombinasyon", "Binom açılımı (temel düzey)"]},
    {"ust": "Trigonometri (Dik Üçgen, Alan, Sinüs-Kosinüs Teoremi)", "altlar": ["Dik üçgende trigonometrik oranlar", "Trigonometrik oranlar arası bağıntılar", "Üçgende alan bağıntısı (trigonometrik)", "Sinüs teoremi ve kosinüs teoremi"]},
    {"ust": "Analitik Geometri (Nokta ve Doğru)", "altlar": ["İki nokta arası uzaklık", "Doğrunun eğimi", "Doğru denklemi", "Doğrular arası ilişkiler (paralellik, diklik)"]},
    {"ust": "İstatistik (İki Kategorik Değişken)", "altlar": ["İki kategorik değişken kavramı", "Sıklık ve çapraz tablolar", "Bağımsızlık yorumlanması", "Verilerin grafiksel gösterimi"]},
    {"ust": "Koşullu Olasılık ve Bayes Teoremi", "altlar": ["Koşullu olasılık kavramı", "Bağımlı ve bağımsız olaylar", "Çarpma kuralı", "Bayes teoremi (temel düzey)"]},
    {"ust": "Trigonometrik Fonksiyonlar", "altlar": ["Yönlü açı ve birim çember", "Trigonometrik fonksiyonların grafikleri", "Trigonometrik denklemler", "Toplam-fark formülleri"]},
    {"ust": "Üstel ve Logaritmik Fonksiyonlar", "altlar": ["Üstel fonksiyon ve grafiği", "Logaritma kavramı ve özellikleri", "Logaritmik fonksiyon ve grafiği", "Üstel-logaritmik denklemler"]},
    {"ust": "Fonksiyonlarda İşlemler ve Bileşke", "altlar": ["Fonksiyonlarda dört işlem", "Bileşke fonksiyon", "Ters fonksiyon", "Fonksiyonların grafik yorumlanması"]},
    {"ust": "Dörtgenler ve Çokgenler", "altlar": ["Dörtgen çeşitleri ve özellikleri", "Paralelkenar, yamuk, deltoid özellikleri", "Çokgenlerde açı ve köşegen sayıları", "Çokgenlerde alan hesaplama"]},
    {"ust": "İstatistik (İki Nicel Değişken)", "altlar": ["Serpme (saçılım) diyagramı", "Korelasyon kavramı", "Doğrusal regresyon (temel düzey)", "Yorumlama ve tahmin"]}
  ]'::jsonb;
  v_grup jsonb;
  v_alt text;
  v_sira int;
begin
  for v_grup in select * from jsonb_array_elements(v_satirlar) loop
    v_sira := 0;
    for v_alt in select * from jsonb_array_elements_text(v_grup->'altlar') loop
      if not exists (
        select 1 from public.mufredat_alt_konular
        where ders = 'Matematik' and ust_konu = (v_grup->>'ust') and alt_baslik = v_alt
      ) then
        insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
        values ('Matematik', v_grup->>'ust', v_alt, v_sira);
      end if;
      v_sira := v_sira + 1;
    end loop;
  end loop;
end $$;
