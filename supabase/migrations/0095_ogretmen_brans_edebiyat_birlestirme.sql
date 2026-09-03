-- Öğretmen branşında "Türkçe" ve "Edebiyat" birleştirildi (03.09.2026
-- kullanıcı isteği). Lisede branş tektir; MEB'deki resmî adı "Türk Dili ve
-- Edebiyatı". Ayrı bir "Türkçe öğretmeni" branşı ortaokula aittir, bu
-- platform lise/YKS odaklı olduğu için listede iki seçenek bulunması
-- kafa karıştırıyordu.
--
-- KAPSAM UYARISI: burada değişen SADECE öğretmenin branş etiketi
-- (teachers.brans). Ders/konu taksonomisinde Türkçe (TYT) ve Edebiyat
-- (AYT) AYRI KALIYOR — gerçek sınavda ayrı bölümler ve konu listeleri,
-- TYT/AYT görünüm filtreleri ile net ağırlıkları buna dayanıyor
-- (bkz. src/lib/konu-hakimiyeti.ts, analiz-motoru.ts,
-- mufredat-konulari.json). Bu migration onlara dokunmuyor.
--
-- teachers.brans serbest metin (CHECK/enum yok), bu yüzden veri taşıması
-- düz bir UPDATE ile yeterli.

update public.teachers
set brans = 'Türk Dili ve Edebiyatı'
where brans in ('Türkçe', 'Edebiyat');
