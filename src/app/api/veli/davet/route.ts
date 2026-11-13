import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { adNormalize, sifreGecerliMi, telefonGecerliMi, telefonSanitize } from "@/lib/validators";
import { davetTokenOzeti, davetTokeniBicimliMi } from "@/lib/veli-davet-baglantisi";
import { kullaniciKurumuGetir } from "@/lib/deneme-suresi";
import { kurumErisimiKapaliMi } from "@/lib/kurum-yetkileri";

// Öğrencinin gönderdiği davet bağlantısıyla veli hesabı açma (migration 0187).
//
// Güvenlik:
// - Davet tek kullanımlık: koşullu UPDATE (kullanilmamış, iptal edilmemiş,
//   süresi geçmemiş) ile atomik olarak sahiplenilir; aynı bağlantıyla iki
//   hesap açılamaz. Hata olursa sahiplenme geri alınır.
// - Hesap eski akışla AYNI yoldan açılır: 'onaylandi' bir veli_link_requests
//   satırı + request_id meta verisi → handle_new_user veliyi öğrenciye bağlar
//   ve satırı 'kullanildi' yapar. Veli girişi (okul + öğrenci no + şifre)
//   değişmez.
// - Bağlantının 256 bitlik anahtarı tahmin edilemez; yanıtlar davetin neden
//   geçersiz olduğunu ayırt etmez.
// v2 (13.11.2026): src/lib/veli-kvkk.ts yeni metin.
const KVKK_ONAY_VERSIYON = "v2-2026-11-13";
const GECERSIZ = "Davet bağlantısı geçersiz, süresi dolmuş ya da daha önce kullanılmış. Öğrencinizden yeni bir bağlantı isteyin.";

export async function POST(request: Request) {
  let govde: Record<string, unknown>;
  try {
    govde = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const { token, sifre, kvkkOnay } = govde;
  const veliAd = adNormalize(String(govde.veliAd ?? ""));
  const telefon = telefonSanitize(String(govde.telefon ?? ""));

  if (!davetTokeniBicimliMi(token)) return NextResponse.json({ error: GECERSIZ }, { status: 400 });
  if (veliAd.split(/\s+/).filter(Boolean).length < 2 || veliAd.length > 80) {
    return NextResponse.json({ error: "Adınızı ve soyadınızı yazın." }, { status: 400 });
  }
  if (!telefonGecerliMi(telefon)) return NextResponse.json({ error: "Telefon numarasını 10-11 haneli yazın (örn. 05321234567)." }, { status: 400 });
  if (typeof sifre !== "string" || !sifreGecerliMi(sifre)) {
    return NextResponse.json({ error: "Şifre en az 8 karakter olmalı; harf, rakam ve özel işaret içermelidir." }, { status: 400 });
  }
  if (kvkkOnay !== true) return NextResponse.json({ error: "Devam etmek için KVKK aydınlatma metnini onaylamanız gerekiyor." }, { status: 400 });

  const admin = createAdminClient();
  const simdi = new Date().toISOString();
  const { data: davet } = await admin.from("veli_davetleri")
    .update({ kullanildi_at: simdi })
    .eq("token_ozeti", davetTokenOzeti(token))
    .is("kullanildi_at", null).is("iptal_at", null).gt("son_kullanma", simdi)
    .select("id, student_id").maybeSingle();
  if (!davet) return NextResponse.json({ error: GECERSIZ }, { status: 400 });

  const geriAl = async (talepId?: string) => {
    await admin.from("veli_davetleri").update({ kullanildi_at: null, talep_id: null }).eq("id", davet.id);
    if (talepId) await admin.from("veli_link_requests").delete().eq("id", talepId);
  };

  // Kurumu kapalıysa (süresi bitmiş/pasif) yeni veli hesabı açılmaz.
  const kurum = await kullaniciKurumuGetir(admin, davet.student_id, "ogrenci");
  if (kurumErisimiKapaliMi(kurum)) {
    await geriAl();
    return NextResponse.json({ error: "Kurumun hesabı şu anda kapalı. Okul yönetimiyle iletişime geçin." }, { status: 403 });
  }
  const { count: veliSayisi } = await admin.from("parent_students").select("parent_id", { count: "exact", head: true }).eq("student_id", davet.student_id);
  if ((veliSayisi ?? 0) >= 2) {
    await geriAl();
    return NextResponse.json({ error: "Bu öğrenciye zaten iki veli hesabı bağlı." }, { status: 400 });
  }

  const { data: talep, error: talepHatasi } = await admin.from("veli_link_requests").insert({
    student_id: davet.student_id, veli_ad: veliAd, veli_telefon: telefon, durum: "onaylandi",
    kod: randomBytes(6).toString("hex").toUpperCase(), onaylanma_at: simdi,
    kod_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }).select("id").single();
  if (talepHatasi || !talep) {
    console.error("davetli veli talebi oluşturulamadı:", talepHatasi?.message);
    await geriAl();
    return NextResponse.json({ error: "Hesap şu anda açılamadı. Biraz sonra tekrar deneyin." }, { status: 500 });
  }

  const eposta = `veli+${talep.id}@sgeducoach.internal`;
  const { data: olusan, error: olusturmaHatasi } = await admin.auth.admin.createUser({
    email: eposta, password: sifre, email_confirm: true,
    user_metadata: { role: "veli", ad: veliAd, telefon, request_id: talep.id, kvkk_onay_versiyon: KVKK_ONAY_VERSIYON },
  });
  if (olusturmaHatasi || !olusan.user) {
    console.error("davetli veli hesabı oluşturulamadı:", olusturmaHatasi?.message);
    await geriAl(talep.id);
    return NextResponse.json({ error: "Hesap şu anda açılamadı. Biraz sonra tekrar deneyin." }, { status: 500 });
  }
  await admin.from("veli_davetleri").update({ talep_id: talep.id }).eq("id", davet.id);

  // Bu cihazda başka bir oturum açıksa yerine veli oturumu açılır.
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { error: girisHatasi } = await supabase.auth.signInWithPassword({ email: eposta, password: sifre });
  if (girisHatasi) return NextResponse.json({ ok: true, girisYapildi: false });
  return NextResponse.json({ ok: true, girisYapildi: true });
}
