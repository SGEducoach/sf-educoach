-- Faz H — "Türkçe (Maarif)" alt konu TASLAĞI (9-10-11. sınıf).
--
-- ÖNEMLİ — bu, önceki taslaklardan (Matematik/Fizik/vb., migration
-- 0056-0057) FARKLI bir güven seviyesinde: oralarda ÜST BAŞLIK zaten
-- kullanıcının sağladığı çerçeve programından geliyordu, ben sadece ALT
-- başlık ekliyordum. Türkçe'de ise Maarif Modeli ayrı konu başlığı hiç
-- vermiyor (tema/beceri bazlı, bkz. mufredat-konulari.ts'in kendi notu)
-- — bu yüzden hem ÜST başlıkları (bkz. src/lib/mufredat-konulari.json'a
-- eklenen "Türkçe (Maarif)" satırları) HEM alt başlıkları BEN icat ettim,
-- MEB'in dört temel dil becerisi (okuma/dinleme-izleme/konuşma/yazma) +
-- söz varlığı/dil bilgisi çerçevesine dayanarak. Kaynak dokümanla
-- doğrulanmadı — /yonetici → Konu anlatımları → Müfredat hiyerarşisi
-- ekranından MUTLAKA gözden geçirin, gerekirse düzeltin/silin.
--
-- Bu, "Türkçe" (düz TYT) dersinin YANINDA duran AYRI bir ders — TYT
-- Türkçe listesi hiç değişmedi, dokunulmadı. Öğrenci Konu Hakimiyeti
-- ekranında ikisini de (9-10-11. sınıfsa) ayrı ayrı görür.

do $$
declare
  v_satirlar jsonb := $json$[
    {"ust": "Okuma Kültürü ve Metin Türleri", "altlar": ["Okuma stratejileri ve okuduğunu anlama", "Öyküleyici metinler", "Bilgilendirici metinler", "Şiir türleri ve nazım biçimleri"]},
    {"ust": "Dinleme/İzleme Becerileri", "altlar": ["Dinleme/izleme stratejileri", "Sözlü metinleri anlama ve yorumlama", "Medya okuryazarlığı", "Dinlediğini/izlediğini değerlendirme"]},
    {"ust": "Konuşma Becerileri", "altlar": ["Hazırlıklı ve hazırlıksız konuşma", "Konuşma kuralları ve beden dili", "Anlatım biçimleri (betimleme, öyküleme, açıklama)", "Sunum teknikleri"]},
    {"ust": "Yazma Becerileri", "altlar": ["Yazma süreci (planlama, taslak, düzeltme)", "Öyküleyici ve betimleyici yazılar", "Bilgilendirici yazılar", "Yazım ve noktalama kurallarının uygulanması"]},
    {"ust": "Söz Varlığı ve Dil Bilgisi Uygulamaları", "altlar": ["Kelime ve kavram bilgisi", "Deyim, atasözü ve söz sanatları", "Cümlede ve sözcükte anlam uygulamaları", "Yazım ve noktalama kuralları"]},

    {"ust": "Metin Türleri: Bilgilendirici ve Öyküleyici", "altlar": ["Bilgilendirici metin çözümlemesi", "Öyküleyici metin çözümlemesi", "Metinler arası karşılaştırma", "Yazarın bakış açısını belirleme"]},
    {"ust": "Şiir İncelemesi", "altlar": ["Nazım birimi, ölçü, uyak", "Temalara göre şiir çözümlemesi", "Şiirde söz sanatları", "Şiir yazma denemeleri"]},
    {"ust": "Anlatım Biçimleri ve Düşünceyi Geliştirme Yolları", "altlar": ["Açıklayıcı ve tartışmacı anlatım", "Örnekleme, tanımlama, karşılaştırma", "Düşünceyi geliştirme yolları", "Metinde tutarlılık ve bütünlük"]},
    {"ust": "Yazılı ve Sözlü Anlatım Uygulamaları", "altlar": ["Deneme ve eleştiri yazma", "Sunum ve tartışma uygulamaları", "Rapor ve tutanak yazma", "Dilekçe ve resmî yazışmalar"]},
    {"ust": "Dil Bilgisi ve Anlatım Bozuklukları", "altlar": ["Cümle çözümlemesi", "Anlatım bozukluğu türleri", "Yazım ve noktalama uygulamaları", "Cümlede anlam ilişkileri"]},

    {"ust": "Eleştirel Okuma ve Metin Çözümleme", "altlar": ["Metni yorumlama ve eleştirme", "Yazarın amacını ve bakış açısını sorgulama", "Metinler arası ilişkilendirme", "Farklı disiplinlerden metin okuma"]},
    {"ust": "Tartışmacı ve Bilgilendirici Metinler", "altlar": ["Tez-antitez geliştirme", "Kanıt ve gerekçelendirme", "Makale ve fıkra türleri", "Sav ve karşı sav oluşturma"]},
    {"ust": "Sözlü Anlatım ve Tartışma Teknikleri", "altlar": ["Panel, forum, açık oturum", "Etkili konuşma ve ikna teknikleri", "Grup tartışmalarında rol alma", "Sözlü sunumda görsel destek kullanımı"]},
    {"ust": "Yazılı Anlatım: Deneme ve Eleştiri", "altlar": ["Deneme yazma teknikleri", "Eleştiri yazısı yazma", "Kompozisyon planlama ve düzenleme", "Özgün metin oluşturma"]},
    {"ust": "İleri Dil Bilgisi ve Anlatım Bozuklukları", "altlar": ["Karmaşık cümle çözümlemesi", "Anlatım bozukluklarını giderme", "Yazım ve noktalama ileri uygulamalar", "Metin türlerine göre dil kullanımı"]}
  ]$json$::jsonb;
  v_grup jsonb;
  v_alt text;
  v_sira int;
begin
  for v_grup in select * from jsonb_array_elements(v_satirlar) loop
    v_sira := 0;
    for v_alt in select * from jsonb_array_elements_text(v_grup->'altlar') loop
      if not exists (
        select 1 from public.mufredat_alt_konular
        where ders = 'Türkçe (Maarif)' and ust_konu = (v_grup->>'ust') and alt_baslik = v_alt
      ) then
        insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
        values ('Türkçe (Maarif)', v_grup->>'ust', v_alt, v_sira);
      end if;
      v_sira := v_sira + 1;
    end loop;
  end loop;
end $$;
