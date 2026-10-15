import "server-only";
import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VELI_DAVET_GECERLILIK_GUN, veliTelefonuTemizle } from "@/lib/ilkokul-gelisim";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

function davetKoduUret(): string {
  // Öğretmen onaylı akıştaki (veli_talep_onayla) biçimle aynı: 12 haneli onaltılık.
  return randomBytes(6).toString("hex").toUpperCase();
}

// Bir öğrenci için onaylı (öğretmen onayı beklemeyen) veli talebi açar
// (16.10.2026, ilkokul). Veli giriş ekranındaki mevcut "kod ile giriş"
// adımıyla hesabını açar. Kayıt doğrudan "onaylandi" eklendiği için
// öğrencinin mesaj kutusuna kod gönderen tetikleyici (yalnız UPDATE'te
// çalışır) devreye girmez — ilkokul öğrencisi zaten giriş yapmıyor.
export async function veliDavetiOlustur(
  admin: Istemci,
  girdi: { studentId: string; veliAd: string; veliTelefon?: string | null; olusturanId: string },
): Promise<{ kod: string; sonGecerlilik: string } | { error: string }> {
  const kod = davetKoduUret();
  const simdi = new Date();
  const son = new Date(simdi.getTime() + VELI_DAVET_GECERLILIK_GUN * 24 * 3600 * 1000);
  const { error } = await admin.from("veli_link_requests").insert({
    student_id: girdi.studentId,
    veli_ad: girdi.veliAd,
    veli_telefon: veliTelefonuTemizle(girdi.veliTelefon),
    durum: "onaylandi",
    kod,
    onaylayan_ogretmen_id: girdi.olusturanId,
    onaylanma_at: simdi.toISOString(),
    kod_expires_at: son.toISOString(),
  });
  if (error) return { error: error.message };
  return { kod, sonGecerlilik: son.toISOString().slice(0, 10) };
}
