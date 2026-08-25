-- Kullanıcı hata bildirimi (2026-08-25, Hüseyin Yıldız — okul müdürü
-- sayfasında): "Bu okulun raporunu görme yetkiniz yok." (konu_zayiflik_raporu
-- RPC, migration 0054). Kök neden migration 0067'de bulduğumuzla AYNI:
-- okul müdürleri hesap açılırken OTOMATİK olarak school_moderators'a
-- eklenmiyor (sadece dershane müdürü ekleniyor, bkz. handle_new_user
-- trigger yorumu) — is_school_moderator() bu tabloya bakıyor, dolayısıyla
-- okul müdürünü kapsamıyor.
--
-- Migration 0067'de bunu SADECE ogretmen_ders_programi için ayrı bir
-- politikayla çözmüştük. Bu aynı boşluk platformda is_school_moderator()
-- kullanan HER yerde tekrar tekrar çıkacaktı (konu_zayiflik_raporu,
-- yurt_nobeti, students/teachers/veli_link_requests "school moderator"
-- politikaları...). Kalıcı çözüm: is_school_moderator()'ın KENDİSİNİ
-- genişletmek — "aynı okulun müdürü" de artık moderatör sayılıyor. Bu,
-- müdürün zaten kavramsal olarak moderatörden daha az değil daha çok
-- yetkiye sahip olması gerektiği fikriyle tutarlı. /moderator PANELİNE
-- giriş (requireModerator, TypeScript) BU FONKSİYONU kullanmıyor — o
-- school_moderators tablosuna doğrudan bakıyor, bu yüzden müdür hâlâ
-- /moderator paneline eklenmiş olmuyor, sadece salt-okunur rapor/veri
-- görünürlüğü genişliyor.
create or replace function public.is_school_moderator(p_school_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.school_moderators
    where profile_id = auth.uid() and school_id = p_school_id
  ) or exists (
    select 1 from public.teachers t
    join public.profiles p on p.id = t.id
    where t.id = auth.uid() and t.school_id = p_school_id and p.role = 'mudur'
  );
$$;
