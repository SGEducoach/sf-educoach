import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { DashboardYanMenu } from "@/components/dashboard/DashboardYanMenu";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { KullaniciArama } from "@/components/yonetici/KullaniciArama";
import { VeliTalepleri } from "@/components/yonetici/VeliTalepleri";
import { PdfEslesmeYonetimi } from "@/components/yonetici/PdfEslesmeYonetimi";
import { KayitsizOgrencilerKarti } from "@/components/yonetici/KayitsizOgrencilerKarti";
import { KazanimEslesmeYonetimi } from "@/components/yonetici/KazanimEslesmeYonetimi";
import { ModeratorlerListesi } from "@/components/yonetici/ModeratorlerListesi";
import { PlatformIstatistikleri } from "@/components/yonetici/PlatformIstatistikleri";
import { KonuAnlatimYonetimi } from "@/components/yonetici/KonuAnlatimYonetimi";
import { MufredatHiyerarsiYonetimi } from "@/components/yonetici/MufredatHiyerarsiYonetimi";
import { KonuAdEslesmeYonetimi } from "@/components/yonetici/KonuAdEslesmeYonetimi";
import { konuAdIncelemeVerisiGetir } from "@/app/yonetici/konu-ad-eslesme-actions";
import { NobetProgramYukleme } from "@/components/yonetici/NobetProgramYukleme";
import { DenemeYuklemeSayfasi } from "@/components/yonetici/DenemeYuklemeSayfasi";
import { GrupKoclukYonetimi } from "@/components/yonetici/GrupKoclukYonetimi";
import { BlogYonetimi } from "@/components/yonetici/BlogYonetimi";
import { KurallarYonetimi } from "@/components/yonetici/KurallarYonetimi";
import { HataBildirimleriYonetimi } from "@/components/yonetici/HataBildirimleriYonetimi";
import type { KurumKademesi } from "@/lib/types";
import { SiteAyarlariYonetimi } from "@/components/yonetici/SiteAyarlariYonetimi";
import { AdminlerYonetimi } from "@/components/yonetici/AdminlerYonetimi";
import { IslemGecmisi } from "@/components/yonetici/IslemGecmisi";
import { OgrenciAktivitesi } from "@/components/yonetici/OgrenciAktivitesi";
import { AKTIVITE_DONEMLERI, VARSAYILAN_AKTIVITE_DONEMI } from "@/lib/ogrenci-aktivitesi-verisi";
import { DuyuruGecmisi } from "@/components/dashboard/DuyuruGecmisi";
import { siteAyarlariGetir, ortaokulAyariGetir, anaSayfaAyarlariGetir } from "@/app/yonetici/actions";
import { AnaSayfaAyarlariYonetimi } from "@/components/yonetici/AnaSayfaAyarlariYonetimi";
import { AnaSayfaDuyuruYonetimi } from "@/components/yonetici/AnaSayfaDuyuruYonetimi";
import { anaSayfaDuyurulariniGetir } from "@/lib/ana-sayfa-duyurulari";
import { seoAnahtarKelimeleriGetir, siteTemaGetir } from "@/lib/app-ayarlari";
import { VARSAYILAN_TEMA } from "@/lib/site-tema";
import { AdminProfilim } from "@/components/yonetici/AdminProfilim";
import { YoneticiGirisForm } from "@/components/yonetici/YoneticiGirisForm";
import { YoneticiDuyuruPaneli } from "@/components/yonetici/YoneticiDuyuruPaneli";
import { TgDenemeYonetimi } from "@/components/yonetici/TgDenemeYonetimi";
import { RehberSinifAtamalari } from "@/components/yonetici/RehberSinifAtamalari";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { YoneticiMesajlar } from "@/components/dashboard/YoneticiMesajlar";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { sinifSiraKarsilastir } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsappYonetimi } from "@/components/yonetici/WhatsappYonetimi";
import { MudurYardimcisiAtamalari } from "@/components/yonetici/MudurYardimcisiAtamalari";
import type { KurumModulYetkileri } from "@/lib/kurum-yetkileri";
import { BelletmenBasvurulari } from "@/components/yonetici/BelletmenBasvurulari";
import { sablonAyarlariGetir } from "@/lib/whatsapp-sablon-ayarlari-verisi";
import { TUM_SABLONLAR } from "@/lib/whatsapp-sablon-ayarlari";
import { TEXT, TEXT_MUTED } from "@/lib/theme";
import { YoneticiSekmeleri } from "@/components/yonetici/YoneticiSekmeleri";
import { KurumSecici } from "@/components/yonetici/KurumSecici";
import { BekleyenIslerKarti } from "@/components/yonetici/BekleyenIslerKarti";
import { bekleyenIsleriGetir } from "@/lib/yonetici-bekleyen-isler";

// İletişim sayfasının sekmeleri (20.10.2026); ilki varsayılan.
const ILETISIM_SEKMELERI = [
  { deger: "yazismalar", etiket: "Kurum Yazışmaları" },
  { deger: "site-duyurusu", etiket: "Site Duyurusu" },
  { deger: "whatsapp", etiket: "WhatsApp Kartları" },
  { deger: "pano", etiket: "Pano İlanları" },
  { deger: "gecmis", etiket: "Duyuru Geçmişi" },
] as const;

// Kurumları Yönet iç sekmeleri (20.10.2026); ilki varsayılan.
const KURUM_SEKMELERI = [
  { deger: "bilgi", etiket: "Bilgi ve Paket" },
  { deger: "idare", etiket: "Rehberlik ve İdare" },
  { deger: "program", etiket: "Ders Programı ve Nöbet" },
] as const;

// SeFu Koç'un tek kontrol noktası — bilerek /dashboard'dan ayrı, kendi
// bağımsız girişi olan, hiçbir yerden link verilmeyen bir adres. Normal
// giriş/rol seçimi akışının hiçbir parçası değil: sadece bu URL'yi bilen
// (ve admin hesabı olan) kişi buraya ulaşabilir.
//
// Diğer roller gibi (bkz. dashboard/page.tsx) tek sayfa üst üste dizilmiş
// bölümler yerine artık sol menü + aktif bölüm mantığıyla çalışıyor —
// ?bolum= (veya /yonetici/[bolum] catch-all, bkz. dashboard-navigation.ts
// YONETICI_ROUTE_BOLUMLERI) hangi bölümün gösterileceğini belirler.
export default async function YoneticiPage({
  searchParams,
}: {
  searchParams: Promise<{ okul?: string; bolum?: string; kurum?: string; donem?: string; deneme?: string; sekme?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <YoneticiGirisForm />;

  const { data: profile } = await supabase.from("profiles").select("ad, role").eq("id", user.id).single();

  // Admin olmayan biri (başka bir rolle oturum açmış durumda) bu adrese
  // gelirse panelin var olduğunu hiç hissettirmeden anasayfaya yönlendirilir.
  if (!profile || profile.role !== "admin") redirect("/");

  const params = await searchParams;
  const aktifBolum = (params.bolum ?? "ozet") as DashboardBolumu;
  if (aktifBolum === "kullanicilar") redirect("/yonetici/kullanici-yonetimi");
  // Eski adresler (yer imleri, bildirim bağlantıları) İletişim sekmelerine.
  if (aktifBolum === "mesajlar") redirect("/yonetici/iletisim?sekme=yazismalar");
  if (aktifBolum === "whatsapp-yonetimi") redirect("/yonetici/iletisim?sekme=whatsapp");
  if (aktifBolum === "duyuru-gecmisi") redirect("/yonetici/iletisim?sekme=gecmis");
  if (!dashboardMenusu("admin").some((oge) => oge.bolum === aktifBolum)) redirect("/yonetici");
  const iletisimSekmesi = (ILETISIM_SEKMELERI.find((s) => s.deger === params.sekme) ?? ILETISIM_SEKMELERI[0]).deger;
  const kurumSekmesi = (KURUM_SEKMELERI.find((s) => s.deger === params.sekme) ?? KURUM_SEKMELERI[0]).deger;

  // ozel 0166 ile geldi; sütun yoksa onsuz okunur.
  const okulSorgusu = (sutunlar: string) => supabase.from("schools").select(sutunlar).is("grup_kapasitesi", null).order("ad");
  const okulIlk = await okulSorgusu("id, ad, okul_kodu, tur, aktif, manuel_aktif, kullanim_bitis_tarihi, deneme_bitis_tarihi, modul_yetkileri, paket_adi, logo_url, kademe, yurtlu, ozel");
  const okullar = okulIlk.error ? (await okulSorgusu("id, ad, okul_kodu, tur, aktif, kademe, yurtlu")).data : okulIlk.data;
  const okulListesi = (okullar ?? []) as unknown as { id: string; ad: string; okul_kodu: string; tur: "okul" | "dershane"; aktif: boolean; manuel_aktif?: boolean; kullanim_bitis_tarihi?: string | null; deneme_bitis_tarihi?: string | null; modul_yetkileri?: KurumModulYetkileri; paket_adi?: string | null; logo_url?: string | null; kademe?: KurumKademesi; yurtlu?: boolean; ozel?: boolean }[];
  const { data: kurumPaketleri } = aktifBolum === "okullar"
    ? await supabase.from("kurum_paketleri").select("id, ad, aciklama, modul_yetkileri").eq("aktif", true).order("sira")
    : { data: [] };
  const gorunecekOkulId = params.okul || okulListesi[0]?.id || null;

  const [{ data: siniflar }, { data: ogretmenler }] = await Promise.all([
    gorunecekOkulId
      ? supabase.from("classes").select("id, seviye, sube").eq("school_id", gorunecekOkulId)
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

  const { kapali: siteKapali } = aktifBolum === "site-ayarlari" ? await siteAyarlariGetir() : { kapali: false };
  const { aktif: ortaokulAktif } = aktifBolum === "site-ayarlari" ? await ortaokulAyariGetir() : { aktif: false };
  const siteTemaId = aktifBolum === "site-ayarlari" ? (await siteTemaGetir()).id : VARSAYILAN_TEMA.id;
  const seoAnahtarKelimeleri = aktifBolum === "site-ayarlari" ? await seoAnahtarKelimeleriGetir() : [];
  const { ayarlar: anaSayfaAyarlari, gorseller: anaSayfaGorselleri } = aktifBolum === "site-ayarlari"
    ? await anaSayfaAyarlariGetir()
    : { ayarlar: { baslik: "", govde: "", sliderGecisSaniye: 6 }, gorseller: [] };
  const anaSayfaDuyurulari = aktifBolum === "site-ayarlari" ? await anaSayfaDuyurulariniGetir(supabase) : [];
  const konuAdInceleme = aktifBolum === "icerik" ? await konuAdIncelemeVerisiGetir() : null;
  const whatsappAyarlari = aktifBolum === "iletisim" && iletisimSekmesi === "whatsapp" ? await sablonAyarlariGetir(createAdminClient()) : null;
  const bekleyenIsler = aktifBolum === "ozet" || aktifBolum === "iletisim" ? await bekleyenIsleriGetir(createAdminClient()) : null;

  // Kullanıcı isteği (26.08.2026): admin de dahil olmak üzere yanlış giriş
  // denemesi bildirimi alıyor (bkz. api/giris/route.ts) — Mesajlarım kutusu
  // artık admin panelinde de görünüyor.
  const { count: okunmamisMesajSayisiHam } = await supabase
    .from("duyuru_aliciler")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("okundu", false);

  return (
    <div className="sfec-dashboard-shell min-h-dvh w-full flex-1 flex flex-col">
      <Header ad={profile.ad} role="admin" aktifBolum={aktifBolum} okunmamisMesajSayisi={okunmamisMesajSayisiHam ?? 0} />
      <div className="mx-auto flex min-h-[calc(100dvh-6.75rem)] w-full max-w-[100rem] flex-1 items-stretch gap-6 px-4 py-6 sm:px-6 lg:py-7">
        <DashboardYanMenu role="admin" aktifBolum={aktifBolum} />
        <main id="ana-icerik" className="sfec-dashboard-main min-h-[calc(100dvh-10.25rem)] min-w-0 w-full flex-1 flex flex-col gap-6">
          {/* Genel Bakış (20.10.2026): bekleyen işler + istatistikler; duyuru
              ve pano formları İletişim'e taşındı. */}
          {aktifBolum === "ozet" && (
            <>
              {bekleyenIsler && <section className="sfec-section"><BekleyenIslerKarti isler={bekleyenIsler} /></section>}
              <section className="sfec-section"><PlatformIstatistikleri /></section>
            </>
          )}
          {/* İletişim (20.10.2026): yazışma, site duyurusu, WhatsApp kartları,
              pano ve duyuru geçmişi tek sayfada; yalnız açık sekme yüklenir. */}
          {aktifBolum === "iletisim" && (
            <section className="sfec-section flex flex-col gap-4">
              <YoneticiSekmeleri etiket="İletişim bölümleri" secili={iletisimSekmesi}
                sekmeler={ILETISIM_SEKMELERI.map((s) => ({ ...s, href: `/yonetici/iletisim?sekme=${s.deger}`, sayi: s.deger === "yazismalar" ? bekleyenIsler?.yanitBekleyenYazisma : undefined }))} />
              {iletisimSekmesi === "yazismalar" && <YoneticiMesajlar />}
              {iletisimSekmesi === "site-duyurusu" && <YoneticiDuyuruPaneli okullar={okulListesi.map((o) => ({ id: o.id, ad: o.ad }))} />}
              {iletisimSekmesi === "whatsapp" && whatsappAyarlari && (
                <WhatsappYonetimi sablonlar={TUM_SABLONLAR} ayarlar={whatsappAyarlari.ayarlar} hazir={whatsappAyarlari.hazir}
                  okullar={okulListesi.map((o) => ({ id: o.id, ad: o.ad, yurtlu: o.yurtlu === true }))} />
              )}
              {iletisimSekmesi === "pano" && <TgDenemeYonetimi okullar={okulListesi.map((o) => ({ id: o.id, ad: o.ad }))} />}
              {iletisimSekmesi === "gecmis" && <DuyuruGecmisi />}
            </section>
          )}
          {aktifBolum === "belletmen-basvurulari" && <section className="sfec-section"><BelletmenBasvurulari /></section>}
          {aktifBolum === "kullanici-yonetimi" && <section className="sfec-section flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Kullanıcı Yönetimi</h1>
              <p className="text-sm" style={{ color: TEXT_MUTED }}>Kullanıcıları ara, ekle, çıkar ve hesaplarını yönet.</p>
            </div>
            <KullaniciArama />
            <AdminPanel
              mod="kullanici"
              okullar={okulListesi}
              gorunecekOkulId={gorunecekOkulId}
              siniflar={((siniflar ?? []) as { id: string; seviye: string; sube: string }[]).sort(sinifSiraKarsilastir)}
              ogretmenListesi={ogretmenListesi}
            />
            <KayitsizOgrencilerKarti yurtDuzenle />
          </section>}
          {aktifBolum === "ogrenci-aktivitesi" && (
            <section className="sfec-section">
              <OgrenciAktivitesi
                kurumId={params.kurum || null}
                donem={AKTIVITE_DONEMLERI.find((d) => d.deger === params.donem)?.deger ?? VARSAYILAN_AKTIVITE_DONEMI} />
            </section>
          )}
          {aktifBolum === "talepler" && <VeliTalepleri />}
          {aktifBolum === "pdf-eslesme" && <section className="sfec-section flex flex-col gap-4"><PdfEslesmeYonetimi denemeAnahtari={params.deneme} /><KazanimEslesmeYonetimi /></section>}
          {aktifBolum === "deneme-yukle" && (
            <section className="sfec-section"><DenemeYuklemeSayfasi
              okullar={okulListesi.map((o) => ({ id: o.id, ad: o.ad, tur: o.tur, kademe: o.kademe ?? null }))}
              seciliOkulId={params.okul ?? null}
            /></section>
          )}
          {/* Kurumları Yönet iç sekmeleri (20.10.2026): Bilgi ve Paket
              (kurum ekle/düzenle, paket, sınıflar), Rehberlik ve İdare,
              Ders Programı ve Nöbet. Seçili kurum sekmeler arasında korunur. */}
          {aktifBolum === "okullar" && okulListesi.length > 0 && (
            <YoneticiSekmeleri etiket="Kurum bölümleri" secili={kurumSekmesi}
              sekmeler={KURUM_SEKMELERI.map((s) => ({ ...s, href: `/yonetici/okullar?${gorunecekOkulId ? `okul=${gorunecekOkulId}&` : ""}sekme=${s.deger}` }))} />
          )}
          {aktifBolum === "okullar" && kurumSekmesi === "bilgi" && (
            <section className="sfec-section"><AdminPanel
              okullar={okulListesi}
              paketler={kurumPaketleri ?? []}
              gorunecekOkulId={gorunecekOkulId}
              siniflar={((siniflar ?? []) as { id: string; seviye: string; sube: string }[]).sort(sinifSiraKarsilastir)}
              ogretmenListesi={ogretmenListesi}
            /></section>
          )}
          {aktifBolum === "okullar" && kurumSekmesi !== "bilgi" && okulListesi.length > 0 && (
            <KurumSecici okullar={okulListesi.map((o) => ({ id: o.id, ad: o.ad }))} seciliOkulId={gorunecekOkulId} sekme={kurumSekmesi} />
          )}
          {aktifBolum === "okullar" && kurumSekmesi === "idare" && gorunecekOkulId && okulListesi.some((o) => o.id === gorunecekOkulId && o.tur === "okul") && (
            <section className="sfec-section"><RehberSinifAtamalari schoolId={gorunecekOkulId} /></section>
          )}
          {aktifBolum === "okullar" && kurumSekmesi === "idare" && gorunecekOkulId && (
            <section className="sfec-section"><MudurYardimcisiAtamalari schoolId={gorunecekOkulId} /></section>
          )}
          {/* Ders programı + nöbet listesi PDF yükleme (kullanıcı isteği 17.09.2026). */}
          {aktifBolum === "okullar" && kurumSekmesi === "program" && gorunecekOkulId && (
            <section className="sfec-section">
              <NobetProgramYukleme
                okulId={gorunecekOkulId}
                okulAdi={okulListesi.find((o) => o.id === gorunecekOkulId)?.ad ?? ""}
                yurtlu={okulListesi.find((o) => o.id === gorunecekOkulId)?.yurtlu === true}
              />
            </section>
          )}
          {aktifBolum === "grup-kocluk" && <section className="sfec-section"><GrupKoclukYonetimi /></section>}
          {aktifBolum === "moderatorler" && <section className="sfec-section"><ModeratorlerListesi /></section>}
          {aktifBolum === "icerik" && (
            <section className="sfec-section flex flex-col gap-5">
              <KonuAnlatimYonetimi />
              <MufredatHiyerarsiYonetimi />
              {konuAdInceleme && <KonuAdEslesmeYonetimi {...konuAdInceleme} />}
            </section>
          )}
          {aktifBolum === "blog" && <section className="sfec-section"><BlogYonetimi /></section>}
          {aktifBolum === "kurallar" && <KurallarYonetimi />}
          {aktifBolum === "hata-bildirimleri" && <section className="sfec-section"><HataBildirimleriYonetimi /></section>}
          {aktifBolum === "islem-gecmisi" && <section className="sfec-section"><IslemGecmisi /></section>}
          {aktifBolum === "site-ayarlari" && (
            <section className="sfec-section">
              <SiteAyarlariYonetimi
                kapaliBaslangic={siteKapali}
                ortaokulBaslangic={ortaokulAktif}
                temaIdBaslangic={siteTemaId}
                seoAnahtarKelimeleriBaslangic={seoAnahtarKelimeleri}
              />
              <AnaSayfaAyarlariYonetimi ayarlarBaslangic={anaSayfaAyarlari} gorsellerBaslangic={anaSayfaGorselleri} />
              <AnaSayfaDuyuruYonetimi baslangic={anaSayfaDuyurulari} />
            </section>
          )}
          {aktifBolum === "adminler" && <section className="sfec-section"><AdminlerYonetimi /></section>}
          {aktifBolum === "profil" && <section className="sfec-section"><AdminProfilim /></section>}
        </main>
      </div>
    </div>
  );
}
