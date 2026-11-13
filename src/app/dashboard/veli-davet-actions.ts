"use server";

// Öğrencinin velisine davet bağlantısı üretmesi (migration 0187). Ham anahtar
// yalnız üretildiği anda öğrenciye döner; tabloda özeti tutulur, sonradan
// geri okunamaz (kaybolursa yeni davet üretilir, eskisi iptal olur).

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DAVET_GECERLILIK_GUN, DAVETLE_EN_FAZLA_VELI, GUNLUK_DAVET_SINIRI, davetTokenOzeti, davetTokeniUret,
} from "@/lib/veli-davet-baglantisi";

export interface VeliDavetDurumu {
  bagliVeliler: string[];
  aktifDavetSonKullanma: string | null;
  yeniDavetMumkun: boolean;
}

async function ogrenciyiDogrula() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const [{ data: profil }, { data: ogrenci }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("students").select("id").eq("id", user.id).maybeSingle(),
  ]);
  if (profil?.role !== "ogrenci" || !ogrenci) return null;
  return { admin, studentId: user.id };
}

async function bagliVeliAdlari(admin: ReturnType<typeof createAdminClient>, studentId: string): Promise<string[]> {
  const { data: baglar } = await admin.from("parent_students").select("parent_id").eq("student_id", studentId);
  const idler = ((baglar ?? []) as { parent_id: string }[]).map((b) => b.parent_id);
  if (idler.length === 0) return [];
  const { data } = await admin.from("profiles").select("ad").in("id", idler);
  return ((data ?? []) as { ad: string }[]).map((p) => p.ad);
}

export async function veliDavetDurumuGetir(): Promise<{ error: string | null; durum: VeliDavetDurumu | null }> {
  const k = await ogrenciyiDogrula();
  if (!k) return { error: "Bu bölüm yalnız öğrenci hesabında kullanılabilir.", durum: null };
  const simdi = new Date().toISOString();
  const [veliler, { data: aktif }] = await Promise.all([
    bagliVeliAdlari(k.admin, k.studentId),
    k.admin.from("veli_davetleri").select("son_kullanma").eq("student_id", k.studentId)
      .is("kullanildi_at", null).is("iptal_at", null).gt("son_kullanma", simdi)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    error: null,
    durum: {
      bagliVeliler: veliler,
      aktifDavetSonKullanma: (aktif as { son_kullanma: string } | null)?.son_kullanma ?? null,
      yeniDavetMumkun: veliler.length < DAVETLE_EN_FAZLA_VELI,
    },
  };
}

async function siteAdresi(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "https://www.sefukoc.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function veliDavetiOlusturOgrenci(): Promise<{ error: string | null; baglanti: string | null; sonKullanma: string | null }> {
  const k = await ogrenciyiDogrula();
  if (!k) return { error: "Bu bölüm yalnız öğrenci hesabında kullanılabilir.", baglanti: null, sonKullanma: null };
  const veliler = await bagliVeliAdlari(k.admin, k.studentId);
  if (veliler.length >= DAVETLE_EN_FAZLA_VELI) {
    return { error: `Hesabına zaten ${DAVETLE_EN_FAZLA_VELI} veli bağlı. Değişiklik için okul yönetimine başvur.`, baglanti: null, sonKullanma: null };
  }
  const birGunOnce = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await k.admin.from("veli_davetleri").select("id", { count: "exact", head: true })
    .eq("student_id", k.studentId).gte("created_at", birGunOnce);
  if ((count ?? 0) >= GUNLUK_DAVET_SINIRI) {
    return { error: "Bugün çok fazla davet bağlantısı oluşturdun. Yarın tekrar dene.", baglanti: null, sonKullanma: null };
  }
  const simdi = new Date();
  // Aynı anda tek geçerli bağlantı: yenisi üretilince eskisi geçersiz olur.
  await k.admin.from("veli_davetleri").update({ iptal_at: simdi.toISOString() })
    .eq("student_id", k.studentId).is("kullanildi_at", null).is("iptal_at", null);
  const token = davetTokeniUret();
  const sonKullanma = new Date(simdi.getTime() + DAVET_GECERLILIK_GUN * 24 * 3600 * 1000).toISOString();
  const { error } = await k.admin.from("veli_davetleri").insert({
    student_id: k.studentId, token_ozeti: davetTokenOzeti(token), son_kullanma: sonKullanma,
  });
  if (error) {
    console.error("veli daveti oluşturulamadı:", error.message);
    return { error: "Davet bağlantısı şu anda oluşturulamadı. Biraz sonra tekrar dene.", baglanti: null, sonKullanma: null };
  }
  return { error: null, baglanti: `${await siteAdresi()}/veli-davet/${token}`, sonKullanma };
}

export async function veliDavetiIptalEt(): Promise<{ error: string | null }> {
  const k = await ogrenciyiDogrula();
  if (!k) return { error: "Bu bölüm yalnız öğrenci hesabında kullanılabilir." };
  const { error } = await k.admin.from("veli_davetleri").update({ iptal_at: new Date().toISOString() })
    .eq("student_id", k.studentId).is("kullanildi_at", null).is("iptal_at", null);
  return { error: error ? "Davet iptal edilemedi." : null };
}
