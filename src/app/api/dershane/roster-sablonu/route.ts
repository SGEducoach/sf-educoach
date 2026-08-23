import ExcelJS from "exceljs";
import { requireDershaneMudur } from "@/lib/dershane-auth";

// exceljs Node API'sini kullanıyor (Buffer, dosya üretimi) — edge runtime'da
// çalışmaz.
export const runtime = "nodejs";

const ALAN_SECENEKLERI = ["SAY", "EA", "SOZ"];
const PROGRAM_SECENEKLERI = ["Hafta İçi", "Hafta Sonu"];
const SATIR_SAYISI = 300;

// DERSHANE MODU (Faz D4) — müdürün toplu öğrenci yükleme şablonu. "Sınıf"
// kolonu o dershanenin GERÇEK şubelerinden (dershaneSinifEkle ile
// oluşturulmuş) bir açılır menü olarak geliyor — müdür önce şube
// oluşturmadan bu şablonu anlamlı dolduramaz, bu bilerek böyle.
export async function GET() {
  const { admin, schoolId } = await requireDershaneMudur();
  if (!admin || !schoolId) {
    return new Response("Bu işlem için dershane müdürü yetkisi gerekiyor.", { status: 403 });
  }

  const { data: siniflarHam } = await admin.from("classes").select("seviye, sube").eq("school_id", schoolId);
  const sinifSecenekleri = (siniflarHam ?? []).map((s) => `${s.seviye}-${s.sube}`).sort();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Öğrenciler");
  sheet.columns = [
    { header: "Sınıf Öğretmeni (bilgi amaçlı)", key: "sinifOgretmeni", width: 26 },
    { header: "Telefon", key: "telefon", width: 15 },
    { header: "Ad Soyad", key: "adSoyad", width: 24 },
    { header: "Veli Telefonu", key: "veliTelefonu", width: 15 },
    { header: "Alan", key: "alan", width: 10 },
    { header: "Sınıf", key: "sinif", width: 12 },
    { header: "Hafta İçi/Sonu", key: "program", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  const alanFormul = `"${ALAN_SECENEKLERI.join(",")}"`;
  const programFormul = `"${PROGRAM_SECENEKLERI.join(",")}"`;
  const sinifFormul = sinifSecenekleri.length > 0 ? `"${sinifSecenekleri.join(",")}"` : null;

  for (let satir = 2; satir <= SATIR_SAYISI + 1; satir++) {
    sheet.getCell(`E${satir}`).dataValidation = {
      type: "list", allowBlank: true, formulae: [alanFormul],
      showErrorMessage: true, error: "Lütfen listeden seçin: SAY, EA veya SÖZ.",
    };
    sheet.getCell(`G${satir}`).dataValidation = {
      type: "list", allowBlank: true, formulae: [programFormul],
      showErrorMessage: true, error: "Lütfen listeden seçin: Hafta İçi veya Hafta Sonu.",
    };
    if (sinifFormul) {
      sheet.getCell(`F${satir}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [sinifFormul],
        showErrorMessage: true, error: "Lütfen listeden bir şube seçin (önce Şubeler bölümünden şube oluşturun).",
      };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="ogrenci-sablonu.xlsx"',
    },
  });
}
