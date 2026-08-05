import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VeriGirisSikligi } from "@/lib/types";

// Vercel Cron bu route'u çağırır (vercel.json'daki schedule'a göre).
// Hobby planda cron günde 1 kez çalışabiliyor — bu yüzden pencereleri
// (uyariOncesiMs'e +24s tampon ekleyerek) günlük çalıştırmayı da
// yakalayacak şekilde genişlettik. Pro plana geçilirse daha sık
// (örn. saatlik) çalıştırılıp pencereler daraltılabilir.
const SIKLIK_AYARLARI: Record<VeriGirisSikligi, { periyotSaat: number; uyariOncesiSaat: number }> = {
  gunluk: { periyotSaat: 24, uyariOncesiSaat: 6 },
  "3gunluk": { periyotSaat: 72, uyariOncesiSaat: 12 },
  haftalik: { periyotSaat: 168, uyariOncesiSaat: 24 },
};

const GUNLUK_CRON_TAMPON_SAAT = 24;

function yetkiliMi(authHeader: string | null): boolean {
  const beklenen = (process.env.CRON_SECRET ?? "").trim();
  const gelen = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  return beklenen.length > 0 && gelen === beklenen;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (new URL(request.url).searchParams.get("debug") === "1") {
    const beklenen = process.env.CRON_SECRET ?? "";
    const gelen = (authHeader ?? "").replace(/^Bearer\s+/i, "");
    return NextResponse.json({
      envVarSet: Boolean(process.env.CRON_SECRET),
      envVarLength: beklenen.length,
      envVarTrimmedLength: beklenen.trim().length,
      headerReceivedLength: gelen.length,
      headerTrimmedLength: gelen.trim().length,
      match: yetkiliMi(authHeader),
    });
  }

  if (!yetkiliMi(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const now = new Date();
  let gonderilen = 0;
  const detaylar: string[] = [];

  const { data: students, error: studentsError } = await admin
    .from("students")
    .select("id, veri_giris_sikligi, son_hatirlatma_deadline, created_at, profiles!students_id_fkey(ad, email)");

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 });
  }

  for (const s of students ?? []) {
    const profile = (s as unknown as { profiles: { ad: string; email: string | null } | null }).profiles;
    if (!profile?.email) continue;

    const [{ data: konu }, { data: soru }, { data: deneme }] = await Promise.all([
      admin.from("konu_calismalar").select("created_at").eq("student_id", s.id).order("created_at", { ascending: false }).limit(1),
      admin.from("soru_cozumleri").select("created_at").eq("student_id", s.id).order("created_at", { ascending: false }).limit(1),
      admin.from("denemeler").select("created_at").eq("student_id", s.id).eq("kaynak", "ogrenci").order("created_at", { ascending: false }).limit(1),
    ]);

    const tarihler = [konu?.[0]?.created_at, soru?.[0]?.created_at, deneme?.[0]?.created_at, s.created_at]
      .filter((t): t is string => Boolean(t));
    const sonGiris = new Date(Math.max(...tarihler.map((t) => new Date(t).getTime())));

    const ayar = SIKLIK_AYARLARI[s.veri_giris_sikligi as VeriGirisSikligi] ?? SIKLIK_AYARLARI.haftalik;
    const deadline = new Date(sonGiris.getTime() + ayar.periyotSaat * 3600 * 1000);
    const uyariBaslangic = new Date(deadline.getTime() - (ayar.uyariOncesiSaat + GUNLUK_CRON_TAMPON_SAAT) * 3600 * 1000);

    const ayniDeadlineIcinGonderildi =
      s.son_hatirlatma_deadline && new Date(s.son_hatirlatma_deadline).getTime() === deadline.getTime();

    if (now >= uyariBaslangic && now < deadline && !ayniDeadlineIcinGonderildi) {
      const { data: veliler } = await admin
        .from("parent_students")
        .select("profiles!parent_students_parent_id_fkey(email)")
        .eq("student_id", s.id);

      type VeliRow = { profiles: { email: string | null } | null };
      const veliEmailleri = ((veliler as unknown as VeliRow[]) ?? [])
        .map((v) => v.profiles?.email)
        .filter((e): e is string => Boolean(e));

      const aliciler = [profile.email, ...veliEmailleri];

      try {
        await resend.emails.send({
          from: "SG EduCoach <onboarding@resend.dev>",
          to: aliciler,
          subject: `${profile.ad} için veri girişi hatırlatması`,
          html: `<p>Merhaba,</p><p><strong>${profile.ad}</strong> için veri girişi zamanı yaklaşıyor. Son giriş: ${sonGiris.toLocaleDateString("tr-TR")}.</p><p>Lütfen SG EduCoach'a girip güncel verileri ekleyin.</p>`,
        });
        gonderilen++;
        detaylar.push(`${profile.ad}: ${aliciler.length} alıcıya gönderildi`);
      } catch (e) {
        detaylar.push(`${profile.ad}: HATA - ${e instanceof Error ? e.message : String(e)}`);
      }

      await admin.from("students").update({ son_hatirlatma_deadline: deadline.toISOString() }).eq("id", s.id);
    }
  }

  return NextResponse.json({ ok: true, gonderilen, detaylar });
}
