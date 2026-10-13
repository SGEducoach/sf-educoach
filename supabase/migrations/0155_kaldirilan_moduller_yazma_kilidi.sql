-- Kullanımdan kaldırılan ekranların kayıtlarını sakla; yeni kayıt ve
-- güncelleme alma. Silme tetikleyiciyle kilitlenmez: kurum/kullanıcı
-- silindiğinde yabancı anahtarın bağlı kayıtları temizlemesi sürmelidir.
-- Eski tarayıcı sekmelerinin önbellekte kalan sunucu eylemlerini çağırması
-- halinde de veritabanı düzeyinde yazma engellenir. Ajanda sosyal
-- etkinlikleri (yarismalar) bu kapsama girmez.
create or replace function public.kaldirilan_modul_yazma_engeli()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'Bu modül artık kullanılamıyor.';
end;
$$;

revoke all on function public.kaldirilan_modul_yazma_engeli() from public;

create trigger etkinlik_gruplari_yazma_kilidi
  before insert or update on public.etkinlik_gruplari
  for each row execute function public.kaldirilan_modul_yazma_engeli();
create trigger etkinlik_grup_uyeleri_yazma_kilidi
  before insert or update on public.etkinlik_grup_uyeleri
  for each row execute function public.kaldirilan_modul_yazma_engeli();
create trigger etkinlik_calismalari_yazma_kilidi
  before insert or update on public.etkinlik_calismalari
  for each row execute function public.kaldirilan_modul_yazma_engeli();
create trigger etkinlik_calisma_atamalari_yazma_kilidi
  before insert or update on public.etkinlik_calisma_atamalari
  for each row execute function public.kaldirilan_modul_yazma_engeli();
create trigger rehberlik_gorusmeleri_yazma_kilidi
  before insert or update on public.rehberlik_gorusmeleri
  for each row execute function public.kaldirilan_modul_yazma_engeli();
