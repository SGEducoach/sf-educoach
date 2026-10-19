import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { kullaniciKurumuGetir, kurumDenemeSuresiDolduMu, grupDondurulmus, DENEME_SURESI_SONA_ERDI_MESAJI, GRUP_DONDURULDU_MESAJI } from "@/lib/deneme-suresi";
import { pushGonderProfile } from "@/lib/push-send";
import { bildirimGonder } from "@/lib/bildirim-gonder";
import { geciciSifreyiEtkinlestir } from "@/lib/gecici-sifre";
import { grupKoduNormalize } from "@/lib/grup-kocluk";
import { ilkokulMu } from "@/lib/kademe";
import type { UserRole } from "@/lib/types";
import { IDARE_CEREZI } from "@/lib/mudur-yardimcisi";
import { kurumErisimiKapaliMi, KURUM_BAGLANTI_HATASI } from "@/lib/kurum-yetkileri";

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
// grupKodu: Grup Koçluk öğrencisi (Faz 4) — kurum listesi yerine koçun verdiği
// kod; sunucuda kuruma çevrilir (dışarıya kod sorgulatan ayrı bir kapı yok,
// kod denemeleri de aşağıdaki hatalı giriş sınırına takılır).
// gorev: İdare girişi (kullanıcı isteği 18.10.2026) — role "mudur" ile
// "mudur" (müdür) ya da "mudur_yardimcisi" (okul kodu + kendi şifresi).
interface GirisGovdesi { role?: GirisRolu; gorev?: "mudur" | "mudur_yardimcisi"; schoolId?: string; okulNo?: string; email?: string; password?: string; grupKodu?: string }

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

// İlkokul öğrencisi (1-4. sınıf) giriş yapmaz (16.10.2026). Kural sınıf
// seviyesinden türetiliyor, ayrı bir bayrak tutulmuyor (bkz. kademe.ts).
async function ilkokulOgrencisiMi(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<boolean> {
  const { data } = await admin.from("students").select("classes(seviye)").eq("id", userId).maybeSingle();
  // Gömülü ilişki çalışma anında nesne döner, tipte dizi görünür (proje notu).
  const sinif = (data as unknown as { classes: { seviye: string } | { seviye: string }[] | null } | null)?.classes;
  const seviye = Array.isArray(sinif) ? sinif[0]?.seviye : sinif?.seviye;
  return ilkokulMu(seviye);
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
  // Müdür yardımcısı denemeleri müdürün sayacından ayrı tutulur.
  const rol = `${body.role ?? ""}${body.role === "mudur" && body.gorev === "mudur_yardimcisi" ? ":mudur_yardimcisi" : ""}`;
  return createHash("sha256").update(`${istemciIp(request)}|${rol}|${tanimlayici ?? ""}`).digest("hex");
}

export async function POST(request: NextRequest) {
  let body: GirisGovdesi;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Geçersiz giriş isteği." }, { status: 400 }); }

  if (!body.role || !["ogrenci", "ogretmen", "veli", "mudur", "admin"].includes(body.role) || !body.password) {
    return NextResponse.json({ error: "Giriş bilgileri eksik." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (body.grupKodu !== undefined) {
    const kod = grupKoduNormalize(String(body.grupKodu));
    const { data: grup } = kod
      ? await admin.from("schools").select("id").ilike("okul_kodu", kod).not("grup_kapasitesi", "is", null).maybeSingle()
      : { data: null };
    // Bulunamayan kod da normal bir hatalı giriş gibi sayılır (ayrı anahtar).
    body.schoolId = (grup?.id as string | undefined) ?? `grup-yok:${kod}`;
  }
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
  const mudurYardimcisiGirisi = body.role === "mudur" && body.gorev === "mudur_yardimcisi";
  if (mudurYardimcisiGirisi) {
    // Müdür yardımcısı (migration 0163): okul kodundan kurumun müdür
    // yardımcıları bulunur, şifre her birine denenir (veli adaylarındaki
    // gibi), ilk tutan kazanır. Hatalı denemeler aynı sınıra takılır.
    girisEmail = "";
    error = new Error("Invalid login credentials");
    const { data: okul } = await admin.from("schools").select("id").eq("okul_kodu", body.okulNo?.trim() ?? "").maybeSingle();
    const { data: uyeler } = okul
      ? await admin.from("mudur_yardimcilari").select("profile_id").eq("school_id", okul.id)
      : { data: [] };
    const idler = ((uyeler ?? []) as { profile_id: string }[]).map((u) => u.profile_id).slice(0, 20);
    const { data: adaylar } = idler.length
      ? await admin.from("profiles").select("id, email").in("id", idler).eq("role", "ogretmen")
      : { data: [] };
    for (const aday of (adaylar ?? []) as { id: string; email: string | null }[]) {
      if (!aday.email) continue;
      let sonuc = await supabase.auth.signInWithPassword({ email: aday.email, password: body.password });
      if (sonuc.error && await geciciSifreyiEtkinlestir(admin, aday.id, body.password)) {
        sonuc = await supabase.auth.signInWithPassword({ email: aday.email, password: body.password });
      }
      if (!sonuc.error) { error = null; girisEmail = aday.email; break; }
    }
  } else if (body.role === "veli") {
    // Sadeleştirme (29.08.2026) — veli artık HER girişte kod GİRMİYOR,
    // sadece şifre. Bir öğrencide birden fazla tamamlanmış veli hesabı
    // olabildiği için (anne+baba ayrı kayıt) okul_no tek başına hesabı
    // belirlemiyor — adayların HER birine şifre denenir, ilk tutan kazanır.
    const { data: adaylar } = await admin.rpc("resolve_veli_email_adaylari", { p_school_id: body.schoolId, p_okul_no: body.okulNo?.trim() });
    error = new Error("Invalid login credentials");
    for (const aday of (adaylar as string[] | null) ?? []) {
      let sonuc = await supabase.auth.signInWithPassword({ email: aday, password: body.password });
      if (sonuc.error) {
        const { data: adayProfil } = await admin.from("profiles").select("id").eq("email", aday).eq("role", "veli").maybeSingle();
        if (adayProfil && await geciciSifreyiEtkinlestir(admin, adayProfil.id, body.password)) {
          sonuc = await supabase.auth.signInWithPassword({ email: aday, password: body.password });
        }
      }
      if (!sonuc.error) { error = null; girisEmail = aday; break; }
    }
  } else {
    ({ error } = girisEmail
      ? await supabase.auth.signInWithPassword({ email: girisEmail, password: body.password })
      : { error: new Error("Invalid login credentials") });
    if (error && girisEmail) {
      const { data: hedefProfil } = await admin.from("profiles").select("id").eq("email", girisEmail).maybeSingle();
      if (hedefProfil && await geciciSifreyiEtkinlestir(admin, hedefProfil.id, body.password)) {
        ({ error } = await supabase.auth.signInWithPassword({ email: girisEmail, password: body.password }));
      }
    }
  }

  let askidaMi = false;
  let denemeSuresiDoldu = false;
  let grupDonduruldu = false;
  let kurumKapali = false;
  let ilkokulOgrencisi = false;
  let belletmenDurumu: "bekliyor" | "reddedildi" | null = null;
  if (!error) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user ? await admin.from("profiles").select("role, aktif").eq("id", user.id).maybeSingle() : { data: null };
    // Kurum dışı belletmen (migration 0165): admin onayına kadar giremez.
    const { data: belletmen } = user && profile?.role === "ogretmen"
      ? await admin.from("kurum_disi_belletmenler").select("durum").eq("profile_id", user.id).maybeSingle()
      : { data: null };
    if (body.role === "admin" && profile?.role !== "admin") {
      await supabase.auth.signOut();
      error = new Error("Invalid login credentials");
    } else if (belletmen && belletmen.durum !== "onaylandi") {
      await supabase.auth.signOut();
      belletmenDurumu = belletmen.durum as "bekliyor" | "reddedildi";
      error = new Error("Belletmen onay bekliyor");
    } else if (profile && profile.aktif === false) {
      // Faz F (2026-08-25) — profiles.aktif ZATEN vardı (moderatör/admin
      // aç-kapa yapabiliyordu, bkz. moderatorAktiflikDegistir/
      // hesapAktiflikDegistir) ama login bunu HİÇ kontrol etmiyordu; bu
      // yüzden "ban" fiilen işe yaramıyordu. Otomatik manipülasyon
      // banı (bkz. manipulasyon-takip.ts) da AYNI alanı kullanıyor.
      await supabase.auth.signOut();
      askidaMi = true;
      error = new Error("Hesap askıda");
    } else if (user && profile?.role === "ogrenci" && await ilkokulOgrencisiMi(admin, user.id)) {
      // İlkokul (16.10.2026, migration 0157): 1-4. sınıf öğrencisi sisteme
      // girmez; kaydı veli ve kurum için var. Şifre doğru olsa da reddedilir.
      await supabase.auth.signOut();
      ilkokulOgrencisi = true;
      error = new Error("İlkokul öğrencisi");
    } else if (user && profile && profile.role !== "admin") {
      // Kuruma özel deneme tarihi yalnız girildiğinde uygulanır.
      // Grup Koçluk grupları kendi bitiş kuralına tabidir.
      const kurum = await kullaniciKurumuGetir(admin, user.id, profile.role as UserRole);
      if (kurumErisimiKapaliMi(kurum)) {
        await supabase.auth.signOut();
        kurumKapali = true;
        error = new Error(KURUM_BAGLANTI_HATASI);
      }
      if (!kurumKapali && kurumDenemeSuresiDolduMu(kurum)) {
        await supabase.auth.signOut();
        denemeSuresiDoldu = true;
        error = new Error("Deneme süresi doldu");
      }
      if (!kurumKapali && grupDondurulmus(kurum)) {
        await supabase.auth.signOut();
        grupDonduruldu = true;
        error = new Error("Grup donduruldu");
      }
    }
  }

  if (kurumKapali) {
    return NextResponse.json({ error: KURUM_BAGLANTI_HATASI }, { status: 403 });
  }

  if (denemeSuresiDoldu) {
    return NextResponse.json({ error: DENEME_SURESI_SONA_ERDI_MESAJI }, { status: 403 });
  }

  if (grupDonduruldu) {
    return NextResponse.json({ error: GRUP_DONDURULDU_MESAJI }, { status: 403 });
  }

  if (belletmenDurumu) {
    return NextResponse.json({ error: belletmenDurumu === "bekliyor"
      ? "Belletmen başvurunuz yönetici onayı bekliyor. Onaylanınca giriş yapabilirsiniz."
      : "Belletmen başvurunuz onaylanmadı. Ayrıntı için okul yönetimiyle görüşün." }, { status: 403 });
  }

  if (ilkokulOgrencisi) {
    return NextResponse.json({ error: "İlkokul öğrencileri sisteme giriş yapmaz. Gelişim raporunu veli hesabından izleyebilirsiniz." }, { status: 403 });
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
  const yanit = NextResponse.json({ ok: true });
  // İdare girişiyle gelen müdür yardımcısı İdare paneline açılır; öğretmen
  // ya da müdür girişi panel tercihini sıfırlar (bkz. src/lib/mudur-yardimcisi.ts).
  if (mudurYardimcisiGirisi) yanit.cookies.set(IDARE_CEREZI, "idare", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  else if (body.role === "ogretmen" || body.role === "mudur") yanit.cookies.delete(IDARE_CEREZI);
  return yanit;
}
