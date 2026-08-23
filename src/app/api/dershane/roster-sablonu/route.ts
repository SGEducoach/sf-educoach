import ExcelJS from "exceljs";
import { requireDershaneMudur } from "@/lib/dershane-auth";

// exceljs Node API'sini kullanıyor (Buffer, dosya üretimi) — edge runtime'da
// çalışmaz.
export const runtime = "nodejs";

const ALAN_SECENEKLERI = ["SAY", "EA", "SOZ"];
const PROGRAM_SECENEKLERI = ["Hafta İçi", "Hafta Sonu"];
const SEVIYE_SECENEKLERI = ["9", "10", "11", "12"];
const SUBE_SECENEKLERI = ["A", "B", "C", "D", "E", "F", "G", "X"];
const SATIR_SAYISI = 300;

// DERSHANE MODU (Faz D4) — müdürün toplu öğrenci yükleme şablonu. "Sınıf"
// (seviye) ve "Şube" ayrı kolonlar — ikisi de sabit bir seçenek listesinden
// açılır menü (kullanıcı isteğiyle: dershanenin HENÜZ oluşturmadığı bir
// şubeyi de önceden yazabilsin, ama yükleme sırasında o şube gerçekten
// oluşturulmuş olmalı — aksi halde satır "Sınıf bulunamadı" hatasıyla
// döner, bkz. dashboard/actions.ts dershaneRosterTopluEkle).
export async function GET() {
  const { admin, schoolId } = await requireDershaneMudur();
  if (!admin || !schoolId) {
    return new Response("Bu işlem için dershane müdürü yetkisi gerekiyor.", { status: 403 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Öğrenciler");
  sheet.columns = [
    { header: "Sınıf Öğretmeni (bilgi amaçlı)", key: "sinifOgretmeni", width: 26 },
    { header: "Telefon", key: "telefon", width: 15 },
    { header: "Ad Soyad", key: "adSoyad", width: 24 },
    { header: "Veli Telefonu", key: "veliTelefonu", width: 15 },
    { header: "Alan", key: "alan", width: 10 },
    { header: "Sınıf", key: "sinif", width: 10 },
    { header: "Şube", key: "sube", width: 10 },
    { header: "Hafta İçi/Sonu", key: "program", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  const alanFormul = `"${ALAN_SECENEKLERI.join(",")}"`;
  const programFormul = `"${PROGRAM_SECENEKLERI.join(",")}"`;
  const seviyeFormul = `"${SEVIYE_SECENEKLERI.join(",")}"`;
  const subeFormul = `"${SUBE_SECENEKLERI.join(",")}"`;

  for (let satir = 2; satir <= SATIR_SAYISI + 1; satir++) {
    sheet.getCell(`E${satir}`).dataValidation = {
      type: "list", allowBlank: true, formulae: [alanFormul],
      showErrorMessage: true, error: "Lütfen listeden seçin: SAY, EA veya SÖZ.",
    };
    sheet.getCell(`F${satir}`).dataValidation = {
      type: "list", allowBlank: true, formulae: [seviyeFormul],
      showErrorMessage: true, error: "Lütfen listeden seçin: 9, 10, 11 veya 12.",
    };
    sheet.getCell(`G${satir}`).dataValidation = {
      type: "list", allowBlank: true, formulae: [subeFormul],
      showErrorMessage: true, error: "Lütfen listeden bir şube seçin (A-G veya X).",
    };
    sheet.getCell(`H${satir}`).dataValidation = {
      type: "list", allowBlank: true, formulae: [programFormul],
      showErrorMessage: true, error: "Lütfen listeden seçin: Hafta İçi veya Hafta Sonu.",
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ogrenci-sablonu.xlsx"',
    },
  });
}
