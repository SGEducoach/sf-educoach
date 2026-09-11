import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { sinifOgrencileriniGetir, UUID_DESENI, yaziliKullanicisi } from "@/lib/yazili-sinif-ogrencileri";
import { yaziliErisimi } from "@/lib/yazili-erisim";
import { YAZILI_KILIT_MESAJI } from "@/lib/yazili-erisim-hesap";

// exceljs Node API'sini kullanıyor (Buffer, dosya üretimi) — edge runtime'da
// çalışmaz.
export const runtime = "nodejs";

// Kullanıcı isteği (11.09.2026): "bir rehber excel dosyası hazırla, toplu
// öğrenci ekleme mantığıyla çalışsın; öğrenci no, isim soyisim, analiz
// yapılacak yazılının notları yer alsın; 1. ya da 2. yazılı demeye gerek yok,
// girişte belirtiyoruz." Toplu öğrenci şablonundan (dershane/roster-sablonu)
// farkı: boş değil, seçilen sınıfın öğrencileriyle DOLU geliyor — öğretmen
// yalnızca Puan sütununu doldurur, numara/isim yazım hatası olmaz.
// Yükleme tarafı: dashboard/yazili-puan-excel-actions.ts.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sinifId = url.searchParams.get("sinif") ?? "";
  const maxHam = Number(url.searchParams.get("max"));
  const maxPuan = Number.isInteger(maxHam) && maxHam > 0 && maxHam <= 1000 ? maxHam : null;
  if (!UUID_DESENI.test(sinifId)) return new Response("Geçersiz sınıf.", { status: 400 });

  const supabase = await createClient();
  const ogretmenId = await yaziliKullanicisi(supabase);
  if (!ogretmenId) {
    return new Response("Bu işlem için öğretmen girişi gerekiyor.", { status: 403 });
  }
  // Dürüstlük engeli (bkz. lib/yazili-erisim.ts).
  if (!(await yaziliErisimi(ogretmenId)).izinli) return new Response(YAZILI_KILIT_MESAJI, { status: 403 });

  const { error, sinifAdi, ogrenciler } = await sinifOgrencileriniGetir(supabase, sinifId);
  if (error) return new Response("Öğrenci listesi alınamadı.", { status: 500 });
  if (ogrenciler.length === 0) return new Response("Bu sınıfta görüntüleyebileceğiniz öğrenci yok.", { status: 404 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Puanlar", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Okul No", key: "okulNo", width: 12 },
    { header: "Ad Soyad", key: "ad", width: 30 },
    { header: maxPuan ? `Puan (0-${maxPuan})` : "Puan", key: "puan", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  // Okul No metin kalsın: baştaki sıfırlar ve dershane kullanıcı adları bozulmasın.
  sheet.getColumn(1).numFmt = "@";
  for (const o of ogrenciler) sheet.addRow({ okulNo: o.okulNo, ad: o.ad, puan: null });

  for (let satir = 2; satir <= ogrenciler.length + 1; satir++) {
    sheet.getCell(`C${satir}`).dataValidation = {
      type: "whole", operator: "between", allowBlank: true,
      formulae: [0, maxPuan ?? 1000],
      showErrorMessage: true, errorTitle: "Geçersiz puan",
      error: maxPuan ? `Puan 0 ile ${maxPuan} arasında bir tam sayı olmalı.` : "Puan 0 veya daha büyük bir tam sayı olmalı.",
    };
  }

  const aciklama = workbook.addWorksheet("Nasıl doldurulur");
  aciklama.getColumn(1).width = 95;
  [
    "1. \"Puanlar\" sayfasında yalnızca Puan sütununu doldurun.",
    "2. Okul No ve Ad Soyad sütunlarını değiştirmeyin — öğrenciler okul numarasıyla eşleştirilir.",
    "3. Sınava girmeyen öğrencinin puanını boş bırakın; ekranda sonradan girebilirsiniz.",
    "4. Dosyayı kaydedin, Yazılı Analizi > puan girişi ekranında \"Excel'den yükle\" ile seçin.",
    "Hangi yazılı olduğu (1. ya da 2.) ilk adımda seçildiği için dosyada ayrıca belirtilmez.",
  ].forEach((metin) => aciklama.addRow([metin]));

  const buffer = await workbook.xlsx.writeBuffer();
  const dosyaAdi = `yazili-puanlari-${(sinifAdi ?? "sinif").replace(/[^0-9A-Za-z-]/g, "")}.xlsx`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${dosyaAdi}"`,
      "Cache-Control": "no-store",
    },
  });
}
