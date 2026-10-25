"use client";
import { driveYuklemeAdresi, type DriveEki } from "@/lib/whatsapp-drive";

export async function driveApi<T>(islem: string, veri: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch("/api/whatsapp-drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...veri, islem }), signal: AbortSignal.timeout(60_000) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Drive işlemi tamamlanamadı.");
  return data as T;
}
export async function driveDurumuOku<T>(): Promise<T> {
  const r = await fetch("/api/whatsapp-drive", { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Drive durumu okunamadı.");
  return data as T;
}
export interface DriveYuklemeTaslagi { adres: string; bilet: string; tur: string }
export async function driveDosyasiYukle(dosya: File, taslak?: DriveYuklemeTaslagi, yeniden = false): Promise<{ ek: DriveEki; taslak: DriveYuklemeTaslagi }> {
  const t = taslak ?? await driveApi<DriveYuklemeTaslagi>("baslat", { ad: dosya.name, boyut: dosya.size });
  if (!driveYuklemeAdresi(t.adres)) throw new Error("Drive yükleme adresi doğrulanamadı.");
  // Tek dosyaya özel oturum URI'si. OAuth token'ı ve dosya baytları sitemize gelmez.
  // Aynı taslakla yeniden denemede önce tamamlanmayı doğrula; dosyayı ikinci kez oluşturma.
  let baslangic = 0;
  if (yeniden) {
    try { return { ek: await driveApi<DriveEki>("tamamla", { bilet: t.bilet }), taslak: t }; } catch { /* Upload yarım kaldıysa aynı URI ile devam et. */ }
    const durum = await fetch(t.adres, { method: "PUT", headers: { "Content-Range": `bytes */${dosya.size}` }, credentials: "omit", signal: AbortSignal.timeout(20_000) });
    if (durum.ok) return { ek: await driveApi<DriveEki>("tamamla", { bilet: t.bilet }), taslak: t };
    if (durum.status !== 308) throw new Error("Yükleme oturumu sona ermiş olabilir. Dosyayı listeden kaldırıp yeniden seçin.");
    const son = durum.headers.get("Range")?.match(/^bytes=0-(\d+)$/)?.[1];
    baslangic = son ? Number(son) + 1 : 0;
    if (!Number.isSafeInteger(baslangic) || baslangic < 0 || baslangic >= dosya.size) throw new Error("Yükleme konumu doğrulanamadı. Tekrar deneyin.");
  }
  const yukle = await fetch(t.adres, { method: "PUT", body: dosya.slice(baslangic), headers: { "Content-Type": t.tur, "Content-Range": `bytes ${baslangic}-${dosya.size - 1}/${dosya.size}` }, credentials: "omit", signal: AbortSignal.timeout(180_000) });
  if (!yukle.ok) throw new Error("Drive'a aktarım tamamlanamadı. Aynı dosya için yeniden deneyin.");
  return { ek: await driveApi<DriveEki>("tamamla", { bilet: t.bilet }), taslak: t };
}

export async function driveEkleriniKartaEkle(canvas: HTMLCanvasElement, ekler: DriveEki[], aile: string) {
  if (!ekler.length) return;
  const { default: QRCode } = await import("qrcode");
  const qrs = await Promise.all(ekler.map(async (e) => {
    const data = await QRCode.toDataURL(e.adres, { width: 240, margin: 4, errorCorrectionLevel: "M" });
    const img = new Image(); img.src = data; await img.decode(); return img;
  }));
  const eski = document.createElement("canvas"); eski.width = canvas.width; eski.height = canvas.height;
  eski.getContext("2d")!.drawImage(canvas, 0, 0);
  const bas = canvas.height;
  canvas.height += 100 + Math.ceil(ekler.length / 3) * 310;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#f5f7fb"; c.fillRect(0, 0, canvas.width, canvas.height); c.drawImage(eski, 0, 0);
  c.fillStyle = "#14213d"; c.font = `700 26px ${aile}`;
  c.fillText("Ek dosyalar · QR kodu okutun", 72, bas + 48);
  for (let i = 0; i < ekler.length; i++) {
    const x = 72 + i % 3 * 320, y = bas + 65 + Math.floor(i / 3) * 310;
    c.drawImage(qrs[i], x, y, 240, 240);
    c.fillStyle = "#14213d"; c.font = `600 19px ${aile}`;
    let ad = ekler[i].ad;
    while (ad.length > 1 && c.measureText(ad).width > 270) ad = ad.slice(0, -2) + "…";
    c.fillText(ad, x, y + 269);
  }
}
