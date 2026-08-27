import Link from "next/link";
import { BarChart3, CalendarCheck2, ChevronLeft, ListChecks, Sparkles, Target } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { OgretmenPanel } from "@/components/dashboard/OgretmenPanel";
import { DershaneMudurPaneli } from "@/components/dashboard/DershaneMudurPaneli";
import { OgrenciVeriGirisi } from "@/components/dashboard/OgrenciVeriGirisi";
import { Rozetlerim } from "@/components/dashboard/Rozetlerim";
import { KonuHaritasiRaporu } from "@/components/dashboard/KonuHaritasiRaporu";
import type { OyunEtiketiSayaclari, RozetDurum } from "@/components/dashboard/Rozetlerim";
import { AnalizPaneli } from "@/components/dashboard/AnalizPaneli";
import { HosgeldinPopuplari } from "@/components/dashboard/HosgeldinPopuplari";
import { ZorunluSifreDegisikligiKapisi } from "@/components/dashboard/ZorunluSifreDegisikligiKapisi";
import { analizVerisiGetir } from "@/lib/analiz";
import type { RaporDonemi } from "@/lib/analiz";
import { kohortKarsilastirmasiGetir } from "@/lib/analiz-kohort";
import { dogrulukRozetSeviyesiHesapla } from "@/lib/analiz-motoru";
import { ogrencininZayifKonulariGetir, konuHaritasiGetir } from "@/lib/konu-raporu";
import { konuHakimiyetiGetir, konuHakimiyetiOzetiGetir, tamGorunumMu, gerekYokHaritasiGetir } from "@/lib/konu-hakimiyeti";
import { KonuHakimiyetiEkrani } from "@/components/dashboard/KonuHakimiyetiEkrani";
import { AYT_ALAN_ETIKET, sinifSiraKarsilastir, dokuzOnSinifMi, maarifHiyerarsiSinifMi, TYT_DERSLERI, AYT_DERSLERI } from "@/lib/types";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import type { AytAlan, KurumTuru, UserRole } from "@/lib/types";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT, MINT_BG } from "@/lib/theme";
import { Gorevlerim } from "@/components/dashboard/Gorevlerim";
import type { GorevSatiri } from "@/components/dashboard/Gorevlerim";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import { DashboardYanMenu } from "@/components/dashboard/DashboardYanMenu";
import { TgDenemeleri } from "@/components/dashboard/TgDenemeleri";
import { tgDenemeIlanlariGetir } from "@/lib/tg-deneme-ilanlari";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { RozetGoruntulemePaneli } from "@/components/dashboard/RozetGoruntulemePaneli";
import { kurumRozetGorunumuGetir, veliRozetGorunumuGetir } from "@/lib/rozet-gorunumu";
import { dershaneDenemeBitisGetir, suresiDolduMu, kurumTuruGetir } from "@/lib/deneme-suresi";
import { ogretmenProgramiGetir, yurtNobetiGetir } from "@/lib/ders-programi";
import type { DersProgramiSatiri } from "@/lib/ders-programi";
import { dershaneAnaSayfaVerisiGetir } from "@/lib/dershane-ana-sayfa";
import { DershaneAnaSayfa } from "@/components/dashboard/DershaneAnaSayfa";
import { DenemeSuresiSonaErdiEkrani } from "@/components/DenemeSuresiSonaErdiEkrani";
import { RehberlikPaneli } from "@/components/dashboard/RehberlikPaneli";
import { REHBER_BRANSI } from "@/lib/rehberlik";

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
  searchParams: Promise<{ sinif?: string; ogrenci?: string; ogretmen?: string; donem?: string; okul?: string; hafta?: string; ders?: string; bolum?: string }>;
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

  // DERSHANE MODU (Faz D3): müdürün menüsü kendi kurumunun tur'una göre
  // tamamen değişiyor (bkz. dashboard-navigation.ts DERSHANE_MUDUR_MENUSU) —
  // bu yüzden aktifBolum doğrulamasından ÖNCE bilinmesi gerekiyor. Artık
  // TÜM roller için çözülüyor (öncesinde sadece müdür) — dershane 1
  // haftalık deneme süresi (bkz. deneme-suresi.ts) öğrenci/veli/öğretmen
  // için de kontrol edilmesi gerektiğinden.
  const kurumTuru = await kurumTuruGetir(supabase, user.id, role);

  // Dershane 1 haftalık deneme süresi (2026-08-25 kullanıcı isteği, bkz.
  // migration 0065) — SADECE dershane rolleri, okul hiç etkilenmez. Zaten
  // oturum açmış birinin dashboard'a her girişinde de kontrol ediliyor
  // (sadece login anında değil) — süre oturum sırasında dolarsa da anında
  // engellensin diye.
  if (kurumTuru === "dershane") {
    const bitis = await dershaneDenemeBitisGetir(supabase);
    if (suresiDolduMu(bitis)) return <DenemeSuresiSonaErdiEkrani />;
  }

  const params = await searchParams;
  // Tüm rollerde (dershane müdürü dahil, artık kendi "Ana Sayfa"sı var —
  // bkz. DERSHANE_MUDUR_MENUSU) bolum parametresi verilmediğinde
  // varsayılan "ozet".
  // 2026-08-25 kullanıcı isteği: "dershane müdürünün ana sayfası okul
  // müdürlerinde de olsun" — okul müdürü de artık dershane müdürüyle aynı
  // ilk deneyimle (kademe bazlı performans) açılıyor. Dershane müdürü zaten
  // "ozet" = Ana Sayfa olduğundan (bkz. DERSHANE_MUDUR_MENUSU) etkilenmiyor.
  const varsayilanBolum: DashboardBolumu = role === "mudur" && kurumTuru !== "dershane" ? "kurum-performansi" : "ozet";
  const aktifBolum = (params.bolum ?? varsayilanBolum) as DashboardBolumu;
  // 2026-08-26 kullanıcı isteği — Rehber Öğretmen branşına özel menü ögesi
  // (bkz. dashboard-navigation.ts REHBERLIK_MENU_OGESI) branş bilgisine
  // bağlı olduğundan menü geçerliliği kontrolünden ÖNCE çekiliyor.
  const { data: ogretmenBransHam } = (role === "ogretmen")
    ? await supabase.from("teachers").select("brans").eq("id", user.id).maybeSingle()
    : { data: null };
  const brans = ogretmenBransHam?.brans;
  if (!dashboardMenusu(role, kurumTuru, brans).some((oge) => oge.bolum === aktifBolum)) redirect("/dashboard");
  const donem = (["haftalik", "aylik", "tum"].includes(params.donem ?? "") ? params.donem : "tum") as RaporDonemi;
  const { data: moderatorYetkisi } = (role === "ogretmen" || role === "mudur")
    ? await supabase.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle()
    : { data: null };

  // Kullanıcı isteği (26.08.2026): yanlış giriş bildirimi artık öğrenci
  // hariç tüm rollere gidebiliyor (bkz. api/giris/route.ts) — bu sorgu
  // artık TÜM roller için çalışıyor, sadece öğrenci/veliyle sınırlı değil.
  const { count: okunmamisMesajSayisiHam } = await supabase
    .from("duyuru_aliciler")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("okundu", false);
  const okunmamisMesajSayisi = okunmamisMesajSayisiHam ?? 0;

  return (
    <div className="sfec-dashboard-shell min-h-dvh w-full flex-1 flex flex-col">
      {/* role !== "mudur" şartı: dershane müdürü hesap açılırken otomatik
          olarak school_moderators'a da eklenir (migration 0052) — bu
          öğretmen için olduğu gibi GERÇEK bir ek yetki değil, müdür için
          örtük bir uygulama detayı. Bu yüzden müdürde her zaman "Müdür"
          gösterilir, "Moderatör" etiketi öğretmen+moderatör kombinasyonuna
          özel kalır. */}
      <Header ad={profile.ad} role={role} kurumTuru={kurumTuru} brans={brans} okunmamisMesajSayisi={okunmamisMesajSayisi} moderatorMu={!!moderatorYetkisi} rolEtiketi={moderatorYetkisi && role !== "mudur" ? "Moderatör" : undefined} aktifBolum={aktifBolum} />
      <ZorunluSifreDegisikligiKapisi gecici={profile.gecici_sifre} />
      <HosgeldinPopuplari role={role} />
      <div className="mx-auto flex min-h-[calc(100dvh-6.75rem)] w-full max-w-[100rem] flex-1 items-stretch gap-6 px-4 py-6 sm:px-6 lg:py-7">
        <DashboardYanMenu role={role} kurumTuru={kurumTuru} brans={brans} aktifBolum={aktifBolum} />
        <main id="ana-icerik" className="sfec-dashboard-main min-h-[calc(100dvh-10.25rem)] min-w-0 w-full flex-1 flex flex-col gap-6">
          {aktifBolum === "tg-denemeleri" ? (
            <TgDenemeleri bugun={bugununTarihiTR()} dbIlanlar={await tgDenemeIlanlariGetir(supabase)} />
          ) : (
            <>
              {role === "ogrenci" && <OgrenciIcerik userId={user.id} ad={profile.ad} donem={donem} haftaBaslangic={haftaninPazartesisi(params.hafta)} aktifBolum={aktifBolum} />}
              {(role === "ogretmen" || role === "mudur") && (
                <OgretmenIcerik userId={user.id} role={role} kurumTuru={kurumTuru} brans={brans} secilenSinifId={params.sinif} secilenOgrenciId={params.ogrenci} secilenOgretmenId={params.ogretmen} donem={donem} aktifBolum={aktifBolum} />
              )}
              {role === "veli" && <VeliIcerik userId={user.id} ad={profile.ad} secilenOgrenciId={params.ogrenci} donem={donem} aktifBolum={aktifBolum} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// Eğlence etiketleri mevcut rozet RPC'sinden tamamen bağımsızdır. Yalnızca
// Rozetlerim sayfası açıldığında tüm zamanlardaki gerçek girişler sayılır:
// konu = kayıt adedi, soru = doğru+yanlış+boş toplamı, deneme = kayıt adedi.
async function oyunEtiketiSayaclariGetir(
  supabase: Awaited<ReturnType<typeof createClient>>, userId: string, aktifBolum: DashboardBolumu,
): Promise<OyunEtiketiSayaclari> {
  if (aktifBolum !== "rozetler") return { konu: 0, soru: 0, deneme: 0 };
  const [konuSonucu, soruSonucu, denemeSonucu] = await Promise.all([
    supabase.from("konu_calismalar").select("id", { count: "exact", head: true }).eq("student_id", userId),
    supabase.from("soru_cozumleri").select("dogru, yanlis, bos").eq("student_id", userId),
    supabase.from("denemeler").select("id", { count: "exact", head: true }).eq("student_id", userId),
  ]);
  return {
    konu: konuSonucu.count ?? 0,
    soru: ((soruSonucu.data as { dogru: number; yanlis: number; bos: number }[] | null) ?? [])
      .reduce((toplam, kayit) => toplam + kayit.dogru + kayit.yanlis + kayit.bos, 0),
    deneme: denemeSonucu.count ?? 0,
  };
}

async function OgrenciIcerik({ userId, ad, donem, haftaBaslangic, aktifBolum }: { userId: string; ad: string; donem: RaporDonemi; haftaBaslangic: string; aktifBolum: DashboardBolumu }) {
  const supabase = await createClient();

  // Kullanıcı bulgusu (24.08.2026): "önce kutular geliyor içerik geç
  // geliyor" — bu fonksiyon önceden ~7 sorguyu SIRAYLA (her biri bir
  // öncekinin bitmesini bekleyerek) çalıştırıyordu, hiçbiri birbirine
  // muhtaç değilken. loading.tsx tüm sayfayı TEK bir iskelet arkasında
  // tutuyor (bkz. DashboardIskeleti) — o yüzden toplam bekleme, tüm
  // sorguların TOPLAMI kadar sürüyordu. Aşağıda birbirinden bağımsız
  // sorgular tek Promise.all'da paralel çalışıyor — toplam süre artık
  // en YAVAŞ sorgu kadar (toplamı değil).
  const haftaBitis = tarihEkle(haftaBaslangic, 6);
  const [
    { data: student },
    analiz,
    { data: konuOnerileriHam },
    { data: rozetDurumHam },
    { data: tamamlananKonularHam },
    oyunEtiketiSayaclari,
    zayifKonular,
    gerekYokSeti,
    { data: gorevAtamalariHam },
  ] = await Promise.all([
    supabase.from("students").select("okul_no, ayt_alan, hedef_bolum, schools(ad, tur), classes(seviye, sube)").eq("id", userId).single(),
    analizVerisiGetir(supabase, userId, donem),
    // Konu girişi sırasında öneri (datalist): resmî müfredat listesi (188
    // konu, sınıf etiketli) + öğrencilerin serbest girip daha önce
    // ürettirdiği ek konular — böylece hem baştan kapsamlı hem zamanla
    // organik olarak büyüyor.
    supabase.from("konu_anlatimlari").select("ders, konu, seviye").order("konu"),
    // Rozetler CANLI hesaplanıyor (bkz. migration 0029) — kalıcı bir
    // "kazanıldı" tablosu yok, her yüklemede güncel durum tazeleniyor.
    supabase.rpc("ogrenci_rozet_durumu", { p_student_id: userId }),
    // Konu tamamlama sayacı (§1, yenilikler_1.txt): payda = müfredattaki
    // ders başına konu sayısı (MUFREDAT_KONULARI), pay = öğrencinin
    // "hakimim" (hedefe_yakinlik='yakin') işaretlediği FARKLI konu sayısı
    // — aynı konuyu birden fazla kez çalışmış olsa bile bir kez sayılır.
    supabase.from("konu_calismalar").select("ders, konu").eq("student_id", userId).eq("hedefe_yakinlik", "yakin"),
    oyunEtiketiSayaclariGetir(supabase, userId, aktifBolum),
    // Konu bilme/bilmeme göstergesi (Faz K3) — sadece "ozet" ve
    // "yapay-zeka" sekmelerinde gösteriliyor, gereksiz sorguyu diğer
    // sekmelerde atlıyoruz.
    (aktifBolum === "ozet" || aktifBolum === "yapay-zeka") ? ogrencininZayifKonulariGetir(supabase, userId) : Promise.resolve([]),
    // Konu Hakimiyeti (Faz H3) — "gerek yok" onayı Plan Yap ve Konu
    // Çalışma girişinde de gerekiyor, ikisi de bu sekmelerde.
    (aktifBolum === "gorevler" || aktifBolum === "planlar" || aktifBolum === "veri-girisi")
      ? gerekYokHaritasiGetir(supabase, userId)
      : Promise.resolve(new Set<string>()),
    // Görevlerim (Faz 3, §5): görüntülenen haftanın (Pzt-Paz) görevleri —
    // gorev_atamalari + gorevler join'i.
    // Program Yap (27.08.2026): bir görevin bu öğrenci için EFEKTİF tarihi
    // ogrenci_tarih varsa ondan, yoksa gorevler.tarih'ten gelir (bkz.
    // GorevSatiri eşlemesi aşağıda). "Programa ekle" akışı öğrenciyi
    // SADECE görüntülenen haftanın 7 günüyle sınırladığı için (bkz.
    // Gorevlerim.tsx gün seçici) ogrenci_tarih hiçbir zaman gorevler.tarih'in
    // haftasından farklı bir haftaya kaymaz — bu yüzden filtre hâlâ tek
    // (orijinal) tarihe bakabiliyor, ayrı bir OR sorgusu gerekmiyor.
    supabase.from("gorev_atamalari")
      .select("id, durum, programa_eklendi_mi, ogrenci_tarih, ogrenci_baslangic_saat, ogrenci_bitis_saat, gorevler!inner(tur, ders, konu, hedef_soru_sayisi, hedef_dakika, tarih, son_tarih, baslangic_saat, bitis_saat, aciklama, olusturan_ogrenci_id)")
      .eq("student_id", userId)
      .gte("gorevler.tarih", haftaBaslangic)
      .lte("gorevler.tarih", haftaBitis),
  ]);
  const gerekYokListesi = Array.from(gerekYokSeti);

  type Row = {
    okul_no: string; ayt_alan: AytAlan; hedef_bolum: string;
    schools: { ad: string; tur: string } | null; classes: { seviye: string; sube: string } | null;
  };
  const s = student as unknown as Row | null;

  if (!s) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">Öğrenci profili bulunamadı.</p>
      </div>
    );
  }

  const uretilenKonular = (konuOnerileriHam as { ders: string; konu: string; seviye: string | null }[]) ?? [];
  const konuOneriAnahtarlari = new Set(MUFREDAT_KONULARI.map((k) => `${k.ders}|${k.konu}`));
  const konuOnerileri = [
    ...MUFREDAT_KONULARI,
    ...uretilenKonular.filter((k) => !konuOneriAnahtarlari.has(`${k.ders}|${k.konu}`)),
  ];

  const rozetDurum = (rozetDurumHam as RozetDurum | null) ?? { konu: "yok", soru: "yok", deneme: "yok", genel: "yok" };

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

  // Faz K4 — 9-10-11. sınıf müfredat üst başlık/alt başlık hiyerarşisi:
  // sadece "veri-girisi" sekmesinde ve sadece ilgili sınıf seviyesinde
  // gerekiyor. Öğrencinin sınıf seviyesi yukarıdaki Promise.all'daki
  // `student` sorgusunun sonucuna muhtaç olduğu için BİLEREK ayrı/sıralı
  // kalıyor — ama küçük ve dar kapsamlı bir sorgu, toplam süreye
  // önceki haliyle kıyasla ihmal edilebilir bir katkısı var.
  let mufredatAltKonulari: { ders: string; ustKonu: string; altBaslik: string }[] = [];
  if (aktifBolum === "veri-girisi" && maarifHiyerarsiSinifMi(s.classes?.seviye ?? null)) {
    const { data: altKonularHam } = await supabase.from("mufredat_alt_konular").select("ders, ust_konu, alt_baslik").order("sira");
    mufredatAltKonulari = ((altKonularHam as { ders: string; ust_konu: string; alt_baslik: string }[]) ?? [])
      .map((r) => ({ ders: r.ders, ustKonu: r.ust_konu, altBaslik: r.alt_baslik }));
  }

  const dokuzOnMu = dokuzOnSinifMi(s.classes?.seviye ?? null);
  const dersListesi = dokuzOnMu
    ? [...TYT_DERSLERI]
    : [...TYT_DERSLERI, ...AYT_DERSLERI[s.ayt_alan].filter((d) => !TYT_DERSLERI.includes(d as typeof TYT_DERSLERI[number]))];

  // Faz H2 — Konu Hakimiyeti: kendi sekmesinde VE Analiz/Rapor'da (özet
  // kartı + donut grafiği) gerekiyor, diğer sekmelerde gereksiz sorguyu
  // atlıyoruz (aynı dokuzOnMu'ya bağlı olduğu için de student sorgusundan
  // sonra, mufredatAltKonulari ile aynı gerekçeyle). Analiz Motoru Faz D —
  // "rozetler" sekmesi de eklendi: Doğruluk Rozeti (bkz. aşağı) bu veriden
  // türetiliyor.
  const dershaneMi = s.schools?.tur === "dershane";
  const konuHakimiyetiTamGorunum = tamGorunumMu(s.classes?.seviye ?? null, dershaneMi);
  const konuHakimiyetiSatirlari = (aktifBolum === "konu-hakimiyeti" || aktifBolum === "analiz" || aktifBolum === "rozetler")
    ? await konuHakimiyetiGetir(supabase, userId, s.classes?.seviye ?? null, s.ayt_alan, dokuzOnMu, dershaneMi)
    : [];
  // Analiz Motoru Faz D — Katman 2'nin (bileşik mastery skoru) rozet
  // sistemine EK/bağımsız bir gösterge olarak eklenmesi (bkz. analiz-motoru.ts,
  // dogrulukRozetSeviyesiHesapla). "rozetler" dışındaki sekmelerde
  // konuHakimiyetiSatirlari boş olduğundan bu her zaman "yok" döner —
  // zararsız, kullanılmıyor.
  const dogrulukSeviyesi = dogrulukRozetSeviyesiHesapla(
    konuHakimiyetiSatirlari.map((satir) => satir.masterySkoru).filter((skor): skor is number => skor !== null),
  );

  type GorevAtamaRow = {
    id: string; durum: GorevSatiri["durum"];
    programa_eklendi_mi: boolean;
    ogrenci_tarih: string | null; ogrenci_baslangic_saat: string | null; ogrenci_bitis_saat: string | null;
    gorevler: {
      tur: GorevSatiri["tur"]; ders: string; konu: string | null;
      hedef_soru_sayisi: number | null; hedef_dakika: number | null;
      tarih: string; son_tarih: string; baslangic_saat: string | null; bitis_saat: string | null; aciklama: string | null;
      olusturan_ogrenci_id: string | null;
    } | null;
  };
  // Program Yap (27.08.2026): tarih/baslangicSaat/bitisSaat aşağıda hep
  // EFEKTİF değeri taşıyor — öğrenci "Programa ekle" ile kendi saat/gün
  // seçtiyse (ogrenci_*), yoksa görevin kendi (öğretmenin girdiği veya hiç
  // girilmemiş) değeri. Böylece Gorevlerim.tsx tek bir alan setiyle hem
  // günlük listeyi (bu tarihe göre) hem haftalık programı çizebiliyor.
  const gorevlerimListesi: GorevSatiri[] = ((gorevAtamalariHam as unknown as GorevAtamaRow[]) ?? [])
    .filter((g) => g.gorevler)
    .map((g) => ({
      atamaId: g.id,
      tur: g.gorevler!.tur,
      ders: g.gorevler!.ders,
      konu: g.gorevler!.konu,
      hedefSoruSayisi: g.gorevler!.hedef_soru_sayisi,
      hedefDakika: g.gorevler!.hedef_dakika,
      tarih: g.ogrenci_tarih ?? g.gorevler!.tarih,
      sonTarih: g.gorevler!.son_tarih,
      baslangicSaat: g.ogrenci_baslangic_saat ?? g.gorevler!.baslangic_saat,
      bitisSaat: g.ogrenci_bitis_saat ?? g.gorevler!.bitis_saat,
      aciklama: g.gorevler!.aciklama,
      durum: g.durum,
      kaynak: g.gorevler!.olusturan_ogrenci_id ? "plan" : "gorev",
      programaEklendiMi: g.programa_eklendi_mi,
    }));

  return (
    <div className="min-h-full flex flex-col gap-6">
      {aktifBolum === "ozet" && <>
        <section className="sfec-dashboard-hero sfec-fade rounded-3xl p-6 sm:p-8 print:hidden">
          <div className="relative z-10 flex min-h-36 items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-3xl"
                style={{ background: MINT_BG, border: `2px solid ${BORDER_STRONG}` }}>
                <span className="sfec-hosgeldin-kapi h-11 w-11 sm:h-14 sm:w-14" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: TEXT_MUTED }}>
                  <Sparkles size={13} color={MINT} /> Öğrenci paneli
                </div>
                <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="truncate text-2xl sm:text-3xl font-extrabold">
                  Hoş geldin {ad.split(" ")[0]}
                </h1>
                <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>{s.schools?.ad ?? "Okul bilgisi bekleniyor"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-80">
              <Bilgi etiket="Sınıf" deger={s.classes ? `${s.classes.seviye}-${s.classes.sube}` : "—"} />
              <Bilgi etiket="Okul No" deger={s.okul_no} />
              <Bilgi etiket="AYT Alanı" deger={AYT_ALAN_ETIKET[s.ayt_alan]} />
              <Bilgi etiket="Hedef" deger={s.hedef_bolum ? s.hedef_bolum.toLocaleUpperCase("tr-TR") : "Belirlenmedi"} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden" aria-label="Haftalık öğrenci özeti">
          <OzetIstatistikKarti Icon={CalendarCheck2} etiket="Konu çalışma" deger={`${analiz.buHaftaKonuDakika} dk`} aciklama="Son 7 gün" />
          <OzetIstatistikKarti Icon={ListChecks} etiket="Çözülen soru" deger={String(analiz.buHaftaSoru)} aciklama="Son 7 gün" />
          <OzetIstatistikKarti Icon={Target} etiket="Son deneme neti" deger={analiz.sonDenemeNet === null ? "—" : String(analiz.sonDenemeNet)} aciklama="En güncel sonuç" />
          <OzetIstatistikKarti Icon={BarChart3} etiket="Bekleyen ödev" deger={String(gorevlerimListesi.filter((g) => g.kaynak === "gorev" && g.durum === "bekliyor").length)} aciklama="Bu hafta" />
        </section>
      </>}

      {(aktifBolum === "gorevler" || aktifBolum === "planlar") && <section className="print:hidden">
        <Gorevlerim
          gorevler={gorevlerimListesi}
          gorunum={aktifBolum === "planlar" ? "planlar" : "gorevler"}
          haftaBaslangic={haftaBaslangic}
          aytAlan={s.ayt_alan}
          sinifSeviyesi={s.classes?.seviye ?? null}
          dersListesi={dersListesi}
          konuOnerileri={konuOnerileri}
          konuSayaclari={konuSayaclari}
          gerekYokListesi={gerekYokListesi}
        />
      </section>}

      {aktifBolum === "ozet" && <section className="print:hidden"><KonuHaritasiRaporu mod="kendi" konular={zayifKonular} /></section>}

      {aktifBolum === "rozetler" && <Rozetlerim durum={rozetDurum} oyunSayaclari={oyunEtiketiSayaclari} dogrulukSeviyesi={dogrulukSeviyesi} sinifSeviyesi={s.classes?.seviye ?? null} />}

      {aktifBolum === "yapay-zeka" && <section className="min-h-full"><KonuHaritasiRaporu mod="kendi" konular={zayifKonular} /></section>}

      {aktifBolum === "veri-girisi" && <div className="print:hidden">
        <OgrenciVeriGirisi aytAlan={s.ayt_alan} konuOnerileri={konuOnerileri} sinifSeviyesi={s.classes?.seviye ?? null} konuSayaclari={konuSayaclari} mufredatAltKonulari={mufredatAltKonulari} gerekYokListesi={gerekYokListesi} />
      </div>}

      {aktifBolum === "konu-hakimiyeti" && <div className="print:hidden">
        <KonuHakimiyetiEkrani satirlar={konuHakimiyetiSatirlari} tamGorunum={konuHakimiyetiTamGorunum} aytAlan={s.ayt_alan} />
      </div>}

      {aktifBolum === "analiz" && <div>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold mb-3 print:hidden">Analiz / Rapor</h2>
        <AnalizPaneli veri={analiz} ogrenciAdi={ad} konuHakimiyetiSatirlari={konuHakimiyetiSatirlari} konuHakimiyetiTamGorunum={konuHakimiyetiTamGorunum} konuHakimiyetiAytAlan={s.ayt_alan} hedefDuzenlenebilir />
      </div>}
    </div>
  );
}

async function OgretmenIcerik({ userId, role, kurumTuru, brans, secilenSinifId, secilenOgrenciId, secilenOgretmenId, donem, aktifBolum }: {
  userId: string; role: "ogretmen" | "mudur"; kurumTuru?: KurumTuru; brans?: string; secilenSinifId?: string; secilenOgrenciId?: string; secilenOgretmenId?: string; donem: RaporDonemi; aktifBolum: DashboardBolumu;
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

  // 2026-08-26 kullanıcı isteği — Rehber Öğretmen kendi okulunun TÜM
  // öğrencilerine (sınıf öğretmenliği/branş dersi sınırı olmadan) mesaj
  // gönderebiliyor, tek tek veya toplu (bkz. RehberlikPaneli.tsx,
  // rehberMesajGonder). Menüde bu bölüm zaten sadece rehber branşına
  // gösteriliyor (bkz. dashboard-navigation.ts) — burada da savunma
  // amaçlı aynı kontrol tekrarlanıyor (doğrudan URL ile erişim denenirse).
  if (aktifBolum === "rehberlik") {
    if (brans !== REHBER_BRANSI) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Bu bölüm sadece Rehber Öğretmen branşına açıktır.</p>
        </div>
      );
    }
    const { data: ogrenciler } = await supabase
      .from("students")
      .select("id, profiles!students_id_fkey(ad), classes(id, seviye, sube)")
      .eq("school_id", teacher.school_id);
    type RehberOgrenciRow = { id: string; profiles: { ad: string } | null; classes: { id: string; seviye: string; sube: string } | null };
    const ogrenciListesi = ((ogrenciler as unknown as RehberOgrenciRow[]) ?? [])
      .map((o) => ({
        id: o.id, ad: o.profiles?.ad ?? "İsimsiz",
        sinifId: o.classes?.id ?? null, sinifAdi: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : "—",
      }))
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
    return <RehberlikPaneli ogrenciler={ogrenciListesi} />;
  }

  if (aktifBolum === "rozetler") {
    const gorunum = await kurumRozetGorunumuGetir(supabase, teacher.school_id, secilenOgrenciId, secilenSinifId);
    return <RozetGoruntulemePaneli gorunum={gorunum} action="/dashboard/rozetler" kapsam={`${gorunum.kurumAdi ?? "Kurum"} · Yalnız bu kurumdaki öğrenciler`} />;
  }

  // Ana Sayfa / kurum performansı (2026-08-25 kullanıcı isteği: "dershane
  // müdürünün ana sayfası okul müdürlerinde de olsun") — dershaneAnaSayfaVerisiGetir
  // kurum türünden bağımsız (sadece school_id alıyor), olduğu gibi
  // yeniden kullanıldı. Sadece okul müdürü (dershane müdürü zaten kendi
  // ayrı panelinde, "ozet" bölümünde, aynı bileşeni kullanıyor).
  if (aktifBolum === "kurum-performansi" && role === "mudur" && kurumTuru !== "dershane") {
    const veri = await dershaneAnaSayfaVerisiGetir(supabase, teacher.school_id);
    return <section className="sfec-section"><DershaneAnaSayfa veri={veri} /></section>;
  }

  // Konu bilme/bilmeme göstergesi (Faz K3) — müdür (okul) OKULUN geneline,
  // öğretmen sadece kendi sınıfına (kendiSinifiMi ile aynı gerekçe: branş
  // öğretmeninin sınıf öğretmeni OLMADIĞI bir sınıfa dair veri sızmasın)
  // bakar. Dershane müdürü ayrı bileşende (DershaneMudurPaneli) ele alınıyor.
  // 2026-08-26 kullanıcı isteği — Rehber Öğretmen'in sınıf öğretmenliği
  // (homeroom) yok, bu yüzden müdürle aynı okul-geneli görünümü alıyor.
  if (aktifBolum === "yapay-zeka" && !(role === "mudur" && kurumTuru === "dershane")) {
    if (role === "mudur" || brans === REHBER_BRANSI) {
      const { satirlar, error } = await konuHaritasiGetir(supabase, { schoolId: teacher.school_id });
      return <KonuHaritasiRaporu mod="rapor" satirlar={satirlar} kapsamEtiketi="Okulunuz" hata={error} />;
    }
    if (!teacher.class_id) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Bu rapor sadece bir sınıfın öğretmeni içindir.</p>
        </div>
      );
    }
    const { satirlar, error } = await konuHaritasiGetir(supabase, { classId: teacher.class_id });
    return <KonuHaritasiRaporu mod="rapor" satirlar={satirlar} kapsamEtiketi="Sınıfınız" hata={error} />;
  }

  // "Öğrenci profili görüntüle" (analiz sayfası, ?ogrenci=) hem okul hem
  // dershane müdürü için ORTAK — dershane dalına geçmeden önce ele alınır.
  if (secilenOgrenciId) {
    const { data: ogrenci } = await supabase
      .from("students")
      .select("id, profiles!students_id_fkey(ad)")
      .eq("id", secilenOgrenciId)
      .single();

    type OgrenciRow = { id: string; profiles: { ad: string } | null };
    const o = ogrenci as unknown as OgrenciRow | null;

    if (o) {
      const [analiz, konuHakimiyetiOzeti, kohort] = await Promise.all([
        analizVerisiGetir(supabase, secilenOgrenciId, donem),
        konuHakimiyetiOzetiGetir(supabase, secilenOgrenciId),
        kohortKarsilastirmasiGetir(supabase, secilenOgrenciId),
      ]);
      const ogrenciAdi = o.profiles?.ad ?? "İsimsiz";
      // Dershane müdürünün "ozet" bölümü yok (bkz. DERSHANE_MUDUR_MENUSU) —
      // varsayılan geri dönüş hedefi ona göre değişiyor, aksi halde
      // /dashboard'a dönüş aktifBolum doğrulamasında geçersiz kalıp
      // yönlendirme döngüsüne girerdi.
      const geriDonusHref = secilenSinifId
        ? `/dashboard?bolum=ozet&sinif=${secilenSinifId}`
        : kurumTuru === "dershane" ? "/dashboard/ogrenciler" : "/dashboard";
      return (
        <div className="flex flex-col gap-4">
          <Link href={geriDonusHref}
            className="sfec-btn inline-flex items-center gap-1 text-xs font-bold w-fit px-3 py-1.5 rounded-full print:hidden"
            style={{ background: BG1_ALT, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            <ChevronLeft size={14} /> Listeye dön
          </Link>
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold print:hidden">{ogrenciAdi}</h1>
          <AnalizPaneli veri={analiz} ogrenciAdi={ogrenciAdi}
            konuHakimiyetiSatirlari={konuHakimiyetiOzeti.satirlar} konuHakimiyetiTamGorunum={konuHakimiyetiOzeti.tamGorunum}
            konuHakimiyetiAytAlan={konuHakimiyetiOzeti.aytAlan} ogretmenGorunumu kohortKarsilastirma={kohort} />
        </div>
      );
    }
  }

  // DERSHANE MODU (Faz D3): dershane müdürü tamamen ayrı bir panel görüyor
  // — bkz. src/components/dashboard/DershaneMudurPaneli.tsx.
  if (role === "mudur" && kurumTuru === "dershane") {
    const { data: dershaneSiniflari } = await supabase
      .from("classes")
      .select("id, seviye, sube")
      .eq("school_id", teacher.school_id);
    return (
      <DershaneMudurPaneli
        siniflar={((dershaneSiniflari ?? []) as { id: string; seviye: string; sube: string }[]).sort(sinifSiraKarsilastir)}
        aktifBolum={aktifBolum}
        schoolId={teacher.school_id}
      />
    );
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
      ? supabase.from("students").select("id, okul_no, yurt_ogrencisi, profiles!students_id_fkey(ad)").eq("class_id", gorunecekSinifId)
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

  type OgrenciRow = { id: string; okul_no: string; yurt_ogrencisi: boolean; profiles: { ad: string } | null };
  const ogrenciListesi = ((ogrenciler as unknown as OgrenciRow[]) ?? []).map((o) => ({
    id: o.id, okul_no: o.okul_no, ad: o.profiles?.ad ?? "İsimsiz", yurtOgrencisi: o.yurt_ogrencisi,
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

  // Verdiğim Görevler (2026-08-25 kullanıcı isteği — öğretmenin verdiği
  // görevleri takip edebileceği bir ekran yoktu, "Bekleyen Onaylar"
  // sekmesine eklenmesi kararlaştırıldı). Homeroom şartı YOK (bekleyenOnaylar'ın
  // aksine) — branş öğretmeni de kendi sınıfı olmadan görev verebiliyor
  // (bkz. gorevVerilebilirMi), o yüzden burada da kendiSinifId'ye bağlı değil.
  type VerdigimGorevRow = {
    id: string; tur: string; ders: string; konu: string | null; tarih: string; son_tarih: string;
    gorev_atamalari: { id: string; student_id: string; durum: "bekliyor" | "tamamlandi" | "tamamlanmadi"; students: { profiles: { ad: string } | null } | null }[];
  };
  const { data: verdigimGorevlerHam } = aktifBolum === "onaylar"
    ? await supabase
        .from("gorevler")
        .select("id, tur, ders, konu, tarih, son_tarih, gorev_atamalari(id, student_id, durum, students(profiles!students_id_fkey(ad)))")
        .eq("olusturan_ogretmen_id", userId)
        .order("tarih", { ascending: false })
        .limit(15)
    : { data: [] as VerdigimGorevRow[] };
  const verdigimGorevler = ((verdigimGorevlerHam as unknown as VerdigimGorevRow[]) ?? []).map((g) => ({
    id: g.id, tur: g.tur as "konu" | "soru" | "deneme", ders: g.ders, konu: g.konu, tarih: g.tarih, sonTarih: g.son_tarih,
    atamalar: (g.gorev_atamalari ?? []).map((a) => ({ id: a.id, durum: a.durum, ogrenciAd: a.students?.profiles?.ad ?? "İsimsiz" })),
  }));

  // Ders Programı + Yurt Nöbeti (2026-08-25 kullanıcı isteği) — sadece
  // "Derslerim" bölümünde gösterildiği için o zaman çekiliyor. Yurt Nöbeti
  // "okul için sadece" (kullanıcı kararı) — dershane'de bu path'e bir
  // öğretmen (müdür değil) de düşebildiğinden kurumTuru burada da kontrol
  // ediliyor.
  const dershaneMi = kurumTuru === "dershane";
  const [dersProgramiSatirlari, yurtNobetiSatirlari] = aktifBolum === "dersler" && role === "ogretmen"
    ? await Promise.all([
        ogretmenProgramiGetir(supabase, userId),
        dershaneMi ? Promise.resolve([]) : yurtNobetiGetir(supabase, userId),
      ])
    : [[], []];

  // Okul müdürünün "Öğretmenler" bölümü (2026-08-25 kullanıcı isteği:
  // "dershane ve okul müdürü öğretmenlerin programlarını görsün") —
  // dershane müdürü zaten kendi ayrı panelinde (DershaneMudurPaneli)
  // düzenleyebiliyordu; okul müdürü SALT-OKUNUR görsün (kullanıcının
  // ders programı için belirlediği "sadece admin ve dershane müdürü elle
  // ekler" kuralı okul müdürünü kapsamıyor). is_ogretmen() geniş okuma
  // izni (bkz. AGENTS.md/proje notları) sayesinde müdür herhangi bir
  // öğretmenin ders_programi'nı normal client ile okuyabiliyor, RLS
  // ders_programi_select_moderator zaten bunu açıkça karşılıyor.
  let okulOgretmenleri: { id: string; ad: string; brans: string }[] = [];
  let secilenOgretmenProgrami: DersProgramiSatiri[] = [];
  if (aktifBolum === "ogretmenler" && role === "mudur" && !dershaneMi) {
    const { data: ogretmenlerHam } = await supabase
      .from("teachers")
      .select("id, brans, profiles!teachers_id_fkey(ad)")
      .eq("school_id", teacher.school_id)
      .neq("id", userId);
    type OgretmenListeRow = { id: string; brans: string; profiles: { ad: string } | null };
    okulOgretmenleri = ((ogretmenlerHam as unknown as OgretmenListeRow[]) ?? [])
      .map((o) => ({ id: o.id, ad: o.profiles?.ad ?? "İsimsiz", brans: o.brans }))
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
    if (secilenOgretmenId) {
      secilenOgretmenProgrami = await ogretmenProgramiGetir(supabase, secilenOgretmenId);
    }
  }

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
      verdigimGorevler={verdigimGorevler}
      konuOnerileri={MUFREDAT_KONULARI}
      aktifBolum={aktifBolum}
      dersProgramiSatirlari={dersProgramiSatirlari}
      yurtNobetiSatirlari={yurtNobetiSatirlari}
      dershaneMi={dershaneMi}
      okulOgretmenleri={okulOgretmenleri}
      secilenOgretmenId={secilenOgretmenId}
      secilenOgretmenProgrami={secilenOgretmenProgrami}
    />
  );
}

async function VeliIcerik({ userId, ad, secilenOgrenciId, donem, aktifBolum }: { userId: string; ad: string; secilenOgrenciId?: string; donem: RaporDonemi; aktifBolum: DashboardBolumu }) {
  const supabase = await createClient();

  if (aktifBolum === "rozetler") {
    const gorunum = await veliRozetGorunumuGetir(supabase, userId);
    return <RozetGoruntulemePaneli gorunum={gorunum} action="/dashboard/rozetler" kapsam="Hesabınıza bağlı öğrencinin rozetleri" seciciGoster={false} />;
  }

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
        <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="mb-4 flex items-center gap-2 text-xl font-bold">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: MINT_BG, border: `1px solid ${BORDER_STRONG}` }}>
            <span className="sfec-hosgeldin-kapi h-6 w-6" aria-hidden="true" />
          </span>
          <span>Hoş geldin {ad}</span>
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

      {aktifBolum === "analiz" && seciliCocuk?.students && (
        <VeliAnalizBolumu supabase={supabase} studentId={seciliCocuk.students.id} donem={donem} ogrenciAdi={seciliCocuk.students.profiles?.ad} />
      )}
    </div>
  );
}

// Veli için Analiz/Rapor sekmesi — analiz verisi + Konu Hakimiyeti özetini
// PARALEL çekip AnalizPaneli'ne geçirir (VeliIcerik'in JSX'i içinde iki
// ayrı await ifadesi yerine, okunabilirlik için ayrı bir async bileşene
// taşındı — aynı Promise.all deseni OgretmenIcerik'teki secilenOgrenciId
// dalıyla tutarlı).
async function VeliAnalizBolumu({ supabase, studentId, donem, ogrenciAdi }: {
  supabase: Awaited<ReturnType<typeof createClient>>; studentId: string; donem: RaporDonemi; ogrenciAdi?: string;
}) {
  const [analiz, konuHakimiyetiOzeti] = await Promise.all([
    analizVerisiGetir(supabase, studentId, donem),
    konuHakimiyetiOzetiGetir(supabase, studentId),
  ]);
  return (
    <section className="flex flex-col gap-4">
      <AnalizPaneli veri={analiz} ogrenciAdi={ogrenciAdi}
        konuHakimiyetiSatirlari={konuHakimiyetiOzeti.satirlar} konuHakimiyetiTamGorunum={konuHakimiyetiOzeti.tamGorunum}
        konuHakimiyetiAytAlan={konuHakimiyetiOzeti.aytAlan} />
    </section>
  );
}

function Bilgi({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div className="rounded-2xl px-3.5 py-3" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide mb-0.5">{etiket}</div>
      <div style={{ color: TEXT }} className="text-sm font-bold truncate" title={deger}>{deger}</div>
    </div>
  );
}

function OzetIstatistikKarti({ Icon, etiket, deger, aciklama }: {
  Icon: typeof Target;
  etiket: string;
  deger: string;
  aciklama: string;
}) {
  return (
    <div className="sfec-dashboard-stat sfec-fade rounded-3xl p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
          <Icon size={20} color={TEXT} aria-hidden="true" />
        </div>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: BG1_ALT, color: TEXT_MUTED }}>{aciklama}</span>
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[0.11em]" style={{ color: TEXT_MUTED }}>{etiket}</div>
      <div className="mt-1 text-2xl font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{deger}</div>
    </div>
  );
}
