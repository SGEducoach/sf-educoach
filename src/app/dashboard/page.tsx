import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { OgretmenPanel } from "@/components/dashboard/OgretmenPanel";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { OgrenciVeriGirisi } from "@/components/dashboard/OgrenciVeriGirisi";
import { AnalizPaneli } from "@/components/dashboard/AnalizPaneli";
import { BildirimAyarlari } from "@/components/dashboard/BildirimAyarlari";
import { analizVerisiGetir } from "@/lib/analiz";
import type { RaporDonemi } from "@/lib/analiz";
import { AYT_ALAN_ETIKET } from "@/lib/types";
import type { AytAlan, UserRole, VeriGirisSikligi } from "@/lib/types";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT } from "@/lib/theme";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sinif?: string; ogrenci?: string; donem?: string; okul?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ad, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const role = profile.role as UserRole;
  const params = await searchParams;
  const donem = (["haftalik", "aylik", "tum"].includes(params.donem ?? "") ? params.donem : "tum") as RaporDonemi;

  return (
    <div style={{ minHeight: "100vh", width: "100%" }} className="flex-1 flex flex-col">
      <Header ad={profile.ad} role={role} />
      <div className="max-w-6xl mx-auto px-6 py-7 w-full flex-1 flex flex-col gap-6">
        <BildirimAyarlari />
        {role === "ogrenci" && <OgrenciIcerik userId={user.id} ad={profile.ad} donem={donem} />}
        {(role === "ogretmen" || role === "mudur") && (
          <OgretmenIcerik userId={user.id} secilenSinifId={params.sinif} secilenOgrenciId={params.ogrenci} donem={donem} />
        )}
        {role === "veli" && <VeliIcerik userId={user.id} secilenOgrenciId={params.ogrenci} donem={donem} />}
        {role === "admin" && <AdminIcerik secilenOkulId={params.okul} />}
      </div>
    </div>
  );
}

async function OgrenciIcerik({ userId, ad, donem }: { userId: string; ad: string; donem: RaporDonemi }) {
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("okul_no, ayt_alan, hedef_bolum, veri_giris_sikligi, schools(ad), classes(seviye, sube)")
    .eq("id", userId)
    .single();

  type Row = {
    okul_no: string; ayt_alan: AytAlan; hedef_bolum: string; veri_giris_sikligi: VeriGirisSikligi;
    schools: { ad: string } | null; classes: { seviye: string; sube: string } | null;
  };
  const s = student as unknown as Row | null;

  if (!s) {
    return (
      <div className="sgec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">Öğrenci profili bulunamadı.</p>
      </div>
    );
  }

  const analiz = await analizVerisiGetir(supabase, userId, donem);

  return (
    <div className="flex flex-col gap-6">
      <div className="sgec-fade rounded-3xl p-6 print:hidden" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold mb-4">Hoş geldin! 👋</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Bilgi etiket="Okul No" deger={s.okul_no} />
          <Bilgi etiket="Okul" deger={s.schools?.ad ?? "—"} />
          <Bilgi etiket="Sınıf" deger={s.classes ? `${s.classes.seviye}-${s.classes.sube}` : "—"} />
          <Bilgi etiket="AYT Alanı" deger={AYT_ALAN_ETIKET[s.ayt_alan]} />
        </div>
      </div>

      <div className="print:hidden">
        <OgrenciVeriGirisi studentId={userId} aytAlan={s.ayt_alan} veriGirisSikligi={s.veri_giris_sikligi} />
      </div>

      <div>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold mb-3 print:hidden">Analiz / Rapor</h2>
        <AnalizPaneli veri={analiz} ogrenciAdi={ad} />
      </div>
    </div>
  );
}

async function OgretmenIcerik({ userId, secilenSinifId, secilenOgrenciId, donem }: {
  userId: string; secilenSinifId?: string; secilenOgrenciId?: string; donem: RaporDonemi;
}) {
  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("school_id, class_id")
    .eq("id", userId)
    .single();

  if (!teacher) {
    return (
      <div className="sgec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">Öğretmen profili bulunamadı.</p>
      </div>
    );
  }

  if (secilenOgrenciId) {
    const { data: ogrenci } = await supabase
      .from("students")
      .select("id, profiles!students_id_fkey(ad)")
      .eq("id", secilenOgrenciId)
      .single();

    type OgrenciRow = { id: string; profiles: { ad: string } | null };
    const o = ogrenci as unknown as OgrenciRow | null;

    if (o) {
      const analiz = await analizVerisiGetir(supabase, secilenOgrenciId, donem);
      const ogrenciAdi = o.profiles?.ad ?? "İsimsiz";
      return (
        <div className="flex flex-col gap-4">
          <Link href={secilenSinifId ? `/dashboard?sinif=${secilenSinifId}` : "/dashboard"}
            className="sgec-btn inline-flex items-center gap-1 text-xs font-bold w-fit px-3 py-1.5 rounded-full print:hidden"
            style={{ background: BG1_ALT, color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
            <ChevronLeft size={14} /> Listeye dön
          </Link>
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold print:hidden">{ogrenciAdi}</h1>
          <AnalizPaneli veri={analiz} ogrenciAdi={ogrenciAdi} />
        </div>
      );
    }
  }

  const { data: siniflar } = await supabase
    .from("classes")
    .select("id, seviye, sube")
    .eq("school_id", teacher.school_id)
    .order("seviye")
    .order("sube");

  const sinifListesi = (siniflar ?? []) as { id: string; seviye: string; sube: string }[];
  const gorunecekSinifId = secilenSinifId || teacher.class_id || sinifListesi[0]?.id || null;
  const kendiSinifiMi = gorunecekSinifId === teacher.class_id;

  const [{ data: ogrenciler }, { data: talepler }] = await Promise.all([
    gorunecekSinifId
      ? supabase.from("students").select("id, okul_no, profiles!students_id_fkey(ad)").eq("class_id", gorunecekSinifId)
      : Promise.resolve({ data: [] }),
    teacher.class_id
      ? supabase.from("veli_link_requests").select("*, students!inner(class_id, profiles!students_id_fkey(ad))").eq("students.class_id", teacher.class_id).eq("durum", "bekliyor")
      : Promise.resolve({ data: [] }),
  ]);

  type OgrenciRow = { id: string; okul_no: string; profiles: { ad: string } | null };
  const ogrenciListesi = ((ogrenciler as unknown as OgrenciRow[]) ?? []).map((o) => ({
    id: o.id, okul_no: o.okul_no, ad: o.profiles?.ad ?? "İsimsiz",
  }));

  type TalepRow = {
    id: string; student_id: string; veli_ad: string; veli_telefon: string;
    durum: "bekliyor" | "onaylandi" | "reddedildi" | "kullanildi"; kod: string | null;
    onaylayan_ogretmen_id: string | null; created_at: string; onaylanma_at: string | null;
    students: { profiles: { ad: string } | null } | null;
  };
  const talepListesi = ((talepler as unknown as TalepRow[]) ?? []).map((t) => ({
    ...t, ogrenci_ad: t.students?.profiles?.ad ?? "İsimsiz",
  }));

  const gorunenSinif = sinifListesi.find((s) => s.id === gorunecekSinifId);
  const sinifAdi = gorunenSinif ? `${gorunenSinif.seviye}-${gorunenSinif.sube}` : null;

  return (
    <OgretmenPanel
      bekleyenTalepler={talepListesi}
      ogrenciler={ogrenciListesi}
      sinifAdi={sinifAdi}
      siniflar={sinifListesi}
      gorunecekSinifId={gorunecekSinifId}
      kendiSinifId={teacher.class_id}
      kendiSinifiMi={kendiSinifiMi}
    />
  );
}

// ============ Admin: platformun tek kontrol noktası ============
// Müdür sadece gözlemci; sınıf ekleme + sınıf öğretmeni atama admin'e ait.
// Admin herhangi bir okula bağlı değildir (teachers tablosunda satırı yok),
// bu yüzden kendi ayrı içerik fonksiyonuyla tüm okulları listeler.
async function AdminIcerik({ secilenOkulId }: { secilenOkulId?: string }) {
  const supabase = await createClient();
  const { data: okullar } = await supabase.from("schools").select("id, ad, okul_kodu").order("ad");
  const okulListesi = (okullar ?? []) as { id: string; ad: string; okul_kodu: string }[];
  const gorunecekOkulId = secilenOkulId || okulListesi[0]?.id || null;

  const [{ data: siniflar }, { data: ogretmenler }] = await Promise.all([
    gorunecekOkulId
      ? supabase.from("classes").select("id, seviye, sube").eq("school_id", gorunecekOkulId).order("seviye").order("sube")
      : Promise.resolve({ data: [] }),
    gorunecekOkulId
      ? supabase.from("teachers").select("id, brans, class_id, profiles!teachers_id_fkey(ad, role), classes(seviye, sube)").eq("school_id", gorunecekOkulId)
      : Promise.resolve({ data: [] }),
  ]);

  type OgretmenRow = { id: string; brans: string; class_id: string | null; profiles: { ad: string; role: string } | null; classes: { seviye: string; sube: string } | null };
  const ogretmenListesi = ((ogretmenler as unknown as OgretmenRow[]) ?? []).map((o) => ({
    id: o.id, ad: o.profiles?.ad ?? "İsimsiz", brans: o.brans, classId: o.class_id,
    sinifAdi: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
    mudurMu: o.profiles?.role === "mudur",
  }));

  const { data: kayitlar } = await supabase
    .from("admin_audit_log")
    .select("id, eylem, detay, created_at, profiles(ad)")
    .order("created_at", { ascending: false })
    .limit(15);

  type KayitRow = { id: string; eylem: string; detay: Record<string, unknown> | null; created_at: string; profiles: { ad: string } | null };
  const kayitListesi = ((kayitlar as unknown as KayitRow[]) ?? []).map((k) => ({
    id: k.id, eylem: k.eylem, detay: k.detay, createdAt: k.created_at, aktorAdi: k.profiles?.ad ?? "—",
  }));

  return (
    <AdminPanel
      okullar={okulListesi}
      gorunecekOkulId={gorunecekOkulId}
      siniflar={(siniflar ?? []) as { id: string; seviye: string; sube: string }[]}
      ogretmenListesi={ogretmenListesi}
      islemKayitlari={kayitListesi}
    />
  );
}

async function VeliIcerik({ userId, secilenOgrenciId, donem }: { userId: string; secilenOgrenciId?: string; donem: RaporDonemi }) {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("parent_students")
    .select("students(id, okul_no, profiles!students_id_fkey(ad))")
    .eq("parent_id", userId);

  type LinkRow = { students: { id: string; okul_no: string; profiles: { ad: string } | null } | null };
  const cocuklar = ((links as unknown as LinkRow[]) ?? []).filter((l) => l.students);

  const seciliId = secilenOgrenciId || cocuklar[0]?.students?.id;
  const seciliCocuk = cocuklar.find((c) => c.students?.id === seciliId);

  return (
    <div className="flex flex-col gap-6">
      <div className="sgec-fade rounded-3xl p-6 print:hidden" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold mb-4">Hoş geldiniz! 👋</h1>
        {cocuklar.length === 0 ? (
          <p style={{ color: TEXT_MUTED }} className="text-sm">Henüz bağlı bir öğrenci yok.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cocuklar.map((c, i) => {
              const secili = c.students?.id === seciliId;
              return (
                <Link key={i} href={`/dashboard?ogrenci=${c.students?.id}`}
                  className="sgec-btn rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                  style={{ color: secili ? MINT : TEXT, background: secili ? "rgba(124,232,176,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${secili ? MINT : "transparent"}` }}>
                  {c.students?.profiles?.ad} <span style={{ color: TEXT_MUTED }} className="font-normal">· #{c.students?.okul_no}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {seciliCocuk?.students && (
        <AnalizPaneli veri={await analizVerisiGetir(supabase, seciliCocuk.students.id, donem)} ogrenciAdi={seciliCocuk.students.profiles?.ad} />
      )}
    </div>
  );
}

function Bilgi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide mb-0.5">{etiket}</div>
      <div style={{ color: MINT }} className="text-sm font-bold">{deger}</div>
    </div>
  );
}
