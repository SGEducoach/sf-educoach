import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { requireDershaneMudur } from "@/lib/dershane-auth";
import { gecerliDersler } from "@/lib/deneme-dersleri";
import type { DenemeTuru } from "@/lib/types";

// exceljs Node API'sini kullanıyor (Buffer, dosya üretimi) — edge runtime'da
// çalışmaz. Aynı desen: src/app/api/dershane/roster-sablonu/route.ts.
export const runtime = "nodejs";

// Kullanıcı isteği (27.08.2026): "sonuçlar excel olarak da yüklenebilecek...
// onun excel halini düşün" — deneme sonuç PDF'inin (dershane karnesi:
// öğrenci adı + ders başına doğru/yanlış) Excel karşılığı. Tür (TYT/AYT/
// BRANS) query param olarak geliyor çünkü ders listesi türe göre değişiyor
// (bkz. gecerliDersler) — şablon o türe özel üretiliyor.
export async function GET(request: NextRequest) {
  const { admin, schoolId } = await requireDershaneMudur();
  if (!admin || !schoolId) {
    return new Response("Bu işlem için dershane müdürü yetkisi gerekiyor.", { status: 403 });
  }

  const turParam = request.nextUrl.searchParams.get("tur");
  const tur = (["TYT", "AYT", "BRANS"].includes(turParam ?? "") ? turParam : "TYT") as DenemeTuru;
  const dersler = gecerliDersler(tur);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Deneme Sonuçları");

  const columns: { header: string; key: string; width: number }[] = [
    { header: "Ad Soyad", key: "adSoyad", width: 26 },
  ];
  for (const ders of dersler) {
    columns.push({ header: `${ders} Doğru`, key: `${ders}_dogru`, width: 14 });
    columns.push({ header: `${ders} Yanlış`, key: `${ders}_yanlis`, width: 14 });
  }
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  // Not: kasıtlı olarak örnek/açıklama satırı YOK — yükleme tarafı "Ad
  // Soyad" dolu olan HER satırı gerçek bir öğrenci sayıyor (bkz.
  // denemeExcelIceriAktar), örnek bir satır silinmeyi unutulursa "adı
  // bulundu ama sonucu okunamadı" olarak yanlışlıkla raporlanırdı.

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="deneme-sonucu-sablonu-${tur.toLowerCase()}.xlsx"`,
    },
  });
}
