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

class PdfAyristirmaHatasi extends Error {
  constructor(readonly kullaniciMesaji: string) {
    super(kullaniciMesaji);
    this.name = "PdfAyristirmaHatasi";
  }
}

function kayitMi(deger: unknown): deger is Record<string, unknown> {
  return typeof deger === "object" && deger !== null && !Array.isArray(deger);
}

function pdfCiktiSemasi(dersler: string[]) {
  return {
    type: "object",
    properties: {
      ogrenciler: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ad_soyad: { type: "string" },
            ders_sonuclari: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  ders: { type: "string", enum: dersler },
                  dogru: { type: "integer" },
                  yanlis: { type: "integer" },
                },
                required: ["ders", "dogru", "yanlis"],
                additionalProperties: false,
              },
            },
          },
          required: ["ad_soyad", "ders_sonuclari"],
          additionalProperties: false,
        },
      },
    },
    required: ["ogrenciler"],
    additionalProperties: false,
  } as const;
}

function claudeYanitiniAyristir(metin: string, dersler: string[]): PdfOgrenciSonucu[] {
  const temiz = metin.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const veri: unknown = JSON.parse(temiz);
  if (!kayitMi(veri) || !Array.isArray(veri.ogrenciler)) {
    throw new Error("Yanıtta ogrenciler dizisi bulunamadı.");
  }
  if (veri.ogrenciler.length > 500) {
    throw new Error("Yanıttaki öğrenci sayısı güvenli sınırı aşıyor.");
  }

  const izinliDersler = new Set(dersler);
  return veri.ogrenciler.map((ogrenci, ogrenciIndex) => {
    if (!kayitMi(ogrenci)) throw new Error(`${ogrenciIndex + 1}. öğrenci kaydı geçersiz.`);

    const adSoyad = typeof ogrenci.ad_soyad === "string" ? ogrenci.ad_soyad.trim() : "";
    if (!adSoyad || adSoyad.length > 150) {
      throw new Error(`${ogrenciIndex + 1}. öğrenci adı boş veya çok uzun.`);
    }
    if (!Array.isArray(ogrenci.ders_sonuclari) || ogrenci.ders_sonuclari.length === 0) {
      throw new Error(`${ogrenciIndex + 1}. öğrencinin ders sonucu bulunamadı.`);
    }
    if (ogrenci.ders_sonuclari.length > dersler.length) {
      throw new Error(`${ogrenciIndex + 1}. öğrencide beklenenden fazla ders sonucu var.`);
    }

    const gorulenDersler = new Set<string>();
    const dersSonuclari = ogrenci.ders_sonuclari.map((sonuc, dersIndex) => {
      if (!kayitMi(sonuc)) throw new Error(`${ogrenciIndex + 1}. öğrencinin ${dersIndex + 1}. ders sonucu geçersiz.`);
      const ders = typeof sonuc.ders === "string" ? sonuc.ders.trim() : "";
      const dogru = sonuc.dogru;
      const yanlis = sonuc.yanlis;

      if (!izinliDersler.has(ders) || gorulenDersler.has(ders)) {
        throw new Error(`${ogrenciIndex + 1}. öğrencide geçersiz veya tekrarlı ders var.`);
      }
      if (!Number.isInteger(dogru) || !Number.isInteger(yanlis) ||
          (dogru as number) < 0 || (yanlis as number) < 0 ||
          (dogru as number) > 200 || (yanlis as number) > 200 ||
          (dogru as number) + (yanlis as number) > 200) {
        throw new Error(`${ogrenciIndex + 1}. öğrencinin ${ders} sayıları geçersiz.`);
      }

      gorulenDersler.add(ders);
      return { ders, dogru: dogru as number, yanlis: yanlis as number };
    });

    return { ad_soyad: adSoyad, ders_sonuclari: dersSonuclari };
  });
}

function hataOzeti(hata: unknown): string {
  return hata instanceof Error ? `${hata.name}: ${hata.message}` : String(hata);
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

  let ayristirilan: PdfOgrenciSonucu[] | null = null;
  try {
    const anthropic = getAnthropicClient();
    let sonBicimHatasi: unknown;

    for (let deneme = 1; deneme <= 2; deneme++) {
      const yanit = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 8000,
        output_config: {
          format: {
            type: "json_schema",
            schema: pdfCiktiSemasi(dersler),
          },
        },
        system:
          "Sen bir deneme sınavı sonuç raporu okuyucususun. Sana verilen PDF, bir dershanenin " +
          "öğrencilerine ait toplu deneme sınavı sonuç raporudur (taranmış görsel veya dijital " +
          "olabilir). Her öğrenci için ad-soyadını ve derslere göre doğru/yanlış sayılarını çıkar. " +
          `Geçerli ders adları: ${dersler.join(", ")}. Yalnızca bu listedeki ders adlarını kullan, ` +
          "en yakın eşleşeni seç. Çıktıyı verilen JSON şemasına eksiksiz uydur; açıklama veya kod bloğu ekleme.",
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text", text: "Bu deneme sonuç raporundaki tüm öğrencilerin sonuçlarını çıkar." },
          ],
        }],
      }, { timeout: 120_000 });

      if (yanit.stop_reason === "max_tokens" || yanit.stop_reason === "model_context_window_exceeded") {
        throw new PdfAyristirmaHatasi("PDF sonucu tek seferde işlenemeyecek kadar büyük. Lütfen sonuç sayfalarını daha küçük parçalara bölün.");
      }
      if (yanit.stop_reason !== "end_turn") {
        throw new PdfAyristirmaHatasi("PDF işleme servisi yanıtı tamamlayamadı. Lütfen kısa süre sonra tekrar deneyin.");
      }

      const metinBlogu = yanit.content.find((b) => b.type === "text");
      if (!metinBlogu || !("text" in metinBlogu)) {
        throw new PdfAyristirmaHatasi("PDF işleme servisinden boş yanıt alındı. Lütfen tekrar deneyin.");
      }

      try {
        ayristirilan = claudeYanitiniAyristir(metinBlogu.text, dersler);
        sonBicimHatasi = undefined;
        break;
      } catch (bicimHatasi) {
        sonBicimHatasi = bicimHatasi;
        if (deneme === 1) {
          console.warn("deneme PDF yapılandırılmış yanıtı doğrulanamadı; tek yeniden deneme uygulanıyor:", hataOzeti(bicimHatasi));
        }
      }
    }

    if (!ayristirilan) {
      console.error("deneme PDF yapılandırılmış yanıtı iki denemede de doğrulanamadı:", hataOzeti(sonBicimHatasi));
      throw new PdfAyristirmaHatasi("PDF okundu ancak sonuç biçimi doğrulanamadı. Lütfen tekrar deneyin.");
    }
  } catch (e) {
    console.error("deneme PDF ayrıştırma hatası:", e);
    const mesaj = e instanceof PdfAyristirmaHatasi
      ? e.kullaniciMesaji
      : "PDF işleme sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
    return { error: mesaj, toplam: 0, otomatikEslesen: 0, bekleyen: 0 };
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
