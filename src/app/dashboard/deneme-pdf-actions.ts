"use server";

// DERSHANE MODU (Faz D5) — toplu deneme sonucu PDF'i Claude vision ile
// yapılandırılmış veriye çevrilir, öğrencilerle ad-soyad üzerinden
// eşleştirilir. Kullanıcı kararı: eşleştirme yöntemi ad-soyad; belirsiz/
// eşleşmeyen satırlar admin'e (site admini, /yonetici) düşer, orada elle
// düzeltilir — bkz. pdf_deneme_eslesme_bekleyenler (migration 0051).
import { revalidatePath } from "next/cache";
import { requireDershaneMudur } from "@/lib/dershane-auth";
import { getAnthropicClient } from "@/lib/anthropic";
import { adNormalize } from "@/lib/validators";
import { TYT_DERSLERI, AYT_DERSLERI, BRANS_DENEMESI_DERSLERI } from "@/lib/types";
import type { DenemeTuru } from "@/lib/types";

function gecerliDersler(tur: DenemeTuru): string[] {
  if (tur === "TYT") return [...TYT_DERSLERI];
  if (tur === "BRANS") return [...BRANS_DENEMESI_DERSLERI];
  return [...new Set(Object.values(AYT_DERSLERI).flat())];
}

// AYT_DERSLERI bazı dersleri sınav yapısına özgü alt-adlarla tutuyor
// ("Tarih-1", "Felsefe Grubu") — deneme_ders_sonuclari'nda düz ders
// adlarıyla saklamak için normalize ediyoruz (bkz. mufredat-konulari.ts'
// teki aynı desen).
function dersAdiNormalize(ad: string): string {
  return ad.trim().replace(/-\d$/, "").replace(/^Felsefe Grubu$/i, "Felsefe");
}

interface PdfOgrenciSonucu {
  ad_soyad: string;
  ders_sonuclari: { ders: string; dogru: number; yanlis: number }[];
}

function claudeYanitiniAyristir(metin: string): PdfOgrenciSonucu[] {
  // Claude bazen ```json ... ``` bloğuna sarıyor — temizleyip parse ediyoruz.
  const temiz = metin.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const veri = JSON.parse(temiz);
  if (!Array.isArray(veri)) throw new Error("Beklenmeyen format.");
  return veri;
}

export async function denemePdfIceriAktar(formData: FormData): Promise<{
  error: string | null; toplam: number; otomatikEslesen: number; bekleyen: number;
}> {
  const { user, admin, schoolId } = await requireDershaneMudur();
  if (!admin || !schoolId) return { error: "Bu işlem için dershane müdürü yetkisi gerekiyor.", toplam: 0, otomatikEslesen: 0, bekleyen: 0 };

  const dosya = formData.get("dosya") as File | null;
  const yayinevi = String(formData.get("yayinevi") ?? "").trim();
  const tarih = String(formData.get("tarih") ?? "").trim();
  const tur = String(formData.get("tur") ?? "") as DenemeTuru;

  if (!dosya) return { error: "PDF dosyası seçilmedi.", toplam: 0, otomatikEslesen: 0, bekleyen: 0 };
  if (!yayinevi) return { error: "Yayınevi gerekli.", toplam: 0, otomatikEslesen: 0, bekleyen: 0 };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return { error: "Uygulama tarihi gerekli.", toplam: 0, otomatikEslesen: 0, bekleyen: 0 };
  if (!["TYT", "AYT", "BRANS"].includes(tur)) return { error: "Tür seçin.", toplam: 0, otomatikEslesen: 0, bekleyen: 0 };

  const base64 = Buffer.from(await dosya.arrayBuffer()).toString("base64");
  const dersler = gecerliDersler(tur);

  let ayristirilan: PdfOgrenciSonucu[];
  try {
    const anthropic = getAnthropicClient();
    const yanit = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      system:
        "Sen bir deneme sınavı sonuç raporu okuyucususun. Sana verilen PDF, bir dershanenin " +
        "öğrencilerine ait toplu deneme sınavı sonuç raporudur (taranmış görsel veya dijital " +
        "olabilir). Her öğrenci için ad-soyadını ve derslere göre doğru/yanlış sayılarını çıkar. " +
        `Geçerli ders adları: ${dersler.join(", ")}. Yalnızca bu listedeki ders adlarını kullan, ` +
        "en yakın eşleşeni seç. SADECE aşağıdaki JSON formatında, başka hiçbir açıklama/metin " +
        'olmadan yanıt ver: [{"ad_soyad": "Ad Soyad", "ders_sonuclari": [{"ders": "...", "dogru": 0, "yanlis": 0}]}]',
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Bu deneme sonuç raporundaki tüm öğrencilerin sonuçlarını yukarıdaki JSON formatında çıkar." },
        ],
      }],
    });
    const metinBlogu = yanit.content.find((b) => b.type === "text");
    if (!metinBlogu || !("text" in metinBlogu)) throw new Error("Yanıt boş.");
    ayristirilan = claudeYanitiniAyristir(metinBlogu.text);
  } catch (e) {
    console.error("deneme PDF ayrıştırma hatası:", e);
    return { error: "PDF ayrıştırılamadı. Lütfen dosyanın okunaklı olduğundan emin olup tekrar deneyin.", toplam: 0, otomatikEslesen: 0, bekleyen: 0 };
  }

  if (ayristirilan.length === 0) {
    return { error: "PDF'te öğrenci sonucu bulunamadı.", toplam: 0, otomatikEslesen: 0, bekleyen: 0 };
  }

  const { data: ogrencilerHam } = await admin
    .from("students")
    .select("id, profiles!students_id_fkey(ad)")
    .eq("school_id", schoolId);
  type OgrenciRow = { id: string; profiles: { ad: string } | null };
  const ogrenciler = ((ogrencilerHam ?? []) as unknown as OgrenciRow[])
    .filter((o) => o.profiles)
    .map((o) => ({ id: o.id, adNorm: adNormalize(o.profiles!.ad) }));

  let otomatikEslesen = 0;
  let bekleyen = 0;

  for (const satir of ayristirilan) {
    const adNorm = adNormalize(satir.ad_soyad);
    const eslesenler = ogrenciler.filter((o) => o.adNorm === adNorm);

    if (eslesenler.length === 1) {
      const studentId = eslesenler[0].id;
      const { data: mevcutDeneme } = await admin
        .from("denemeler")
        .select("id")
        .eq("student_id", studentId).eq("tarih", tarih).eq("tur", tur).eq("kaynak", "ogretmen")
        .maybeSingle();

      let denemeId = mevcutDeneme?.id as string | undefined;
      if (!denemeId) {
        const { data: yeniDeneme, error: olusturmaHatasi } = await admin
          .from("denemeler")
          .insert({ student_id: studentId, tarih, tur, hedefe_yakinlik: "belirsiz", yayinevi, kaynak: "ogretmen" })
          .select("id").single();
        if (olusturmaHatasi || !yeniDeneme) { bekleyen++; continue; }
        denemeId = yeniDeneme.id as string;
      }

      let satirBasarili = true;
      for (const ds of satir.ders_sonuclari) {
        const { error } = await admin.from("deneme_ders_sonuclari")
          .upsert({ deneme_id: denemeId, ders: dersAdiNormalize(ds.ders), dogru: ds.dogru, yanlis: ds.yanlis }, { onConflict: "deneme_id,ders" });
        if (error) satirBasarili = false;
      }
      if (satirBasarili) otomatikEslesen++; else bekleyen++;
    } else {
      await admin.from("pdf_deneme_eslesme_bekleyenler").insert({
        school_id: schoolId, ad_soyad_ham: satir.ad_soyad, ders_sonuclari: satir.ders_sonuclari,
        yayinevi, tarih, tur, olusturan_mudur_id: user.id,
      });
      bekleyen++;
    }
  }

  revalidatePath("/dashboard");
  return { error: null, toplam: ayristirilan.length, otomatikEslesen, bekleyen };
}
