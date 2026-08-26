-- Kullanıcı bulgusu (26.08.2026): admin panelinde "Kurallar" sekmesi hep
-- "Yükleniyor..." gösteriyordu. Kök neden startTransition eksikliği DEĞİLDİ
-- (o düzeltme zaten yapılmıştı, "Platform durumu" için işe yaradığı
-- doğrulandı) — canlı veritabanında app_ayarlari tablosu tamamen BOŞ
-- çıktı. Migration 0022 bu tabloyu oluşturup varsayılan kurallar_metni/
-- kurallar_versiyon satırlarını eklemesi gerekiyordu ama muhtemelen hiç
-- çalıştırılmamış (uygulama kodunda bu tabloya tek yazma yolu
-- kurallarGuncelle'nin upsert'i — hiçbir yerde silme/truncate yok, yani
-- veri sonradan silinmiş değil, hiç girilmemiş). Bu migration sadece
-- eksik varsayılan satırları yeniden ekliyor; tablo/politika zaten var
-- (0022'deki create table/policy tekrar çalıştırılsa da "if not exists"/
-- "drop+create" sayesinde zararsız, ama burada sadece insert yeterli).
insert into public.app_ayarlari (anahtar, deger) values
  ('kurallar_versiyon', 'v1'),
  ('kurallar_metni', $$SG EduCoach'a hoş geldiniz. Platforma kayıt olarak veya bir öğrencinin verisine veli olarak bağlanarak aşağıdaki kuralları kabul etmiş sayılırsınız.

1. HESAP VE BİLGİ DOĞRULUĞU
Ad, telefon, okul/sınıf, e-posta gibi bilgileri doğru ve güncel girmekle yükümlüsünüz. Öğrenci hesapları okul numarası + şifre, öğretmen hesapları e-posta + şifre, veli hesapları ise öğretmen onaylı bir kod ile açılır. Hesabınızın ve şifrenizin güvenliğinden siz sorumlusunuz; şifrenizi başkasıyla paylaşmayın.

2. ROLLER VE YETKİLER
- Öğrenci: yalnızca kendi verisini girer ve görür.
- Öğretmen: kendi sınıfının öğrencilerine görev/onay verebilir; diğer sınıfları yalnızca görüntüleyebilir (salt okunur).
- Sınıf öğretmenliği ataması, kayıt sırasında kendiliğinden yapılamaz; yalnızca okul yönetimi (admin) tarafından atanır.
- Müdür: kendi okulundaki verileri görüntüleyebilir (gözlemci); kontrol yetkileri (sınıf ekleme, sınıf öğretmeni atama) platform yöneticisine (admin) aittir.
- Veli: onay kodunu aldığı öğrencinin akademik verilerini görüntüleyebilir.

3. VELİ ONAYI (18 YAŞ ALTI ÖĞRENCİLER)
Öğrenci 18 yaşından küçükse, verilerinin veli tarafından görüntülenebilmesi için velinin ayrıca KVKK Aydınlatma Metni'ni onaylaması gerekir.

4. VERİ TOPLAMA VE KULLANIM AMACI
Platform; konu çalışması, soru çözümü, deneme sonuçları, motivasyon ve haftalık verimlilik gibi akademik verileri, öğrencinin gelişiminin takip edilmesi ve ilgili öğretmen/veli ile paylaşılması amacıyla toplar. Veriler yalnızca öğrencinin kendisi, bağlı olduğu öğretmen(ler), velisi ve okul yönetimiyle paylaşılır; üçüncü taraflarla paylaşılmaz. Ayrıntılar için KVKK Aydınlatma Metni'ne bakınız.

5. BİLDİRİMLER
Hatırlatma ve bilgilendirme amacıyla e-posta ve (izin verirseniz) anlık bildirim gönderilebilir. Bildirim izinlerini istediğiniz zaman cihaz/tarayıcı ayarlarından kapatabilirsiniz.

6. YASAKLI KULLANIM
Başkası adına veya başkasının bilgileriyle kayıt olmak, başka bir kullanıcının hesabına izinsiz erişmeye çalışmak, sisteme yanlış/yanıltıcı veri girmek ve platformun işleyişini bozmaya yönelik her türlü davranış yasaktır. Bu kurallara aykırı kullanım tespit edilirse hesabınız uyarılmadan askıya alınabilir.

7. DEĞİŞİKLİKLER
Bu kurallar ve platformun işleyişi zaman içinde güncellenebilir; önemli değişikliklerde kayıt sırasında tekrar onayınız istenir.

Sorularınız için: sg.educoach@gmail.com$$)
on conflict (anahtar) do nothing;
