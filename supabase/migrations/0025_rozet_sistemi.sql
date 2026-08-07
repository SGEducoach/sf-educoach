-- Rozet sistemi: son 30 gün içinde en az bir veri girişi (konu çalışma/
-- soru çözümü/deneme) yapılan GÜN sayısına göre Bronz(15)/Gümüş(20)/
-- Altın(30) rozeti. "Gün" için tarih (created_at değil) kullanılıyor —
-- öğrenci geçmiş bir gün için de girebildiği için (bkz. migration öncesi
-- eklenen "geçmiş tarih için gir" özelliği) doğru gün budur.
--
-- Rozet kazanımı SADECE rozet_kontrol_et() RPC'si üzerinden yazılabiliyor
-- (security definer) — student_badges'e doğrudan client insert policy'si
-- YOK, böylece bir öğrenci eşiği sağlamadan kendine rozet yazamaz.

create table public.student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  badge_id text not null check (badge_id in ('bronz', 'gumus', 'altin')),
  earned_at date not null default current_date,
  unique (student_id, badge_id)
);

create index on public.student_badges (student_id);

alter table public.student_badges enable row level security;

create policy "student_badges_select" on public.student_badges
  for select using (public.has_student_access(student_id));

create policy "student_badges_select_any_teacher" on public.student_badges
  for select using (public.is_ogretmen());

create or replace function public.ogrenci_aktif_gun_sayisi_pencere(p_student_id uuid, p_gun_sayisi int)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(distinct tarih)::int from (
    select tarih from public.konu_calismalar where student_id = p_student_id and tarih >= current_date - p_gun_sayisi
    union
    select tarih from public.soru_cozumleri where student_id = p_student_id and tarih >= current_date - p_gun_sayisi
    union
    select tarih from public.denemeler where student_id = p_student_id and tarih >= current_date - p_gun_sayisi
  ) t;
$$;

revoke all on function public.ogrenci_aktif_gun_sayisi_pencere(uuid, int) from public;
grant execute on function public.ogrenci_aktif_gun_sayisi_pencere(uuid, int) to authenticated;

create or replace function public.rozet_kontrol_et(p_student_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aktif_gun int;
  v_yeni text[] := '{}';
begin
  if p_student_id <> auth.uid() then
    raise exception 'Yetkisiz.';
  end if;

  select public.ogrenci_aktif_gun_sayisi_pencere(p_student_id, 30) into v_aktif_gun;

  if v_aktif_gun >= 15 and not exists (select 1 from public.student_badges where student_id = p_student_id and badge_id = 'bronz') then
    insert into public.student_badges (student_id, badge_id) values (p_student_id, 'bronz');
    v_yeni := array_append(v_yeni, 'bronz');
  end if;
  if v_aktif_gun >= 20 and not exists (select 1 from public.student_badges where student_id = p_student_id and badge_id = 'gumus') then
    insert into public.student_badges (student_id, badge_id) values (p_student_id, 'gumus');
    v_yeni := array_append(v_yeni, 'gumus');
  end if;
  if v_aktif_gun >= 30 and not exists (select 1 from public.student_badges where student_id = p_student_id and badge_id = 'altin') then
    insert into public.student_badges (student_id, badge_id) values (p_student_id, 'altin');
    v_yeni := array_append(v_yeni, 'altin');
  end if;

  return v_yeni;
end;
$$;

revoke all on function public.rozet_kontrol_et(uuid) from public;
grant execute on function public.rozet_kontrol_et(uuid) to authenticated;
