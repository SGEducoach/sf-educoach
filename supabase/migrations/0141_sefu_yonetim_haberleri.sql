-- Kurum seçilmeyen admin haberleri ana sayfada SeFu Yönetim kaynağıyla yayınlanır.
alter table public.tg_deneme_ilanlari alter column school_id drop not null;

comment on column public.tg_deneme_ilanlari.school_id is
  'NULL: SeFu Yönetim haberi (yalnız admin yönetir). Diğer satırlar ilgili kurum panosuna aittir.';

drop policy if exists tg_deneme_ilanlari_okuma on public.tg_deneme_ilanlari;
create policy tg_deneme_ilanlari_okuma on public.tg_deneme_ilanlari
  for select to authenticated
  using (public.is_admin() or (school_id is not null and public.kurum_uyesi_mi(school_id)));

drop policy if exists tg_deneme_ilanlari_ekleme on public.tg_deneme_ilanlari;
create policy tg_deneme_ilanlari_ekleme on public.tg_deneme_ilanlari
  for insert to authenticated
  with check (public.is_admin() or (school_id is not null and public.is_school_moderator(school_id)));

drop policy if exists tg_deneme_ilanlari_guncelleme on public.tg_deneme_ilanlari;
create policy tg_deneme_ilanlari_guncelleme on public.tg_deneme_ilanlari
  for update to authenticated
  using (public.is_admin() or (school_id is not null and public.is_school_moderator(school_id)))
  with check (public.is_admin() or (school_id is not null and public.is_school_moderator(school_id)));

drop policy if exists tg_deneme_ilanlari_silme on public.tg_deneme_ilanlari;
create policy tg_deneme_ilanlari_silme on public.tg_deneme_ilanlari
  for delete to authenticated
  using (public.is_admin() or (school_id is not null and public.is_school_moderator(school_id)));
