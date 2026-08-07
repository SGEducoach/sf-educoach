"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient } from "@/lib/anthropic";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import type { DenemeZorlugu, HedefeYakinlik, VeriGirisSikligi, VerimlilikDuzeyi } from "@/lib/types";

async function requireStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// ============ AI destekli konu anlatımı ============
// Bir ders+konu kombinasyonu için anlatım tek sefer üretilip
// konu_anlatimlari tablosuna kaydediliyor; sonraki her istek oradan
// okunuyor — aynı konu için tekrar Claude API çağrısı yapılmıyor.
const KONU_ANLATIMI_SISTEM_PROMPTU = `Sen YKS (TYT/AYT) öğrencilerine konu anlatan deneyimli, sabırlı bir öğretmensin. Sana verilen ders ve konu için lise seviyesine uygun, açık ve sade bir Türkçeyle bir konu anlatımı yaz.

Kurallar:
- Düz metin yaz — LaTeX, markdown başlık (#), kalın (**) kullanma; gerekirse sade satır başları ve kısa paragraflarla yapılandır.
- Metni DOĞRUDAN konuyla başlat — en başa konu adını tekrar eden bir "# Başlık" satırı EKLEME, uygulama bunu zaten ayrıca gösteriyor.
- Konunun mantığını, temel kurallarını ve varsa formüllerini düz metin olarak (örn. "türev = f'(x)") açıkla.
- En az bir kısa, somut örnek çöz.
- Sık yapılan hataları veya karıştırılan noktaları kısaca belirt.
- Uzunluk: yaklaşık 300-500 kelime. Motive edici ama abartısız bir üslup kullan.`;

// Model talimata uymayıp yine de markdown başlık/kalın işareti eklerse
// (gözlemlendi) burada temizliyoruz — prompt uyumuna güvenmek yerine.
function icerikTemizle(text: string): string {
  return text
    .replace(/^#{1,6}\s+.*\n+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .trim();
}

export async function konuAnlatimiGetir(ders: string, konu: string) {
  const { supabase } = await requireStudent();
  const dersT = ders.trim();
  const konuT = konu.trim();
  if (!dersT || !konuT) return { icerik: null, seviye: null, error: "Ders/konu bilgisi eksik." };

  const { data: mevcut } = await supabase
    .from("konu_anlatimlari")
    .select("icerik, seviye")
    .eq("ders", dersT)
    .eq("konu", konuT)
    .maybeSingle();

  if (mevcut) return { icerik: mevcut.icerik as string, seviye: mevcut.seviye as string | null, error: null };

  // Öğrencinin yazdığı konu, resmî müfredat listesindeki bir konuyla birebir
  // eşleşiyorsa (aynı ders+konu) sınıf/seviye etiketini oradan alıyoruz.
  const resmiEslesme = MUFREDAT_KONULARI.find((k) => k.ders === dersT && k.konu === konuT);
  const seviye = resmiEslesme?.seviye ?? null;

  let icerik: string;
  try {
    const anthropic = getAnthropicClient();
    const yanit = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: KONU_ANLATIMI_SISTEM_PROMPTU,
      messages: [{ role: "user", content: `${dersT} dersinden "${konuT}" konusunu anlat.` }],
    });
    const metinBlogu = yanit.content.find((b) => b.type === "text");
    icerik = metinBlogu && "text" in metinBlogu ? icerikTemizle(metinBlogu.text) : "";
    if (!icerik) return { icerik: null, seviye: null, error: "İçerik üretilemedi, lütfen tekrar deneyin." };
  } catch (e) {
    console.error("konu anlatımı üretme hatası:", e);
    return { icerik: null, seviye: null, error: "Konu anlatımı şu anda üretilemedi. Lütfen daha sonra tekrar deneyin." };
  }

  // Önbelleğe yaz — service-role, RLS'i bypass eder (normal kullanıcılar bu
  // tabloya yazamaz, sadece okuyabilir). Yazma başarısız olsa bile üretilen
  // içerik kullanıcıya döner; bir dahaki istekte tekrar üretilir.
  const admin = createAdminClient();
  const { error: kayitHatasi } = await admin
    .from("konu_anlatimlari")
    .upsert({ ders: dersT, konu: konuT, icerik, seviye }, { onConflict: "ders,konu" });
  if (kayitHatasi) console.error("konu anlatımı kaydedilemedi:", kayitHatasi.message);

  return { icerik, seviye, error: null };
}

async function verimlilikSorulsunMu(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
): Promise<boolean> {
  const [{ data: sayi }, { data: student }] = await Promise.all([
    supabase.rpc("ogrenci_giris_sayisi", { p_student_id: studentId }),
    supabase.from("students").select("veri_giris_sikligi").eq("id", studentId).single(),
  ]);
  const count = (sayi as number) ?? 0;
  const siklik = (student?.veri_giris_sikligi as VeriGirisSikligi) ?? "haftalik";
  if (count === 0) return false;
  if (siklik === "gunluk") return count % 7 === 0;
  if (siklik === "3gunluk") return count % 3 === 0;
  return true; // haftalik: her girişte
}

export async function konuCalismaEkle(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const ders = String(formData.get("ders"));
  const konu = String(formData.get("konu") ?? "").trim();
  const sureDakika = Number(formData.get("sureDakika"));
  const hedefeYakinlik = String(formData.get("hedefeYakinlik")) as HedefeYakinlik;

  if (!ders || !konu || !sureDakika || sureDakika <= 0 || !hedefeYakinlik) {
    return { error: "Lütfen tüm alanları doldurun.", verimlilikSorulsunMu: false };
  }

  const { error } = await supabase.from("konu_calismalar").insert({
    student_id: user.id, ders, konu, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik,
  });
  if (error) return { error: error.message, verimlilikSorulsunMu: false };

  const sorulsunMu = await verimlilikSorulsunMu(supabase, user.id);
  revalidatePath("/dashboard");
  return { error: null, verimlilikSorulsunMu: sorulsunMu };
}

export async function soruCozumuEkle(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const ders = String(formData.get("ders"));
  const dogru = Number(formData.get("dogru"));
  const yanlis = Number(formData.get("yanlis"));
  const sureDakika = Number(formData.get("sureDakika"));
  const hedefeYakinlik = String(formData.get("hedefeYakinlik")) as HedefeYakinlik;

  if (!ders || Number.isNaN(dogru) || Number.isNaN(yanlis) || !sureDakika || sureDakika <= 0 || !hedefeYakinlik) {
    return { error: "Lütfen tüm alanları doldurun.", verimlilikSorulsunMu: false };
  }

  const { error } = await supabase.from("soru_cozumleri").insert({
    student_id: user.id, ders, dogru, yanlis, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik,
  });
  if (error) return { error: error.message, verimlilikSorulsunMu: false };

  const sorulsunMu = await verimlilikSorulsunMu(supabase, user.id);
  revalidatePath("/dashboard");
  return { error: null, verimlilikSorulsunMu: sorulsunMu };
}

export async function denemeEkle(
  tur: "TYT" | "AYT",
  sureDakika: number,
  hedefeYakinlik: HedefeYakinlik,
  zorluk: DenemeZorlugu,
  dersSonuclari: { ders: string; dogru: number; yanlis: number }[],
) {
  const { supabase, user } = await requireStudent();

  if (!sureDakika || sureDakika <= 0 || !hedefeYakinlik || !zorluk || dersSonuclari.length === 0) {
    return { error: "Lütfen tüm alanları doldurun.", verimlilikSorulsunMu: false };
  }

  const { data: deneme, error } = await supabase
    .from("denemeler")
    .insert({ student_id: user.id, tur, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik, zorluk, kaynak: "ogrenci" })
    .select("id")
    .single();

  if (error || !deneme) return { error: error?.message ?? "Deneme kaydedilemedi.", verimlilikSorulsunMu: false };

  const { error: sonucError } = await supabase.from("deneme_ders_sonuclari").insert(
    dersSonuclari.map((d) => ({ deneme_id: deneme.id, ders: d.ders, dogru: d.dogru, yanlis: d.yanlis }))
  );
  if (sonucError) return { error: sonucError.message, verimlilikSorulsunMu: false };

  const sorulsunMu = await verimlilikSorulsunMu(supabase, user.id);
  revalidatePath("/dashboard");
  return { error: null, verimlilikSorulsunMu: sorulsunMu };
}

export async function haftalikVerimlilikEkle(duzey: VerimlilikDuzeyi) {
  const { supabase, user } = await requireStudent();
  const { error } = await supabase.from("haftalik_verimlilikler").insert({ student_id: user.id, duzey });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

// Veri giriş sıklığı sadece BİR KEZ seçilebilir — bir daha değiştirilemez.
// Önce kilit durumunu kontrol ediyoruz; zaten kilitliyse işlemi reddediyoruz
// (öğrenci konsoldan doğrudan action'ı çağırsa bile bu kontrol devrede).
export async function veriGirisSikligiGuncelle(siklik: VeriGirisSikligi) {
  const { supabase, user } = await requireStudent();

  const { data: mevcut } = await supabase
    .from("students")
    .select("veri_giris_sikligi_kilitli")
    .eq("id", user.id)
    .single();
  if (mevcut?.veri_giris_sikligi_kilitli) {
    return { error: "Veri giriş sıklığı zaten seçildi, bir daha değiştirilemez." };
  }

  const { error } = await supabase
    .from("students")
    .update({ veri_giris_sikligi: siklik, veri_giris_sikligi_kilitli: true })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}
