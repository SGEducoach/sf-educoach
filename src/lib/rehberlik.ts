// Rehberlik servisi (2026-08-26 kullanıcı isteği) — "Rehber Öğretmen"
// branşındaki bir öğretmen, homeroom/sınıf öğretmenliği sınırı olmadan
// kendi okulundaki HERHANGİ bir öğrenciye/veliye mesaj gönderebiliyor
// (bkz. RehberlikPaneli.tsx, rehberMesajGonder). Sabitler tek yerde,
// çünkü birden fazla dosya (dashboard-navigation.ts, dashboard/page.tsx,
// dashboard-actions.ts) aynı branş adını karşılaştırıyor.
export const REHBER_BRANSI = "Rehber Öğretmen";
export const REHBERLIK_DUYURU_BASLIGI = "Rehberlik Servisinden Mesajınız Var";

// Dershane rehberinin öğrenci adına veri girişinde geriye dönük sınır
// (kullanıcı kararı 13.09.2026; öğrenci: konu/soru 3, deneme 7 gün). DB
// tetikleyicisi (migration 0107, gecmis_tarih_sinir_kontrol) de 30 uygular.
export const REHBER_GERIYE_DONUK_GUN = 30;
