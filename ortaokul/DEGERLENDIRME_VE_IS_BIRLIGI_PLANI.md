# Ortaokul Paneli — Değerlendirme Raporu ve İş Birliği Planı

**Değerlendirilen belge:** `ORTAOKUL_PANELI_URUN_VE_TEKNIK_TASARIM.md` (Taslak v1.0, 988 satır)
**Tarih:** 30.09.2026
**Yöntem:** Belgenin her teknik iddiası, canlı veritabanı şeması (73 tablo) ve `src/` kod tabanıyla karşılaştırıldı.

---

## 1. Özet yargı

Belge, ürün ve pedagoji tarafında **yayına hazır kalitede**. Kademe matrisi, dil/ton kuralları, yapay zekâ yasak listesi, erişilebilirlik hedefleri ve kabul kriterleri doğrudan işe koşulabilir durumda. "Lise panelinin küçültülmüş kopyası değildir" ilkesi belgenin tamamında tutarlı biçimde uygulanmış.

Tek ama ciddi zayıflığı şu: **teknik bölümler mevcut kod tabanıyla hiç yüzleşmiyor.** §18'deki veri modeli sıfırdan bir ürün varsayıyor ve İngilizce adlı sekiz yeni tablo öneriyor; oysa bu kavramların çoğu SeFu'da Türkçe adlarla zaten var ve canlı veriyle çalışıyor. Bu, iki yönlü hata üretiyor:

- **Maliyeti olduğundan düşük gösteriyor** — "kazanım bağlı görev" gibi tek satırlık kabul kriterleri, bugünkü şemada karşılanamaz.
- **Maliyeti yanlış yerde gösteriyor** — yeniden yazılması gerekmeyen şeyler (plan önerisi, deneme okuma, bildirim, denetim kaydı) yeni iş gibi duruyor.

Karar verilmesi gereken asıl soru belgede hiç sorulmamış: **ortaokul, mevcut veri modelinin genişletilmesi mi, yoksa yanında duran ikinci bir model mi?** Bu sorunun cevabı, projenin süresini iki katına kadar değiştirir.

---

## 2. Güçlü yanlar

| Bölüm | Neden güçlü |
|---|---|
| §2 Kademe matrisi | 5→8 arası sorumluluk devri somut; her satır bir ürün davranışına çevrilebiliyor |
| §2.1 Dil ve ton | Kural seti test edilebilir ("başarısız/tembel/geride" yasak) — metin denetimi otomatikleştirilebilir |
| §1.2 + §15.3 Kapsam dışı ve yasaklar | Çocuk güvenliği ve yapay zekâ sınırları net; sonradan tartışma çıkarmayacak kadar açık |
| §10.3 LGS "geçmiş dağılım ≠ tahmin" | Sektörde en sık yapılan etik hatadan kaçınıyor, üstelik ekran metnini de vermiş |
| §16 Erişilebilirlik | WCAG 2.1 AA + ölçülebilir eşikler; "disleksi fontu zorunlu değil" nüansı doğru |
| §22 Kabul kriterleri | Çoğu doğrudan teste çevrilebiliyor |
| §21.2 Durum semantiği | "Akademik eksikte kırmızı kullanılmaz" kuralı, mevcut panelin de gözden geçirilmesi gereken bir yeri |

---

## 3. Kodla çelişen ve eksik kalan yerler

### 3.1 Veri modeli mevcut şemayı yok sayıyor

§18'de önerilen tabloların bugünkü karşılıkları:

| Belgedeki öneri | Mevcut karşılığı | Durum |
|---|---|---|
| `curriculum_units`, `learning_outcomes` | `mufredat-konulari.json` (205 kayıt) + `mufredat_alt_konular` + `kazanim_konu_eslesmeleri` | Kısmen var; sürümleme ve kazanım katmanı yok |
| `student_outcome_progress` | `ogrenci_konu_hakimiyeti` (student, ders, konu, hakimiyet_seviyesi, tekrar_durumu) | **Var**, konu düzeyinde; kazanım düzeyi yok |
| `learning_evidence` | `soru_cozumleri`, `konu_calismalar`, `deneme_kazanim_sonuclari`, `yazili_soru_sonuclari` | **Var**, dört ayrı tabloda dağınık |
| `student_plan_items` | `gorev_atamalari` (+ `ogrenci_*` saat/gün alanları) + `ogrenci_oto_programlari` | **Var**, Program Yap/Oto Program olarak çalışıyor |
| `student_checkins` | `haftalik_verimlilikler` (haftalık tek düzey) | Kısmen var; günlük ve duygu boyutu yok |
| `exam_topic_distributions` | — | **Gerçekten yeni** |

Ayrıca isimlendirme: veritabanındaki 73 tablonun tamamı Türkçe. Sekiz İngilizce tablo eklemek kalıcı bir çatlak yaratır — sorguların yarısı `ogrenci_konu_hakimiyeti`, yarısı `student_outcome_progress` derse, altı ay sonra hangisinin güncel olduğu kimsenin aklında kalmaz.

**Önerim:** yeni tabloları Türkçe adlandır ve mevcutları **genişlet**, yanına ikinci bir model kurma. Somut olarak:
- `mufredat_*` ailesi sürümlenir (`mufredat_surumleri`, `mufredat_dersleri`, `mufredat_uniteleri`, `mufredat_kazanimlari`).
- `ogrenci_konu_hakimiyeti` kazanım kimliğiyle genişletilir (kolon ekleme, yeni tablo değil).
- Kanıt kayıtları için yeni tablo açmak yerine mevcut dört tablonun üstüne bir **görünüm** (view) konur.

### 3.2 Sınıf seviyesi öğrencide tutulmuyor

Belge §19.2'de "sınıf seviyesi bazlı menü üretimi eklenmelidir" diyor, doğru. Ama bugün sınıf seviyesi **öğrencide değil, `classes.seviye`'de** duruyor ve menü fonksiyonu seviyeyi hiç görmüyor:

```
dashboardMenusu(role, kurumTuru, brans, grupMu)
```

Deneyimin 5/6/7/8'e göre dallanması isteniyorsa seviye tek bir yerden, güvenilir biçimde çözülmeli. Bugün `students.class_id` boş olan öğrenci yok (240 öğrencinin hepsi sınıflı) ama grup koçluğu ve dershane akışlarında sınıfsız öğrenci mümkün — o durumda panel hangi kademeyi gösterecek, belgede yok.

### 3.3 Kademe kavramı yok; `students` tablosu YKS'ye gömülü

- `schools.tur` yalnızca `okul` / `dershane`. İlkokul/ortaokul/lise ayrımı yok. Aynı kurumda hem ortaokul hem lise varsa (çok yaygın) bugünkü modelde ifade edilemiyor.
- `students` tablosunda her öğrencide `ayt_alan`, `hedef_net_tyt`, `hedef_net_ayt`, `hedef_bolum` kolonları var. 5. sınıf öğrencisi için hepsi anlamsız. Bunlar zorunlu mu, varsayılanlı mı — kayıt akışı ortaokul için gözden geçirilmeli.
- Belge §19.2 "YKS/TYT/AYT terimleri ortaokul ekranlarında görünmemeli" diyor; ama bu terimler yalnızca ekranda değil **veri modelinde** de gömülü. Sadece etiket değiştirmek yetmez.

### 3.4 Görev–kazanım bağı bugün yok

Kabul kriteri §22.2: *"Görev en az bir ders ve tercihen bir öğrenme çıktısıyla ilişkilendirilebilir."*

Bugün `gorevler.ders` ve `gorevler.konu` **serbest metin**; hiçbir müfredat tablosuna yabancı anahtar yok. Kazanım bazlı sınıf haritası (§14.2), kazanım bazlı deneme analizi (§10.2) ve hedefli tekrar (§Faz 3) bu bağ kurulmadan çalışmaz. Bu, MVP'nin en büyük tek teknik kalemi ve belgede tek satır olarak geçiyor.

### 3.5 Ortaokul öğretmen branşları tanımlı değil

`BRANS_LISTESI` lise branşlarından oluşuyor: Matematik, Fizik, Kimya, Biyoloji, Türk Dili ve Edebiyatı, Tarih, Coğrafya, Felsefe, Din Kültürü, İngilizce, Beden Eğitimi, Müzik, Rehber Öğretmen, Diğer.

Eksikler: **Türkçe** (kodda "ortaokul branşıdır" diye not düşülmüş ama listede yok), **Fen Bilimleri**, **Sosyal Bilgiler**, **Teknoloji ve Tasarım**, **Görsel Sanatlar**. Öğretmen kaydı ve görev yetkisi buna bağlı olduğu için Faz 0'da çözülmesi gerekir.

### 3.6 Belgede "yeni" gibi duran, aslında hazır olanlar

Bunlar plana yanlış maliyet yazdırıyor:

- **Plan önerisi motoru** (§9.2) — SeFu Oto Program olarak çalışıyor: 4 adımlı sihirbaz, gece yarısını aşan aralık, taşıma, çakışma kontrolü.
- **Deneme PDF okuma/eşleştirme** (§Faz 3) — üç yayınevi biçimi Claude'suz okunuyor, ad-soyad eşleştirme ve yönetici inceleme kuyruğu mevcut.
- **Kazanım→konu eşleştirme** (§7.1) — `kazanim_konu_eslesmeleri` ve admin arayüzü var.
- **Bildirim politikası altyapısı** (§12) — panel bildirimi + web push + e-posta üçlüsü ve rol bazlı tercihler çalışıyor. Sessiz saatler yok, eklenmeli.
- **Denetim kaydı, RLS deseni, rol doğrulaması** (§20) — mevcut ve oturmuş.
- **Hız/süre analizi** — TYT için dün tamamlandı (ders bazlı tempo bütçesi, yetişme ekseni). LGS'ye uyarlaması yeni model değil, yeni katsayı.

---

## 4. Belgede hiç ele alınmamış başlıklar

1. **LGS'nin sınav yapısı.** İki oturum (sözel 50 soru / 75 dk, sayısal 40 soru / 80 dk) ve ders başına soru sayıları belgede yok. Deneme analizi ve süre/tempo çalışması bu yapı olmadan kurulamaz — lise tarafında aynı iş için TYT 165 dk / 120 soru omurgasını kullanmak zorunda kaldık.
2. **Yerleştirme puanı mantığı.** LGS'de merkezî sınav puanı tek başına yeterli değil; okul başarı puanı da yerleştirmeye giriyor. §10.4 "puan tahmini" bölümü bunu hiç anmıyor. Tahmin gösterilecekse bu eksik ciddi.
3. **Öğretim yılı geçişi.** 5. sınıf öğrencisi 6'ya geçince ne oluyor? Sınıf, veri, plan geçmişi, kazanım ilerlemesi. Lise tarafında da çözülmemiş bir konu; ortaokulda dört yıl üst üste yaşanacağı için daha kritik.
4. **Müfredat verisinin kaynağı ve emeği.** Belge §25'te "kim güncelleyecek" diye soruyor ama büyüklüğü hesaplamıyor. Ölçüldü — bkz. §8.
5. **Ticari model.** Kurum sözleşmesi, fiyatlandırma, pilot okulun yükümlülüğü yok. Grup Koçluk'ta kapasite/süre modeli kurmuştuk; ortaokul için karşılığı tanımsız.
6. **Velinin ortaokuldaki farklı konumu.** Belge veliyi lise mantığıyla ele alıyor ("gözetim değil destek"). Ortaokulda veli fiilen planın parçası; 5-6. sınıfta görev hatırlatması çoğu zaman veliye gidiyor. §13'ün bu gerçeğe göre yeniden yazılması gerekir.

---

## 5. Açık kararlara önerim

Belge §25'te on soru sormuş. Kod tarafını bildiğim için altısına net öneri verebiliyorum:

| # | Soru | Önerim | Gerekçe |
|---|---|---|---|
| 1 | Ayrı rota mı, `/dashboard` içinde mi? | **Aynı rota, seviyeye göre dallanma** | Oturum, rol, kurum, bildirim, RLS tek yerde kalır; ayrı rota bu altyapıyı ikiye böler |
| 2 | Pilot 8. sınıf mı, 5–8 mi? | **Yalnız 8. sınıf** | Belgenin §26'daki kendi önerisi doğru; LGS omurgası en çok yeniden kullanılan parçadır |
| 3 | Müfredat verisini kim girecek? | **Karar gerekiyor — projenin kritik yolu** | Aşağıdaki iş birliği planında ayrı kalem |
| 5 | Öğrenci dosya yükleme ilk sürümde? | **Hayır** | Depolama, tarama, saklama süresi ve KVKK yükü MVP'yi geciktirir; Faz 2'ye |
| 8 | 7. sınıfta LGS görünümü varsayılan? | **Kapalı** | Belgenin kendi §11.2 ilkesiyle tutarlı |
| 10 | Başarım sistemi ilk sürümde? | **Hayır** | Lise tarafında rozet zaten kaldırıldı, yerine gelecek başarım listesi hâlâ onay bekliyor; ortaokula önce onun sonucu taşınmalı |

Kalan dörtte (4, 6, 7, 9) karar sizin: LGS yayınevi biçimleri, veli özeti kanalı, rehber notu görünürlüğü, günlük süre üst sınırı.

---

## 6. İş birliği planı

### 6.1 Rol dağılımı

| Alan | Kim | Not |
|---|---|---|
| Ürün kararları, pedagojik hüküm, kurum ilişkisi | **Siz** | §25'teki on karar ve sonradan çıkacaklar |
| Müfredat verisi (ünite/konu/kazanım) | **Siz + ben** | PDF'lerden ilk taslağı ben çıkarırım, doğrulama ve düzeltme sizde — içerik doğruluğu benim hüküm verebileceğim bir alan değil |
| Veri modeli, migration, RLS | **Ben** | Her migration canlıda geri alınabilir işlemle doğrulanır |
| Sunucu eylemleri, iş kuralları, testler | **Ben** | |
| Arayüz ve metinler | **Ben yazarım, siz onaylarsınız** | §2.1 dil kuralları metinlerin denetim ölçütü |
| Gerçek kullanıcı testi (§24.3) | **Siz** | Sınıf seviyesi başına 5 öğrenci; ben test senaryosunu hazırlarım |
| Deploy, alias, canlı doğrulama | **Ben** | Mevcut düzen aynen sürer |

### 6.2 Çalışma ritmi

Son iki haftada oturmuş düzeni koruyoruz:

1. Siz bir iş tarif edersiniz.
2. Ben kod tabanına bakıp **önce itiraz ve soru** getiririm; gerçekten kararınıza ihtiyaç varsa dururum.
3. Onaydan sonra dilim tamamlanır: tip kontrolü + lint + test + build + commit + deploy + dört alias + canlı duman testi.
4. Ekranı giriş yapmış hesapla göremediğim yerleri **açıkça söylerim**; doğrulama sizde kalır.
5. Kalıcı olan kararlar not dosyasına yazılır.

Bir dilim = yarım gün ile bir gün arası iş. Dilim bittiğinde canlıda çalışır olmalı; yarım bırakılmış faz yok.

### 6.3 Faz planı

Belgedeki beş fazı, kod gerçeğine göre yeniden sıraladım. **Faz 0 belgedekinden belirgin büyük** — asıl risk orada.

**Faz 0 — Omurga (en kritik, en çok gizli iş burada)**
- Kademe kavramı: `schools`/`classes` seviye modeli, ortaokul kurum türü
- Sınıf seviyesinin öğrenciden tek noktadan çözülmesi, menü üretimine seviye parametresi
- Ortaokul öğretmen branşları
- Sürümlü müfredat tabloları (Türkçe adlarla) + mevcut `mufredat_*` verisinin göçü
- `gorevler` ↔ kazanım bağı
- RLS ve çapraz rol yetki testleri
- `ortaokul_aktif` özellik bayrağı
- **Çıktı:** panelde görünür bir şey yok; altyapı hazır. Bunu peşinen kabul etmek gerekiyor.

**Faz 1 — 8. sınıf öğrenci çekirdeği**
- Bugün, Görevlerim, Derslerim (sade konu haritası), Planım, Yardım İste
- Mobil ve erişilebilirlik kabul kriterleri
- **Çıktı:** pilot sınıf gerçek kullanabilir.

**Faz 2 — Öğretmen ve veli**
- Kazanım bağlı görev verme, teslim/geri bildirim, sınıf kazanım haritası
- Veli haftalık özeti (kanal kararı gerekiyor)
- Sessiz saatler ve bildirim dili
- **Çıktı:** döngü kapanır — öğretmen verir, öğrenci yapar, veli görür.

**Faz 3 — LGS ölçme**
- LGS sınav yapısı (2 oturum, 50+40 soru, süre omurgası)
- Deneme yükleme: mevcut PDF okuyucuya LGS yayınevi biçimleri
- Kazanım bazlı analiz, geçmiş dağılım tablosu, en fazla üç odak önerisi
- **Çıktı:** 8. sınıf için ürün tamamlanır.

**Faz 4 — 7/6/5. sınıf ve gelişmiş öneriler**
- Yaşa göre sadeleştirilmiş sürümler (pilot geri bildirimiyle)
- Aralıklı tekrar, hata türü analizi, öğretmen onaylı yapay zekâ desteği

### 6.4 Karar kapıları

Her fazın başında ilerlemeyi durduran kararlar:

- **Faz 0 öncesi:** genişletme mi paralel model mi (§3.1) · pilot kapsam · müfredat verisini kim girecek
- **Faz 1 öncesi:** 5-8 ders adlarının ve ekran terminolojisinin son hâli
- **Faz 2 öncesi:** veli özeti kanalı · rehber notu görünürlük politikası · günlük süre üst sınırı
- **Faz 3 öncesi:** puan tahmini gösterilecek mi (gösterilecekse OBP dâhil mi) · hangi LGS yayınevleri

### 6.5 "Bitti" tanımı

Bir dilim şunların hepsi sağlandığında bitmiş sayılır:

- Tip kontrolü, lint ve testler temiz; yeni iş kuralı için test yazılmış
- Migration varsa canlıda uygulanmış ve geri alınan bir işlemle doğrulanmış
- Canlıda çalışıyor, dört alias güncel
- Doğrulayamadığım şey açıkça yazılmış
- Kabul kriterlerinden hangilerini karşıladığı söylenmiş

### 6.6 İlk üç adım

1. §3.1'deki **genişletme / paralel model** kararını verelim. Tek cümlelik cevabınız yeter; gerisini ben kurarım.
2. Kaynak PDF'lerden **tek ders için** (öneri: 8. sınıf Matematik) ünite–konu–kazanım taslağını çıkarayım. Doğruluğunu görürsünüz, biçimi birlikte oturtturuz, kalan altı dersin emeği ancak o zaman güvenilir biçimde tahmin edilir.
3. Faz 0'ın ilk dilimi: kademe + sınıf seviyesi + ortaokul branşları. Panelde görünmez ama her şey buna bağlı.

---

## 8. Müfredat verisi — ölçüldü (30.09.2026 eki)

Raporun ilk hâlinde ~700 kayıt tahmini vardı. Kaynak PDF'ler makineyle taranarak **gerçek sayılar çıkarıldı**:

| Ders | 5 | 6 | 7 | 8 | Toplam |
|---|---:|---:|---:|---:|---:|
| Türkçe | 80 | 91 | 96 | 98 | **365** |
| Fen Bilimleri | 27 | 36 | 35 | 43 | **141** |
| Matematik | 23 | 24 | 30 | 23 | **100** |
| Din Kültürü ve Ahlak Bilgisi | 18 | 18 | 17 | 19 | **72** |
| Sosyal Bilgiler | 19 | 18 | 17 | — | **54** |
| **Toplam öğrenme çıktısı** | | | | | **732** |
| İngilizce (ünite sayısı) | 7 | 8 | 8 | 8 | 31 ünite |

**Tahmin doğru çıktı (732 ≈ 700) ama emek tahmini yanlıştı.** Kodlar düzenli
(`MAT.8.1.1.`, `FB.8.2.3.`, `T.O.8.14.`) ve metinler makineyle çıkarılabiliyor.
8. sınıf Matematik için çıkarıcı yazıldı; **23/23 öğrenme çıktısının tamamı eksiksiz**
alındı (`veri/matematik-8-taslak.json`). Yani bu iş elle veri girişi değil,
**çıkarma + insan doğrulaması**. Doğrulama yine de zorunlu: PDF metni satır
sonlarında tireyle bölünüyor ve tablo hücre başlıkları ("ÖĞRENME ÇIKTILARI",
"VE SÜREÇ BİLEŞENLERİ") cümlelerin ortasına giriyor — ilk denemede 23 çıktının
2'si hiç gelmedi, 1'i yarım kaldı. Her ders için aynı gözden geçirme gerekecek.

### 8.1 İki yeni bulgu

1. **8. sınıf T.C. İnkılap Tarihi ve Atatürkçülük programı klasörde yok.** Sosyal
   Bilgiler PDF'i yalnız 5–7. sınıfı kapsıyor (doğru), ama 8. sınıfın dersi ayrı bir
   programda ve o dosya elimizde değil. LGS'de bu dersten 10 soru çıkıyor —
   8. sınıf pilotu için **eksik parça**, temin edilmeli.
2. **İngilizce'nin numaralı öğrenme çıktısı yok.** Program ünite + işlev/beceri
   yapısında kurulmuş. Belgenin §7.1'deki "Konu > Öğrenme çıktısı > İçerik" zinciri
   İngilizce'de kırılıyor. Veri modeli, **öğrenme çıktısı katmanı olmayan dersi**
   tolere etmek zorunda.

### 8.2 Kararınız: paralel model (30.09.2026)

Raporda genişletme önerilmişti; **paralel model** seçildi. Karar sizindir, kurulum ona
göre yapılacak. Paralel modelin bilinen bedeli iki başlıkta toplanıyor:

- **Çoğalma:** aynı kavram iki yerde durur (`ogrenci_konu_hakimiyeti` ile ortaokul
  karşılığı gibi). Analiz, rapor ve bildirim kodu ikiye ayrışırsa bakım maliyeti
  kalıcı olarak artar.
- **Ayrışma:** lise tarafında düzeltilen bir hata ortaokulda düzeltilmeden kalabilir.

**Bunu dengelemek için üç kural öneriyorum:**

1. **Ortak olan paylaşılır, ayrı olan ayrılır.** Kimlik, rol, kurum, sınıf, bildirim,
   denetim kaydı, dosya ve oturum **tek** kalır. Paralel olan yalnızca müfredat,
   ilerleme ve ölçme katmanıdır.
2. **Adlandırma Türkçe ve önekli:** `ortaokul_mufredat_*`, `ortaokul_ogrenci_*`.
   Hangi tablonun hangi kademeye ait olduğu adından anlaşılsın; İngilizce ad yok.
3. **Saf iş kuralları ortak kütüphanede.** Tempo hesabı, durum eşikleri ve sıralama
   mantığı iki kademede de aynı fonksiyonu çağırsın, yalnızca katsayılar farklı olsun.
   Kopyalanan her fonksiyon ileride ayrışacak demektir.

## 7. Beklenen zorluklar

- **Faz 0'ın görünmezliği.** Uzun sürer, ekranda karşılığı olmaz. Sabır gerektirir; atlanırsa Faz 1'de iki katı bedelle geri gelir.
- **Müfredat verisinin doğruluğu.** Yanlış kazanım, yanlış analiz üretir ve öğretmen güvenini bir defada kaybettirir. Bu yüzden içerik onayı sizde.
- **Mevcut panelin bozulma riski.** 240 lise öğrencisi bu sistemi kullanıyor. Her ortaokul değişikliği özellik bayrağının arkasında kalmalı; `students`/`classes` üzerindeki her dokunuş lise tarafında da test edilmeli.
- **Kapsam genişlemesi.** Belge çok iyi ve çok şey vaat ediyor. Faz sınırlarını korumak ortak sorumluluğumuz.
