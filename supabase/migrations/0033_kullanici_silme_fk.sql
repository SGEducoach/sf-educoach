-- Bir öğretmen hesabı kalıcı silindiğinde geçmiş veli talepleri korunsun;
-- yalnızca talebi onaylayan kullanıcı bağlantısı boşaltılsın.
alter table public.veli_link_requests
  drop constraint if exists veli_link_requests_onaylayan_ogretmen_id_fkey;

alter table public.veli_link_requests
  add constraint veli_link_requests_onaylayan_ogretmen_id_fkey
  foreign key (onaylayan_ogretmen_id)
  references public.profiles(id)
  on delete set null;
