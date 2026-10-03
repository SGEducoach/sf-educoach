-- Kurum, dershane ve grup koçluk hesabını bağlı kullanıcı/verileriyle tek
-- transaction içinde kaldırır. Yalnız admin çağırabilir.
create or replace function public.admin_kurum_kalici_sil(p_school_id uuid, p_ad text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ad text;
  v_ogrenciler uuid[];
  v_ogretmenler uuid[];
  v_veliler uuid[];
  v_moderatorler uuid[];
  v_kullanicilar uuid[];
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Yalnızca yönetici kurum silebilir.';
  end if;

  select ad into v_ad from public.schools where id = p_school_id for update;
  if v_ad is null then raise exception 'Kurum bulunamadı.'; end if;
  if p_ad is distinct from v_ad then raise exception 'Kurum adı değişti. İşlemi yeniden başlatın.'; end if;

  select coalesce(array_agg(id), '{}'::uuid[]) into v_ogrenciler
    from public.students where school_id = p_school_id;
  select coalesce(array_agg(id), '{}'::uuid[]) into v_ogretmenler
    from public.teachers where school_id = p_school_id;
  select coalesce(array_agg(distinct ps.parent_id), '{}'::uuid[]) into v_veliler
    from public.parent_students ps
    join public.students s on s.id = ps.student_id
    join public.profiles p on p.id = ps.parent_id and p.role = 'veli'
    where s.school_id = p_school_id
      and not exists (
        select 1 from public.parent_students diger
        join public.students ds on ds.id = diger.student_id
        where diger.parent_id = ps.parent_id and ds.school_id <> p_school_id
      );
  select coalesce(array_agg(sm.profile_id), '{}'::uuid[]) into v_moderatorler
    from public.school_moderators sm
    join public.profiles p on p.id = sm.profile_id and p.role <> 'admin'
    where sm.school_id = p_school_id
      and not exists (select 1 from public.teachers t where t.id = sm.profile_id and t.school_id <> p_school_id)
      and not exists (select 1 from public.students s where s.id = sm.profile_id and s.school_id <> p_school_id)
      and not exists (
        select 1 from public.parent_students ps
        join public.students s on s.id = ps.student_id
        where ps.parent_id = sm.profile_id and s.school_id <> p_school_id
      );
  select coalesce(array_agg(distinct id), '{}'::uuid[]) into v_kullanicilar
    from unnest(v_ogrenciler || v_ogretmenler || v_veliler || v_moderatorler) as id;

  if exists (select 1 from public.profiles where id = any(v_kullanicilar) and role = 'admin') then
    raise exception 'Yönetici hesabı kuruma bağlı. Önce bağlantıyı ayırın.';
  end if;

  -- Kurum dışı öğrenciye verilmiş bir karar/onay varsa o öğrencinin verisini
  -- silmeden dur. Veritabanı transaction'ı tüm önceki adımları geri alır.
  if exists (
    select 1 from public.ortaokul_konu_yeterlilikleri y
    where y.karar_veren_id = any(v_kullanicilar)
      and y.student_id <> all(v_ogrenciler)
  ) or exists (
    select 1 from public.soru_cozumleri sc
    where sc.onaylayan_id = any(v_kullanicilar)
      and sc.student_id <> all(v_ogrenciler)
  ) or exists (
    select 1 from public.yonetici_mesajlari m
    where (m.kurum_yetkilisi_id = any(v_kullanicilar) or m.gonderen_id = any(v_kullanicilar))
      and m.school_id <> p_school_id
  ) then
    raise exception 'Bu hesaba başka kurum verisi bağlı. Önce bağlantıları ayırın.';
  end if;

  delete from public.yonetici_mesajlari where school_id = p_school_id;
  -- Öğrenci kayıtlarını önce silmek, öğretmenin karar_veren_id RESTRICT
  -- bağlantısını da aynı transaction içinde güvenle çözer.
  delete from public.students where school_id = p_school_id;
  delete from public.teachers where school_id = p_school_id;
  delete from auth.users where id = any(v_kullanicilar);
  delete from public.schools where id = p_school_id;

  insert into public.admin_audit_log(actor_id, eylem, detay)
  values (auth.uid(), 'admin_kurum_kalici_sil', jsonb_build_object(
    'school_id', p_school_id, 'ad', v_ad,
    'ogrenci', cardinality(v_ogrenciler), 'ogretmen', cardinality(v_ogretmenler),
    'veli', cardinality(v_veliler)
  ));
  return jsonb_build_object('ogrenci', cardinality(v_ogrenciler),
    'ogretmen', cardinality(v_ogretmenler), 'veli', cardinality(v_veliler));
end;
$$;

revoke all on function public.admin_kurum_kalici_sil(uuid, text) from public, anon;
grant execute on function public.admin_kurum_kalici_sil(uuid, text) to authenticated;
