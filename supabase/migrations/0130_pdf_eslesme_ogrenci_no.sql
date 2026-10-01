-- PDF deneme eşleştirme kuyruğuna öğrenci numarası.
--
-- Neden (01.10.2026, canlı veride bulundu): kuyruk satırları yalnız HAM ADLA
-- ayırt ediliyordu. Tek bir Kafa Dengi yüklemesinde PDF'teki İKİ ayrı
-- "MEHMET ŞAHİN" satırı, kurumdaki TEK Mehmet Şahin hesabına otomatik
-- yazıldı; ikisinin netleri farklıydı, biri sessizce düştü. Yönetici ekranı
-- da iki satırı yan yana gösterdiğinde hangisinin kimin olduğunu
-- söyleyemiyordu — ayırt edici bir alan yoktu.
--
-- PDF'in kendi öğrenci numarası okul listesi biçimlerinde zaten
-- ayrıştırılıyor (bkz. PdfOgrenciSonucu.ogrenci_no); burada saklanmıyordu.
-- Saklanınca hem ekranda adaşlar ayırt edilebiliyor hem de tekrar
-- yüklemelerde "aynı satır mı" kararı ada değil ada+numaraya bakıyor.
--
-- NOT: bilerek UNIQUE kısıt EKLENMEDİ. (kurum, ad, yayınevi, tarih, tür)
-- gerçek hayatta tekil DEĞİL — aynı adı taşıyan iki ayrı öğrencinin aynı
-- denemede iki ayrı satırı olabiliyor (yukarıdaki olay tam olarak bu).
-- Tekil kısıt bu iki kişiyi tek satıra çökertir ve birinin sonucunu yok eder.

alter table public.pdf_deneme_eslesme_bekleyenler
  add column if not exists ogrenci_no integer;

comment on column public.pdf_deneme_eslesme_bekleyenler.ogrenci_no is
  'PDF''te yazan öğrenci numarası (varsa). Adaş öğrencileri ayırt etmek için; kurumdaki students.okul_no ile aynı şey değildir.';

-- Yönetici ekranı kurum + deneme süzgeciyle çalışıyor; satır sayısı yükleme
-- başına 100+ artıyor.
create index if not exists pdf_eslesme_kurum_deneme_idx
  on public.pdf_deneme_eslesme_bekleyenler (school_id, tarih, tur, created_at desc);
