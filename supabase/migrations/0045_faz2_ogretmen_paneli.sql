-- Faz 2 (yenilikler_1.txt §4): öğretmen çoklu sınıf/ders, öğrenci sınıf
-- transferi, soru çözümü "gördüm" onayı.

-- ============ 1) Öğretmenin branş dersi verdiği sınıflar (çoklu) ============
-- teachers.class_id tekil kalıyor (sınıf öğretmenliği/homeroom — admin-only
-- atama, mevcut teachers_class_id_guard trigger'ı değişmedi). Bu yeni tablo
-- SADECE "hangi sınıfta hangi dersi veriyor" ilişkisini tutuyor — öğretmenin
-- kendi ekleyip çıkarabildiği, admin onayı gerektirmeyen, daha gevşek bir
-- self-servis ilişki (kullanıcı: "11-C Türkçe dersini ekleyip çıkarabilecek").
create table public.ogretmen_dersleri (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  ders text not null,
  created_at timestamptz not null default now(),
  unique (teacher_id, class_id, ders)
);

alter table public.ogretmen_dersleri enable row level security;

create policy "ogretmen_dersleri_select_own" on public.ogretmen_dersleri
  for select using (teacher_id = auth.uid());
create policy "ogretmen_dersleri_select_admin" on public.ogretmen_dersleri
  for select using (public.is_admin());
-- Kendi ekleme: sadece kendi okulundaki bir sınıfa, kendi adına.
create policy "ogretmen_dersleri_insert_own" on public.ogretmen_dersleri
  for insert with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.teachers t
      join public.classes c on c.school_id = t.school_id
      where t.id = auth.uid() and c.id = ogretmen_dersleri.class_id
    )
  );
create policy "ogretmen_dersleri_delete_own" on public.ogretmen_dersleri
  for delete using (teacher_id = auth.uid());
-- Admin: tek tek öğretmenlere ders ataması (§8) için serbest ekleme/silme.
create policy "ogretmen_dersleri_admin_all" on public.ogretmen_dersleri
  for all using (public.is_admin()) with check (public.is_admin());

-- ============ 2) Öğrenci sınıf transferi ("öğrenci ekle/çıkar") ============
-- Kullanıcı kararı: bu, öğrenciyi BAŞKA bir sınıfa taşımak demek —
-- students.class_id NOT NULL kalıyor, hesap/veri kaybı yok. Sınıf öğretmeni
-- SADECE kendi sınıfındaki bir öğrenciyi aynı okuldaki başka bir sınıfa
-- taşıyabilir. Guard trigger, bu yoldan yalnızca class_id'nin değişmesine
-- izin veriyor (diğer alanlara dokunulamaz) — teachers_class_id_guard ile
-- aynı desen.
create policy "students_update_sinif_ogretmeni" on public.students
  for update
  using (
    exists (select 1 from public.teachers t where t.id = auth.uid() and t.class_id = students.class_id)
  )
  with check (
    exists (select 1 from public.classes c where c.id = students.class_id and c.school_id = students.school_id)
  );

create or replace function public.students_transfer_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.school_id is distinct from old.school_id
     or new.okul_no is distinct from old.okul_no
     or new.ayt_alan is distinct from old.ayt_alan
     or new.hedef_bolum is distinct from old.hedef_bolum
     or new.veri_giris_sikligi is distinct from old.veri_giris_sikligi then
    raise exception 'Bu işlemle yalnızca sınıf değiştirilebilir.';
  end if;
  return new;
end;
$$;

drop trigger if exists students_transfer_guard on public.students;
create trigger students_transfer_guard
  before update on public.students
  for each row execute function public.students_transfer_guard();

-- ============ 3) Soru çözümü "gördüm" onayı ============
-- Görevlendirme dışı (öğrencinin kendi girdiği) soru çözümlerine öğretmenin
-- "gördüm" damgası basması; öğretmen onaylayana kadar bekleyen iş sayacı
-- olarak gösterilecek (Faz 2, öğretmen paneli).
alter table public.soru_cozumleri add column onaylandi_mi boolean not null default false;
alter table public.soru_cozumleri add column onaylayan_id uuid references public.profiles(id);
alter table public.soru_cozumleri add column onaylanma_at timestamptz;

-- Öğretmen, kendi sınıfındaki öğrencilerin soru çözümlerini onaylayabilir.
-- (ogretmen_dersleri üzerinden branş bazlı görünürlük ileride genişletilebilir
-- — Faz 2'de sadece homeroom kapsamı yeterli görüldü.)
create policy "soru_cozumleri_update_ogretmen_onay" on public.soru_cozumleri
  for update using (
    exists (
      select 1 from public.students s
      join public.teachers t on t.class_id = s.class_id
      where s.id = soru_cozumleri.student_id and t.id = auth.uid()
    )
  );

create or replace function public.soru_cozumleri_onay_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.student_id is distinct from old.student_id
     or new.tarih is distinct from old.tarih
     or new.ders is distinct from old.ders
     or new.dogru is distinct from old.dogru
     or new.yanlis is distinct from old.yanlis
     or new.bos is distinct from old.bos
     or new.sure_dakika is distinct from old.sure_dakika
     or new.konu is distinct from old.konu
     or new.yayinevi is distinct from old.yayinevi
     or new.kaynak is distinct from old.kaynak then
    raise exception 'Bu işlemle yalnızca onay bilgisi güncellenebilir.';
  end if;
  return new;
end;
$$;

drop trigger if exists soru_cozumleri_onay_guard on public.soru_cozumleri;
create trigger soru_cozumleri_onay_guard
  before update on public.soru_cozumleri
  for each row execute function public.soru_cozumleri_onay_guard();
