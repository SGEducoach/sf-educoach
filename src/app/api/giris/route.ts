import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PENCERE_MS = 15 * 60 * 1000;
const ENGEL_MS = 15 * 60 * 1000;
const MAKS_HATA = 5;

type GirisRolu = "ogrenci" | "ogretmen" | "veli" | "mudur" | "admin";
interface GirisGovdesi { role?: GirisRolu; schoolId?: string; okulNo?: string; kod?: string; email?: string; password?: string }

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
    .select("failed_count, window_started_at, blocked_until").eq("attempt_key", attemptKey).maybeSingle();

  if (limit?.blocked_until && new Date(limit.blocked_until).getTime() > Date.now()) {
    const dakika = Math.max(1, Math.ceil((new Date(limit.blocked_until).getTime() - Date.now()) / 60_000));
    return NextResponse.json({ error: `Çok fazla hatalı deneme yapıldı. ${dakika} dakika sonra tekrar deneyin.` }, { status: 429 });
  }

  let girisEmail = body.email?.trim().toLocaleLowerCase("tr-TR") ?? "";
  if (body.role === "ogrenci") {
    const { data } = await admin.rpc("resolve_ogrenci_email", { p_school_id: body.schoolId, p_okul_no: body.okulNo?.trim() });
    girisEmail = data ?? "";
  } else if (body.role === "veli") {
    const { data } = await admin.rpc("resolve_veli_login", { p_school_id: body.schoolId, p_okul_no: body.okulNo?.trim(), p_kod: body.kod?.trim() });
    girisEmail = data ?? "";
  } else if (body.role === "mudur") {
    const { data } = await admin.rpc("resolve_mudur_email", { p_okul_kodu: body.okulNo?.trim() });
    girisEmail = data ?? "";
  }

  const supabase = await createClient();
  let { error } = girisEmail
    ? await supabase.auth.signInWithPassword({ email: girisEmail, password: body.password })
    : { error: new Error("Invalid login credentials") };

  if (!error && body.role === "admin") {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user ? await admin.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      error = new Error("Invalid login credentials");
    }
  }

  if (error) {
    const simdi = Date.now();
    const pencereBaslangici = limit?.window_started_at ? new Date(limit.window_started_at).getTime() : 0;
    const ayniPencere = simdi - pencereBaslangici < PENCERE_MS;
    const yeniSayac = ayniPencere ? (limit?.failed_count ?? 0) + 1 : 1;
    const blockedUntil = yeniSayac >= MAKS_HATA ? new Date(simdi + ENGEL_MS).toISOString() : null;
    await admin.from("login_attempt_limits").upsert({
      attempt_key: attemptKey, failed_count: yeniSayac,
      window_started_at: ayniPencere && limit?.window_started_at ? limit.window_started_at : new Date(simdi).toISOString(),
      blocked_until: blockedUntil, updated_at: new Date(simdi).toISOString(),
    });
    const kalan = Math.max(0, MAKS_HATA - yeniSayac);
    const mesaj = blockedUntil ? "Çok fazla hatalı deneme yapıldı. 15 dakika sonra tekrar deneyin." : `Bilgiler hatalı. Kalan deneme hakkı: ${kalan}.`;
    return NextResponse.json({ error: mesaj }, { status: blockedUntil ? 429 : 401 });
  }

  await admin.from("login_attempt_limits").delete().eq("attempt_key", attemptKey);
  return NextResponse.json({ ok: true });
}
