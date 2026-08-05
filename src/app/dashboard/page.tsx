import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { OgretmenPanel } from "@/components/dashboard/OgretmenPanel";
import { AYT_ALAN_ETIKET } from "@/lib/types";
import type { AytAlan, UserRole } from "@/lib/types";
import { BG1, BORDER, TEXT, TEXT_MUTED, MINT } from "@/lib/theme";

export default async function DashboardPage() {
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

  return (
    <div style={{ minHeight: "100vh", width: "100%" }} className="flex-1 flex flex-col">
      <Header ad={profile.ad} role={role} />
      <div className="max-w-6xl mx-auto px-6 py-7 w-full flex-1">
        {role === "ogrenci" && <OgrenciIcerik userId={user.id} />}
        {role === "ogretmen" && <OgretmenIcerik userId={user.id} />}
        {role === "veli" && <VeliIcerik userId={user.id} />}
      </div>
    </div>
  );
}

async function OgrenciIcerik({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("okul_no, ayt_alan, hedef_bolum, schools(ad), classes(seviye, sube)")
    .eq("id", userId)
    .single();

  type Row = {
    okul_no: string; ayt_alan: AytAlan; hedef_bolum: string;
    schools: { ad: string } | null; classes: { seviye: string; sube: string } | null;
  };
  const s = student as unknown as Row | null;

  return (
    <div className="sgec-fade rounded-3xl p-6" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold mb-4">Hoş geldin! 👋</h1>
      {s && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Bilgi etiket="Okul No" deger={s.okul_no} />
          <Bilgi etiket="Okul" deger={s.schools?.ad ?? "—"} />
          <Bilgi etiket="Sınıf" deger={s.classes ? `${s.classes.seviye}-${s.classes.sube}` : "—"} />
          <Bilgi etiket="AYT Alanı" deger={AYT_ALAN_ETIKET[s.ayt_alan]} />
        </div>
      )}
      <p style={{ color: TEXT_MUTED }} className="text-sm">
        Veri girişi (deneme, konu çalışma, soru çözümü vb.) yakında burada olacak.
      </p>
    </div>
  );
}

async function OgretmenIcerik({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("class_id, classes(seviye, sube)")
    .eq("id", userId)
    .single();

  type TeacherRow = { class_id: string | null; classes: { seviye: string; sube: string } | null };
  const t = teacher as unknown as TeacherRow | null;
  const sinifAdi = t?.classes ? `${t.classes.seviye}-${t.classes.sube}` : null;

  if (!t?.class_id) {
    return (
      <div className="sgec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">Henüz bir sınıfa atanmadınız.</p>
      </div>
    );
  }

  const [{ data: ogrenciler }, { data: talepler }] = await Promise.all([
    supabase.from("students").select("id, okul_no, profiles!students_id_fkey(ad)").eq("class_id", t.class_id),
    supabase.from("veli_link_requests").select("*, students!inner(class_id, profiles!students_id_fkey(ad))").eq("students.class_id", t.class_id).eq("durum", "bekliyor"),
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

  return <OgretmenPanel bekleyenTalepler={talepListesi} ogrenciler={ogrenciListesi} sinifAdi={sinifAdi} />;
}

async function VeliIcerik({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("parent_students")
    .select("students(okul_no, profiles!students_id_fkey(ad))")
    .eq("parent_id", userId);

  type LinkRow = { students: { okul_no: string; profiles: { ad: string } | null } | null };
  const cocuklar = ((links as unknown as LinkRow[]) ?? []).filter((l) => l.students);

  return (
    <div className="sgec-fade rounded-3xl p-6" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold mb-4">Hoş geldiniz! 👋</h1>
      {cocuklar.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm">Henüz bağlı bir öğrenci yok.</p>
      ) : (
        <div className="flex flex-col gap-2 mb-4">
          {cocuklar.map((c, i) => (
            <div key={i} className="rounded-xl px-3.5 py-2.5 text-sm font-semibold" style={{ color: TEXT, background: "rgba(255,255,255,0.04)" }}>
              {c.students?.profiles?.ad} <span style={{ color: TEXT_MUTED }} className="font-normal">· #{c.students?.okul_no}</span>
            </div>
          ))}
        </div>
      )}
      <p style={{ color: TEXT_MUTED }} className="text-sm">Çocuğunuzun verileri (deneme, çalışma vb.) yakında burada görünecek.</p>
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
