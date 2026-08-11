"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient } from "@/lib/anthropic";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import { KONU_ANLATIMI_SISTEM_PROMPTU, icerikTemizle } from "@/lib/konu-anlatimi";
import { pushGonderProfile } from "@/lib/push-send";
import { SURE_UST_SINIR, DENEME_SURE_UST_SINIR, KATEGORI_GERIYE_DONUK_SINIR, dersSoruSayisi } from "@/lib/types";
import type { DenemeTuru, DenemeZorlugu, HedefeYakinlik, VerimlilikDuzeyi } from "@/lib/types";

const SEVIYE_ETIKET: Record<string, string> = { bronz: "Bronz 🥉", gumus: "Gümüş 🥈", altin: "Altın 🥇" };
const KATEGORI_ETIKET: Record<string, string> = { konu: "Konu Çalışma", soru: "Soru Çözümü", deneme: "Deneme" };

// Her başarılı veri girişinden sonra çağrılır: rozet_kontrol_et RPC'si
// (security definer) 4 kategorinin (konu/soru/deneme/genel) güncel
// seviyesini hesaplayıp önceki bilinen seviyeyle karşılaştırıyor, sadece
// YÜKSELENLERİ "kategori:seviye" formatında döndürüyor — biz burada bunu
// parse edip bağlı veli(ler)e kategoriye özel push bildirimi gönderiyoruz.
async function rozetKontrolVeBildir(supabase: Awaited<ReturnType<typeof createClient>>, studentId: string) {
  try {
    const { data: yukselenlerHam } = await supabase.rpc("rozet_kontrol_et", { p_student_id: studentId });
    const yukselenler = (yukselenlerHam as string[] | null) ?? [];
    if (yukselenler.length === 0) return;

    const [{ data: profile }, { data: veliler }] = await Promise.all([
      supabase.from("profiles").select("ad").eq("id", studentId).single(),
      supabase.from("parent_students").select("parent_id").eq("student_id", studentId),
    ]);
    const ad = profile?.ad ?? "Öğrenciniz";
    if (!veliler || veliler.length === 0) return;

    const admin = createAdminClient();
    for (const token of yukselenler) {
      const [kategori, seviye] = token.split(":");
      const seviyeEtiket = SEVIYE_ETIKET[seviye] ?? seviye;
      const baslik = kategori === "genel"
        ? `SG EDUCOACH ${seviyeEtiket} Rozeti Kazanıldı!`
        : `${KATEGORI_ETIKET[kategori] ?? kategori} — ${seviyeEtiket} Rozeti Kazanıldı!`;
      const govde = kategori === "genel"
        ? `${ad}, üç kategorinin de gerektirdiği seviyeye ulaşarak SG EDUCOACH ${seviyeEtiket} rozetini kazandı.`
        : `${ad}, ${KATEGORI_ETIKET[kategori] ?? kategori} kategorisinde ${seviyeEtiket} rozetine ulaştı.`;
      for (const v of veliler) await pushGonderProfile(admin, v.parent_id, baslik, govde);
    }
  } catch (e) {
    console.error("rozet kontrolü başarısız:", e);
  }
}

async function requireStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Öğrenci "geçmiş tarih için gir" ile bir tarih seçebiliyor — bugünden ileri
// bir tarih ya da bozuk bir değer olmasın diye doğrulanıyor. Boşsa bugün
// kullanılır. geriyeMaksGun, rozet sistemi v2 ile birlikte eklendi: her
// kategorinin kendi geriye dönük sınırı var (bkz. KATEGORI_GERIYE_DONUK_SINIR)
// — sınırsız backdating, rozet/seri sayımını manipüle etmeye açık kapı
// bırakıyordu. DB'de de aynı sınır check constraint olarak duruyor
// (migration 0029) — bu, savunma katmanı.
function tarihDogrula(
  ham: FormDataEntryValue | string | null,
  geriyeMaksGun: number,
): { tarih: string; error: string | null } {
  const bugun = new Date().toISOString().slice(0, 10);
  const deger = (ham ?? "").toString().trim();
  if (!deger) return { tarih: bugun, error: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deger)) return { tarih: bugun, error: "Tarih geçersiz." };
  if (deger > bugun) return { tarih: bugun, error: "İleri bir tarih girilemez." };
  const enEskiTarih = new Date(Date.now() - geriyeMaksGun * 24 * 3600 * 1000).toISOString().slice(0, 10);
  if (deger < enEskiTarih) {
    return { tarih: bugun, error: `En fazla ${geriyeMaksGun} gün geriye dönük giriş yapabilirsin.` };
  }
  return { tarih: deger, error: null };
}

// ============ AI destekli konu anlatımı ============
// Bir ders+konu kombinasyonu için anlatım tek sefer üretilip
// konu_anlatimlari tablosuna kaydediliyor; sonraki her istek oradan
// okunuyor — aynı konu için tekrar Claude API çağrısı yapılmıyor.
// Prompt/temizleme mantığı @/lib/konu-anlatimi'de — admin panelindeki
// "yeniden üret" akışıyla ortak.

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

// Veri giriş sıklığı sistemi kaldırıldı (öğrenciler artık geçmiş tarih için
// de girebiliyor) — haftalık verimlilik anketi artık herkes için aynı, sabit
// bir kurala göre soruluyor: her 3 girişte bir.
async function verimlilikSorulsunMu(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
): Promise<boolean> {
  const { data: sayi } = await supabase.rpc("ogrenci_giris_sayisi", { p_student_id: studentId });
  const count = (sayi as number) ?? 0;
  return count > 0 && count % 3 === 0;
}

export async function konuCalismaEkle(formData: FormData) {
  const { supabase, user } = await requireStudent();
  const ders = String(formData.get("ders"));
  const konu = String(formData.get("konu") ?? "").trim();
  const sureDakika = Number(formData.get("sureDakika"));
  const hedefeYakinlik = String(formData.get("hedefeYakinlik")) as HedefeYakinlik;
  const { tarih, error: tarihHatasi } = tarihDogrula(formData.get("tarih"), KATEGORI_GERIYE_DONUK_SINIR.konu);

  if (!ders || !konu || !sureDakika || sureDakika <= 0 || !hedefeYakinlik) {
    return { error: "Lütfen tüm alanları doldurun.", verimlilikSorulsunMu: false };
  }
  if (tarihHatasi) return { error: tarihHatasi, verimlilikSorulsunMu: false };
  if (sureDakika > SURE_UST_SINIR) {
    return { error: `Süre en fazla ${SURE_UST_SINIR} dakika olabilir (tek oturum için) — haftalık/günlük toplamı buraya girme.`, verimlilikSorulsunMu: false };
  }

  const { error } = await supabase.from("konu_calismalar").insert({
    student_id: user.id, ders, konu, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik, tarih,
  });
  if (error) return { error: error.message, verimlilikSorulsunMu: false };

  await rozetKontrolVeBildir(supabase, user.id);
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
  const { tarih, error: tarihHatasi } = tarihDogrula(formData.get("tarih"), KATEGORI_GERIYE_DONUK_SINIR.soru);

  if (!ders || Number.isNaN(dogru) || Number.isNaN(yanlis) || !sureDakika || sureDakika <= 0 || !hedefeYakinlik) {
    return { error: "Lütfen tüm alanları doldurun.", verimlilikSorulsunMu: false };
  }
  if (tarihHatasi) return { error: tarihHatasi, verimlilikSorulsunMu: false };
  // Süre, toplam soru sayısının (doğru+yanlış) iki katını geçemez — soru
  // başına makul bir üst sınır koyup "günlük toplamı tek oturuma girme"
  // hatasını (bkz. SURE_UST_SINIR yorumu) burada da yakalıyor.
  const toplamSoru = dogru + yanlis;
  if (sureDakika > toplamSoru * 2) {
    return { error: `Süre, toplam soru sayısının (${toplamSoru}) iki katı olan ${toplamSoru * 2} dakikayı geçemez.`, verimlilikSorulsunMu: false };
  }

  const { error } = await supabase.from("soru_cozumleri").insert({
    student_id: user.id, ders, dogru, yanlis, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik, tarih,
  });
  if (error) return { error: error.message, verimlilikSorulsunMu: false };

  await rozetKontrolVeBildir(supabase, user.id);
  const sorulsunMu = await verimlilikSorulsunMu(supabase, user.id);
  revalidatePath("/dashboard");
  return { error: null, verimlilikSorulsunMu: sorulsunMu };
}

export async function denemeEkle(
  tur: DenemeTuru,
  sureDakika: number,
  hedefeYakinlik: HedefeYakinlik,
  zorluk: DenemeZorlugu,
  dersSonuclari: { ders: string; dogru: number; yanlis: number }[],
  tarihGirdisi?: string,
) {
  const { supabase, user } = await requireStudent();
  const { tarih, error: tarihHatasi } = tarihDogrula(tarihGirdisi ?? null, KATEGORI_GERIYE_DONUK_SINIR.deneme);

  if (!sureDakika || sureDakika <= 0 || !hedefeYakinlik || !zorluk || dersSonuclari.length === 0) {
    return { error: "Lütfen tüm alanları doldurun.", verimlilikSorulsunMu: false };
  }
  if (tarihHatasi) return { error: tarihHatasi, verimlilikSorulsunMu: false };
  if (sureDakika > DENEME_SURE_UST_SINIR) {
    return { error: `Süre en fazla ${DENEME_SURE_UST_SINIR} dakika olabilir.`, verimlilikSorulsunMu: false };
  }
  // Ders başına resmî/branş soru sayısı üst sınırı sunucu tarafında da
  // doğrulanıyor (bkz. 9_10_sinif_ekleme_senaryosu.pdf 7.5 — Branş Denemesi
  // sınırlarının sunucuda doğrulanması istendi; TYT/AYT için de aynı kontrol
  // ücretsiz bir ek güvence).
  for (const d of dersSonuclari) {
    const maksSoru = dersSoruSayisi(tur, d.ders);
    if (maksSoru !== undefined && d.dogru + d.yanlis > maksSoru) {
      return { error: `${d.ders} için doğru+yanlış toplamı ${maksSoru} soruyu aşamaz.`, verimlilikSorulsunMu: false };
    }
  }

  // Okul bu tarih+tür için sonuçları zaten toplu girdiyse (kaynak='ogretmen'),
  // öğrencinin aynı denemeyi bir de kendisinin girip mükerrer/çelişkili kayıt
  // oluşturması engelleniyor — istatistikler ve rozetler tek kaynaktan beslensin.
  const { data: okulKaydi } = await supabase
    .from("denemeler")
    .select("id")
    .eq("student_id", user.id)
    .eq("tarih", tarih)
    .eq("tur", tur)
    .eq("kaynak", "ogretmen")
    .maybeSingle();
  if (okulKaydi) {
    return {
      error: `Bu tarihteki ${tur} denemenin sonucu okul tarafından sisteme yüklendi, tekrar giremezsin.`,
      verimlilikSorulsunMu: false,
    };
  }

  const { data: deneme, error } = await supabase
    .from("denemeler")
    .insert({ student_id: user.id, tur, sure_dakika: sureDakika, hedefe_yakinlik: hedefeYakinlik, zorluk, kaynak: "ogrenci", tarih })
    .select("id")
    .single();

  if (error || !deneme) return { error: error?.message ?? "Deneme kaydedilemedi.", verimlilikSorulsunMu: false };

  const { error: sonucError } = await supabase.from("deneme_ders_sonuclari").insert(
    dersSonuclari.map((d) => ({ deneme_id: deneme.id, ders: d.ders, dogru: d.dogru, yanlis: d.yanlis }))
  );
  if (sonucError) return { error: sonucError.message, verimlilikSorulsunMu: false };

  await rozetKontrolVeBildir(supabase, user.id);
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

