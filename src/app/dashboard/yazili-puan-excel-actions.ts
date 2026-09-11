"use server";

import { createClient } from "@/lib/supabase/server";
import { adNormalize } from "@/lib/validators";
import { sinifOgrencileriniGetir, UUID_DESENI, yaziliKullanicisi } from "@/lib/yazili-sinif-ogrencileri";

export interface ExcelPuanSonucu {
  error: string | null;
  puanlar: Record<string, number>;
  eslesmeyenler: { satir: number; okulNo: string; ad: string }[];
  hatalar: { satir: number; ad: string; mesaj: string }[];
  bosBirakilanlar: string[];
}

const BOS_SONUC: Omit<ExcelPuanSonucu, "error"> = { puanlar: {}, eslesmeyenler: [], hatalar: [], bosBirakilanlar: [] };
const EN_BUYUK_DOSYA = 2 * 1024 * 1024;
const EN_FAZLA_SATIR = 500;

// exceljs hücre değeri sayı, metin, zengin metin ya da formül sonucu olabilir.
function hucreMetni(deger: unknown): string {
  if (deger == null) return "";
  if (typeof deger === "object") {
    const d = deger as { result?: unknown; text?: unknown; richText?: { text: string }[] };
    if (d.richText) return d.richText.map((parca) => parca.text).join("").trim();
    if (d.result !== undefined) return hucreMetni(d.result);
    if (d.text !== undefined) return String(d.text).trim();
    return "";
  }
  return String(deger).trim();
}

// Yazılı analizi puan şablonunu (api/yazili-analizi/puan-sablonu) okur ve
// puanları öğrenci kimliğine eşler. VERİTABANINA YAZMAZ — sonuç yalnızca
// puan giriş ekranını doldurur; kayıt eskisi gibi sihirbazın son adımında.
// Eşleştirme okul numarasıyla; numara yoksa/bulunamazsa ad, sınıfta TEK
// kişiye aitse adla (aynı adlı iki öğrenci asla tahminle eşleşmez).
export async function yaziliPuanlariniExceldenOku(formData: FormData): Promise<ExcelPuanSonucu> {
  const supabase = await createClient();
  if (!(await yaziliKullanicisi(supabase))) return { error: "Bu işlem için öğretmen girişi gerekiyor.", ...BOS_SONUC };

  const sinifId = String(formData.get("sinifId") ?? "");
  const maxToplam = Number(formData.get("maxToplam"));
  const dosya = formData.get("dosya");
  if (!UUID_DESENI.test(sinifId)) return { error: "Geçersiz sınıf.", ...BOS_SONUC };
  if (!Number.isFinite(maxToplam) || maxToplam <= 0) return { error: "Önce ilk adımda soru puanlarını girin.", ...BOS_SONUC };
  if (!(dosya instanceof File) || dosya.size === 0) return { error: "Dosya seçilmedi.", ...BOS_SONUC };
  if (dosya.size > EN_BUYUK_DOSYA) return { error: "Dosya çok büyük (en fazla 2 MB).", ...BOS_SONUC };

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await dosya.arrayBuffer());
  } catch {
    return { error: "Dosya okunamadı — şablondan indirdiğiniz .xlsx dosyasını yükleyin (eski .xls biçimi desteklenmiyor).", ...BOS_SONUC };
  }
  const sheet = workbook.getWorksheet("Puanlar") ?? workbook.worksheets[0];
  if (!sheet) return { error: "Dosyada sayfa bulunamadı.", ...BOS_SONUC };

  const { error, ogrenciler } = await sinifOgrencileriniGetir(supabase, sinifId);
  if (error) return { error: "Sınıf listesi alınamadı.", ...BOS_SONUC };

  const noIle = new Map(ogrenciler.filter((o) => o.okulNo).map((o) => [o.okulNo, o]));
  const adSayaci = new Map<string, number>();
  for (const o of ogrenciler) {
    const anahtar = adNormalize(o.ad);
    adSayaci.set(anahtar, (adSayaci.get(anahtar) ?? 0) + 1);
  }
  const adIle = new Map(ogrenciler.filter((o) => adSayaci.get(adNormalize(o.ad)) === 1).map((o) => [adNormalize(o.ad), o]));

  const sonuc: ExcelPuanSonucu = { error: null, puanlar: {}, eslesmeyenler: [], hatalar: [], bosBirakilanlar: [] };
  const gorulen = new Set<string>();
  let satirSayisi = 0;

  sheet.eachRow((row, satir) => {
    if (satir === 1) return; // başlık
    const okulNo = hucreMetni(row.getCell(1).value).replace(/\.0+$/, "");
    const ad = hucreMetni(row.getCell(2).value);
    const puanHam = hucreMetni(row.getCell(3).value).replace(",", ".");
    if (!okulNo && !ad && !puanHam) return; // tamamen boş satır
    satirSayisi++;

    const ogrenci = (okulNo ? noIle.get(okulNo) : undefined) ?? (ad ? adIle.get(adNormalize(ad)) : undefined);
    if (!ogrenci) {
      sonuc.eslesmeyenler.push({ satir, okulNo, ad });
      return;
    }
    if (gorulen.has(ogrenci.id)) {
      sonuc.hatalar.push({ satir, ad: ogrenci.ad, mesaj: "Bu öğrenci dosyada birden fazla kez var." });
      return;
    }
    gorulen.add(ogrenci.id);

    if (!puanHam) {
      sonuc.bosBirakilanlar.push(ogrenci.ad);
      return;
    }
    const puan = Number(puanHam);
    if (!Number.isInteger(puan)) {
      sonuc.hatalar.push({ satir, ad: ogrenci.ad, mesaj: `"${puanHam}" tam sayı değil.` });
      return;
    }
    if (puan < 0 || puan > maxToplam) {
      sonuc.hatalar.push({ satir, ad: ogrenci.ad, mesaj: `Puan 0 ile ${maxToplam} arasında olmalı.` });
      return;
    }
    sonuc.puanlar[ogrenci.id] = puan;
  });

  if (satirSayisi === 0) return { error: "Dosyada doldurulmuş satır bulunamadı.", ...BOS_SONUC };
  if (satirSayisi > EN_FAZLA_SATIR) return { error: `Dosyada çok fazla satır var (en fazla ${EN_FAZLA_SATIR}).`, ...BOS_SONUC };
  return sonuc;
}
