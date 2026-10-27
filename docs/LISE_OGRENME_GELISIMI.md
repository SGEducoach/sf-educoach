# Lise öğretmeni — Öğrenme Gelişimi

27 Ekim 2026 · İlk sürüm · Dal: `codex/lise-ogrenme-gelisimi`

## Amaç ve kullanım

Öğretmene yeni bir değerlendirme defteri doldurtmadan, mevcut veriyi
“Nerede destek gerekiyor → çalışma ver → sonrasını izle” akışına bağlamak.

Giriş: **Öğretmen → Konu Durumu → Öğrenme Gelişimi**.
Mevcut Konu Özeti, destek gereken konular ve toplu görev verme korunur.
Yeni görünüm lise kurumlarındaki öğretmenlere açılır; karma kurumda yalnız
9–12. sınıf öğrencileri içerilir. Dershane ve ortaokul ekranları bu sürüme
katılmaz. Yeni yan menü öğesi yoktur.

1. Öğretmen mevcut kapsam/sınıf ve ders seçimini kullanır.
2. Son 30 takvim gününde **kendisinin atadığı** konu çalışması ve soru
   çözümü görevlerini görür. Atanan her öğrenci ayrı bir çalışma sayılır.
3. Süresi geçenler ve tamamlananlar süzülür; görev ayrıntısında sonraki
   deneme ölçümü ve varsa aynı tür önceki ölçüm görülür.
4. Öğrenci seçilince konu kaynakları açılır: deneme D/Y/B, soru çözümü
   D/Y, öğrencinin beyanı ve konu çalışma oturumu. Bu bölüm kayıtlı tüm
   geçmişi kapsar; 30 gün yalnız görev takibinin penceresidir.
5. Bir konu açıldığında mevcut çalışma verme formu öğrenci/ders/konu
   seçilmiş gelir. Yetki yine mevcut sunucu eylemi ve RLS ile doğrulanır.

## Öğrenme hakkında hangi çıkarımlar yapılabilir?

- Öğrenci beyanı, ölçüm ve çalışma kaydı ayrı tutulur. Yeni hâkimiyet
  puanı, öğretmen değerlendirmesi veya öğrenci beyanına otomatik yazma yok.
- Veri olmaması “yetersiz”, görev tamamlanması “öğrendi” sayılmaz.
- Görevlerin kesin tamamlanma zamanı mevcut şemada tutulmuyor. Bu yüzden
  referans, planlanan görev günü ile gerçek atama gününün daha geç olanıdır.
  Aynı günkü deneme önce/sonra karşılaştırmasına katılmaz.
- Karşılaştırma **aynı öğrenci, aynı konu ve aynı deneme türü** içindir.
  TYT/AYT karıştırılmaz; yayınevleri farklı olabilir. Soru güçlüğü eşitlenmiş
  değildir. Sonuç, çalışmanın etkisine ilişkin nedensel bir kanıt değildir.
- Her dönemden aynı türdeki son iki deneme alınır. İki tarafta da en az
  iki deneme ve 10 cevaplanmış soru varsa cevaplananlardaki doğruluk farkı
  gösterilir. Aksi halde D/Y/B gösterilip karşılaştırmanın yetersiz olduğu
  belirtilir. Boşlara süre yetiştirememe anlamı atanmaz.
- Aynı denemedeki aynı konuya bağlı kazanım satırları bir ölçümde toplanır.
- Kaynak adları mevcut yönetici onaylı eşleme ile birleştirilir; bulanık
  eşleme/AI kullanılmaz. Branş denemesi kazanımları mevcut karara uygun
  biçimde ayrı kalır; genel müfredat ödevine kendiliğinden bağlanmaz.
- Konusu belirtilmemiş ödevler herhangi bir konunun sonucunu sahiplenmez.

## Yük, erişim ve veri güvenliği

Mevcut toplu konu sorgularının çıktısı yeniden kullanılır. Öğrenci başına
yeni sorgu yoktur. Yalnız etkin lise öğretmeni için ek görev sorgusu vardır;
bu sorgu öğretmenin sunucudaki kimliği + yetkili kapsamdaki öğrenci
kimlikleri + 30 günlük atama aralığı ile sınırlıdır. Öğrenci listeleri
150'lik parçalar, sonuçlar 1000'lik sayfalar halinde okunur. Görev sorgusu
hatası ayrı uyarıdır; sıfır görevmiş gibi gösterilmez ve mevcut konu özeti
çalışmaya devam eder.

Polling, cron, ücretli AI çağrısı, yeni bağımlılık, migration veya canlı
veritabanına müdahale yoktur. Süzgeçler eldeki özet üzerinde çalışır.
Çalışma verme mevcut kayıt akışını kullanır. Kaynakların saklama ve silme
kuralları değiştirilmez.

## Kontrol ve yayın durumu

Hesap/kapsam ve arayüz testleri; 1000 üstü sayfalama, öğretmen/öğrenci/ders
sınırları, İstanbul günü, sorgu hatası, boş veri, az ölçüm, branş ayrımı,
aynı günkü ölçüm ve HTML kaçışını kapsar.

Yerel önizlemede gerçek bileşen yalnız uydurma öğrencilerle denendi:
öğrenci seçimi, tamamlanan/süresi geçen süzgeci, ayrıntı açma, kaynak ayrımı
ve sahte görev gönderimi. 1280 ve 390 piksel tarayıcı kırılımlarında
yatay taşma olmadığı DOM ölçümüyle doğrulandı. Önizleme ve ekran görüntüleri
yerel `output/` altındadır; depoya girmez.

Gerçek öğretmen oturumu, Supabase üzerinden uçtan uca görev okuma/yazma ve
production build/yayın bu yerel önizlemeyle doğrulanmış sayılmaz. Son
otomatik kontrol sayıları ve commit için `SEFUKOC_GUNLUK_DURUM.md` kaydı
esas alınır. Canlıya alınmadı.

## Sonraki içerik adımı ve pilot

Resmî öğrenme çıktıları bu sürümde eklenmedi: lise için sınıf ve program
sürümü doğrulanmış kaynak/eşleme hazırlanmalı. Mevcut alt konu adı bir
öğrenme çıktısı gibi etiketlenmez. Öğretmenin tarihçeli manuel değerlendirme
formu da bu sürümün parçası değildir.

Canlıya alındıktan sonra 2–3 öğretmenle iki haftalık pilot önerilir.
Görüşmede üç somut soru sorulur: Öncelikli konu seçebildi mi? Rapordan
çalışma verebildi mi? Sonuç için yeniden döndü mü? Yeni kullanım telemetrisi
eklenmediği için bu pilotun sonuçları kendiliğinden ölçülmüş sayılmaz.
Kullanılmayan alanlar çoğaltılmadan önce öğretmen geri bildirimiyle sadeleşir.
