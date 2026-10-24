-- 0179'daki "okul numarasıyla otomatik bağla" tetikleyicisi yeterince güvenli
-- değil: canlı veride numarası eşleşen 535 satırın 41'inde ad ya da sınıf
-- uyuşmuyor (numara yazım hatası ya da yanlış öğrenci olabilir; adaş tuzağı
-- kuralı: ad tek başına kimlik değil, numara da tek başına yetmez).
-- Bağlama kararı artık uygulama kodunda verilir (ad benzerliği + sınıf seviyesi
-- + numara birlikte; bkz. src/lib/on-kayitli.ts numarayaGoreListeBaglantisi) —
-- ad benzerliği "ikinci ad eksik / kısaltılmış" yazımları tanıyor, SQL'de yok.
-- Şüpheli eşleşmeler yönetici onayına düşer.
drop trigger if exists pdf_eslesme_listeye_bagla on public.pdf_deneme_eslesme_bekleyenler;
drop function if exists public.pdf_eslesme_listeye_bagla();
