-- Analiz Motoru Faz D — rozet sistemi konsolidasyonu, adım 1.
--
-- ogrenci_rozet_durumu RPC'sinin yetki kontrolü (migration 0029) sadece
-- has_student_access() (kendisi/bağlı veli/kendi sınıf öğretmeni) VEYA
-- is_ogretmen() (herhangi bir öğretmen/müdür) kapsıyordu — ADMIN ve OKUL
-- MODERATÖRÜ hiç kapsanmıyordu. Bu yüzden src/lib/rozet-gorunumu.ts
-- (yonetici/rozetler + moderator/rozetler sayfaları) bu RPC'yi hiç
-- ÇAĞIRAMIYOR, service-role admin client + kendi TypeScript formül
-- kopyasıyla (SQL'deki 3 fonksiyonun BİREBİR yeniden yazımı) idare
-- ediyordu — iki yerde aynı eşiklerin bakımı gerektiren, zamanla
-- sessizce sapabilecek bir risk. Bu düzeltme kök nedeni giderip TS
-- tarafının bu RPC'yi doğrudan çağırmasını mümkün kılıyor (sonraki
-- commit'te src/lib/rozet-gorunumu.ts sadeleştiriliyor).
--
-- İmza/dönüş tipi (jsonb) DEĞİŞMEDİ — create or replace yeterli.
create or replace function public.ogrenci_rozet_durumu(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_konu text; v_soru text; v_deneme text; v_altin_sayisi int; v_genel text;
begin
  if not (
    public.has_student_access(p_student_id)
    or public.is_ogretmen()
    or public.is_admin()
    or exists (
      select 1 from public.students s
      where s.id = p_student_id and public.is_school_moderator(s.school_id)
    )
  ) then
    raise exception 'Yetkisiz.';
  end if;

  v_konu := public.ogrenci_konu_seviyesi(p_student_id);
  v_soru := public.ogrenci_soru_seviyesi(p_student_id);
  v_deneme := public.ogrenci_deneme_seviyesi(p_student_id);

  v_altin_sayisi := (case when v_konu = 'altin' then 1 else 0 end)
                  + (case when v_soru = 'altin' then 1 else 0 end)
                  + (case when v_deneme = 'altin' then 1 else 0 end);
  v_genel := case v_altin_sayisi when 3 then 'altin' when 2 then 'gumus' when 1 then 'bronz' else 'yok' end;

  return jsonb_build_object('konu', v_konu, 'soru', v_soru, 'deneme', v_deneme, 'genel', v_genel);
end;
$$;

revoke all on function public.ogrenci_rozet_durumu(uuid) from public;
grant execute on function public.ogrenci_rozet_durumu(uuid) to authenticated;
