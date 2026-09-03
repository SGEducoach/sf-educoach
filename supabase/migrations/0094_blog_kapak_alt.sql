-- Blog kapak görseli için alt metin (03.09.2026 kullanıcı isteği). Taslak
-- şablonunda "Görsel alt metni" alanı vardı ama tabloda karşılığı yoktu.
-- Alt metin hem erişilebilirlik (ekran okuyucu) hem de görsel aramada
-- indekslenme için gerekli.
--
-- Not: "URL kısa adı" için yeni sütun gerekmiyor — slug sütunu zaten var,
-- yalnızca yönetim formunda düzenlenebilir hâle getirildi.

alter table public.blog_yazilari
  add column if not exists kapak_alt text
  check (kapak_alt is null or char_length(kapak_alt) <= 200);
