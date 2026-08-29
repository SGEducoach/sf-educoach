import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dershaneDenemeBitisGetir, suresiDolduMu, kurumTuruGetir, DENEME_SURESI_SONA_ERDI_MESAJI } from "@/lib/deneme-suresi";
import { pushGonderProfile } from "@/lib/push-send";
import { bildirimGonder } from "@/lib/bildirim-gonder";
import type { UserRole } from "@/lib/types";

const PENCERE_MS = 15 * 60 * 1000;
const ENGEL_MS = 15 * 60 * 1000;
const ENGEL_UST_SINIR_MS = 24 * 60 * 60 * 1000;
const MAKS_HATA = 5;

// Kademeli artış: aynı attempt_key art arda kaç kez engellendiyse (block_count),
// engel süresi 15dk -> 30dk -> 60dk ... şeklinde katlanır, 24 saatte tavanlanır.
// Başarılı girişte satır tamamen silindiği için sayaç sıfırlanır.
function kademeliEngelSuresi(blockCount: number): number {
  return Math.min(ENGEL_MS * 2 ** blockCount, ENGEL_UST_SINIR_MS);
}

type GirisRolu = "ogrenci" | "ogretmen" | "veli" | "mudur" | "admin";
interface GirisGovdesi { role?: GirisRolu; schoolId?: string; okulNo?: string; email?: string; password?: string }

// Kullanıcı isteği (26.08.2026): öğrenci hariç tüm rollerde (admin dahil)
// hesap sahibine "yanlış giriş denemesi yapıldı" bildirimi düşsün.
// login_attempt_limits'teki attempt_key hash'i bir profile_id'ye
// ÇÖZÜLEMEZ (bkz. anahtarOlustur) — bu yüzden hedefi BURADA, girisEmail
// (rol'e göre RPC'yle veya doğrudan girilen e-posta) üzerinden ayrıca
// çözüyoruz: gerçekten var olan bir hesaba denk geldiyse (rastgele bir
// e-posta/okul no değil) ve o hesap öğrenci değilse hem push hem kalıcı
// bir bildirim kaydı oluşturuyoruz.
//
// Kullanıcı isteği (26.08.2026, Bildirimler yeniden tasarımı — devam):
// "Yanlış giriş denemesi bildirimleri mesajlar kısmına gidiyor. Bunlar
// bildirim paneline gidecek." — daha önce duyurular/duyuru_aliciler'a
// (Mesajlarım kutusu) yazıyordu, artık ayrı "bildirimler" tablosuna
// (bkz. migration 0079, src/lib/bildirim-gonder.ts) yazıyor.
async function yanlisGirisBildirimGonder(admin: ReturnType<typeof createAdminClient>, girisEmail: string, tarih: Date) {
  if (!girisEmail) return;
  const { data: hedefProfil } = await admin.from("profiles").select("id, role, bildirim_yanlis_giris").eq("email", girisEmail).maybeSingle();
  if (!hedefProfil || hedefProfil.role === "ogrenci" || hedefProfil.bildirim_yanlis_giris === false) return;

  const baslik = "Yanlış giriş denemesi";
  const govde = `${tarih.toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} tarihinde hesabınıza yanlış şifre ile giriş denemesi yapıldı. Bu siz değilseniz şifrenizi değiştirmenizi öneririz.`;
  await pushGonderProfile(admin, hedefProfil.id, baslik, govde);
  await bildirimGonder(admin, hedefProfil.id, "yanlis_giris", baslik, govde);
}

function istemciIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "bilinmeyen";
}

function anahtarOlustur(request: NextRequest, body: GirisGovdesi) {
  const tanimlayici = body.role === "ogretmen"
    ? body.email?.trim().toLocaleLowerCase("tr-TR")
    : `${body.schoolId ?? ""}:${body.okulNo?.trim().toLocaleLowerCase("tr-TR")}`;
  return createHash("sha256").update(`${istemciIp(request)}|${body.role ?? ""}|${tanimlayici ?? ""}`).digest("hex");
}

export async function POST(request: NextRequest) {
  let body: GirisGovdesi;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Geçersiz giriş isteği." }, { status: 400 }); }

  if (!body.role || !["ogrenci", "ogretmen", "veli", "mudur", "admin"].includes(body.role) || !body.password) {
    return NextResponse.json({ error: "Giriş bilgileri eksik." }, { status: 400 });
  }

  const admin = createAdminClient();
  const attemptKey = anahtarOlustur(request, body);
  const { data: limit } = await admin.from("login_attempt_limits")
    .select("failed_count, window_started_at, blocked_until, block_count").eq("attempt_key", attemptKey).maybeSingle();

  if (limit?.blocked_until && new Date(limit.blocked_until).getTime() > Date.now()) {
    const dakika = Math.max(1, Math.ceil((new Date(limit.blocked_until).getTime() - Date.now()) / 60_000));
    return NextResponse.json({ error: `Çok fazla hatalı deneme yapıldı. ${dakika} dakika sonra tekrar deneyin.` }, { status: 429 });
  }

  let girisEmail = body.email?.trim().toLocaleLowerCase("tr-TR") ?? "";
  if (body.role === "ogrenci") {
    const { data } = await admin.rpc("resolve_ogrenci_email", { p_school_id: body.schoolId, p_okul_no: body.okulNo?.trim() });
    girisEmail = data ?? "";
  } else if (body.role === "mudur") {
    const { data } = await admin.rpc("resolve_mudur_email", { p_okul_kodu: body.okulNo?.trim() });
    girisEmail = data ?? "";
  }

  const supabase = await createClient();
  let error: Error | null;
  if (body.role === "veli") {
    // Sadeleştirme (29.08.2026) — veli artık HER girişte kod GİRMİYOR,
    // sadece şifre. Bir öğrencide birden fazla tamamlanmış veli hesabı
    // olabildiği için (anne+baba ayrı kayıt) okul_no tek başına hesabı
    // belirlemiyor — adayların HER birine şifre denenir, ilk tutan kazanır.
    const { data: adaylar } = await admin.rpc("resolve_veli_email_adaylari", { p_school_id: body.schoolId, p_okul_no: body.okulNo?.trim() });
    error = new Error("Invalid login credentials");
    for (const aday of (adaylar as string[] | null) ?? []) {
      const sonuc = await supabase.auth.signInWithPassword({ email: aday, password: body.password });
      if (!sonuc.error) { error = null; girisEmail = aday; break; }
    }
  } else {
    ({ error } = girisEmail
      ? await supabase.auth.signInWithPassword({ email: girisEmail, password: body.password })
      : { error: new Error("Invalid login credentials") });
  }

  let askidaMi = false;
  let denemeSuresiDoldu = false;
  if (!error) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user ? await admin.from("profiles").select("role, aktif").eq("id", user.id).maybeSingle() : { data: null };
    if (body.role === "admin" && profile?.role !== "admin") {
      await supabase.auth.signOut();
      error = new Error("Invalid login credentials");
    } else if (profile && profile.aktif === false) {
      // Faz F (2026-08-25) — profiles.aktif ZATEN vardı (moderatör/admin
      // aç-kapa yapabiliyordu, bkz. moderatorAktiflikDegistir/
      // hesapAktiflikDegistir) ama login bunu HİÇ kontrol etmiyordu; bu
      // yüzden "ban" fiilen işe yaramıyordu. Otomatik manipülasyon
      // banı (bkz. manipulasyon-takip.ts) da AYNI alanı kullanıyor.
      await supabase.auth.signOut();
      askidaMi = true;
      error = new Error("Hesap askıda");
    } else if (user && profile && profile.role !== "admin") {
      // Dershane 1 haftalık deneme süresi (bkz. deneme-suresi.ts,
      // migration 0065) — SADECE dershane rolleri, okul hiç etkilenmez.
      const kurumTuru = await kurumTuruGetir(admin, user.id, profile.role as UserRole);
      if (kurumTuru === "dershane") {
        const bitis = await dershaneDenemeBitisGetir(admin);
        if (suresiDolduMu(bitis)) {
          await supabase.auth.signOut();
          denemeSuresiDoldu = true;
          error = new Error("Deneme süresi doldu");
        }
      }
    }
  }

  if (denemeSuresiDoldu) {
    return NextResponse.json({ error: DENEME_SURESI_SONA_ERDI_MESAJI }, { status: 403 });
  }

  if (askidaMi) {
    // Şifre doğru olsa bile hesap askıda — bu bir "hatalı şifre denemesi"
    // değil, rate-limit sayacını gereksiz artırmasın (kademeli engel
    // burada anlamsız, hesap zaten kapalı).
    return NextResponse.json({ error: "Hesabınız askıya alındı. Kurumunuzun yetkilisiyle (moderatör/yönetici) iletişime geçin." }, { status: 403 });
  }

  if (error) {
    const simdi = Date.now();
    const pencereBaslangici = limit?.window_started_at ? new Date(limit.window_started_at).getTime() : 0;
    const ayniPencere = simdi - pencereBaslangici < PENCERE_MS;
    const yeniSayac = ayniPencere ? (limit?.failed_count ?? 0) + 1 : 1;
    const engelTetiklendi = yeniSayac >= MAKS_HATA;
    const yeniBlockCount = engelTetiklendi ? (limit?.block_count ?? 0) + 1 : (limit?.block_count ?? 0);
    const engelSuresiMs = kademeliEngelSuresi(yeniBlockCount - 1);
    const blockedUntil = engelTetiklendi ? new Date(simdi + engelSuresiMs).toISOString() : null;
    await admin.from("login_attempt_limits").upsert({
      attempt_key: attemptKey, failed_count: yeniSayac,
      window_started_at: ayniPencere && limit?.window_started_at ? limit.window_started_at : new Date(simdi).toISOString(),
      blocked_until: blockedUntil, block_count: yeniBlockCount, updated_at: new Date(simdi).toISOString(),
    });
    const kalan = Math.max(0, MAKS_HATA - yeniSayac);
    const engelDakika = Math.round(engelSuresiMs / 60_000);
    const mesaj = blockedUntil ? `Çok fazla hatalı deneme yapıldı. ${engelDakika} dakika sonra tekrar deneyin.` : `Bilgiler hatalı. Kalan deneme hakkı: ${kalan}.`;
    await yanlisGirisBildirimGonder(admin, girisEmail, new Date(simdi));
    return NextResponse.json({ error: mesaj }, { status: blockedUntil ? 429 : 401 });
  }

  await admin.from("login_attempt_limits").delete().eq("attempt_key", attemptKey);
  return NextResponse.json({ ok: true });
}
