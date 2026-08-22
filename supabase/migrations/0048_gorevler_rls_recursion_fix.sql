-- Faz 3 hotfix: "infinite recursion detected in policy for relation gorevler".
--
-- gorevler_select_related (gorevler tablosu) doğrudan gorev_atamalari'ni
-- sorguluyordu; gorev_atamalari_select_related (gorev_atamalari tablosu) da
-- doğrudan gorevler'i sorguluyordu — birbirini RLS üzerinden çağırınca sonsuz
-- döngü oluştu. Çözüm: bu iki tablo-arası kontrolü, bu şemada zaten
-- is_admin()/is_ogretmen()/has_student_access() için kullanılan aynı desenle
-- SECURITY DEFINER fonksiyonlara taşımak — bu fonksiyonlar RLS'i bypass
-- ettiği için karşı tablonun policy'sini tekrar tetiklemiyor, döngü kırılıyor.

create or replace function public.gorev_ilgili_mi(p_gorev_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.gorev_atamalari ga
    where ga.gorev_id = p_gorev_id
    and (
      ga.student_id = auth.uid()
      or exists (select 1 from public.parent_students ps where ps.student_id = ga.student_id and ps.parent_id = auth.uid())
    )
  );
$$;
revoke all on function public.gorev_ilgili_mi(uuid) from public;
grant execute on function public.gorev_ilgili_mi(uuid) to authenticated;

create or replace function public.gorev_olusturani_mi(p_gorev_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.gorevler g where g.id = p_gorev_id and g.olusturan_ogretmen_id = auth.uid());
$$;
revoke all on function public.gorev_olusturani_mi(uuid) from public;
grant execute on function public.gorev_olusturani_mi(uuid) to authenticated;

drop policy if exists "gorevler_select_related" on public.gorevler;
create policy "gorevler_select_related" on public.gorevler
  for select using (
    olusturan_ogretmen_id = auth.uid()
    or public.gorev_ilgili_mi(id)
  );

drop policy if exists "gorev_atamalari_select_related" on public.gorev_atamalari;
create policy "gorev_atamalari_select_related" on public.gorev_atamalari
  for select using (
    student_id = auth.uid()
    or public.gorev_olusturani_mi(gorev_id)
    or exists (select 1 from public.parent_students ps where ps.student_id = gorev_atamalari.student_id and ps.parent_id = auth.uid())
  );
