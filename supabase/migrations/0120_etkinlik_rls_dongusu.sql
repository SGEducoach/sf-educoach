-- ÜRETİM HATASI (20.09.2026): "infinite recursion detected in policy for
-- relation etkinlik_grup_uyeleri" — Program Yap ekranını açan öğrenci
-- (oto-program-veri.ts, etkinlik_calisma_atamalari → etkinlik_calismalari
-- join'i) hiç veri alamıyordu.
--
-- Kök neden: iki politika birbirini çağırıyordu.
--   etkinlik_gruplari   politikası  → etkinlik_grup_uyeleri'ni okuyor
--   etkinlik_grup_uyeleri politikası → etkinlik_gruplari'nı okuyor
-- Politika içindeki alt sorgular hedef tablonun RLS'ini yeniden tetiklediği
-- için döngü kapanıyor. etkinlik_calismalari ve etkinlik_calisma_atamalari
-- da bu iki tabloya baktığı için aynı döngüye giriyordu.
--
-- Çözüm: üyelik/öğretmenlik kontrolleri SECURITY DEFINER yardımcı
-- fonksiyonlara taşındı (fonksiyon gövdesi RLS'i yeniden tetiklemez).
-- Görünürlük kuralları AYNI: öğretmen kendi grubunu, öğrenci üyesi olduğu
-- grubu görür.

create or replace function public.etkinlik_grubu_ogretmeni_mi(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.etkinlik_gruplari g
    where g.id = p_group_id and g.teacher_id = auth.uid()
  );
$$;

create or replace function public.etkinlik_grubu_uyesi_mi(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.etkinlik_grup_uyeleri u
    where u.group_id = p_group_id and u.student_id = auth.uid()
  );
$$;

create or replace function public.etkinlik_calismasinin_ogretmeni_mi(p_calisma_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.etkinlik_calismalari c
    join public.etkinlik_gruplari g on g.id = c.group_id
    where c.id = p_calisma_id and g.teacher_id = auth.uid()
  );
$$;

-- Politika yardımcıları anon/authenticated tarafından çalıştırılabilir
-- olmalı (yoksa politika değerlendirilemez); auth.uid() dışında hiçbir
-- şey döndürmüyorlar.
grant execute on function public.etkinlik_grubu_ogretmeni_mi(uuid) to anon, authenticated;
grant execute on function public.etkinlik_grubu_uyesi_mi(uuid) to anon, authenticated;
grant execute on function public.etkinlik_calismasinin_ogretmeni_mi(uuid) to anon, authenticated;

drop policy if exists "etkinlik_grup_select" on public.etkinlik_gruplari;
create policy "etkinlik_grup_select" on public.etkinlik_gruplari
  for select using (
    teacher_id = auth.uid() or public.etkinlik_grubu_uyesi_mi(id)
  );

drop policy if exists "etkinlik_uye_select" on public.etkinlik_grup_uyeleri;
create policy "etkinlik_uye_select" on public.etkinlik_grup_uyeleri
  for select using (
    student_id = auth.uid() or public.etkinlik_grubu_ogretmeni_mi(group_id)
  );

drop policy if exists "etkinlik_calisma_select" on public.etkinlik_calismalari;
create policy "etkinlik_calisma_select" on public.etkinlik_calismalari
  for select using (
    public.etkinlik_grubu_ogretmeni_mi(group_id) or public.etkinlik_grubu_uyesi_mi(group_id)
  );

drop policy if exists "etkinlik_atama_select" on public.etkinlik_calisma_atamalari;
create policy "etkinlik_atama_select" on public.etkinlik_calisma_atamalari
  for select using (
    student_id = auth.uid() or public.etkinlik_calismasinin_ogretmeni_mi(calisma_id)
  );
