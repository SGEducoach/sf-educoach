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
| Depodaki son commit (bu kayıt anı) | `85936a91` — 23 Ekim 2026 — "Faz 1 Adım 2: students(class_id) indeksi (0173)" (main; Faz 1 Adım 1 + 2 birleşimi). Bu dosyanın kendi commit'i bunun üzerindedir |
| Önceki işlevsel commit | 21 Ekim 2026 — Ana sayfa rol kartları giriş ekranlarına bağlandı (1eb2488) |
| Teknoloji | Next.js 16, TypeScript, Tailwind v4, Supabase, Claude API, Resend, Web Push/PWA |
| Canlı yayın doğrulaması | Vercel production `85936a91` READY (sefukoc.com, www.sefukoc.com); ekranda deneme **yapılmadı** |
| Canlı veritabanı (Supabase `sg-educoach`) | 0149–0170 canlıda var (elle uygulanmış, `list_migrations` 0148'de kalıyor, yanıltıcı). 0171, 0172, 0173 23.10.2026'da uygulandı. students: 394 satır |
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
| Durum | Adım 1 ve 2 **canlıda** (kod + 0171/0172/0173). Adım 0 canlı ölçümü kısmen yapıldı (indeksler, tablolar); **`max_rows` ölçülmedi**. Ekranda deneme yapılmadı. RPC adımları (Adım 3+) başlamadı |
| Son ilgili commit | `85936a91` (main), öncesinde `b2b0d06b` (Adım 1 birleşimi). Dallar: `faz1-adim1`, `faz1-adim2` yalnız yerelde (Claude'un PC'sinde) |
| Kullanıcı kararları (23.10) | Görev birikmesi son 30 gün (tek sabit) · analiz varsayılanı "Aylık", "Tüm zamanlar" seçenek · tek risk puanı yok, M2 = gerekçeli öncelik sıralaması · `schema.sql` Adım 0 sonrası canlıdan `pg_dump --schema-only` ile yeniden üretilecek |
| Migration numaraları | 0171 = rehber_takip_bildirimleri (20.10'da kodla gitti ama canlıya **23.10'a kadar uygulanmamıştı**; Takip Bildirimleri canlıda çalışmıyordu), 0172 = rehber_takip_taramalari (Adım 1), 0173 = `students(class_id)` indeksi (Adım 2; `school_id` için ayrı indeks gereksiz, `(school_id, okul_no)` birleşik indeksi var). Planlanan RPC'ler **0174+** |
| Mevcut yapı (koddan) | Analizde RPC/view yok; tüm toplama JS'te (`src/lib/analiz.ts`, `konu-hakimiyeti.ts`, `sinif-analizi-verisi.ts`, `rehber-kapsam-listesi.ts`, `rehber-takip-verisi.ts`). İndeks: `(student_id, tarih)` üç ana tabloda var; `students(school_id/class_id)` indeksi bulunamadı. `schema.sql` migration'lardan geride (en yüksek referans 0148). Çift `0167` numarası var |
| Önceki oturum (23.10, 1. oturum) | Faz 1 keşfi: migration/indeks/RLS envanteri, analiz sayfalarının veri yolu, 0171 takip mantığı, Claude kullanımı. Rapor: `FAZ1_KESIF_RAPORU.md` (15 bulgu + 3 UX notu, uygulama sırası) |
| En kritik bulgular | (1) Rehber/sınıf toplu sorguları tüm geçmişi sınırsız çekiyor → 1000 satır sınırında sessiz kesilme riski (yanlış "sessizlik", görev oranı). (2) Takip Bildirimleri sayfası her açılışta tam kurum taraması bekliyor (`page.tsx:1042`). (3) Öğrenci analizi "Tüm zamanlar"da ham satırları sınırsız çekiyor |
| Bu oturumda yapılan (23.10, 2. oturum) | `FAZ1_ADIM0_OLCUM.sql` (salt okunur ölçüm S1–S6). Adım 1: takip sayfası açılış taraması yalnız son tarama 26 saatten eskiyse; "Son tarama" etiketi + tarama hatası uyarısı; cron/"Şimdi tara"/sayfa tarama zamanını 0172 tablosuna yazar; tablo yoksa eski davranış. Adım 2: 0173 `students(school_id)`, `(class_id)` (if not exists). Yamalar: `FAZ1_ADIM1_TAKIP_TARAMA.patch`, `FAZ1_ADIM2_STUDENTS_INDEKS.patch` |
| Kontroller (Claude, 23.10) | Birleşik halde vitest 71 dosya / 774 test geçti, `tsc --noEmit` temiz, eslint temiz. Yerel `next build` ortam sorunuyla (junction + Turbopack) çalışmadı; gerçek build Vercel'de başarılı (READY). Canlı: 0171/0172 tabloları RLS açık, politikasız (servis anahtarıyla erişim, istenen); `students_class_id_idx` doğrulandı. Son 1 saat runtime hatası: yalnız eski bir `admin_audit_log` RLS ihlali (bu işle ilgisiz) |
| Engel / açık soru | `max_rows` canlıda ölçülmedi (PostgREST ayarı; SQL ile okunamadı, Supabase API ayarlarından bakılmalı veya 1000+ satırlık bir sorguyla sınanmalı). Rehber hesabıyla ekranda "Son tarama" etiketi doğrulanmadı |
| Sonraki adım | (1) `max_rows` ölçümü. (2) `ogrenci_aktivite_ozeti` RPC (0174, görev penceresi 30 gün, `security definer` ise kurum kontrolü fonksiyon içinde) → `ogrenci_analiz_ozeti` RPC (0175) + varsayılan "Aylık". (3) `schema.sql` canlıdan yeniden üretimi. (4) Bağımsız not: `admin_audit_log` RLS hatası incelenecek |

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

---

## 4. DEVİR NOTU

> **Canlıya alma: Claude.** Son kontrol ve canlıya alma Claude'dadır. Migration'ların canlı veritabanına uygulanması, Claude kontrolünden sonra yalnızca kullanıcının onayıyla yapılır. Diğer AI'lar `main`'e push etmez, migration uygulamaz.

| Alan | Kayıt |
| --- | --- |
| Tamamlanmamış iş | Faz 1 Adım 1–2 **tamamlandı ve canlıda**. Açık: `max_rows` ölçümü, ekranda doğrulama, RPC adımları (0174+), `schema.sql` yeniden üretimi |
| Dallar / commit'ler | Adım 1 → `b2b0d06b` (birleşim; asıl commit `57d9f9b`), Adım 2 → `85936a91` (birleşim; asıl commitler `35a30b9` + `f24f391`). `main` = `85936a91` + bu dosyanın commit'i. `faz1-adim1`, `faz1-adim2` dalları yalnız Claude PC'sinde, push edilmedi |
| Aktif dosyalar (başka AI dokunmasın) | Şu an kilitli iş yok. RPC işi başlarsa: `src/lib/analiz.ts`, `rehber-takip-verisi.ts`, `rehber-kapsam-listesi.ts`, `sinif-analizi-verisi.ts` |
| Migration durumu | 0171, 0172, 0173 **canlıda uygulandı** (23.10.2026, Supabase `sg-educoach`). Bir sonraki numara **0174** |
| Doğrulama | vitest 774/774, `tsc` temiz, eslint temiz, Vercel build READY. Ekranda deneme **yapılmadı** |
| Claude PC'sinde commit edilmemiş dosyalar | `.claude/launch.json`, `src/app/signup/SignupForm.tsx`, `src/app/signup/dershane-actions.ts` (bu işle ilgisiz, dokunulmadı, push edilmesin) |
| Diğer bilgisayarda aktif iş | Bilinmiyor |
| Kullanıcı kararı bekleyenler | Rehber hesabıyla ekranda doğrulama; `max_rows` ölçümü için Supabase API ayarı bakışı |
| Bir sonraki oturum ilk işi | Bölüm 0 protokolü → `max_rows` ölçümü → Adım 3 (RPC 0174) → `schema.sql` yeniden üretimi |

## 5. KISA YÖNLENDİRME (yeni oturuma yapıştırılacak)

"sefukoc.com çalışmasına başla. Önce GitHub commit geçmişine (SGEducoach/sf-educoach, main) bak, sonra SEFUKOC_GUNLUK_DURUM.md ve SEFUKOC_MERKEZ_PROJE.md dosyalarını oku, bana 5 satırlık güncel durum raporu ver. Doğrulanmamış işi tamamlanmış sayma. Bitirirken aynı durum dosyasını güncelle."
