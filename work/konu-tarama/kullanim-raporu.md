# SeFu Koç — sistem kullanımı ve içerik verimi

Tarih: 10 Ekim 2026. Dönem: 12 Eylül–10 Ekim 2026. Kapsam: canlı veritabanındaki tüm kurumlar.

## Sonuç

Deneme sonuçları en geniş öğrenci kitlesine ulaşıyor. Son 28 günde 352 deneme kaydı 225 farklı öğrenciye ait. Bunların 336'sı öğretmen/kurum, 16'sı öğrenci kaynaklı. Bu, ekran ziyaretini değil sisteme işlenen içerik kapsamını ölçer.

Günlük çalışmada soru çözümü 660 kayıtla, konu çalışması 354 kayıtla izleniyor. Farklı öğrenci sayısı sırasıyla 52 ve 67. Ders bazında Matematik ve Türkçe belirgin biçimde önde.

| Alan | Kayıt | Farklı öğrenci | Açıklama |
| --- | ---: | ---: | --- |
| Deneme sonucu | 352 | 225 | En geniş kapsam; çoğu kurum yüklemesi |
| Soru çözümü | 660 | 52 | En yüksek bireysel kayıt hacmi |
| Konu çalışması | 354 | 67 | Daha çok farklı öğrenciye yayılmış |
| Ortaokul çalışması | 0 | 0 | Dönemde kullanım kaydı yok |
| Yazılı analizi | 0 sınav | — | Dönemde kullanım kaydı yok |

Denemeler ayrıca 166 farklı denemeye bağlı 12.534 kazanım-sonuç satırı ve 92 karne özeti üretti. Kazanım satırları ayrı öğrenci eylemi değildir.

## Kurum ve ders dağılımı

| Kurum | Deneme | Konu çalışması | Soru çözümü |
| --- | ---: | ---: | ---: |
| Elbistan BİST Fen Lisesi | 215 | 113 | 325 |
| Kariyerim | 137 | 241 | 335 |
| Diğer kurumlar | 0 | 0 | 0 |

| Ders | Konu çalışması | Soru çözümü |
| --- | ---: | ---: |
| Matematik | 118 | 210 |
| Türkçe | 68 | 218 |
| Kimya | 47 | 89 |
| Fizik | 47 | 64 |
| Biyoloji | 43 | 56 |

Bu sayılar öğrenci sayısına göre normalize edilmediği için kurum performans sıralaması olarak okunmamalı.

## Görevler: yüksek atama, düşük kayıtlı tamamlanma

Son 28 günde 1.360 görev ataması var. Son tarihi geçmiş 905 atamanın 65'i tamamlandı, 813'ü tamamlanmadı, 27'si hâlâ bekliyor. Kayıtlı tamamlanma oranı %7,2. Bu, görev akışında incelenmesi gereken bir kopukluk işareti; tek başına öğrencinin çalışmadığını kanıtlamaz. Görevin öğrenciye görünürlüğü, bildirimler ve tamamlanma işaretleme kuralı denetlenmeli.

## Öncelikler

1. Deneme karnesinden öğrenciye bir sonraki konu/soru çalışmasını önermek ve yapılıp yapılmadığını ölçmek. Deneme 225 öğrenciye ulaşırken konu çalışması 67, soru çözümü 52 öğrencide kalıyor.
2. Görev akışındaki görünürlük ve tamamlanma durumlarını denetlemek.
3. Ortaokul için pilot sınıfla ilk çalışma kayıtlarını oluşturup benimsenmeyi izlemek. Sıfır kullanımdan verim kararı çıkarılamaz.

## Ölçüm sınırları ve kaynak

Bu rapor kayıt oluşturma verisini ölçer; sayfa görüntülemesi, oturum süresi veya akademik başarıya nedensel etki değildir. Google Analytics bağlantısı bu çalışma ortamından erişilemediği için en çok ziyaret edilen sayfalar doğrulanamadı. Denemelerin büyük bölümü öğretmen kaynaklı olduğundan 225 öğrencilik kapsam, 225 öğrencinin ekranı açtığı anlamına gelmez. Geçmiş tarihli bir çalışma bu dönemde işlendiyse döneme dahildir.

Kaynak: Canlı Supabase'deki `students`, `konu_calismalar`, `soru_cozumleri`, `denemeler`, `deneme_kazanim_sonuclari`, `deneme_karne_ozetleri`, `gorevler`, `gorev_atamalari`, `ortaokul_calismalar`, `ortaokul_konu_yeterlilikleri` ve `yazili_sinavlar` tablolarından 10 Ekim 2026'da salt okunur sorgular.
