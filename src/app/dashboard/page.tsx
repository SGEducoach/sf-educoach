import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { OgretmenPanel } from "@/components/dashboard/OgretmenPanel";
import { OgrenciVeriGirisi } from "@/components/dashboard/OgrenciVeriGirisi";
import { ZayifKonular } from "@/components/dashboard/ZayifKonular";
import { Rozetlerim } from "@/components/dashboard/Rozetlerim";
import { YapayZekaAnaliziPromosu } from "@/components/dashboard/YapayZekaAnaliziPromosu";
import type { RozetDurum } from "@/components/dashboard/Rozetlerim";
import { AnalizPaneli } from "@/components/dashboard/AnalizPaneli";
import { HosgeldinPopuplari } from "@/components/dashboard/HosgeldinPopuplari";
import { ZorunluSifreDegisikligiKapisi } from "@/components/dashboard/ZorunluSifreDegisikligiKapisi";
import { analizVerisiGetir } from "@/lib/analiz";
import type { RaporDonemi } from "@/lib/analiz";
import { AYT_ALAN_ETIKET, sinifSiraKarsilastir, dokuzOnSinifMi, TYT_DERSLERI, AYT_DERSLERI } from "@/lib/types";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import type { AytAlan, UserRole } from "@/lib/types";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT, MINT_BG } from "@/lib/theme";
import { Gorevlerim } from "@/components/dashboard/Gorevlerim";
import type { GorevSatiri } from "@/components/dashboard/Gorevlerim";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import { DashboardYanMenu } from "@/components/dashboard/DashboardYanMenu";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";

// Görevlerim takvimi haftalık gösteriliyor — verilen tarihin (veya bugünün,
// Türkiye saatine göre) içinde bulunduğu haftanın Pazartesi'sini döndürür.
// Saat dilimi kaymasını önlemek için tüm hesap UTC'ye sabitlenmiş şekilde
// yapılıyor (bkz. src/lib/tarih.ts) — aksi halde Vercel'in UTC'de çalışan
// sunucusunda "bugün" İstanbul saatinden bir gün geride hesaplanabiliyordu.
function haftaninPazartesisi(tarihISO?: string): string {
  const gecerliMi = tarihISO && /^\d{4}-\d{2}-\d{2}$/.test(tarihISO);
  const temelTarih = gecerliMi ? tarihISO! : bugununTarihiTR();
  const d = new Date(`${temelTarih}T12:00:00Z`);
  const gun = d.getUTCDay();
  const fark = gun === 0 ? -6 : 1 - gun;
  return tarihEkle(temelTarih, fark);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sinif?: string; ogrenci?: string; donem?: string; okul?: string; hafta?: string; ders?: string; bolum?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ad, role, gecici_sifre")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const role = profile.role as UserRole;
  // Admin artık normal akışta hiç görünmez — tek kontrol noktası /yonetici'dir.
  if (role === "admin") redirect("/yonetici");
  const params = await searchParams;
  const aktifBolum = (params.bolum ?? "ozet") as DashboardBolumu;
  if (!dashboardMenusu(role).some((oge) => oge.bolum === aktifBolum)) redirect("/dashboard");
  const donem = (["haftalik", "aylik", "tum"].includes(params.donem ?? "") ? params.donem : "tum") as RaporDonemi;
  const { data: moderatorYetkisi } = (role === "ogretmen" || role === "mudur")
    ? await supabase.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle()
    : { data: null };

  // Sadece öğrenci/veli duyuru alıcısı olabiliyor — diğer rollerde sorgu
  // zaten boş dönüyor, koşul sadece gereksiz sorguyu atlıyor.
  let okunmamisMesajSayisi = 0;
  if (role === "ogrenci" || role === "veli") {
    const { count } = await supabase
      .from("duyuru_aliciler")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("okundu", false);
    okunmamisMesajSayisi = count ?? 0;
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%" }} className="flex-1 flex flex-col">
      <Header ad={profile.ad} role={role} okunmamisMesajSayisi={okunmamisMesajSayisi} moderatorMu={!!moderatorYetkisi} rolEtiketi={moderatorYetkisi ? "Moderatör" : undefined} aktifBolum={aktifBolum} />
      <ZorunluSifreDegisikligiKapisi gecici={profile.gecici_sifre} />
      <HosgeldinPopuplari role={role} />
      <div className="mx-auto flex w-full max-w-[90rem] flex-1 items-start gap-6 px-4 py-7 sm:px-6">
        <DashboardYanMenu role={role} aktifBolum={aktifBolum} />
        <main id="ana-icerik" className="min-w-0 w-full flex-1 flex flex-col gap-6">
          {role === "ogrenci" && <OgrenciIcerik userId={user.id} ad={profile.ad} donem={donem} haftaBaslangic={haftaninPazartesisi(params.hafta)} aktifBolum={aktifBolum} />}
          {(role === "ogretmen" || role === "mudur") && (
            <OgretmenIcerik userId={user.id} role={role} secilenSinifId={params.sinif} secilenOgrenciId={params.ogrenci} donem={donem} aktifBolum={aktifBolum} />
          )}
          {role === "veli" && <VeliIcerik userId={user.id} secilenOgrenciId={params.ogrenci} donem={donem} aktifBolum={aktifBolum} />}
        </main>
      </div>
    </div>
  );
}

async function OgrenciIcerik({ userId, ad, donem, haftaBaslangic, aktifBolum }: { userId: string; ad: string; donem: RaporDonemi; haftaBaslangic: string; aktifBolum: DashboardBolumu }) {
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

  if (!s) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">Öğrenci profili bulunamadı.</p>
      </div>
    );
  }

  const analiz = await analizVerisiGetir(supabase, userId, donem);

  // Zayıf konular: "hedefe yakınlık" alanı "uzak" olarak işaretlenen
  // konu_calismalar kayıtları — ders+konu bazında tekilleştirip en son
  // 10 tanesini gösteriyoruz (bkz. ZayifKonular bileşeni, madde 1).
  const { data: zayifKonularHam } = await supabase
    .from("konu_calismalar")
    .select("ders, konu, tarih")
    .eq("student_id", userId)
    .eq("hedefe_yakinlik", "uzak")
    .order("tarih", { ascending: false })
    .limit(50);

  type ZayifRow = { ders: string; konu: string; tarih: string };
  const gorulenler = new Set<string>();
  const zayifKonular: { ders: string; konu: string; seviye: string | null }[] = [];
  for (const r of (zayifKonularHam as ZayifRow[]) ?? []) {
    const anahtar = `${r.ders}|${r.konu}`;
    if (gorulenler.has(anahtar)) continue;
    gorulenler.add(anahtar);
    const resmiEslesme = MUFREDAT_KONULARI.find((k) => k.ders === r.ders && k.konu === r.konu);
    zayifKonular.push({ ders: r.ders, konu: r.konu, seviye: resmiEslesme?.seviye ?? null });
    if (zayifKonular.length >= 10) break;
  }

  // Konu girişi sırasında öneri (datalist): resmî müfredat listesi (188 konu,
  // sınıf etiketli) + öğrencilerin serbest girip daha önce ürettirdiği ek
  // konular — böylece hem baştan kapsamlı hem zamanla organik olarak büyüyor.
  const { data: konuOnerileriHam } = await supabase
    .from("konu_anlatimlari")
    .select("ders, konu, seviye")
    .order("konu");
  const uretilenKonular = (konuOnerileriHam as { ders: string; konu: string; seviye: string | null }[]) ?? [];
  const konuOneriAnahtarlari = new Set(MUFREDAT_KONULARI.map((k) => `${k.ders}|${k.konu}`));
  const konuOnerileri = [
    ...MUFREDAT_KONULARI,
    ...uretilenKonular.filter((k) => !konuOneriAnahtarlari.has(`${k.ders}|${k.konu}`)),
  ];

  // Rozetler CANLI hesaplanıyor (bkz. migration 0029) — kalıcı bir "kazanıldı"
  // tablosu yok, her yüklemede güncel durum tazeleniyor.
  const { data: rozetDurumHam } = await supabase.rpc("ogrenci_rozet_durumu", { p_student_id: userId });
  const rozetDurum = (rozetDurumHam as RozetDurum | null) ?? { konu: "yok", soru: "yok", deneme: "yok", genel: "yok" };

  // Konu tamamlama sayacı (§1, yenilikler_1.txt): payda = müfredattaki ders
  // başına konu sayısı (MUFREDAT_KONULARI), pay = öğrencinin "hakimim"
  // (hedefe_yakinlik='yakin') işaretlediği FARKLI konu sayısı — aynı konuyu
  // birden fazla kez çalışmış olsa bile bir kez sayılır.
  const { data: tamamlananKonularHam } = await supabase
    .from("konu_calismalar")
    .select("ders, konu")
    .eq("student_id", userId)
    .eq("hedefe_yakinlik", "yakin");
  const tamamlananSet = new Set<string>();
  for (const r of (tamamlananKonularHam as { ders: string; konu: string }[] | null) ?? []) {
    tamamlananSet.add(`${r.ders}|${r.konu}`);
  }
  const dersMufredatToplam = new Map<string, number>();
  for (const k of MUFREDAT_KONULARI) dersMufredatToplam.set(k.ders, (dersMufredatToplam.get(k.ders) ?? 0) + 1);
  const konuSayaclari: Record<string, { tamamlanan: number; toplam: number }> = {};
  for (const [ders, toplam] of dersMufredatToplam.entries()) {
    let tamamlanan = 0;
    for (const anahtar of tamamlananSet) if (anahtar.startsWith(`${ders}|`)) tamamlanan++;
    konuSayaclari[ders] = { tamamlanan, toplam };
  }

  const dokuzOnMu = dokuzOnSinifMi(s.classes?.seviye ?? null);
  const dersListesi = dokuzOnMu
    ? [...TYT_DERSLERI]
    : [...TYT_DERSLERI, ...AYT_DERSLERI[s.ayt_alan].filter((d) => !TYT_DERSLERI.includes(d as typeof TYT_DERSLERI[number]))];

  // Görevlerim (Faz 3, §5): görüntülenen haftanın (Pzt-Paz) görevleri —
  // gorev_atamalari + gorevler join'i.
  const haftaBitis = tarihEkle(haftaBaslangic, 6);
  const { data: gorevAtamalariHam } = await supabase
    .from("gorev_atamalari")
    .select("id, durum, gorevler!inner(tur, ders, konu, hedef_soru_sayisi, hedef_dakika, tarih, son_tarih, baslangic_saat, bitis_saat, aciklama)")
    .eq("student_id", userId)
    .gte("gorevler.tarih", haftaBaslangic)
    .lte("gorevler.tarih", haftaBitis);

  type GorevAtamaRow = {
    id: string; durum: GorevSatiri["durum"];
    gorevler: {
      tur: GorevSatiri["tur"]; ders: string; konu: string | null;
      hedef_soru_sayisi: number | null; hedef_dakika: number | null;
      tarih: string; son_tarih: string; baslangic_saat: string | null; bitis_saat: string | null; aciklama: string | null;
    } | null;
  };
  const gorevlerimListesi: GorevSatiri[] = ((gorevAtamalariHam as unknown as GorevAtamaRow[]) ?? [])
    .filter((g) => g.gorevler)
    .map((g) => ({
      atamaId: g.id,
      tur: g.gorevler!.tur,
      ders: g.gorevler!.ders,
      konu: g.gorevler!.konu,
      hedefSoruSayisi: g.gorevler!.hedef_soru_sayisi,
      hedefDakika: g.gorevler!.hedef_dakika,
      tarih: g.gorevler!.tarih,
      sonTarih: g.gorevler!.son_tarih,
      baslangicSaat: g.gorevler!.baslangic_saat,
      bitisSaat: g.gorevler!.bitis_saat,
      aciklama: g.gorevler!.aciklama,
      durum: g.durum,
    }));

  return (
    <div className="flex flex-col gap-6">
      {aktifBolum === "ozet" && <div className="sfec-fade rounded-3xl p-6 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold mb-4 flex items-center gap-2">
          Hoş geldin!
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #7C3AED, #2563EB)" }}>
            <Sparkles size={13} color="#fff" />
          </span>
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Bilgi etiket="Okul No" deger={s.okul_no} />
          <Bilgi etiket="Okul" deger={s.schools?.ad ?? "—"} />
          <Bilgi etiket="Sınıf" deger={s.classes ? `${s.classes.seviye}-${s.classes.sube}` : "—"} />
          <Bilgi etiket="AYT Alanı" deger={AYT_ALAN_ETIKET[s.ayt_alan]} />
        </div>
      </div>}

      {aktifBolum === "gorevler" && <section className="print:hidden">
        <Gorevlerim
          gorevler={gorevlerimListesi}
          haftaBaslangic={haftaBaslangic}
          aytAlan={s.ayt_alan}
          dokuzOnMu={dokuzOnMu}
          dersListesi={dersListesi}
          konuOnerileri={konuOnerileri}
          konuSayaclari={konuSayaclari}
        />
      </section>}

      {aktifBolum === "ozet" && <section className="print:hidden"><YapayZekaAnaliziPromosu /></section>}

      {aktifBolum === "rozetler" && <Rozetlerim durum={rozetDurum} sinifSeviyesi={s.classes?.seviye ?? null} />}

      {aktifBolum === "konular" && <section><ZayifKonular konular={zayifKonular} /></section>}

      {aktifBolum === "veri-girisi" && <div className="print:hidden">
        <OgrenciVeriGirisi aytAlan={s.ayt_alan} konuOnerileri={konuOnerileri} sinifSeviyesi={s.classes?.seviye ?? null} konuSayaclari={konuSayaclari} />
      </div>}

      {aktifBolum === "analiz" && <div>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold mb-3 print:hidden">Analiz / Rapor</h2>
        <AnalizPaneli veri={analiz} ogrenciAdi={ad} />
      </div>}
    </div>
  );
}

async function OgretmenIcerik({ userId, role, secilenSinifId, secilenOgrenciId, donem, aktifBolum }: {
  userId: string; role: "ogretmen" | "mudur"; secilenSinifId?: string; secilenOgrenciId?: string; donem: RaporDonemi; aktifBolum: DashboardBolumu;
}) {
  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("school_id, class_id")
    .eq("id", userId)
    .single();

  if (!teacher) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
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
            className="sfec-btn inline-flex items-center gap-1 text-xs font-bold w-fit px-3 py-1.5 rounded-full print:hidden"
            style={{ background: BG1_ALT, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
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
    .eq("school_id", teacher.school_id);

  const sinifListesi = ((siniflar ?? []) as { id: string; seviye: string; sube: string }[]).sort(sinifSiraKarsilastir);
  const gorunecekSinifId = secilenSinifId || teacher.class_id || sinifListesi[0]?.id || null;
  const kendiSinifiMi = gorunecekSinifId === teacher.class_id;

  const [{ data: ogrenciler }, { data: talepler }, { data: ogretmenDersleriHam }, { data: bekleyenOnaylarHam }] = await Promise.all([
    gorunecekSinifId
      ? supabase.from("students").select("id, okul_no, profiles!students_id_fkey(ad)").eq("class_id", gorunecekSinifId)
      : Promise.resolve({ data: [] }),
    teacher.class_id
      ? supabase.from("veli_link_requests").select("*, students!inner(class_id, profiles!students_id_fkey(ad))").eq("students.class_id", teacher.class_id).eq("durum", "bekliyor")
      : Promise.resolve({ data: [] }),
    // Faz 2 (§4): öğretmenin branş dersi verdiği sınıflar (çoklu, homeroom'dan
    // bağımsız — bkz. migration 0045).
    supabase.from("ogretmen_dersleri").select("id, class_id, ders").eq("teacher_id", userId),
    // Faz 2 (§4): "gördüm" onayı bekleyen, öğrencinin kendi girdiği soru
    // çözümleri — sadece homeroom (kendi sınıfı) kapsamında.
    teacher.class_id
      ? supabase.from("soru_cozumleri")
          .select("id, student_id, ders, dogru, yanlis, bos, tarih, students!inner(class_id, profiles!students_id_fkey(ad))")
          .eq("students.class_id", teacher.class_id)
          .eq("kaynak", "ogrenci")
          .eq("onaylandi_mi", false)
          .order("tarih", { ascending: false })
          .limit(30)
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

  type OgretmenDersiRow = { id: string; class_id: string; ders: string };
  const ogretmenDersleri = ((ogretmenDersleriHam as unknown as OgretmenDersiRow[]) ?? []).map((d) => {
    const sinif = sinifListesi.find((s) => s.id === d.class_id);
    return { id: d.id, classId: d.class_id, ders: d.ders, sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "—" };
  });

  type BekleyenOnayRow = {
    id: string; student_id: string; ders: string; dogru: number; yanlis: number; bos: number; tarih: string;
    students: { profiles: { ad: string } | null } | null;
  };
  const bekleyenOnaylar = ((bekleyenOnaylarHam as unknown as BekleyenOnayRow[]) ?? []).map((s) => ({
    id: s.id, studentId: s.student_id, ders: s.ders, dogru: s.dogru, yanlis: s.yanlis, bos: s.bos, tarih: s.tarih,
    ogrenciAd: s.students?.profiles?.ad ?? "İsimsiz",
  }));

  return (
    <OgretmenPanel
      role={role}
      bekleyenTalepler={talepListesi}
      ogrenciler={ogrenciListesi}
      sinifAdi={sinifAdi}
      siniflar={sinifListesi}
      gorunecekSinifId={gorunecekSinifId}
      kendiSinifId={teacher.class_id}
      kendiSinifiMi={kendiSinifiMi}
      ogretmenDersleri={ogretmenDersleri}
      bekleyenOnaylar={bekleyenOnaylar}
      konuOnerileri={MUFREDAT_KONULARI}
      aktifBolum={aktifBolum}
    />
  );
}

async function VeliIcerik({ userId, secilenOgrenciId, donem, aktifBolum }: { userId: string; secilenOgrenciId?: string; donem: RaporDonemi; aktifBolum: DashboardBolumu }) {
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
      <div className="sfec-fade rounded-3xl p-6 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold mb-4 flex items-center gap-2">
          Hoş geldiniz!
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #7C3AED, #2563EB)" }}>
            <Sparkles size={13} color="#fff" />
          </span>
        </h1>
        {cocuklar.length === 0 ? (
          <p style={{ color: TEXT_MUTED }} className="text-sm">Henüz bağlı bir öğrenci yok.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cocuklar.map((c, i) => {
              const secili = c.students?.id === seciliId;
              return (
                <Link key={i} href={`${aktifBolum === "analiz" ? "/dashboard/analiz" : "/dashboard"}?ogrenci=${c.students?.id}`}
                  className="sfec-btn rounded-xl px-3.5 py-2.5 text-sm font-semibold"
                  style={{ color: secili ? MINT : TEXT, background: secili ? MINT_BG : "rgba(255,255,255,0.04)", border: `1px solid ${secili ? MINT : "transparent"}` }}>
                  {c.students?.profiles?.ad} <span style={{ color: TEXT_MUTED }} className="font-normal">· #{c.students?.okul_no}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {aktifBolum === "analiz" && seciliCocuk?.students && <section><AnalizPaneli veri={await analizVerisiGetir(supabase, seciliCocuk.students.id, donem)} ogrenciAdi={seciliCocuk.students.profiles?.ad} /></section>}
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
