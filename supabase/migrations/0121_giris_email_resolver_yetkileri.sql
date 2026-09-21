-- Giriş resolver'ları gerçek/pseudo e-posta döndürür. Bunlar yalnız
-- /api/giris ve /api/sifre-sifirla içindeki service_role istemcisi tarafından
-- çağrılmalı; anon/authenticated erişimi tarayıcı ağ yanıtında kişisel veri
-- sızıntısına yol açar.

revoke execute on function public.resolve_ogrenci_email(text) from anon, authenticated;
revoke execute on function public.resolve_ogrenci_email(uuid, text) from anon, authenticated;
revoke execute on function public.resolve_mudur_email(text) from anon, authenticated;
revoke execute on function public.resolve_veli_email_adaylari(uuid, text) from anon, authenticated;

grant execute on function public.resolve_ogrenci_email(text) to service_role;
grant execute on function public.resolve_ogrenci_email(uuid, text) to service_role;
grant execute on function public.resolve_mudur_email(text) to service_role;
grant execute on function public.resolve_veli_email_adaylari(uuid, text) to service_role;
