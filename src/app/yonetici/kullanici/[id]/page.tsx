import Link from "next/link";
import { BookOpen, CheckCircle2, Clock3, School, UserRound, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analizVerisiGetir } from "@/lib/analiz";
import { kohortKarsilastirmasiGetir } from "@/lib/analiz-kohort";
import { konuHakimiyetiOzetiGetir } from "@/lib/konu-hakimiyeti";
import { AnalizPaneli } from "@/components/dashboard/AnalizPaneli";
import { Header } from "@/components/dashboard/Header";
import { DashboardYanMenu } from "@/components/dashboard/DashboardYanMenu";
import { DersProgramiYonetimi } from "@/components/dashboard/DersProgramiYonetimi";
import { YurtNobetiTablosu } from "@/components/dashboard/YurtNobetiTablosu";
import { GeriDonButonu } from "@/components/yonetici/GeriDonButonu";
import { ProfiliYonetToggle } from "@/components/yonetici/ProfiliYonetToggle";
import type { KullaniciSonuc } from "@/app/yonetici/actions";
import { ogretmenProgramiGetir, yurtNobetiGetir } from "@/lib/ders-programi";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";
import type { UserRole } from "@/lib/types";

const ROL_ETIKET: Record<UserRole, string> = { ogrenci: "Öğrenci", ogretmen: "Öğretmen", veli: "Veli", mudur: "Müdür", admin: "Yönetici" };

// "Profili Yönet" (kullanıcı isteği, 26.08.2026): bu sayfa şimdiye kadar
// salt-okunur bir görünümdü — KullaniciDetayYonetimi'nin (düzenleme formu)
// çalışması için KullaniciArama'daki kullaniciAra()'nın döndürdüğüyle aynı
// şekilde KullaniciSonuc biçimine ihtiyacı var. Burada tek kullanıcı için
// aynı alanları ayrı bir sorgu ile topluyoruz (kullaniciAra çoklu-satır
// arama için tasarlandığından doğrudan reuse edilmiyor).
async function kullaniciSonucInsa(
  admin: ReturnType<typeof createAdminClient>,
  profil: { id: string; ad: string; email: string | null; telefon: string | null; aktif: boolean },
  role: UserRole,
): Promise<KullaniciSonuc> {
  const { data: moderatorKaydi } = await admin.from("school_moderators").select("profile_id").eq("profile_id", profil.id).maybeSingle();
  const taban: KullaniciSonuc = {
    id: profil.id, ad: profil.ad, email: profil.email, telefon: profil.telefon, role, aktif: profil.aktif,
    okulAdi: null, okulId: null, sinifAdi: null, sinifId: null, okulNo: null, brans: null,
    yurtOgrencisi: null, aytAlan: null, hedefBolum: null, hedefNetTyt: null, hedefNetAyt: null,
    moderatorMu: !!moderatorKaydi,
  };
  if (role === "ogrenci") {
    const { data } = await admin.from("students")
      .select("okul_no, school_id, class_id, yurt_ogrencisi, ayt_alan, hedef_bolum, hedef_net_tyt, hedef_net_ayt, schools(ad), classes(seviye, sube)")
      .eq("id", profil.id).maybeSingle();
    if (!data) return taban;
    const okul = data.schools as unknown as { ad: string } | null;
    const sinif = data.classes as unknown as { seviye: string; sube: string } | null;
    return {
      ...taban, okulAdi: okul?.ad ?? null, okulId: data.school_id, sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : null,
      sinifId: data.class_id, okulNo: data.okul_no, yurtOgrencisi: data.yurt_ogrencisi, aytAlan: data.ayt_alan,
      hedefBolum: data.hedef_bolum, hedefNetTyt: data.hedef_net_tyt, hedefNetAyt: data.hedef_net_ayt,
    };
  }
  if (role === "ogretmen" || role === "mudur") {
    const { data } = await admin.from("teachers").select("brans, school_id, schools(ad)").eq("id", profil.id).maybeSingle();
    if (!data) return taban;
    const okul = data.schools as unknown as { ad: string } | null;
    return { ...taban, okulAdi: okul?.ad ?? null, okulId: data.school_id, brans: data.brans };
  }
  return taban;
}

export default async function KullaniciGoruntulemeSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: yonetici } = await supabase.from("profiles").select("ad, role").eq("id", user.id).maybeSingle();
  if (!yonetici || yonetici.role !== "admin") redirect("/");

  const admin = createAdminClient();
  const { data: profil } = await admin.from("profiles").select("id, ad, email, telefon, role, aktif, created_at").eq("id", id).maybeSingle();
  if (!profil || profil.role === "admin") notFound();
  const role = profil.role as UserRole;
  const kullaniciSonuc = await kullaniciSonucInsa(admin, profil, role);

  return (
    <div className="sfec-dashboard-shell min-h-dvh w-full flex-1 flex flex-col">
      <Header ad={yonetici.ad} role="admin" aktifBolum="kullanicilar" />
      <div className="mx-auto flex min-h-[calc(100dvh-6.75rem)] w-full max-w-[100rem] flex-1 items-stretch gap-6 px-4 py-6 sm:px-6 lg:py-7">
        <DashboardYanMenu role="admin" aktifBolum="kullanicilar" />
        <main id="ana-icerik" className="sfec-dashboard-main min-h-[calc(100dvh-10.25rem)] min-w-0 w-full max-w-4xl flex-1 flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <GeriDonButonu />
          </div>
          <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: BG1_ALT }}><UserRound size={21} color={MINT} /></div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{profil.ad}</h1>
                  <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>{ROL_ETIKET[role]}{kullaniciSonuc.moderatorMu ? " · Moderatör" : ""} · {profil.aktif ? "Aktif hesap" : "Pasif hesap"}</p>
                  <p className="mt-1 break-all text-xs" style={{ color: TEXT_MUTED }}>{[profil.email, profil.telefon].filter(Boolean).join(" · ") || "İletişim bilgisi yok"}</p>
                </div>
              </div>
              <ProfiliYonetToggle kullanici={kullaniciSonuc} />
            </div>
          </section>
          {role === "ogrenci" && <OgrenciSayfasi admin={admin} userId={id} ad={profil.ad} />}
          {(role === "ogretmen" || role === "mudur") && <OgretmenSayfasi admin={admin} userId={id} />}
          {role === "veli" && <VeliSayfasi admin={admin} userId={id} />}
        </main>
      </div>
    </div>
  );
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function OgrenciSayfasi({ admin, userId, ad }: { admin: AdminClient; userId: string; ad: string }) {
  const [{ data: ogrenci }, { data: konular }, { data: sorular }, { data: denemeler }] = await Promise.all([
    admin.from("students").select("okul_no, ayt_alan, hedef_bolum, schools(ad), classes(seviye, sube)").eq("id", userId).maybeSingle(),
    admin.from("konu_calismalar").select("id, tarih, ders, konu, sure_dakika").eq("student_id", userId).order("tarih", { ascending: false }).limit(5),
    admin.from("soru_cozumleri").select("id, tarih, ders, dogru, yanlis, sure_dakika").eq("student_id", userId).order("tarih", { ascending: false }).limit(5),
    admin.from("denemeler").select("id, tarih, tur").eq("student_id", userId).order("tarih", { ascending: false }).limit(5),
  ]);
  if (!ogrenci) return <BosKart metin="Öğrenci profili bulunamadı." />;
  const [analiz, konuHakimiyetiOzeti, kohort] = await Promise.all([
    analizVerisiGetir(admin as Parameters<typeof analizVerisiGetir>[0], userId, "tum"),
    konuHakimiyetiOzetiGetir(admin as Parameters<typeof konuHakimiyetiOzetiGetir>[0], userId),
    kohortKarsilastirmasiGetir(admin as Parameters<typeof kohortKarsilastirmasiGetir>[0], userId),
  ]);
  const okul = ogrenci.schools as unknown as { ad: string } | null;
  const sinif = ogrenci.classes as unknown as { seviye: string; sube: string } | null;
  return <>
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Bilgi icon={School} etiket="Okul" deger={okul?.ad ?? "—"} />
      <Bilgi icon={Users} etiket="Sınıf" deger={sinif ? `${sinif.seviye}-${sinif.sube}` : "—"} />
      <Bilgi icon={UserRound} etiket="Okul no" deger={ogrenci.okul_no} />
      <Bilgi icon={CheckCircle2} etiket="Hedef" deger={ogrenci.hedef_bolum ? ogrenci.hedef_bolum.toLocaleUpperCase("tr-TR") : "—"} />
    </section>
    <AnalizPaneli veri={analiz} ogrenciAdi={ad}
      konuHakimiyetiSatirlari={konuHakimiyetiOzeti.satirlar} konuHakimiyetiTamGorunum={konuHakimiyetiOzeti.tamGorunum}
      konuHakimiyetiAytAlan={konuHakimiyetiOzeti.aytAlan} ogretmenGorunumu kohortKarsilastirma={kohort} />
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <KayitListesi baslik="Son konu çalışmaları" satirlar={(konular ?? []).map((r) => `${r.tarih} · ${r.ders} · ${r.konu} · ${r.sure_dakika} dk`)} />
      <KayitListesi baslik="Son soru çözümleri" satirlar={(sorular ?? []).map((r) => `${r.tarih} · ${r.ders} · ${r.dogru}D/${r.yanlis}Y · ${r.sure_dakika} dk`)} />
      <KayitListesi baslik="Son denemeler" satirlar={(denemeler ?? []).map((r) => `${r.tarih} · ${r.tur}`)} />
    </section>
  </>;
}

async function OgretmenSayfasi({ admin, userId }: { admin: AdminClient; userId: string }) {
  const { data } = await admin.from("teachers").select("brans, school_id, class_id, schools(ad, tur), classes(seviye, sube)").eq("id", userId).maybeSingle();
  if (!data) return <BosKart metin="Öğretmen profili bulunamadı." />;
  const okul = data.schools as unknown as { ad: string; tur: "okul" | "dershane" } | null;
  const sinif = data.classes as unknown as { seviye: string; sube: string } | null;
  const dershaneMi = okul?.tur === "dershane";
  let ogrenciQuery = admin.from("students").select("id, okul_no, profiles!students_id_fkey(ad), classes(seviye, sube)").order("okul_no").limit(100);
  ogrenciQuery = data.class_id ? ogrenciQuery.eq("class_id", data.class_id) : ogrenciQuery.eq("school_id", data.school_id);
  const [{ data: ogrenciler }, { data: okulSiniflari }, dersProgrami, yurtNobeti] = await Promise.all([
    ogrenciQuery,
    admin.from("classes").select("id, seviye, sube").eq("school_id", data.school_id),
    ogretmenProgramiGetir(admin as Parameters<typeof ogretmenProgramiGetir>[0], userId),
    dershaneMi ? Promise.resolve([]) : yurtNobetiGetir(admin as Parameters<typeof yurtNobetiGetir>[0], userId),
  ]);
  type OgrenciRow = { id: string; okul_no: string; profiles: { ad: string } | null; classes: { seviye: string; sube: string } | null };
  const liste = (ogrenciler as unknown as OgrenciRow[]) ?? [];
  return <>
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Bilgi icon={School} etiket="Okul" deger={okul?.ad ?? "—"} /><Bilgi icon={BookOpen} etiket="Branş" deger={data.brans} /><Bilgi icon={Users} etiket="Sınıf öğretmenliği" deger={sinif ? `${sinif.seviye}-${sinif.sube}` : "Atanmamış"} /></section>
    <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 className="mb-3 text-base font-bold" style={{ color: TEXT }}>Ders programı</h2>
      <DersProgramiYonetimi teacherId={userId} dershaneMi={dershaneMi} siniflar={(okulSiniflari ?? []) as { id: string; seviye: string; sube: string }[]} satirlar={dersProgrami} />
    </section>
    {!dershaneMi && (
      <YurtNobetiTablosu satirlar={yurtNobeti} duzenlenebilir={false} />
    )}
    <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}><h2 className="mb-3 text-base font-bold" style={{ color: TEXT }}>{data.class_id ? "Sınıfındaki öğrenciler" : "Okuldaki öğrenciler"}</h2><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{liste.length === 0 && <p className="text-sm" style={{ color: TEXT_MUTED }}>Öğrenci bulunamadı.</p>}{liste.map((o) => <Link key={o.id} href={`/yonetici/kullanici/${o.id}`} className="rounded-xl p-3 text-sm" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}`, color: TEXT }}><strong>{o.profiles?.ad ?? "İsimsiz"}</strong><div className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>{o.classes ? `${o.classes.seviye}-${o.classes.sube}` : "—"} · #{o.okul_no}</div></Link>)}</div></section>
  </>;
}

async function VeliSayfasi({ admin, userId }: { admin: AdminClient; userId: string }) {
  const { data } = await admin.from("parent_students").select("students(id, okul_no, profiles!students_id_fkey(ad), schools(ad), classes(seviye, sube))").eq("parent_id", userId);
  type Row = { students: { id: string; okul_no: string; profiles: { ad: string } | null; schools: { ad: string } | null; classes: { seviye: string; sube: string } | null } | null };
  const satirlar = (data as unknown as Row[]) ?? [];
  return <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}><h2 className="mb-3 text-base font-bold" style={{ color: TEXT }}>Bağlı öğrenciler</h2><div className="flex flex-col gap-2">{satirlar.length === 0 && <p className="text-sm" style={{ color: TEXT_MUTED }}>Bağlı öğrenci yok.</p>}{satirlar.map((r) => r.students && <Link key={r.students.id} href={`/yonetici/kullanici/${r.students.id}`} className="rounded-xl p-3" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}`, color: TEXT }}><strong>{r.students.profiles?.ad ?? "İsimsiz"}</strong><div className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>{r.students.schools?.ad ?? "—"} · {r.students.classes ? `${r.students.classes.seviye}-${r.students.classes.sube}` : "—"} · #{r.students.okul_no}</div></Link>)}</div></section>;
}

function Bilgi({ icon: Icon, etiket, deger }: { icon: typeof School; etiket: string; deger: string }) { return <div className="rounded-2xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}><Icon size={17} color={MINT} /><div className="mt-2 text-[10px] font-bold uppercase" style={{ color: TEXT_MUTED }}>{etiket}</div><div className="mt-1 text-sm font-bold" style={{ color: TEXT }}>{deger}</div></div>; }
function KayitListesi({ baslik, satirlar }: { baslik: string; satirlar: string[] }) { return <div className="rounded-2xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}><h3 className="mb-3 text-sm font-bold" style={{ color: TEXT }}>{baslik}</h3><div className="flex flex-col gap-2">{satirlar.length === 0 && <span className="text-xs" style={{ color: TEXT_MUTED }}>Kayıt yok.</span>}{satirlar.map((s, i) => <div key={`${s}-${i}`} className="flex gap-2 text-xs" style={{ color: TEXT_MUTED }}><Clock3 size={13} color={MINT} className="mt-0.5 shrink-0" />{s}</div>)}</div></div>; }
function BosKart({ metin }: { metin: string }) { return <div className="rounded-2xl p-5 text-sm" style={{ background: BG1, border: `2px solid ${BORDER}`, color: TEXT_MUTED }}>{metin}</div>; }
