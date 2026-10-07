-- Rehberlik Servisi ayrı bir BİRİM (kullanıcı kararı 07.10.2026):
-- "rehberlik kısmını bir öğretmen değil de müdür gibi ayrı bir birim olarak
-- tekrar kuralım... rehber öğretmen bir branş öğretmeni değil ve okuldaki
-- sayılarına göre kademeleri aralarında paylaşabiliyorlar."
--
-- NEDEN TABLO, NEDEN YENİ ROL DEĞİL: rehberin kimliği bugüne kadar
-- teachers.brans = 'Rehber Öğretmen' sihirli metniydi — yani rehber bir
-- BRANŞTI. Kimlik buradan alınıp school_moderators ile birebir aynı desende
-- bir ÜYELİK tablosuna taşınıyor. user_role enum'ına 'rehber' eklemek daha
-- net ayrışma verirdi ama uygulamada role === "ogretmen" diyen 96 kontrolün
-- her birini sessizce false'a çevirirdi (derleyici yakalamaz) ve Postgres'te
-- enum değeri SİLİNEMEZ. Ölçüm: RLS'te profiles.role='ogretmen' kullanan 0
-- politika var, 29 politika is_ogretmen()/ogretmen_okulu() üzerinden geçiyor;
-- yani teachers satırı korunduğu sürece kimliği tabloya almak RLS'i hiç
-- etkilemiyor. Bu yüzden tablo seçildi: geri alınabilir ve dar.
--
-- KAPSAM: yalnızca tur='okul'. Dershane rehberliği (src/lib/dershane-rehber.ts)
-- ve Grup Koçluk koçu (src/lib/grup-koc-auth.ts) FARKLI bir iş — onların
-- kimliği brans = 'Rehber Öğretmen' olarak AYNEN kalıyor, bu migration
-- onlara dokunmuyor.
--
-- 0143'ün devamı: kademe paylaşımı modeli (rehber_sinif_duzeyleri) DOĞRUYDU,
-- sadece yanlış yere (teachers) bağlanmıştı. Veri buraya taşınıyor, 0143'ün
-- RESTRICTIVE politikaları aynen kalıyor çünkü onlar kolonu değil
-- FONKSİYONLARI çağırıyor — yalnız 3 fonksiyonun gövdesi değişiyor.

create table if not exists public.rehberlik_servisi (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  -- Rehberin sorumlu olduğu sınıf düzeyleri. 0143 yalnız 9-12 kabul ediyordu
  -- (kapsam liseydi); burası 5-12, çünkü ortaokul+lise ("ikisi") bir okulda
  -- iki rehberin doğal paylaşımı KADEME paylaşımıdır: biri 5-8, diğeri 9-12.
  -- Boş dizi = henüz atama yapılmamış = hiçbir öğrenciyi görmez (0143 kararı).
  sinif_duzeyleri text[] not null default '{}',
  unvan text not null default 'Rehber Öğretmen',
  created_at timestamptz not null default now()
);

create index if not exists rehberlik_servisi_school_id_idx
  on public.rehberlik_servisi (school_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rehberlik_servisi_sinif_duzeyleri_check'
    and conrelid = 'public.rehberlik_servisi'::regclass) then
    alter table public.rehberlik_servisi
      add constraint rehberlik_servisi_sinif_duzeyleri_check
      check (sinif_duzeyleri <@ array['5','6','7','8','9','10','11','12']::text[]);
  end if;
end $$;

-- Mevcut okul rehberlerini servise taşı (0143'ün atadığı düzeylerle birlikte).
-- Yalnız tur='okul'; dershane/grup rehberleri bilinçli olarak DIŞARIDA.
-- Tekrar çalıştırılabilir: on conflict do nothing.
insert into public.rehberlik_servisi (profile_id, school_id, sinif_duzeyleri)
select t.id, t.school_id, coalesce(t.rehber_sinif_duzeyleri, '{}'::text[])
from public.teachers t
join public.schools sch on sch.id = t.school_id
where t.brans = 'Rehber Öğretmen'
  and sch.tur = 'okul'
  and sch.grup_kapasitesi is null
on conflict (profile_id) do nothing;

alter table public.rehberlik_servisi enable row level security;

-- Okuma: kurumun üyeleri servisi görebilir (öğrenci "rehberim kim" diye
-- bakabilsin, branş öğretmeni yardım isteğini doğru rehbere yönlendirebilsin).
drop policy if exists "rehberlik_servisi_kurum_okur" on public.rehberlik_servisi;
create policy "rehberlik_servisi_kurum_okur" on public.rehberlik_servisi
  for select to authenticated
  using (public.kurum_uyesi_mi(school_id) or public.is_admin());

-- Yazma: HİÇBİR authenticated politikası yok — atama yalnızca sunucu
-- tarafından (servis anahtarı) yapılır, yetki kontrolü
-- src/app/moderator/rehber-sinif-actions.ts içinde (admin veya kurum
-- moderatörü). 0143'te teachers üzerinde ayrı bir koruma tetikleyicisi
-- gerekiyordu çünkü öğretmen kendi satırını güncelleyebiliyordu; bu tabloda
-- öyle bir politika olmadığı için tetikleyiciye gerek yok.

-- ---------------------------------------------------------------------------
-- 0143'ün üç yardımcı fonksiyonu: kimlik kaynağı brans yerine servis üyeliği.
-- Kalıp AYNEN korunuyor — "rehber değilsen serbest geç (not exists), rehberse
-- kapsamınla sınırla" — çünkü bunlar RESTRICTIVE politikalardan çağrılıyor ve
-- diğer tüm rollerin davranışı değişmemeli.
--
-- Kademe (lise/ikisi) koşulu KALKTI: artık kapsamı servis üyeliği belirliyor,
-- okulun kademesi değil. Böylece ortaokul rehberi de aynı sınırla çalışır.
-- ---------------------------------------------------------------------------
create or replace function public.rehber_ogrenciyi_gorebilir(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.rehberlik_servisi rs where rs.profile_id = auth.uid()
  ) or exists (
    select 1 from public.rehberlik_servisi rs
    join public.students s on s.school_id = rs.school_id and s.id = p_student_id
    join public.classes c on c.id = s.class_id and c.school_id = rs.school_id
    where rs.profile_id = auth.uid()
      and c.seviye = any(rs.sinif_duzeyleri)
  );
$$;

create or replace function public.rehber_profili_gorebilir(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.rehberlik_servisi rs where rs.profile_id = auth.uid()
  ) or (
    not exists (select 1 from public.students s where s.id = p_profile_id)
    and not exists (select 1 from public.parent_students ps where ps.parent_id = p_profile_id)
  ) or public.rehber_ogrenciyi_gorebilir(p_profile_id) or exists (
    select 1 from public.parent_students ps
    where ps.parent_id = p_profile_id and public.rehber_ogrenciyi_gorebilir(ps.student_id)
  );
$$;

create or replace function public.rehber_denemesini_gorebilir(p_deneme_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select not exists (
    select 1 from public.rehberlik_servisi rs where rs.profile_id = auth.uid()
  ) or exists (
    select 1 from public.denemeler d
    where d.id = p_deneme_id and public.rehber_ogrenciyi_gorebilir(d.student_id)
  );
$$;

revoke all on function public.rehber_ogrenciyi_gorebilir(uuid) from public;
revoke all on function public.rehber_profili_gorebilir(uuid) from public;
revoke all on function public.rehber_denemesini_gorebilir(uuid) from public;
grant execute on function public.rehber_ogrenciyi_gorebilir(uuid) to authenticated, service_role;
grant execute on function public.rehber_profili_gorebilir(uuid) to authenticated, service_role;
grant execute on function public.rehber_denemesini_gorebilir(uuid) to authenticated, service_role;

-- Okul rehberi mi? Tek kaynak — uygulama tarafı da bunu kullanır.
create or replace function public.okul_rehberi_mi(p_profile_id uuid default null)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.rehberlik_servisi rs
    where rs.profile_id = coalesce(p_profile_id, auth.uid())
  );
$$;
revoke all on function public.okul_rehberi_mi(uuid) from public;
grant execute on function public.okul_rehberi_mi(uuid) to authenticated, service_role;

-- teachers.rehber_sinif_duzeyleri artık OKUNMUYOR; tek kaynak
-- rehberlik_servisi.sinif_duzeyleri. Kolon ve 0143'ün koruma tetikleyicisi
-- geriye dönük güvenlik için bırakıldı, ayrı bir temizlikte düşürülecek.
comment on column public.teachers.rehber_sinif_duzeyleri is
  'TERK EDİLDİ (0144): tek kaynak rehberlik_servisi.sinif_duzeyleri.';
comment on table public.rehberlik_servisi is
  'Okulun rehberlik servisi üyeleri ve sorumlu oldukları sınıf düzeyleri (0144).';
