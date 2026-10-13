-- Eski ortaokul çalışmaları mevcut davranışları korunarak onaylı başlar.
-- Yeni öğrenci kayıtları açıkça bekliyor olarak eklenir ve RLS bunu zorlar.
alter table public.ortaokul_calismalar
  add column onaylandi_mi boolean not null default true,
  add column onaylayan_id uuid references public.profiles(id) on delete set null,
  add column onaylanma_at timestamptz,
  add column duzelten_id uuid references public.profiles(id) on delete set null,
  add column duzeltilme_at timestamptz,
  add column duzeltme_oncesi jsonb;

create index ortaokul_calisma_bekleyen_idx
  on public.ortaokul_calismalar (student_id, created_at desc)
  where not onaylandi_mi;

alter table public.ortaokul_calismalar
  add constraint ortaokul_calisma_onay_tutarliligi check (
    (onaylandi_mi or (onaylayan_id is null and onaylanma_at is null))
    and (duzeltme_oncesi is null or (duzelten_id is not null and duzeltilme_at is not null))
  );

drop policy ortaokul_calisma_ogrenci_ekleme on public.ortaokul_calismalar;
create policy ortaokul_calisma_ogrenci_ekleme on public.ortaokul_calismalar
  for insert to authenticated with check (
    student_id = auth.uid()
    and not onaylandi_mi
    and onaylayan_id is null and onaylanma_at is null
    and duzelten_id is null and duzeltilme_at is null and duzeltme_oncesi is null
    and public.ortaokul_konu_ogrenciye_uygun(student_id, ders_id, tema_id, bolum)
    and public.ortaokul_alt_baslik_ogrenciye_uygun(student_id, tema_id, alt_baslik)
  );

-- Onaylı kaydı öğrenci silemez: öğretmen düzeltmesinin izi korunur.
drop policy ortaokul_calisma_ogrenci_silme on public.ortaokul_calismalar;
create policy ortaokul_calisma_ogrenci_silme on public.ortaokul_calismalar
  for delete to authenticated using (student_id = auth.uid() and not onaylandi_mi);
