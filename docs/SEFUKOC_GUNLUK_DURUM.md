# SEFUKOC.COM — GÜNLÜK DURUM KAYDI

Son güncelleme: 23 Ekim 2026 · Türkiye saati
Depo: https://github.com/SGEducoach/sf-educoach (dal: main)
Bağlı ana dosya: SEFUKOC_MERKEZ_PROJE.md (depoda `docs/SEFUKOC_MERKEZ_PROJE.md`)

> Bu dosya her AI oturumunun (ChatGPT, Claude, ChatLLM vb.) ilk okuyacağı dosyadır.
> Tek dosya, tek sürüm: yeni adla kopya üretme; mevcut dosyayı güncelle.

---

## 0. OTURUM BAŞLANGIÇ PROTOKOLÜ (zorunlu)

Her oturumun ilk adımı, kod ya da analiz işine geçmeden önce:

1. **GitHub'daki son commit geçmişine bak:** https://github.com/SGEducoach/sf-educoach/commits/main
   Yerel klasör geride kalmış olabilir; yerel kopyaya güvenme.
2. Yerelde `git fetch` + `git status` ile kaydedilmemiş / gönderilmemiş değişiklik var mı kontrol et. Kaydedilmemiş işi silme, önce koru.
3. Aşağıdaki **Bölüm 1 (Genel Pano)** ve **Bölüm 2 (Modül Kartları)** bölümünü oku; kullanıcıya 5 satırı geçmeyen bir "Güncel Durum Raporu" ver.
4. Rapordaki son commit ile GitHub'daki son commit farklıysa, aradaki commit'leri özetle ve bu dosyayı önce düzelt.
5. "Doğrulanmadı" yazan hiçbir şeyi tamamlanmış sayma.

## 0.1 OTURUM BİTİŞ PROTOKOLÜ (zorunlu)

1. İlgili modül kartında: Son Commit, Mevcut Durum, Bu Oturumda Yapılan, Sonraki Adım alanlarını güncelle.
2. **Bölüm 3 (Oturum Günlüğü)**'ne tek satır ekle.
3. Tamamlanmamış işi, dalı ve son commit'i **Devir Notu**'na yaz.
4. Dosyayı depoya `docs/` altına aynı adla commit'le (yeni dosya adı üretme).

---

## 1. GENEL PANO

| Alan | Değer |
| --- | --- |
| Depodaki son commit (bu kayıt anı) | `main` = Faz 1 Adım 5 birleşimi (23 Ekim 2026; önceki: `d9c008cd` Adım 4). Hash için `git log -1` |
| Önceki işlevsel commit | 21 Ekim 2026 — Ana sayfa rol kartları giriş ekranlarına bağlandı (1eb2488) |
| Teknoloji | Next.js 16, TypeScript, Tailwind v4, Supabase, Claude API, Resend, Web Push/PWA |
| Canlı yayın doğrulaması | Vercel production Adım 5 birleşimi için kontrol edildi (aşağıdaki oturum günlüğü); ekranda (rehber/müdür hesabıyla) deneme **yapılmadı** |
| Canlı veritabanı (Supabase `sg-educoach`) | 0149–0170 canlıda var (elle uygulanmış, `list_migrations` 0148'de kalıyor, yanıltıcı). 0171–0175 23.10.2026'da uygulandı. students: 394 satır |
| Yerel klasörler (iki bilgisayar) | Doğrulanmadı |
| Aktif ana iş | Analiz bölümü: veri/sorgu altyapısı, rehber risk paneli, kazanım matrisi, AI koçluk |
| Çakışma kuralı | Aynı anda iki bilgisayarda aynı kod üzerinde çalışılmaz |

---

## 2. MODÜL KARTLARI

Alan açıklamaları: **Çalışan AI** = modülde son işi yapan araç/oturum · **Durum** = Planlandı / Devam ediyor / Çalışıyor / Hata var / Doğrulanmadı.

### M1 — Analiz Altyapısı (Supabase RPC / sorgu katmanı)
| Alan | Kayıt |
| --- | --- |
| Amaç | Analiz ekranlarının hızlı ve **doğru** açılması: öğrenci/kurum bazlı toplamların veritabanında (RPC) hesaplanması; hedef 300 ms altı |
| Çalışan AI | ChatLLM (Abacus) Adım 0 SQL'leri + Adım 1–2 kodunu yazdı; Claude kontrol etti, migration'ları uyguladı, main'e aldı ve canlıya verdi |
| Durum | Adım 1–4 **canlıda** (kod + 0171/0172/0173/0174). `ogrenci_aktivite_ozeti` RPC canlı DB'de, yetkileri doğrulandı ve **Rehber Radarı (`rehber-kapsam-listesi.ts`) ile Takip taraması (`rehber-takip-verisi.ts`) artık bunu kullanıyor** (Adım 4). Görev sayıları son 30 gün. Adım 0 ölçümü tamam (`max_rows = 1000`). **Ekranda deneme yapılmadı** (rehber hesabıyla Radar ve Takip Bildirimleri kontrol edilmeli). Denemeler (net hesabı) hâlâ JS'te toplanıyor |
| Son ilgili commit | `main` (23.10): Adım 3 birleşimi — `a12e967a` (migration 0174, ChatLLM), `5c46a3fe` (TS yardımcıları + testler, ChatLLM), `747de74` (Claude: EXECUTE yetkisi PUBLIC'ten de kaldırıldı). Dal `faz1-adim3-0174` GitHub'da duruyor |
| Kullanıcı kararları (23.10) | Görev birikmesi son 30 gün (tek sabit) · analiz varsayılanı "Aylık", "Tüm zamanlar" seçenek · tek risk puanı yok, M2 = gerekçeli öncelik sıralaması · `schema.sql` Adım 0 sonrası canlıdan `pg_dump --schema-only` ile yeniden üretilecek |
| Migration numaraları | 0171 = rehber_takip_bildirimleri (20.10'da kodla gitti ama canlıya **23.10'a kadar uygulanmamıştı**; Takip Bildirimleri canlıda çalışmıyordu), 0172 = rehber_takip_taramalari (Adım 1), 0173 = `students(class_id)` indeksi (Adım 2; `school_id` için ayrı indeks gereksiz, `(school_id, okul_no)` birleşik indeksi var), 0174 = `ogrenci_aktivite_ozeti` RPC (Adım 3; öğrenci başına son hareket + son 30 günün görev açık/toplam sayısı, canlıda), 0175 = `sinif_analiz_ozeti` RPC (Adım 5; canlıda). Bir sonraki numara **0176** |
| Mevcut yapı (koddan) | Analizde RPC/view yok; tüm toplama JS'te (`src/lib/analiz.ts`, `konu-hakimiyeti.ts`, `sinif-analizi-verisi.ts`, `rehber-kapsam-listesi.ts`, `rehber-takip-verisi.ts`). İndeks: `(student_id, tarih)` üç ana tabloda var; `students(school_id/class_id)` indeksi bulunamadı. `schema.sql` migration'lardan geride (en yüksek referans 0148). Çift `0167` numarası var |
| Önceki oturum (23.10, 1. oturum) | Faz 1 keşfi: migration/indeks/RLS envanteri, analiz sayfalarının veri yolu, 0171 takip mantığı, Claude kullanımı. Rapor: `FAZ1_KESIF_RAPORU.md` (15 bulgu + 3 UX notu, uygulama sırası) |
| En kritik bulgular | (1) Rehber/sınıf toplu sorguları tüm geçmişi sınırsız çekiyor → 1000 satır sınırında sessiz kesilme riski (yanlış "sessizlik", görev oranı). (2) Takip Bildirimleri sayfası her açılışta tam kurum taraması bekliyor (`page.tsx:1042`). (3) Öğrenci analizi "Tüm zamanlar"da ham satırları sınırsız çekiyor |
| Bu oturumda yapılan (23.10, 2. oturum) | `FAZ1_ADIM0_OLCUM.sql` (salt okunur ölçüm S1–S6). Adım 1: takip sayfası açılış taraması yalnız son tarama 26 saatten eskiyse; "Son tarama" etiketi + tarama hatası uyarısı; cron/"Şimdi tara"/sayfa tarama zamanını 0172 tablosuna yazar; tablo yoksa eski davranış. Adım 2: 0173 `students(school_id)`, `(class_id)` (if not exists). Yamalar: `FAZ1_ADIM1_TAKIP_TARAMA.patch`, `FAZ1_ADIM2_STUDENTS_INDEKS.patch` |
| Kontroller (Claude, 23.10) | Birleşik halde vitest 71 dosya / 774 test geçti, `tsc --noEmit` temiz, eslint temiz. Yerel `next build` ortam sorunuyla (junction + Turbopack) çalışmadı; gerçek build Vercel'de başarılı (READY). Canlı: 0171/0172 tabloları RLS açık, politikasız (servis anahtarıyla erişim, istenen); `students_class_id_idx` doğrulandı. Son 1 saat runtime hatası: yalnız eski bir `admin_audit_log` RLS ihlali (bu işle ilgisiz) |
| `max_rows` ölçümü (23.10) | Kullanıcı Supabase panelinden doğruladı: **`max_rows = 1000`**. Canlı veri (yalnız sayılar): en büyük kurumda 224 öğrenci, **1464 `gorev_atamalari`**, 707 `soru_cozumleri`; ikinci kurumda 127 öğrenci, 264 görev. Tüm sistemde 1731 görev, 1167 soru çözümü, 695 deneme, 80 konu çalışması. **Sonuç:** `rehber-kapsam-listesi.ts` kurumun tüm öğrencilerinin görevlerini tek `in()` sorgusuyla çekiyor → en büyük kurumda 1464 > 1000, **bugün kesiliyor olabilir** (yanlış görev oranı / sessizlik). `rehber-takip-verisi.ts` 150'lik parça kullanıyor, parça başına ~1000 sınırına yakın (≈6,5 görev/öğrenci). RPC'ye geçiş bu yüzden öncelikli |
| Engel / açık soru | Rehber hesabıyla ekranda "Son tarama" etiketi ve Radar/Takip sayıları doğrulanmadı. Radar'daki "açık/toplam görev" sayıları artık son 30 gün (25 öğrencinin toplamı değişti, görev bayrağı değişmedi). Denemeler JS'te (695 satır, sınırın altında ama büyüyor) |
| Adım 4 doğrulaması (23.10) | Canlı veride RPC `son_hareket` eski üç-tablo mantığıyla 394/394 öğrencide aynı; görev bayrağı eski 1, yeni 1, değişen 0. 784/784 test, tsc, eslint temiz. RPC hatasında artık fırlatılıyor (eksik veriyle bildirim üretilmez) |
| Adım 5 (23.10) — Sınıf Analizi | `sinif-analizi-verisi.ts` kurumun tamamında soru/konu/görev satırlarını toplu `in()` ile çekip 1000'de kesiyordu (en büyük kurumda 1464 görev). Yeni RPC `sinif_analiz_ozeti` (0175) bunları veritabanında sayar; eski davranış birebir korundu (aktiflik penceresi adı 30 gün ama fiilen 28: eski sorgu yalnız son 28 günü çekiyordu). Canlı veride SQL mantığı eskiyle 394/394 öğrencide aynı (fonksiyon oluşturmadan düz SELECT ile). Kod `faz1-adim5-sinif` dalında (790/790 test, tsc, eslint temiz). **0175 canlıya uygulandı** (23.10, kullanıcı izniyle); ACL `{postgres, service_role}`, `public`/`anon`/`authenticated` EXECUTE yok; fonksiyon sonuçları bağımsız sorguyla aynı (394 öğrenci, aktiflik 1194, son dönem 405, önceki dönem 789, görev 1731 = 142 tamamlanan + 189 bekleyen + 1400 tamamlanmayan). Sıra izlendi: önce 0175, sonra main |
| Varsayılan dönem | `src/app/dashboard/page.tsx` varsayılanı "Aylık" yapıldı (kullanıcı kararı 23.10). Dikkat: `AnalizPaneli.tsx` tam analiz görünümünü (deneme trendi, regresyon) yalnız "Genel" (`tum`) dönemde gösteriyor; varsayılan Aylık olunca ilk açılışta yalnız dönem özeti çıkar, Genel `?donem=tum` ile seçilir. Admin kullanıcı sayfası (`yonetici/kullanici/[id]`) bilerek değişmedi |
| Süre ölçümü (23.10) | Canlı veritabanında (yalnız EXPLAIN ANALYZE): en yüklü öğrencinin soru sorgusu 0,75 ms, denemeleri 14,8 ms; 224 öğrencilik Radar RPC'si (`ogrenci_aktivite_ozeti`) 66 ms. **Veritabanı süresi sorun değil.** Öğrenci başına en çok 171 soru çözümü var (sınır 1000) → rapor B4 (öğrenci analizinde kesilme) bugün geçerli değil; `ogrenci_analiz_ozeti` RPC'si şimdilik gereksiz, bu yüzden yazılmadı. Asıl gecikme ağ: Vercel işlevleri `iad1` (ABD), Supabase `eu-west-3` (Paris), depoda `regions` ayarı yok; her sorgu turu bu mesafeyi öder. `vercel.json`'a `"regions": ["cdg1"]` eklemek en büyük kazanç (henüz yapılmadı, karar bekliyor). Uçtan uca 300 ms ölçülemedi (giriş gerektirir) |
| `schema.sql` (23.10) | Kullanımdan kaldırıldı: 215 KB, `drop table ... cascade` ile başlıyordu (çalıştırılırsa canlı tabloları siler), 0148'de kalmıştı, eski güvensiz RLS içeriyordu. Yerine uyarı + güncel döküm komutu konuldu (`supabase db dump`), README güncellendi. Canlıdan otomatik üretilemedi: `pg_dump`/CLI yok, bağlantı şifresi istenmedi; 270 KB'ı elle aktarmak yanlış referans riski taşırdı |
| Sonraki adım | (1) ~~0174~~ TAMAM. (2) ~~RPC'yi Radar/Takip'e bağla~~ TAMAM (Adım 4). (3) ~~`max_rows`~~ TAMAM. (4) ~~0175 + main~~ TAMAM (Adım 5). (5) `vercel.json` bölge kararı (`cdg1`). (6) Rehber hesabıyla ekranda doğrulama. (7) Bağımsız: `admin_audit_log` RLS hatası. (8) Gerekirse: `ogrenci_analiz_ozeti` (öğrenci başına satır 1000'e yaklaşırsa), deneme toplamasının DB'ye taşınması |

### M2 — Rehber Paneli: Risk ve Öncelik Sistemi
| Alan | Kayıt |
| --- | --- |
| Amaç | Net düşüşü, ders düşüşü, sessizlik ve biriken görevden **gerekçeli öncelik sıralaması** (tek risk puanı yok — 07.10.2026 kararı, 23.10'da teyit edildi); kart üzerinden hızlı aksiyon (görüşme, hatırlatma, ödev) |
| Çalışan AI | Önceki oturumlar (ChatGPT/Claude — sohbet kaydı erişilemedi) |
| Durum | Kısmen mevcut; canlı işleyiş testi yapılmadı |
| Son ilgili commit | 19–20 Ekim 2026 — "Rehber Takip Bildirimleri: ani net değişimi, ders düşüşü, sessizlik, biriken görev" (migration 0171 belirtiliyor); görüldü/ele alındı işlemleri |
| Bu oturumda yapılan | Yalnız durum kaydı |
| Engel / açık soru | Koddan doğrulandı (23.10): tek risk puanı **yok** ve bilinçli olarak yapılmamış (`src/lib/rehber-bayrak.ts:4-7`, kullanıcı kararı 07.10.2026 "bayrak sebep söyler, puan vermez"). Bildirimler 5 ayrı tür, JS'te hesaplanıyor; günlük cron 04:30 UTC + sayfa açılışında tarama. Karar hâlâ geçerli mi — kullanıcıya sorulacak |
| Sonraki adım | Mevcut bildirim tiplerini birleştiren öncelik sıralaması + aksiyon butonları tasarla |

### M3 — Öğrenci Paneli: Konu Kazanım Matrisi (LGS / YKS)
| Alan | Kayıt |
| --- | --- |
| Amaç | Konu bazlı hakimiyet yüzdesi, dönem trendi, ek çalışmanın net etkisi simülasyonu |
| Çalışan AI | — |
| Durum | Planlandı (Faz 2) |
| Son ilgili commit | Yok |
| Engel / açık soru | Konu/kazanım verisi hangi tabloda tutuluyor — doğrulanacak; `ORTAOKUL_LISE_IZLERI.md` okunacak |
| Sonraki adım | Veri modelini doğrula, matris bileşeni taslağı |

### M4 — Claude API Koçluk Motoru
| Alan | Kayıt |
| --- | --- |
| Amaç | Son 14 günden 3 maddelik güçlü yön / gelişim alanı / haftalık odak özeti; sonuç önbelleğe yazılır (ör. `student_insights`), her açılışta API çağrılmaz |
| Çalışan AI | — |
| Durum | Planlandı (Faz 3); Claude API altyapısı depoda mevcut |
| Son ilgili commit | Yok |
| Engel / açık soru | Maliyet sınırı ve tetikleme kuralı (haftalık mı, yeni deneme girişinde mi) kullanıcı kararı |
| Sonraki adım | Faz 1 sonrası |

### M5 — Sesli / Fotoğraflı Veri Girişi
| Alan | Kayıt |
| --- | --- |
| Amaç | Çalışma ve soru verisinin sesle/fotoğrafla girilmesi; analizin sürekli beslenmesi |
| Çalışan AI | — |
| Durum | Plan belgeleri var (`SESLI_VE_FOTO_VERI_GIRISI_IS_EMRI.md`, `KONU_CALISMA_SESLI_GIRIS_PLANI.md`); içerikleri incelenmedi |
| Son ilgili commit | Doğrulanmadı |
| Sonraki adım | İş emri belgelerini oku, uygulanma düzeyini koddan çıkar |

### M6 — PWA ve Mobil Bildirimler
| Alan | Kayıt |
| --- | --- |
| Amaç | Mobilde analiz kartları, çevrimdışı son özet, Web Push |
| Çalışan AI | — |
| Durum | Web Push/PWA depoda mevcut; analiz tarafı planlandı (Faz 4) |
| Başvuru belgeleri | `MOBIL_UYGULAMA_ANDROID_IOS_PLANI.md`, `PLAY_STORE_YAYIN_HAZIRLIGI.md` |
| Sonraki adım | Faz 2 sonrası |

### M7 — Admin ve Yönetim Ekranları
| Alan | Kayıt |
| --- | --- |
| Amaç | Yönetici iletişim, kullanıcı yönetimi, bekleyen işler, kurum yönetimi, duyurular |
| Çalışan AI | Önceki oturumlar |
| Durum | Son commit'lere göre yoğun geliştirilmiş; canlı doğrulama yapılmadı |
| Son ilgili commit | 19–20 Ekim 2026 — Admin menü düzeni (İletişim tek sayfa, Kullanıcılar/Site grupları, Bekleyen İşler, Kurumları Yönet sekmeleri); kuruma özel deneme süresi ve Kullanıcı Yönetimi; Duyurular (Site İçi/WhatsApp, WhatsApp Genel Duyuru kartı, dosya ekleme); yan menü düzeltmeleri; "Ajandam" → "Okul İşlemleri" |
| Başvuru belgesi | `docs/YONETIM_VE_ACIL_MUDAHALE.md` |
| Sonraki adım | Analiz modülüyle ilişkili "Bekleyen İşler" kartını risk sistemine bağla (M2) |

---

## 3. OTURUM GÜNLÜĞÜ

| Tarih | Araç / Oturum | Modül | Yapılan | Kontrol sonucu | Son commit |
| --- | --- | --- | --- | --- | --- |
| 23 Ekim 2026 | ChatLLM (Abacus AI Agent) | Genel | Analiz modülü için verimlilik raporu ve 4 fazlı plan; bu durum dosyası ve oturum protokolü oluşturuldu | Depo commit geçmişi okundu; kod okunmadı, test yapılmadı | 23 Eki — merkez proje dosyası eklendi |
| 23 Ekim 2026 | ChatLLM (Abacus AI Agent) | M1 (+M2, M4 notları) | Faz 1 keşfi (salt okunur): GitHub son commit kontrolü, migration/indeks/RLS, analiz veri yolları, 0171, Claude kullanımı; `FAZ1_KESIF_RAPORU.md` yazıldı | Kod okundu; canlı DB, test, build **yapılmadı**; depoda değişiklik yok | `ce4966d0` |
| 23 Ekim 2026 | ChatLLM (Abacus AI Agent) | M1 | Başlangıç protokolü (GitHub = `ce4966d0`, fark yok); Adım 0 ölçüm SQL'leri; Adım 1 (takip açılış taraması koşullu + son tarama etiketi, 0172) ve Adım 2 (0173 indeksler) yazıldı | 774/774 test, tsc, eslint temiz; build/ekran/canlı DB **yapılmadı**; **commit yok** (onay bekleniyor) | `ce4966d0` |
| 23 Ekim 2026 | ChatLLM (Abacus AI Agent) | M1 | Kullanıcı talimatıyla Adım 1 → `faz1-adim1` (`e76dc7a3`), Adım 2 → `faz1-adim2` (`ebfa412b`) ayrı commit; push denendi, 403 ile reddedildi | 774/774 test, tsc temiz, `next build` başarılı (sahte env); migration canlıya **uygulanmadı**; main'e dokunulmadı | `ce4966d0` (GitHub) |
| 23 Ekim 2026 | Claude Code (Claude PC) | M1 | Patch'ler ayrı worktree'lerde incelendi ve uygulandı; canlı DB salt okunur kontrol (0171 canlıda **yoktu**, `school_id` indeksi gereksiz bulundu); 0171, 0172, 0173 (yalnız `class_id`) canlıya uygulandı; iki dal `main`'e birleştirildi, push, Vercel READY | tsc, 774/774 test, eslint, Vercel build; ekranda deneme **yapılmadı**; `max_rows` ölçülmedi | `85936a91` |
| 23 Ekim 2026 | ChatLLM (Abacus AI Agent) | M1 | Adım 3: `origin/main` (`680bf5cd`) üzerinden `faz1-adim3-0174` dalı; 0172/0173 ve ilgili tabloları (`gorev_atamalari`, `gorevler`, `konu_calismalar`, `soru_cozumleri`, `denemeler`) okuyup `ogrenci_aktivite_ozeti` RPC'si (0174) yazıldı — öğrenci başına son hareket (pencereszsiz) + son 30 günün görev açık/toplam sayısı, `security definer`, yalnız servis anahtarıyla; `src/lib/ogrenci-aktivite.ts` (pencere sabiti + RPC satırı eşleştirme) ve testleri eklendi. RPC henüz `rehber-takip-verisi.ts`'e bağlanmadı | vitest 779/779 (72 dosya), `tsc --noEmit` temiz, eslint temiz; canlı DB'ye uygulanmadı, ekranda deneme yapılmadı, push edilmedi | `680bf5cd` (main, değişmedi) |
| 23 Ekim 2026 | Claude Code (Claude PC) | M1 | ChatLLM'in `faz1-adim3-0174` dalı incelendi; migration'da **güvenlik açığı** düzeltildi (EXECUTE PUBLIC'ten de kaldırıldı, `747de74`); 0174 canlıya uygulandı; yetkiler ve sonuç doğrulandı; dal `main`'e fast-forward alındı; durum dosyası güncellendi | 779/779 test, tsc, eslint; canlıda ACL ve bağımsız sorgu karşılaştırması temiz; RPC henüz uygulamaya bağlı değil, ekranda deneme **yapılmadı** | `main` (Adım 3 birleşimi) |
| 23 Ekim 2026 | Claude Code (Claude PC) | M1 | `max_rows = 1000` doğrulandı, canlı veriyle kesilme riski ölçüldü (en büyük kurum 1464 görev satırı); Adım 4: `ogrenci_aktivite_ozeti` RPC `rehber-kapsam-listesi.ts` ve `rehber-takip-verisi.ts`'e bağlandı (`ogrenciAktiviteOzetleriGetir`, 500'lük parçalar, hatada fırlatır); `faz1-adim4-baglama` `main`'e alındı | 784/784 test, tsc, eslint; canlı karşılaştırma: son_hareket 394/394 aynı, görev bayrağı değişen 0; ekranda deneme **yapılmadı** | `main` (Adım 4 birleşimi) |
| 23 Ekim 2026 | Claude Code (Claude PC) | M1 | Adım 5: Sınıf Analizi `sinif_analiz_ozeti` RPC'sine (0175) taşındı (`faz1-adim5-sinif`), varsayılan dönem Aylık, `schema.sql` kullanımdan kaldırıldı, README güncellendi; süre ölçümü (veritabanı hızlı, asıl gecikme ağ/bölge) | 790/790 test, tsc, eslint; canlı SQL karşılaştırması 394/394 aynı; 0175 kullanıcı izniyle canlıya uygulandı, ACL doğrulandı, dal main'e alındı; ekranda deneme yapılmadı | `main` (Adım 5 birleşimi) |

---

## 4. DEVİR NOTU

### Yurt kartı imzası düzeltmesi — Codex, 23 Ekim 2026

- Yerel dal: `codex/yurt-kart-nobetciler`; başlangıç temeli: `9120a6f8`. Yayın öncesi gelen PDF güncellemesi `cd3f493b` korunarak onun üzerine taşındı; birleşik durumda 74 dosyada 808 test geçti. Diğer açık çalışma klasörlerine dokunulmadı.
- Akşam yoklaması, çarşı ve evci izni kartlarında ortak imza artık **Nöbetçiler**. İsteğe bağlı ikinci nöbetçi alanı tüm kartlarda açık; müdür yardımcısına gönderimde de korunur. Veritabanı değişikliği gerekmez.
- Kontrol: 73 test dosyası / 792 test geçti; değişen dört kod dosyasında eslint ve `git diff --check` temiz. Next.js rota tipleri `next typegen` ile üretildikten sonra `tsc --noEmit --incremental false` temiz tamamlandı.
- Kullanıcı 23 Ekim 2026'da canlıya alma onayı verdi. Bu düzeltme ayrı dalda hazırlanıp güncel `origin/main` ile karşılaştırıldı; yalnız bu kayıtta belirtilen dosyalar yayına gönderilecek. Yayın sonucu ilgili commit'in Vercel kontrolünden izlenmeli. Veritabanı değişikliği yok. Gerçek hesapla kart önizleme/paylaşma doğrulanmadı. Eski indirilmiş/paylaşılmış resimler değişmez; kart yeniden oluşturulmalı.

> **Canlıya alma: Claude.** Son kontrol ve canlıya alma Claude'dadır. Migration'ların canlı veritabanına uygulanması, Claude kontrolünden sonra yalnızca kullanıcının onayıyla yapılır. Diğer AI'lar `main`'e push etmez, migration uygulamaz.

| Alan | Kayıt |
| --- | --- |
| Tamamlanmamış iş | Faz 1 Adım 1–5 **canlıda** (0171–0175 uygulandı; Sınıf Analizi RPC, varsayılan Aylık, schema.sql kaldırma main'de). Açık: `vercel.json` bölge kararı (`cdg1`), rehber hesabıyla ekranda doğrulama |
| Dallar / commit'ler | Adım 1 → `b2b0d06b` (birleşim; asıl commit `57d9f9b`), Adım 2 → `85936a91` (birleşim; asıl commitler `35a30b9` + `f24f391`). `main` = `680bf5cd` (bu dosyanın 23.10 commit'i). Adım 3 → dal `faz1-adim3-0174` (ChatLLM yazdı, GitHub'a push etti), commit'ler `a12e967a` (migration 0174), `5c46a3fe` (TS yardımcıları + testler), `747de74` (Claude: EXECUTE yetkisi düzeltmesi); `main`'e fast-forward alındı |
| Aktif dosyalar (başka AI dokunmasın) | Şu an kilitli iş yok. RPC işi devam ederse: `src/lib/analiz.ts`, `rehber-takip-verisi.ts`, `rehber-kapsam-listesi.ts`, `sinif-analizi-verisi.ts`, `src/lib/ogrenci-aktivite.ts` |
| Migration durumu | 0171, 0172, 0173 **canlıda uygulandı** (23.10.2026, Supabase `sg-educoach`). 0174 (`ogrenci_aktivite_ozeti` RPC) de **canlıda uygulandı** (23.10.2026). Bir sonraki numara **0175** |
| Doğrulama (0174) | vitest 779/779 (72 dosya), `tsc --noEmit` temiz, eslint temiz. Canlıda: ACL `{postgres, service_role}`; `public`/`anon`/`authenticated` EXECUTE **yok**; sonuç bağımsız sorguyla birebir uyuştu (394 öğrenci, son 30 günde 1447 görev, 189 açık, uyuşmayan 0). Ekranda/entegrasyonda deneme **yapılmadı** (RPC henüz bağlı değil). Not: yeni fonksiyonlarda EXECUTE varsayılan olarak PUBLIC'e verilir; her yeni RPC `revoke ... from public, anon, authenticated` içermeli |
| Claude PC'sinde commit edilmemiş dosyalar | `.claude/launch.json`, `src/app/signup/SignupForm.tsx`, `src/app/signup/dershane-actions.ts` (bu işle ilgisiz, dokunulmadı, push edilmesin) |
| Diğer bilgisayarda aktif iş | Bilinmiyor |
| Kullanıcı kararı bekleyenler | Rehber hesabıyla ekranda doğrulama; `max_rows` ölçümü için Supabase API ayarı bakışı |
| Bir sonraki oturum ilk işi | Bölüm 0 protokolü → `vercel.json` bölge kararı → rehber/müdür hesabıyla ekranda doğrulama (Radar, Takip Bildirimleri, Sınıf Analizi, varsayılan Aylık) → Faz 2 |

## 5. KISA YÖNLENDİRME (yeni oturuma yapıştırılacak)

"sefukoc.com çalışmasına başla. Önce GitHub commit geçmişine (SGEducoach/sf-educoach, main) bak, sonra SEFUKOC_GUNLUK_DURUM.md ve SEFUKOC_MERKEZ_PROJE.md dosyalarını oku, bana 5 satırlık güncel durum raporu ver. Doğrulanmamış işi tamamlanmış sayma. Bitirirken aynı durum dosyasını güncelle."
