import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VeriGirisSikligi } from "@/lib/types";

export const maxDuration = 60;

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

function enSonTarih(mevcut: Map<string, number>, studentId: string, iso: string) {
  const t = new Date(iso).getTime();
  const onceki = mevcut.get(studentId);
  if (onceki === undefined || t > onceki) mevcut.set(studentId, t);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!yetkiliMi(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const now = new Date();
    let gonderilen = 0;
    const detaylar: string[] = [];

    const [
      { data: students, error: studentsError },
      { data: konular },
      { data: sorular },
      { data: denemeler },
      { data: veliBaglantilari },
    ] = await Promise.all([
      admin.from("students").select("id, veri_giris_sikligi, son_hatirlatma_deadline, created_at, profiles!students_id_fkey(ad, email)"),
      admin.from("konu_calismalar").select("student_id, created_at"),
      admin.from("soru_cozumleri").select("student_id, created_at"),
      admin.from("denemeler").select("student_id, created_at").eq("kaynak", "ogrenci"),
      admin.from("parent_students").select("student_id, profiles!parent_students_parent_id_fkey(email)"),
    ]);

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    // student_id -> en son giriş zamanı (ms)
    const sonGirisMap = new Map<string, number>();
    for (const row of konular ?? []) enSonTarih(sonGirisMap, row.student_id, row.created_at);
    for (const row of sorular ?? []) enSonTarih(sonGirisMap, row.student_id, row.created_at);
    for (const row of denemeler ?? []) enSonTarih(sonGirisMap, row.student_id, row.created_at);

    // student_id -> veli e-postaları
    type VeliBaglanti = { student_id: string; profiles: { email: string | null } | null };
    const veliMap = new Map<string, string[]>();
    for (const row of (veliBaglantilari as unknown as VeliBaglanti[]) ?? []) {
      const email = row.profiles?.email;
      if (!email) continue;
      const liste = veliMap.get(row.student_id) ?? [];
      liste.push(email);
      veliMap.set(row.student_id, liste);
    }

    for (const s of students ?? []) {
      const profile = (s as unknown as { profiles: { ad: string; email: string | null } | null }).profiles;
      if (!profile?.email) continue;

      const sonGirisMs = sonGirisMap.get(s.id) ?? new Date(s.created_at).getTime();
      const sonGiris = new Date(sonGirisMs);

      const ayar = SIKLIK_AYARLARI[s.veri_giris_sikligi as VeriGirisSikligi] ?? SIKLIK_AYARLARI.haftalik;
      const deadline = new Date(sonGirisMs + ayar.periyotSaat * 3600 * 1000);
      const uyariBaslangic = new Date(deadline.getTime() - (ayar.uyariOncesiSaat + GUNLUK_CRON_TAMPON_SAAT) * 3600 * 1000);

      const ayniDeadlineIcinGonderildi =
        s.son_hatirlatma_deadline && new Date(s.son_hatirlatma_deadline).getTime() === deadline.getTime();

      if (now >= uyariBaslangic && now < deadline && !ayniDeadlineIcinGonderildi) {
        const aliciler = [profile.email, ...(veliMap.get(s.id) ?? [])];

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
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
