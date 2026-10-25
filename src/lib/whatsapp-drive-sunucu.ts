import { createHash, randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { kullaniciKurumuGetir, kurumDenemeSuresiDolduMu } from "@/lib/deneme-suresi";
import { kurumErisimiKapaliMi, kurumBolumuAcikMi } from "@/lib/kurum-yetkileri";
import { rehberlikUyeligiGetir } from "@/lib/rehberlik-servisi";
import { mudurYardimcisiUyeligiGetir } from "@/lib/mudur-yardimcisi";
import { rehberlikBirimiMi } from "@/lib/dashboard-navigation";
import { driveBiletImzala, driveBiletOku, driveSirCoz } from "@/lib/whatsapp-drive-crypto";
import { driveDosyasiDogrula, driveDosyaAdresi, driveKimligi, driveYuklemeAdresi } from "@/lib/whatsapp-drive";

export class DriveHatasi extends Error { constructor(mesaj: string, public status = 400) { super(mesaj); } }
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DRIVE_DONUS = "/api/whatsapp-drive/callback";
export const DRIVE_COOKIE = "sf_whatsapp_drive_oauth";
export interface DriveBaglantisi { refresh_token_sifreli: string; klasor_id: string | null; klasor_adi: string | null; updated_at: string }
export interface DriveKullanicisi { id: string; adminMi: boolean; okulId: string | null }
export function driveEksikAyarlar() {
  const adlar = ["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET", "GOOGLE_DRIVE_TOKEN_KEY", "GOOGLE_DRIVE_PICKER_KEY", "GOOGLE_DRIVE_PROJECT_NUMBER"];
  return adlar.filter((ad) => !process.env[ad] || (ad === "GOOGLE_DRIVE_TOKEN_KEY" && !/^[a-f0-9]{64}$/i.test(process.env[ad]!)));
}
export function driveSiteAdresi() {
  const url = new URL(process.env.GOOGLE_DRIVE_SITE_URL || "https://www.sefukoc.com");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) throw new DriveHatasi("Drive site adresi hatalı.", 503);
  return url.origin;
}
export function driveOAuth() {
  if (driveEksikAyarlar().length) throw new DriveHatasi("Yönetici Google Drive kurulumunu tamamlamalı.", 503);
  return new OAuth2Client(process.env.GOOGLE_DRIVE_CLIENT_ID, process.env.GOOGLE_DRIVE_CLIENT_SECRET, driveSiteAdresi() + DRIVE_DONUS);
}
export async function driveKullanicisi(adminGerekli = false): Promise<DriveKullanicisi> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new DriveHatasi("Oturum açın.", 401);
  const { data: p, error } = await supabase.from("profiles").select("role, aktif").eq("id", user.id).maybeSingle();
  if (error || !p || p.aktif === false) throw new DriveHatasi("Hesabınız bu işlem için uygun değil.", 403);
  if (p.role === "admin") return { id: user.id, adminMi: true, okulId: null };
  if (adminGerekli || !["ogretmen", "mudur"].includes(p.role)) throw new DriveHatasi("Bu işlem için yetkiniz yok.", 403);
  const [kurum, { data: ogretmen }, rehber, idare] = await Promise.all([
    kullaniciKurumuGetir(supabase, user.id, p.role),
    supabase.from("teachers").select("school_id, class_id, brans").eq("id", user.id).maybeSingle(),
    rehberlikUyeligiGetir(supabase, user.id), mudurYardimcisiUyeligiGetir(supabase, user.id),
  ]);
  if (!kurum || !ogretmen || kurum.id !== ogretmen.school_id || kurumErisimiKapaliMi(kurum) || kurum.suresiDoldu || kurumDenemeSuresiDolduMu(kurum) || !kurumBolumuAcikMi(kurum.modulYetkileri, "duyurular")) throw new DriveHatasi("Kurumunuzda duyuru işlemi açık değil.", 403);
  if (p.role !== "mudur" && !ogretmen.class_id && !rehberlikBirimiMi(ogretmen.brans, !!rehber) && !idare?.sinifDuzeyleri.length) throw new DriveHatasi("Genel duyuru hazırlama yetkiniz yok.", 403);
  return { id: user.id, adminMi: false, okulId: kurum.id };
}
export async function driveBaglantisiOku(): Promise<DriveBaglantisi | null> {
  const { data, error } = await createAdminClient().from("whatsapp_drive_baglantisi").select("refresh_token_sifreli, klasor_id, klasor_adi, updated_at").eq("id", 1).maybeSingle();
  if (error) throw new DriveHatasi("Drive bağlantısı için veritabanı kurulumu tamamlanmalı.", 503);
  return data as DriveBaglantisi | null;
}
let tokenOnbellek: { sifreli: string; token: Promise<string>; son: number } | null = null;
export function driveTokenOnbelleginiSil() { tokenOnbellek = null; }
export async function driveErisimAnahtari(b: DriveBaglantisi): Promise<string> {
  if (tokenOnbellek?.sifreli === b.refresh_token_sifreli && tokenOnbellek.son > Date.now()) return tokenOnbellek.token;
  const token = (async () => {
    try {
      const oauth = driveOAuth(); oauth.setCredentials({ refresh_token: driveSirCoz(b.refresh_token_sifreli) });
      const r = await oauth.getAccessToken();
      if (!r.token) throw new Error("Token yok");
      return r.token;
    } catch { tokenOnbellek = null; throw new DriveHatasi("Google bağlantısı yenilenemedi. Admin Drive hesabını yeniden bağlamalı.", 503); }
  })();
  tokenOnbellek = { sifreli: b.refresh_token_sifreli, token, son: Date.now() + 50 * 60_000 };
  return token;
}
export async function driveIstegi(token: string, adres: string, init: RequestInit = {}) {
  return fetch(adres, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20_000), redirect: "error" });
}
export async function driveKlasoruDogrula(token: string, id: string) {
  if (!driveKimligi(id)) throw new DriveHatasi("Geçersiz klasör.");
  const r = await driveIstegi(token, `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,trashed,capabilities(canAddChildren),permissions(type,role)`);
  if (!r.ok) throw new DriveHatasi("Klasöre erişilemiyor. Google klasör seçicisinden yeniden seçin.");
  const v = await r.json();
  if (v.mimeType !== "application/vnd.google-apps.folder" || v.trashed || !v.capabilities?.canAddChildren) throw new DriveHatasi("Dosya ekleyebileceğiniz bir Drive klasörü seçin.");
  if (!v.permissions?.some((p: { type: string; role: string }) => p.type === "anyone" && p.role === "reader")) throw new DriveHatasi("Klasörün paylaşımı 'Bağlantıya sahip olan herkes / Görüntüleyen' olmalı.");
  return { id: v.id as string, ad: v.name as string };
}
export async function driveKayit(k: DriveKullanicisi, eylem: string, detay: Record<string, unknown>) {
  const { error } = await createAdminClient().from("admin_audit_log").insert({ actor_id: k.id, eylem, detay });
  if (error) throw new DriveHatasi("Drive işlem kaydı yazılamadı. Yeniden deneyin.", 503);
}
const baglantiSurumu = (b: DriveBaglantisi) => createHash("sha256").update(b.refresh_token_sifreli).digest("hex");
export async function driveYuklemeBaslat(k: DriveKullanicisi, b: DriveBaglantisi, girdi: { ad: unknown; boyut: unknown }) {
  if (!b.klasor_id) throw new DriveHatasi("Admin önce Drive hedef klasörünü seçmeli.", 503);
  const dosya = driveDosyasiDogrula(girdi);
  const { count, error } = await createAdminClient().from("admin_audit_log").select("id", { count: "exact", head: true }).eq("actor_id", k.id).eq("eylem", "whatsapp_drive_baslat").gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if (error) throw new DriveHatasi("Yükleme sınırı kontrol edilemedi.", 503);
  if ((count ?? 0) >= 30) throw new DriveHatasi("Bir saat içinde en fazla 30 dosya yükleyebilirsiniz. Daha sonra tekrar deneyin.", 429);
  const nonce = randomUUID();
  await driveKayit(k, "whatsapp_drive_baslat", { okul_id: k.okulId, islem: nonce, boyut: dosya.boyut });
  const token = await driveErisimAnahtari(b);
  await driveKlasoruDogrula(token, b.klasor_id);
  const ids = await driveIstegi(token, "https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files");
  if (!ids.ok) throw new DriveHatasi("Google yüklemeyi başlatamadı. Yeniden deneyin.", 502);
  const id = (await ids.json()).ids?.[0];
  if (!driveKimligi(id)) throw new DriveHatasi("Google dosya kimliği alınamadı.", 502);
  const r = await driveIstegi(token, "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Upload-Content-Type": dosya.tur, "X-Upload-Content-Length": String(dosya.boyut) },
    body: JSON.stringify({ id, name: dosya.ad, mimeType: dosya.tur, parents: [b.klasor_id], appProperties: { sf_duyuru: nonce, sf_aktor: k.id } }),
  });
  const adres = r.headers.get("Location");
  if (!r.ok || !adres || !driveYuklemeAdresi(adres)) throw new DriveHatasi("Google dosya yükleme oturumu açılamadı.", 502);
  const bilet = driveBiletImzala("yukleme", { ...dosya, id, nonce, aktor: k.id, okul: k.okulId, klasor: b.klasor_id, surum: baglantiSurumu(b), exp: Date.now() + 60 * 60_000 });
  // URI yalnız bu dosyanın yükleme yetkisidir; OAuth token'ı öğretmene verilmez.
  return { adres, bilet, tur: dosya.tur };
}
export async function driveYuklemeTamamla(k: DriveKullanicisi, b: DriveBaglantisi, bilet: string) {
  const v = driveBiletOku("yukleme", bilet);
  if (v.aktor !== k.id || v.okul !== k.okulId || v.klasor !== b.klasor_id || v.surum !== baglantiSurumu(b) || !driveKimligi(v.id)) throw new DriveHatasi("Bu dosya yüklemesi hesabınıza veya güncel klasöre ait değil.", 403);
  const token = await driveErisimAnahtari(b);
  const r = await driveIstegi(token, `https://www.googleapis.com/drive/v3/files/${v.id}?fields=id,name,size,mimeType,parents,trashed,appProperties,permissions(type,role),capabilities(canDownload)`);
  if (!r.ok) throw new DriveHatasi("Yüklenen dosya doğrulanamadı; yükleme tamamlanmamış olabilir.", 502);
  const dosya = await r.json();
  if (dosya.trashed || dosya.id !== v.id || dosya.name !== v.ad || Number(dosya.size) !== v.boyut || dosya.mimeType !== v.tur || !dosya.parents?.includes(v.klasor) || dosya.appProperties?.sf_duyuru !== v.nonce || dosya.appProperties?.sf_aktor !== k.id) throw new DriveHatasi("Yüklenen dosya seçilen dosyayla eşleşmiyor.");
  if (dosya.capabilities?.canDownload === false || !dosya.permissions?.some((p: { type: string; role: string }) => p.type === "anyone" && p.role === "reader")) throw new DriveHatasi("Dosya öğrenciye açık değil. Drive paylaşımını kontrol edin.");
  await driveKayit(k, "whatsapp_drive_tamamla", { dosya_id: v.id, okul_id: k.okulId, boyut: v.boyut });
  return { id: dosya.id as string, ad: dosya.name as string, adres: driveDosyaAdresi(dosya.id) };
}
