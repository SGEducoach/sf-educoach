-- 2026-08-25 kullanıcı isteği: "dershane ve okul müdürü öğretmenlerin
-- programlarını görsün". Dershane müdürü zaten ders_programi_select_moderator
-- (migration 0066) ile görebiliyordu çünkü dershane müdürü hesap
-- oluşturulurken OTOMATİK olarak school_moderators'a ekleniyor (bkz.
-- handle_new_user trigger'ı). OKUL müdürleri ise bu satırı OTOMATİK
-- ALMIYOR ("DERSHANE MODU: ... okul müdürleri etkilenmez" — aynı trigger
-- yorumu) — admin onları ayrıca moderatör yapmadıkça mevcut politika okul
-- müdürünü kapsamıyordu. Bu politika moderatör atamasına bağımlı olmadan
-- doğrudan "aynı okulun müdürü mü" kontrolü yapıyor.
create policy "ders_programi_select_mudur" on public.ogretmen_ders_programi
  for select using (
    exists (
      select 1 from public.teachers hedef
      join public.teachers ben on ben.school_id = hedef.school_id
      join public.profiles p on p.id = ben.id
      where hedef.id = ogretmen_ders_programi.teacher_id
        and ben.id = auth.uid()
        and p.role = 'mudur'
    )
  );
