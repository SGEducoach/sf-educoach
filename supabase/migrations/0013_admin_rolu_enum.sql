-- SG EduCoach — admin rolü (tek kontrol noktası; müdür artık gözlemci).
-- Postgres kısıtı: yeni enum değeri eklendiği transaction içinde
-- KULLANILAMAZ. Bu yüzden enum eklemesi ayrı bir dosyada/çalıştırmada,
-- onu kullanan her şey (0014) ayrı bir sonraki çalıştırmada olmalı.

alter type public.user_role add value if not exists 'admin';
