-- Bug fix (kullanıcı bulgusu, 26.08.2026): admin panelinden bir öğrenci
-- profili kaydedilirken ("Profili kaydet") aslında kayıt BAŞARIYLA
-- gerçekleşiyor ama "Bu işlemle yalnızca sınıf değiştirilebilir." uyarısı
-- görünüp sanki hata varmış izlenimi veriyordu.
--
-- Kök neden: students_transfer_guard() (migration 0045) yalnızca
-- public.is_admin() ile admin'i muaf tutuyordu. is_admin() ise
-- auth.uid()'e bakıyor (bkz. migration 0014) — ama admin panelinin
-- server action'ları (kullaniciProfilGuncelle vb.) DB'ye SERVICE-ROLE
-- client'la (createAdminClient()) bağlanıyor; bu bağlantıda oturum/JWT
-- olmadığından auth.uid() NULL dönüyor ve is_admin() yanlışlıkla FALSE
-- oluyor. Sonuç: admin okulNo/aytAlan/hedefBölüm gibi alanlardan birini
-- güncellediğinde trigger bunu "yetkisiz sınıf-dışı değişiklik" sanıp
-- exception fırlatıyor — ve bu ham Postgres hata metni doğrudan
-- kullanıcıya "hata" olarak gösteriliyor.
--
-- Düzeltme: service_role bağlantısını da (auth.role() = 'service_role')
-- muaf tut. Bu güvenli — service-role client'a HER YERDE (actions.ts
-- dosyalarındaki requireAdmin()/requireModerator()) zaten uygulama
-- katmanında yetki kontrolü yapıldıktan SONRA erişiliyor; bu trigger'ın
-- amacı sadece SINIF ÖĞRETMENİNİN KENDİ OTURUMUYLA (auth.uid() dolu,
-- service_role değil) yaptığı students_update_sinif_ogretmeni RLS
-- politikası kapsamındaki güncellemeyi sınıf-değişikliğiyle sınırlamak —
-- o senaryoda auth.role() 'authenticated' olur, bu muafiyet devreye
-- girmez.
create or replace function public.students_transfer_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.role() = 'service_role' then
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
