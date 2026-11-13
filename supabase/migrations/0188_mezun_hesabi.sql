-- Mezun hesabı (kullanıcı kararı 13.11.2026): mezun, kullanıcı listesinde
-- öğrenci/öğretmen/veli gibi ayrı bir tür. 12. sınıfı bitiren öğrencinin
-- hesabı silinmez, "mezun" rolüne geçer: şifresi ve girişi (okul + numara)
-- korunur, kendi iletişim/üniversite/meslek bilgisini günceller, eski deneme
-- geçmişini salt okunur görür. Mezun Takip kaydı (migration 0184,
-- mezunlar.student_id) aynı anda oluşturulur; rehberlik ve müdür onu görür.
--
-- Mezun sınıftan çıkar: students.class_id ve okul_ogrenci_listesi.class_id
-- yalnız mezun için boş kalır. Böylece sınıfa göre çalışan her şey (ödev
-- atama, yoklama, sınıf listeleri, sınıf analizi, SMS/duyuru alıcıları)
-- mezunu kendiliğinden dışarıda bırakır. Okul listesi satırı SİLİNMEZ:
-- silmek yazılı sınav sonuçlarını (ON DELETE CASCADE) da silerdi.
--
-- Mezun etme ve geri alma yalnız sunucuda (service_role) yapılır:
-- src/lib/mezun-hesap.ts. Hiçbir RLS politikası 'ogrenci' rolüne bakmadığı
-- için (has_student_access kimliğe bakar) mezun kendi verisini okumaya devam
-- eder; öğretmen/müdür erişimi de değişmez.

alter type public.user_role add value if not exists 'mezun';

alter table public.students alter column class_id drop not null;
alter table public.okul_ogrenci_listesi alter column class_id drop not null;
