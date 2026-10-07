import Link from "next/link";
import { BarChart3, CalendarCheck2, ChevronLeft, ListChecks, Sparkles, Target } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Header } from "@/components/dashboard/Header";
import { OgretmenPanel } from "@/components/dashboard/OgretmenPanel";
import { DershaneMudurPaneli } from "@/components/dashboard/DershaneMudurPaneli";
import { OgrenciVeriGirisi } from "@/components/dashboard/OgrenciVeriGirisi";
import { KonuHaritasiRaporu } from "@/components/dashboard/KonuHaritasiRaporu";
import { AnalizPaneli } from "@/components/dashboard/AnalizPaneli";
import { DenemeKonuAnalizi } from "@/components/dashboard/DenemeKonuAnalizi";
import { denemeKonuAnaliziGetir } from "@/lib/deneme-konu-verisi";
import { DenemeKarnesi } from "@/components/dashboard/DenemeKarnesi";
import { denemeKarneleriGetir } from "@/lib/deneme-karnesi-verisi";

// Deneme konu analizinde gösterilecek en fazla son deneme sayısı (tarih +
// tür + yayınevi). Sınıf/okul geneli için daha az — sorgu hacmi büyüyor.
const OGRENCI_DENEME_SAYISI = 12;
const GRUP_DENEME_SAYISI = 6;
import { HosgeldinPopuplari } from "@/components/dashboard/HosgeldinPopuplari";
import { OgretmenEpostaUyarisi } from "@/components/dashboard/OgretmenEpostaUyarisi";
import { ZorunluSifreDegisikligiKapisi } from "@/components/dashboard/ZorunluSifreDegisikligiKapisi";
import { GrupOgrenciAktivasyonu } from "@/components/dashboard/GrupOgrenciAktivasyonu";
import { analizVerisiGetir } from "@/lib/analiz";
import type { RaporDonemi } from "@/lib/analiz";
import { kohortKarsilastirmasiGetir } from "@/lib/analiz-kohort";
import { ogrencininZayifKonulariGetir, konuHaritasiGetir } from "@/lib/konu-raporu";
import { konuHakimiyetiGetir, konuHakimiyetiOzetiGetir, tamGorunumMu, gerekYokHaritasiGetir } from "@/lib/konu-hakimiyeti";
import { KonuHakimiyetiEkrani } from "@/components/dashboard/KonuHakimiyetiEkrani";
import { AYT_ALAN_ETIKET, sinifSiraKarsilastir, dokuzOnSinifMi, TYT_DERSLERI, AYT_DERSLERI } from "@/lib/types";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import { kurumAltKonulariGetir, kurumHiyerarsiKonulari, kurumKonuOnerileri } from "@/lib/kurum-alt-konulari";
import type { AytAlan, KurumTuru, UserRole } from "@/lib/types";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT, MINT_BG, BUTTER, BUTTER_BG } from "@/lib/theme";
import { Gorevlerim } from "@/components/dashboard/Gorevlerim";
import type { GorevSatiri } from "@/components/dashboard/Gorevlerim";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import { gecikmisIslerGetir, veriGecmisiGetir, type GecikmisIs, type GunGecmisi } from "@/lib/veri-gecmisi";
import { VeriGecmisi } from "@/components/dashboard/VeriGecmisi";
import { GecikmisIslerKarti } from "@/components/dashboard/GecikmisIslerKarti";
import { DashboardYanMenu } from "@/components/dashboard/DashboardYanMenu";
import { TgDenemeleri } from "@/components/dashboard/TgDenemeleri";
import { tgDenemeIlanlariGetir } from "@/lib/tg-deneme-ilanlari";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { ortaokulAktifMi, panelKademesi } from "@/lib/ortaokul-ayar";
import { ortaokulDersleriGetir, ortaokulDersHaritasiGetir } from "@/lib/ortaokul-mufredat-sorgu";
import { OrtaokulDerslerim } from "@/components/dashboard/OrtaokulDerslerim";
import { OrtaokulBugun } from "@/components/dashboard/OrtaokulBugun";
import { ortaokulBugunGetir } from "@/lib/ortaokul-bugun-sorgu";
import { ortaokulGorevlerimGetir, ortaokulPlanimGetir } from "@/lib/ortaokul-gorevler-sorgu";
import { OrtaokulGorevlerim } from "@/components/dashboard/OrtaokulGorevlerim";
import { OrtaokulPlanim } from "@/components/dashboard/OrtaokulPlanim";
import { ortaokulYardimIstekleriGetir } from "@/lib/ortaokul-yardim-sorgu";
import { ortaokulCalismalariGetir, ortaokulDersTemaSecenekleri, ortaokulKonuHavuzu, ortaokulYeterlilikGetir } from "@/lib/ortaokul-bolum-sorgu";
import { bolumCoz } from "@/lib/ortaokul-bolum";
import { OrtaokulCalismalarim } from "@/components/dashboard/OrtaokulCalismalarim";
import { OrtaokulYeterlilik } from "@/components/dashboard/OrtaokulYeterlilik";
import { ORTAOKUL_SEVIYELERI } from "@/lib/kademe";
import { yardimMesaji } from "@/lib/ortaokul-yardim";
import { OrtaokulYardim } from "@/components/dashboard/OrtaokulYardim";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { dershaneDenemeBitisGetir, suresiDolduMu, kullaniciKurumuGetir, denemeSuresiUygulanir, grupDondurulmus, GRUP_DONDURULDU_MESAJI, GRUP_SALT_OKUNUR_MESAJI } from "@/lib/deneme-suresi";
import { ogretmenProgramiGetir, okulNobetiGetir, yurtNobetGorevleriGetir } from "@/lib/ders-programi";
import type { OkulNobeti } from "@/lib/ders-programi";
import type { DersProgramiSatiri } from "@/lib/ders-programi";
import { dershaneAnaSayfaVerisiGetir } from "@/lib/dershane-ana-sayfa";
import { DershaneAnaSayfa } from "@/components/dashboard/DershaneAnaSayfa";
import { DenemeSuresiSonaErdiEkrani } from "@/components/DenemeSuresiSonaErdiEkrani";
import { RehberlikPaneli } from "@/components/dashboard/RehberlikPaneli";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { RehberOgrenciTakibi } from "@/components/dashboard/RehberOgrenciTakibi";
import { GrupKocPaneli } from "@/components/dashboard/GrupKocPaneli";
import { DershaneDenemePdfFormu } from "@/components/dashboard/DershaneDenemePdfFormu";
import { grupKocuYetkisi } from "@/lib/grup-koc-auth";
import { grupBekleyenIsSayilari, grupOgrencileriGetir, grupVelileriGetir } from "@/app/dashboard/grup-koc-actions";
import { rehberOgrenciTakibiVerisiGetir } from "@/lib/dershane-rehber";
import { OgrenciProfilim } from "@/components/dashboard/OgrenciProfilim";
import { ogretmenAktifGunuKaydet, ogrenciProfilGoruntulemesiKaydet } from "@/lib/ogretmen-takip";
import { bekleyenOgretmenBildirimleriniGonder } from "@/lib/ogretmen-bildirim";
import { EtkinlikPaneli } from "@/components/dashboard/EtkinlikPaneli";
import { etkinlikBransiMi } from "@/lib/etkinlik";
import type { EtkinlikAtamasi, EtkinlikGrubu, EtkinlikOgrencisi } from "@/lib/etkinlik";

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
  searchParams: Promise<{ sinif?: string; ogrenci?: string; ogretmen?: string; donem?: string; okul?: string; hafta?: string; ders?: string; konu?: string; kisim?: string; bolum?: string; gecmis?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ad, role, email, gecici_sifre, kvkk_onay_at")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const role = profile.role as UserRole;
  // Admin artık normal akışta hiç görünmez — tek kontrol noktası /yonetici'dir.
  if (role === "admin") redirect("/yonetici");
  const teyitliOgretmenEpostasi = typeof user.user_metadata?.sifre_eposta_teyit_email === "string"
    ? user.user_metadata.sifre_eposta_teyit_email.toLowerCase()
    : null;
  const ogretmenEpostaUyarisi = (role === "ogretmen" || role === "mudur")
    && (!profile.email || profile.email.endsWith(".internal") || teyitliOgretmenEpostasi !== profile.email.toLowerCase());

  // DERSHANE MODU (Faz D3): müdürün menüsü kendi kurumunun tur'una göre
  // tamamen değişiyor (bkz. dashboard-navigation.ts DERSHANE_MUDUR_MENUSU) —
  // bu yüzden aktifBolum doğrulamasından ÖNCE bilinmesi gerekiyor. Artık
  // TÜM roller için çözülüyor (öncesinde sadece müdür) — dershane 1
  // haftalık deneme süresi (bkz. deneme-suresi.ts) öğrenci/veli/öğretmen
  // için de kontrol edilmesi gerektiğinden.
  // Performans (2026-09-04): bu dört okuma birbirinden bağımsız (hepsi
  // yalnızca user.id/role'e bağlı) — eskiden ardışık await oldukları için
  // TTFB'ye art arda ekleniyorlardı, şimdi Promise.all ile aynı anda
  // gidiyorlar. Dershane deneme süresi kontrolü kurumTuru'na BAĞLI
  // olduğundan bilinçli olarak hâlâ sonrasında, ayrı bekleniyor.
  const [kurum, { data: ogretmenBransHam }, { data: moderatorYetkisi }, { count: okunmamisMesajSayisiHam }] = await Promise.all([
    kullaniciKurumuGetir(supabase, user.id, role),
    role === "ogretmen"
      ? supabase.from("teachers").select("brans").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    role === "ogretmen" || role === "mudur"
      ? supabase.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Yanlış giriş bildirimi artık öğrenci hariç TÜM rollere gidebiliyor
    // (bkz. api/giris/route.ts) — TÜM roller için sayılıyor.
    supabase.from("duyuru_aliciler").select("*", { count: "exact", head: true }).eq("profile_id", user.id).eq("okundu", false),
  ]);

  // Dershane 1 haftalık deneme süresi (2026-08-25 kullanıcı isteği, bkz.
  // migration 0065) — SADECE dershane rolleri, okul hiç etkilenmez. Zaten
  // oturum açmış birinin dashboard'a her girişinde de kontrol ediliyor
  // (sadece login anında değil) — süre oturum sırasında dolarsa da anında
  // engellensin diye.
  const kurumTuru = kurum?.tur;
  // Yönetici grubu dondurduysa açık oturumlar da durdurulur (girişte de engelli).
  if (grupDondurulmus(kurum)) return <DenemeSuresiSonaErdiEkrani mesaj={GRUP_DONDURULDU_MESAJI} />;
  // Gruplar (Grup Koçluk) kendi bitiş tarihine tabi, bu süreden muaf.
  if (denemeSuresiUygulanir(kurum)) {
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
  // 2026-08-26 kullanıcı isteği — Rehber Öğretmen branşına özel menü ögesi
  // (bkz. dashboard-navigation.ts REHBERLIK_MENU_OGESI) branş bilgisine
  // bağlı olduğundan menü geçerliliği kontrolünden ÖNCE çekiliyor.
  const brans = ogretmenBransHam?.brans;
  // Grup Koçluk koçu (Faz 3): kendi menüsü ve "Grubum" ana sayfası var.
  const grupKocu = role === "ogretmen" && !!kurum?.grupMu;
  // Grup öğrencisinin ilk girişi (Faz 5): KVKK onayı verilmemişse aktivasyon
  // ekranı (şifre + isteğe bağlı e-posta + alan + hedef + onaylar). Sonraki
  // geçici şifrelerde (koç yeniledi) normal şifre değiştirme kapısı çıkar.
  const grupAktivasyonu = role === "ogrenci" && !!kurum?.grupMu && !profile.kvkk_onay_at;
  // Öğrencinin sınıf seviyesi. İKİ yerde gerekiyor: ortaokul panelinin
  // kademesi ve grup aktivasyonundaki alan sorusu.
  //
  // HATA (01.10.2026, canlıda yakalandı): bu sorgu yalnız `grupAktivasyonu`
  // doğruyken çalışıyordu, yani seviye normal okul öğrencisinde DAİMA
  // undefined kalıyor ve panelKademesi her zaman null dönüyordu — bayrak açık
  // olsa bile ortaokul paneli hiç açılmıyordu. Artık her öğrenci için
  // çekiliyor. (Grup aktivasyonu durumunda davranış birebir aynı: orada da
  // zaten çekiliyordu.)
  const ogrenciSinifKaydi = role === "ogrenci"
    ? ((await supabase.from("students").select("classes(seviye)").eq("id", user.id).maybeSingle()).data as unknown as { classes: { seviye: string } | { seviye: string }[] | null } | null)?.classes
    : null;
  // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür (proje notu).
  const ogrenciSinifSeviyesi = Array.isArray(ogrenciSinifKaydi) ? ogrenciSinifKaydi[0]?.seviye : ogrenciSinifKaydi?.seviye;
  const grupAlanSorulur = !dokuzOnSinifMi(ogrenciSinifSeviyesi);
  const varsayilanBolum: DashboardBolumu = !grupKocu && ((role === "mudur" && kurumTuru !== "dershane") || (role === "ogretmen" && brans === REHBER_BRANSI))
    ? "kurum-performansi" : "ozet";
  const aktifBolum = (params.bolum ?? varsayilanBolum) as DashboardBolumu;
  // Ortaokul paneli (Faz 1): yalnızca özellik bayrağı AÇIKKEN ve öğrenci
  // 5-8. sınıftayken "ortaokul" döner. Bayrak kapalıyken null — bu satır
  // dışında hiçbir davranış değişmez, lise tarafı aynen çalışır.
  const ogrenciKademesi = await panelKademesi(supabase, role, ogrenciSinifSeviyesi);
  // Ogretmenin menusu KURUMUN kademesine gore: ortaokul (ya da "ikisi")
  // kurumunda "Konu Yeterliligi" kalemi eklenir. Bayrak kapaliyken null —
  // lise tarafinda hicbir sey degismez.
  const ogretmenKademesi = role === "ogretmen" && (kurum?.kademe === "ortaokul" || kurum?.kademe === "ikisi") && await ortaokulAktifMi(supabase)
    ? kurum.kademe
    : null;
  const menuKademesi = ogrenciKademesi ?? ogretmenKademesi;
  const ogrenciProgramiGizliRotasi = role === "ogretmen" && aktifBolum === "planlar" && !!params.ogrenci;
  if (!dashboardMenusu(role, kurumTuru, brans, grupKocu, menuKademesi).some((oge) => oge.bolum === aktifBolum) && !ogrenciProgramiGizliRotasi) redirect("/dashboard");
  // Yazılı analizi dürüstlük engeli: öğretmenin panele girdiği günler sayılır
  // (bkz. src/lib/ogretmen-takip.ts, yazili-erisim.ts).
  if (role === "ogretmen") ogretmenAktifGunuKaydet(user.id);
  // Üyelikte aktarılan ders programının anlık bildirimi ve e-postası (bkz. migration 0104).
  if (role === "ogretmen") bekleyenOgretmenBildirimleriniGonder(user.id);
  // Koçun bekleyen işleri menüde rozet olarak görünür (denetim 27.09.2026).
  const grupRozetleri = grupKocu ? await grupBekleyenIsSayilari() : null;
  const menuRozetleri = grupRozetleri
    ? { ozet: grupRozetleri.veliTalebi + grupRozetleri.onayBekleyen }
    : undefined;
  const donem = (["bugun", "haftalik", "aylik", "tum"].includes(params.donem ?? "") ? params.donem : "tum") as RaporDonemi;
  const okunmamisMesajSayisi = okunmamisMesajSayisiHam ?? 0;

  return (
    <div className="sfec-dashboard-shell min-h-dvh w-full flex-1 flex flex-col">
      {/* role !== "mudur" şartı: dershane müdürü hesap açılırken otomatik
          olarak school_moderators'a da eklenir (migration 0052) — bu
          öğretmen için olduğu gibi GERÇEK bir ek yetki değil, müdür için
          örtük bir uygulama detayı. Bu yüzden müdürde her zaman "Müdür"
          gösterilir, "Moderatör" etiketi öğretmen+moderatör kombinasyonuna
          özel kalır. */}
      <Header ad={profile.ad} role={role} kurumTuru={kurumTuru} brans={brans} grupMu={grupKocu} okunmamisMesajSayisi={okunmamisMesajSayisi} moderatorMu={!!moderatorYetkisi} rolEtiketi={moderatorYetkisi && role !== "mudur" ? "Moderatör" : undefined} aktifBolum={aktifBolum} rozetler={menuRozetleri} kademe={menuKademesi} />
      {grupAktivasyonu
        ? <GrupOgrenciAktivasyonu ad={profile.ad} alanSorulur={grupAlanSorulur} />
        : <ZorunluSifreDegisikligiKapisi gecici={profile.gecici_sifre} />}
      <OgretmenEpostaUyarisi email={profile.email} goster={ogretmenEpostaUyarisi} />
      {/* Faz 8: süresi dolan grupta öğrenci ve veli salt okunur (koçun kendi uyarısı Grubum'da). */}
      {kurum?.grupMu && kurum.suresiDoldu && (role === "ogrenci" || role === "veli") && (
        <div className="mx-auto w-full max-w-[100rem] px-4 pt-4 sm:px-6">
          <p className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: BUTTER_BG, color: BUTTER, border: `1px solid ${BORDER}` }}>
            {role === "veli" ? "Çocuğunuzun koçluk grubunun süresi doldu; veriler görüntülenebilir ama yeni kayıt yapılamaz." : GRUP_SALT_OKUNUR_MESAJI}
          </p>
        </div>
      )}
      <HosgeldinPopuplari role={role} />
      <div className="mx-auto flex min-h-[calc(100dvh-6.75rem)] w-full max-w-[100rem] flex-1 items-stretch gap-6 px-4 py-6 sm:px-6 lg:py-7">
        <DashboardYanMenu role={role} kurumTuru={kurumTuru} brans={brans} grupMu={grupKocu} kademe={menuKademesi} aktifBolum={aktifBolum} rozetler={menuRozetleri} />
        <main id="ana-icerik" className="sfec-dashboard-main min-h-[calc(100dvh-10.25rem)] min-w-0 w-full flex-1 flex flex-col gap-6">
          {/* Kullanıcı isteği (03.09.2026): Duyuru Geçmişi artık YALNIZCA admin
              panelinde (bkz. duyuru-gecmisi-actions.ts) — müdür menüsünden ve
              bu dallanmadan kaldırıldı. Yerine öğrencinin kendi "Profilim"
              ekranı geldi (sadece şifre değiştirme). */}
          {aktifBolum === "profil" ? (
            <OgrenciProfilim userId={user.id} ad={profile.ad} kademe={ogrenciKademesi} />
          ) : aktifBolum === "tg-denemeleri" ? (
            <TgDenemeleri bugun={bugununTarihiTR()} dbIlanlar={await tgDenemeIlanlariGetir(supabase, kurum?.id)} ortaokulMu={kurum?.kademe === "ortaokul"} />
          ) : grupKocu && aktifBolum === "ozet" ? (
            <GrupKocIcerik />
          ) : grupKocu && aktifBolum === "denemeler" ? (
            // Kullanıcı kararı: koçlara PDF deneme yükleme yok (Claude maliyeti); elle/Excel.
            <section className="sfec-section"><DershaneDenemePdfFormu yalnizcaExcel /></section>
          ) : (
            <>
              {role === "ogrenci" && <OgrenciIcerik userId={user.id} ad={profile.ad} donem={donem} haftaBaslangic={haftaninPazartesisi(params.hafta)} aktifBolum={aktifBolum} gecmisHafta={Number(params.gecmis ?? 0)} seciliDersId={params.ders} seciliKonu={params.konu} seciliBolum={params.kisim} kademe={ogrenciKademesi} sinifSeviyesi={ogrenciSinifSeviyesi} />}
              {(role === "ogretmen" || role === "mudur") && (
                <OgretmenIcerik userId={user.id} role={role} kurumTuru={kurumTuru} brans={brans} secilenSinifId={params.sinif} secilenOgrenciId={params.ogrenci} secilenOgretmenId={params.ogretmen} donem={donem} aktifBolum={aktifBolum} seciliDersId={params.ders} seciliBolum={params.kisim} kademe={menuKademesi} yurtlu={kurum?.yurtlu === true} grupMu={grupKocu} />
              )}
              {role === "veli" && <VeliIcerik userId={user.id} ad={profile.ad} secilenOgrenciId={params.ogrenci} donem={donem} aktifBolum={aktifBolum} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// Grup Koçluk koçunun "Grubum" sayfası (Faz 3). Yetki ve veri sunucuda.
async function GrupKocIcerik() {
  const yetki = await grupKocuYetkisi();
  if (yetki.error !== null) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">{yetki.error}</p>
      </div>
    );
  }
  const [{ ogrenciler }, { talepler, veliler }] = await Promise.all([grupOgrencileriGetir(), grupVelileriGetir()]);
  return <GrupKocPaneli grup={yetki.grup} ogrenciler={ogrenciler} bugun={bugununTarihiTR()} veliTalepleri={talepler} veliler={veliler} />;
}

async function OgrenciIcerik({ userId, ad, donem, haftaBaslangic, aktifBolum, gecmisHafta, seciliDersId, seciliKonu, seciliBolum, kademe, sinifSeviyesi }: {
  userId: string; ad: string; donem: RaporDonemi; haftaBaslangic: string; aktifBolum: DashboardBolumu;
  // Ogrencinin sinif seviyesi — ust tarafta BIR kez cekiliyor, ortaokul
  // ekranlari buradan okuyor (ayri ayri sorgu atmasinlar).
  sinifSeviyesi?: string;
  // Ortaokul "Derslerim" ekranında açılan ders (?ders=).
  seciliDersId?: string;
  // "Yardım İste" ekranına Derslerim'den gelen konu adı (?konu=).
  seciliKonu?: string;
  // Maarif | LGS sekmesi (?kisim=). Sorgu adı "bolum" DEĞİL: o ad rota
  // segmentinin (bölüm) kendisi, çakışır.
  seciliBolum?: string;
  // Ortaokul paneli açıksa "ortaokul"; aksi hâlde null (bkz. panelKademesi).
  kademe?: "ortaokul" | "lise" | null;
  // Veri geçmişi kaç 7 günlük dilim geriye bakıyor (?gecmis=1 → bir önceki 7 gün).
  gecmisHafta: number;
}) {
  const supabase = await createClient();

  // Ortaokul "Bugün" — ana sayfa yerine geçer. Yalnız bayrak açıkken ve
  // öğrenci 5-8. sınıftayken çalışır; lise öğrencisi eski ana sayfayı görür.
  if (kademe === "ortaokul" && aktifBolum === "ozet") {
    const { data: ogrenciSatiri } = await supabase
      .from("students").select("classes(seviye, sube)").eq("id", userId).maybeSingle();
    const sinifKaydi = (ogrenciSatiri as unknown as { classes: { seviye: string; sube: string } | { seviye: string; sube: string }[] | null } | null)?.classes;
    const sinif = Array.isArray(sinifKaydi) ? sinifKaydi[0] : sinifKaydi;
    const veri = await ortaokulBugunGetir(supabase, userId);
    return (
      <OrtaokulBugun
        ad={ad}
        sinif={sinif ? `${sinif.seviye}-${sinif.sube}` : null}
        mesaj={veri.mesaj}
        kartlar={veri.kartlar}
        bugunTamamlanan={veri.bugunTamamlanan}
        bugunBekleyen={veri.bugunBekleyen}
      />
    );
  }

  // Ortaokul "Derslerim" — veri YALNIZ bu bölüm açıkken çekilir; bayrak
  // kapalıyken bu bölüme menüden erişilemediği için hiç çalışmaz.
  if (aktifBolum === "ortaokul-dersler") {
    const dersler = await ortaokulDersleriGetir(supabase, sinifSeviyesi);
    const secili = dersler.find((d) => d.id === seciliDersId) ?? null;
    const temalar = secili ? await ortaokulDersHaritasiGetir(supabase, secili.id) : [];
    return <OrtaokulDerslerim dersler={dersler} secili={secili} temalar={temalar} />;
  }

  // Ortaokul "Görevlerim" — lise listesi YKS makinesiyle geliyor (TYT/AYT
  // deneme formu, hedef soru sayısı, konu önerileri). Ortaokulda teslim tek
  // işaret (§8.4), bu yüzden kendi ekranı var.
  if (kademe === "ortaokul" && aktifBolum === "gorevler") {
    const { gruplar } = await ortaokulGorevlerimGetir(supabase, userId);
    return <OrtaokulGorevlerim gruplar={gruplar} />;
  }

  // Ortaokul "Planım" — Faz 1'de salt okunur haftalık görünüm (§9).
  if (kademe === "ortaokul" && aktifBolum === "planlar") {
    const plan = await ortaokulPlanimGetir(supabase, userId, haftaBaslangic, sinifSeviyesi ?? null);
    return (
      <OrtaokulPlanim
        gunler={plan.gunler}
        mesaj={plan.mesaj}
        oncekiHref={`/dashboard/planlar?hafta=${tarihEkle(haftaBaslangic, -7)}`}
        sonrakiHref={`/dashboard/planlar?hafta=${tarihEkle(haftaBaslangic, 7)}`}
      />
    );
  }

  // Ortaokul "Çalışmalarım" — Maarif | LGS (migration 0132). Öğrenci kaydı
  // girer; YETERLİLİĞE KARAR VERMEZ, öğretmeninin kararını salt okur.
  if (aktifBolum === "ortaokul-calisma") {
    if (kademe !== "ortaokul") notFound();
    const bolum = bolumCoz(seciliBolum);
    const dersler = await ortaokulDersTemaSecenekleri(supabase, sinifSeviyesi);
    const secili = dersler.find((d) => d.id === seciliDersId) ?? dersler[0] ?? null;
    const bugunTarih = bugununTarihiTR();
    const [calisma, yeterlilik] = await Promise.all([
      // Son 30 gün: ekran "bu dönem ne yaptım" sorusuna yanıt veriyor.
      ortaokulCalismalariGetir(supabase, userId, bolum, tarihEkle(bugunTarih, -30)),
      secili ? ortaokulYeterlilikGetir(supabase, userId, secili, bolum) : Promise.resolve([]),
    ]);
    return (
      <OrtaokulCalismalarim
        bolum={bolum}
        dersler={dersler}
        kayitlar={calisma.kayitlar}
        ozet={calisma.ozet}
        yeterlilik={yeterlilik}
        bugun={bugunTarih}
      />
    );
  }

  // Ortaokul "Yardım İste" (§22.1, migration 0129). Bölüm menüde yalnız
  // bayrak açıkken görünüyor; doğrudan adres yazılarak gelinirse de kademe
  // kontrolü sunucu eyleminde tekrar yapılıyor.
  if (aktifBolum === "ortaokul-yardim") {
    if (kademe !== "ortaokul") notFound();
    const [dersler, istekler] = await Promise.all([
      ortaokulDersleriGetir(supabase, sinifSeviyesi),
      ortaokulYardimIstekleriGetir(supabase, userId),
    ]);
    return (
      <OrtaokulYardim
        dersler={dersler.map((d) => ({ id: d.id, ad: d.ad }))}
        istekler={istekler}
        mesaj={yardimMesaji(istekler)}
        hazirDersId={seciliDersId}
        hazirKonu={seciliKonu}
      />
    );
  }

  if (aktifBolum === "etkinlikler") {
    const { data } = await supabase.from("etkinlik_calisma_atamalari")
      .select("id,durum,cakisiyor,red_gerekcesi,etkinlik_calismalari(isim,tarih,baslangic_saat,bitis_saat,etkinlik_gruplari(isim))")
      .eq("student_id", userId).order("created_at", { ascending: false });
    type AtamaRow = { id:string; durum:EtkinlikAtamasi["durum"]; cakisiyor:boolean; red_gerekcesi:string|null; etkinlik_calismalari:{isim:string;tarih:string;baslangic_saat:string;bitis_saat:string;etkinlik_gruplari:{isim:string}|null}|null };
    const atamalar = ((data as unknown as AtamaRow[]) ?? []).flatMap((a): EtkinlikAtamasi[] => a.etkinlik_calismalari ? [{
      id:a.id, durum:a.durum, cakisiyor:a.cakisiyor, redGerekcesi:a.red_gerekcesi,
      etkinlikIsmi:a.etkinlik_calismalari.isim, tarih:a.etkinlik_calismalari.tarih,
      baslangicSaat:a.etkinlik_calismalari.baslangic_saat, bitisSaat:a.etkinlik_calismalari.bitis_saat,
      grupIsmi:a.etkinlik_calismalari.etkinlik_gruplari?.isim ?? "Etkinlik",
    }] : []);
    return <EtkinlikPaneli mod="ogrenci" atamalar={atamalar} />;
  }

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
    { data: tamamlananKonularHam },
    zayifKonular,
    gerekYokSeti,
    { data: gorevAtamalariHam },
  ] = await Promise.all([
    supabase.from("students").select("school_id, okul_no, ayt_alan, hedef_bolum, schools(ad, tur), classes(seviye, sube)").eq("id", userId).single(),
    analizVerisiGetir(supabase, userId, donem),
    // Konu girişi sırasında öneri (datalist): resmî müfredat listesi (188
    // konu, sınıf etiketli) + öğrencilerin serbest girip daha önce
    // ürettirdiği ek konular — böylece hem baştan kapsamlı hem zamanla
    // organik olarak büyüyor.
    supabase.from("konu_anlatimlari").select("ders, konu, seviye").order("konu"),
    // Konu tamamlama sayacı (§1, yenilikler_1.txt): payda = müfredattaki
    // ders başına konu sayısı (MUFREDAT_KONULARI), pay = öğrencinin
    // "hakimim" (hedefe_yakinlik='yakin') işaretlediği FARKLI konu sayısı
    // — aynı konuyu birden fazla kez çalışmış olsa bile bir kez sayılır.
    supabase.from("konu_calismalar").select("ders, konu").eq("student_id", userId).eq("hedefe_yakinlik", "yakin"),
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

  // Öğrenci geri bildirimi (22.09.2026) — "dün ne yapmışım göremiyorum":
  // Veri Girişi'nde son 7 günün kayıt listesi, Ana sayfada dün özeti ve
  // geçmiş günlerde tamamlanmamış işler (kullanıcı isteği 23.09.2026).
  const bugunTR = bugununTarihiTR();
  const gecmisDilim = Number.isFinite(gecmisHafta) ? Math.min(Math.max(Math.trunc(gecmisHafta), 0), 52) : 0;
  const gecmisBitis = tarihEkle(bugunTR, -7 * gecmisDilim);
  const gecmisBaslangic = tarihEkle(gecmisBitis, -6);
  const dunTarihi = tarihEkle(bugunTR, -1);
  let veriGecmisiGunleri: GunGecmisi[] = [];
  let dunGecmisi: GunGecmisi | null = null;
  let gecikmisIsler: GecikmisIs[] = [];
  if (aktifBolum === "veri-girisi") {
    veriGecmisiGunleri = await veriGecmisiGetir(supabase, userId, gecmisBaslangic, gecmisBitis);
  } else if (aktifBolum === "ozet") {
    const [dunGunleri, gecikmisler] = await Promise.all([
      veriGecmisiGetir(supabase, userId, dunTarihi, dunTarihi),
      gecikmisIslerGetir(supabase, userId, bugunTR),
    ]);
    dunGecmisi = dunGunleri[0] ?? null;
    gecikmisIsler = gecikmisler;
  }

  type Row = {
    school_id: string; okul_no: string; ayt_alan: AytAlan; hedef_bolum: string;
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
  const kurumKonulari = await kurumAltKonulariGetir(supabase, s.school_id);
  const konuOneriAnahtarlari = new Set(MUFREDAT_KONULARI.map((k) => `${k.ders}|${k.konu}`));
  const konuOnerileri = [
    ...MUFREDAT_KONULARI,
    ...uretilenKonular.filter((k) => !konuOneriAnahtarlari.has(`${k.ders}|${k.konu}`)),
    ...kurumKonuOnerileri(kurumKonulari).filter((k) => !konuOneriAnahtarlari.has(`${k.ders}|${k.konu}`)),
  ];

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
  // 12. sınıf öğrencisi de filtreyle 9–11. sınıf alt konularına dönebilir.
  if (aktifBolum === "veri-girisi" && ["9", "10", "11", "12"].includes(s.classes?.seviye ?? "")) {
    const { data: altKonularHam } = await supabase.from("mufredat_alt_konular").select("ders, ust_konu, alt_baslik").order("sira");
    mufredatAltKonulari = ((altKonularHam as { ders: string; ust_konu: string; alt_baslik: string }[]) ?? [])
      .map((r) => ({ ders: r.ders, ustKonu: r.ust_konu, altBaslik: r.alt_baslik }))
      .concat(kurumHiyerarsiKonulari(kurumKonulari));
  }

  const dokuzOnMu = dokuzOnSinifMi(s.classes?.seviye ?? null);
  const dersListesi = dokuzOnMu
    ? [...TYT_DERSLERI]
    : [...TYT_DERSLERI, ...AYT_DERSLERI[s.ayt_alan].filter((d) => !TYT_DERSLERI.includes(d as typeof TYT_DERSLERI[number]))];

  // Faz H2 — Konu Hakimiyeti: kendi sekmesinde VE Analiz/Rapor'da (özet
  // kartı + donut grafiği) gerekiyor, diğer sekmelerde gereksiz sorguyu
  // atlıyoruz (aynı dokuzOnMu'ya bağlı olduğu için de student sorgusundan
  // sonra, mufredatAltKonulari ile aynı gerekçeyle).
  const dershaneMi = s.schools?.tur === "dershane";
  const konuHakimiyetiTamGorunum = tamGorunumMu(s.classes?.seviye ?? null, dershaneMi);
  const [konuHakimiyetiSatirlari, denemeKonu, denemeKarneleri] = await Promise.all([
    (aktifBolum === "konu-hakimiyeti" || aktifBolum === "analiz")
      ? konuHakimiyetiGetir(supabase, userId, s.classes?.seviye ?? null, s.ayt_alan, dokuzOnMu, dershaneMi)
      : Promise.resolve([]),
    // Deneme konu analizi (25.09.2026) — karneli PDF'lerden gelen konu dökümü.
    aktifBolum === "analiz" ? denemeKonuAnaliziGetir(supabase, [userId], OGRENCI_DENEME_SAYISI) : Promise.resolve(null),
    aktifBolum === "analiz" ? denemeKarneleriGetir(supabase, userId) : Promise.resolve([]),
  ]);

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
      {aktifBolum === "ozet" && (
        <>
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
            <OzetIstatistikKarti Icon={CalendarCheck2} etiket="Konu çalışma" deger={`${analiz.buHaftaKonuDakika} dk`} aciklama="Bu hafta" />
            <OzetIstatistikKarti Icon={ListChecks} etiket="Çözülen soru" deger={String(analiz.buHaftaSoru)} aciklama="Bu hafta" />
            <OzetIstatistikKarti Icon={Target} etiket="Son deneme neti" deger={analiz.sonDenemeNet === null ? "—" : String(analiz.sonDenemeNet)} aciklama="En güncel sonuç" />
            <OzetIstatistikKarti Icon={BarChart3} etiket="Bekleyen ödev" deger={String(gorevlerimListesi.filter((g) => g.kaynak === "gorev" && g.durum === "bekliyor").length)} aciklama="Bu hafta" />
          </section>
        </>
      )}
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

      {aktifBolum === "ozet" && <GecikmisIslerKarti dun={dunGecmisi} gecikmisler={gecikmisIsler} />}

      {aktifBolum === "ozet" && <section className="print:hidden"><KonuHaritasiRaporu mod="kendi" konular={zayifKonular} /></section>}


      {aktifBolum === "yapay-zeka" && <section className="min-h-full"><KonuHaritasiRaporu mod="kendi" konular={zayifKonular} /></section>}

      {aktifBolum === "veri-girisi" && <div className="print:hidden flex flex-col gap-6">
        <VeriGecmisi gunler={veriGecmisiGunleri} bugun={bugunTR} dun={dunTarihi} haftaOncesi={gecmisDilim}
          oncekiHref={`/dashboard/veri-girisi?gecmis=${gecmisDilim + 1}`}
          sonrakiHref={gecmisDilim > 0 ? `/dashboard/veri-girisi${gecmisDilim > 1 ? `?gecmis=${gecmisDilim - 1}` : ""}` : null} />
        <OgrenciVeriGirisi aytAlan={s.ayt_alan} konuOnerileri={konuOnerileri} sinifSeviyesi={s.classes?.seviye ?? null} konuSayaclari={konuSayaclari} mufredatAltKonulari={mufredatAltKonulari} gerekYokListesi={gerekYokListesi} />
      </div>}

      {aktifBolum === "konu-hakimiyeti" && <div className="print:hidden">
        <KonuHakimiyetiEkrani satirlar={konuHakimiyetiSatirlari} tamGorunum={konuHakimiyetiTamGorunum} aytAlan={s.ayt_alan} />
      </div>}

      {aktifBolum === "analiz" && <div>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold mb-3 print:hidden">Analiz / Rapor</h2>
        <AnalizPaneli veri={analiz} ogrenciAdi={ad} konuHakimiyetiSatirlari={konuHakimiyetiSatirlari} konuHakimiyetiTamGorunum={konuHakimiyetiTamGorunum} konuHakimiyetiAytAlan={s.ayt_alan} hedefDuzenlenebilir />
        {denemeKarneleri.length > 0 && <div className="mt-4"><DenemeKarnesi karneler={denemeKarneleri} /></div>}
        {denemeKonu && <div className="mt-4"><DenemeKonuAnalizi ozet={denemeKonu.ozet} kapsam="ogrenci" hata={denemeKonu.error} /></div>}
      </div>}
    </div>
  );
}

async function OgretmenIcerik({ userId, role, kurumTuru, brans, secilenSinifId, secilenOgrenciId, secilenOgretmenId, donem, aktifBolum, seciliDersId, seciliBolum, kademe, yurtlu = false, grupMu = false }: {
  userId: string; role: "ogretmen" | "mudur"; kurumTuru?: KurumTuru; brans?: string; secilenSinifId?: string; secilenOgrenciId?: string; secilenOgretmenId?: string; donem: RaporDonemi; aktifBolum: DashboardBolumu;
  // Ortaokul Konu Yeterliliği ekranının seçimleri (?ders=, ?kisim=).
  seciliDersId?: string; seciliBolum?: string;
  // Kurumun kademesi: ortaokulda ödev formunun konu havuzu değişiyor.
  kademe?: "ortaokul" | "lise" | "ikisi" | null;
  // Kurumun yurdu var mı (migration 0133): yoksa yurt arayüzleri çizilmiyor.
  yurtlu?: boolean;
  // Grup Koçluk koçu: ekran metinleri "grup" diline geçer (denetim 27.09.2026).
  grupMu?: boolean;
}) {
  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("school_id, class_id, rehber_sinif_duzeyleri")
    .eq("id", userId)
    .single();

  if (!teacher) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">Öğretmen profili bulunamadı.</p>
      </div>
    );
  }

  // Ortaokul "Konu Yeterliliği" — Maarif | LGS (migration 0132). Kararı
  // YALNIZ öğretmen verir; öğrencinin ekranında aynı bilgi salt okunur.
  // Bölüm menüde yalnız ortaokul kurumunda görünüyor; doğrudan adres yazanı
  // da menü kontrolü (yukarıda) zaten /dashboard'a yönlendiriyor.
  if (aktifBolum === "ortaokul-yeterlilik") {
    return (
      <OrtaokulYeterlilikIcerik
        supabase={supabase}
        schoolId={teacher.school_id}
        seciliOgrenciId={secilenOgrenciId}
        seciliDersId={seciliDersId}
        seciliBolum={seciliBolum}
      />
    );
  }

  // Ortaokul öğretmeninin ödev formunda ders ve konu havuzu ORTAOKUL
  // müfredatından gelir. Lise havuzu (MUFREDAT_KONULARI) verilince 5-8 için
  // hiç konu eşleşmiyordu — kullanıcı bildirimi 02.10.2026: "ödev ver lise
  // branş listesi gibi açılıyor, ve konular açık değil".
  //
  // 5-8'in tamamı çekiliyor; formun kendi seviye süzgeci (hedefSeviyeler)
  // seçilen sınıfa göre daraltıyor, bu yüzden burada sınıf tespitine gerek yok.
  const ortaokulKonulari = (kademe === "ortaokul" || kademe === "ikisi") && aktifBolum === "gorevler"
    ? await ortaokulKonuHavuzu(supabase, ORTAOKUL_SEVIYELERI)
    : null;

  const rehberOgretmenMi = role === "ogretmen" && brans === REHBER_BRANSI;
  const liseOkulRehberiMi = rehberOgretmenMi && kurumTuru === "okul" && (kademe === "lise" || kademe === "ikisi");
  const rehberSeviyeleri = liseOkulRehberiMi ? (teacher.rehber_sinif_duzeyleri ?? []) : [];
  const okulOkumaClient = rehberOgretmenMi ? createAdminClient() : supabase;

  // Dershane rehberlik servisi (kullanıcı isteği 13.09.2026): öğrenci adına
  // ödev, veri girişi ve program. Yetki sunucu işlemlerinde ayrıca doğrulanır
  // (bkz. rehber-ogrenci-actions.ts, lib/dershane-rehber.ts).
  if (aktifBolum === "ogrenci-takibi") {
    if (!rehberOgretmenMi || kurumTuru !== "dershane") {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Bu bölüm yalnızca dershane rehber öğretmenine açıktır.</p>
        </div>
      );
    }
    const { ogrenciler, secilen, kurumKonulari } = await rehberOgrenciTakibiVerisiGetir(teacher.school_id, secilenOgrenciId);
    return <RehberOgrenciTakibi ogrenciler={ogrenciler} secilen={secilen} konuOnerileri={[...MUFREDAT_KONULARI, ...kurumKonuOnerileri(kurumKonulari)]} grupMu={grupMu} />;
  }

  if (aktifBolum === "etkinlikler") {
    if (role !== "ogretmen" || kurumTuru !== "okul" || !etkinlikBransiMi(brans)) {
      return <div className="rounded-3xl p-6 text-center" style={{background:BG1,border:`2px solid ${BORDER}`}}><p style={{color:TEXT_MUTED}}>Bu bölüm yalnızca okullardaki Beden Eğitimi ve Müzik öğretmenlerine açıktır.</p></div>;
    }
    // Beden/Müzik öğretmenleri etkinlik için okulun tüm sınıflarından
    // öğrenci seçebilir. Normal öğretmen RLS'i yalnız ders verdiği/sınıfı
    // olan öğrencileri döndürdüğü için burada, yukarıdaki rol+branş+okul
    // doğrulamasından sonra sunucu istemcisi kullanılır.
    const admin = createAdminClient();
    const { data: gruplarHam } = await admin.from("etkinlik_gruplari").select("id,isim").eq("teacher_id",userId).eq("school_id",teacher.school_id).order("created_at");
    const grupIds = (gruplarHam ?? []).map((g) => g.id);
    const [{data:siniflarHam},{data:ogrencilerHam},{data:uyelerHam}] = await Promise.all([
      admin.from("classes").select("id,seviye,sube").eq("school_id",teacher.school_id),
      admin.from("students").select("id,class_id,profiles!students_id_fkey(ad),classes(id,seviye,sube)").eq("school_id",teacher.school_id),
      grupIds.length ? admin.from("etkinlik_grup_uyeleri").select("group_id,student_id").in("group_id", grupIds) : Promise.resolve({data:[]}),
    ]);
    type OgrRow={id:string;class_id:string;profiles:{ad:string}|null;classes:{id:string;seviye:string;sube:string}|null};
    const ogrenciler:EtkinlikOgrencisi[]=((ogrencilerHam as unknown as OgrRow[])??[]).map(o=>({id:o.id,ad:o.profiles?.ad??"İsimsiz",sinifId:o.class_id,sinifAdi:o.classes?`${o.classes.seviye}-${o.classes.sube}`:"—"})).sort((a,b)=>a.ad.localeCompare(b.ad,"tr"));
    const uyeMap=new Map<string,Set<string>>(); for(const u of (uyelerHam as {group_id:string;student_id:string}[]|null)??[]){if(!uyeMap.has(u.group_id))uyeMap.set(u.group_id,new Set());uyeMap.get(u.group_id)!.add(u.student_id)}
    const gruplar:EtkinlikGrubu[]=((gruplarHam as {id:string;isim:string}[]|null)??[]).map(g=>({...g,uyeler:ogrenciler.filter(o=>uyeMap.get(g.id)?.has(o.id))}));
    const siniflar=((siniflarHam as {id:string;seviye:string;sube:string}[]|null)??[]).sort(sinifSiraKarsilastir).map(s=>({id:s.id,ad:`${s.seviye}-${s.sube}`}));
    return <EtkinlikPaneli mod="ogretmen" brans={brans} siniflar={siniflar} ogrenciler={ogrenciler} gruplar={gruplar}/>;
  }

  // Rehber Öğretmen okulda yalnız atandığı sınıf düzeylerinin
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
    const { data: ogrenciler } = liseOkulRehberiMi && rehberSeviyeleri.length === 0
      ? { data: [] }
      : liseOkulRehberiMi
      ? await supabase.from("students")
          .select("id, profiles!students_id_fkey(ad), classes!inner(id, seviye, sube)")
          .eq("school_id", teacher.school_id).in("classes.seviye", rehberSeviyeleri)
      : await supabase.from("students")
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


  // Ana Sayfa / kurum performansı (2026-08-25 kullanıcı isteği: "dershane
  // müdürünün ana sayfası okul müdürlerinde de olsun") — dershaneAnaSayfaVerisiGetir
  // kurum türünden bağımsız (sadece school_id alıyor), olduğu gibi
  // yeniden kullanıldı. Sadece okul müdürü (dershane müdürü zaten kendi
  // ayrı panelinde, "ozet" bölümünde, aynı bileşeni kullanıyor).
  if (aktifBolum === "kurum-performansi" && (role === "mudur" || rehberOgretmenMi) && kurumTuru !== "dershane") {
    const veri = await dershaneAnaSayfaVerisiGetir(okulOkumaClient, teacher.school_id, liseOkulRehberiMi ? rehberSeviyeleri : undefined);
    return <section className="sfec-section"><DershaneAnaSayfa veri={veri} /></section>;
  }

  // Konu bilme/bilmeme göstergesi (Faz K3) — müdür (okul) OKULUN geneline,
  // öğretmen sadece kendi sınıfına (kendiSinifiMi ile aynı gerekçe: branş
  // öğretmeninin sınıf öğretmeni OLMADIĞI bir sınıfa dair veri sızmasın)
  // bakar. Dershane müdürü ayrı bileşende (DershaneMudurPaneli) ele alınıyor.
  // Rehber Öğretmen'in sınıf öğretmenliği (homeroom) yok; lise okul rehberi
  // için deneme kapsamı atandığı düzeylerin öğrencileriyle sınırlanır.
  if (aktifBolum === "yapay-zeka" && !(role === "mudur" && kurumTuru === "dershane")) {
    if (role === "mudur" || brans === REHBER_BRANSI) {
      const [{ satirlar, error }, denemeKonu] = await Promise.all([
        konuHaritasiGetir(supabase, { schoolId: teacher.school_id }),
        grupDenemeKonuAnaliziGetir(okulOkumaClient, liseOkulRehberiMi
          ? { schoolId: teacher.school_id, seviyeler: rehberSeviyeleri }
          : { schoolId: teacher.school_id }),
      ]);
      return (
        <div className="flex flex-col gap-4">
          <KonuHaritasiRaporu mod="rapor" satirlar={satirlar} kapsamEtiketi="Okulunuz" hata={error} />
          <DenemeKonuAnalizi ozet={denemeKonu.ozet} kapsam="grup" kapsamEtiketi="Okulunuz" hata={denemeKonu.error} />
        </div>
      );
    }
    if (!teacher.class_id) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Bu rapor sadece bir sınıfın öğretmeni içindir.</p>
        </div>
      );
    }
    const [{ satirlar, error }, denemeKonu] = await Promise.all([
      konuHaritasiGetir(supabase, { classId: teacher.class_id }),
      grupDenemeKonuAnaliziGetir(supabase, { classId: teacher.class_id }),
    ]);
    return (
      <div className="flex flex-col gap-4">
        <KonuHaritasiRaporu mod="rapor" satirlar={satirlar} kapsamEtiketi="Sınıfınız" hata={error} />
        <DenemeKonuAnalizi ozet={denemeKonu.ozet} kapsam="grup" kapsamEtiketi="Sınıfınız" hata={denemeKonu.error} />
      </div>
    );
  }

  // "Öğrenci profili görüntüle" (analiz sayfası, ?ogrenci=) hem okul hem
  // dershane müdürü için ORTAK — dershane dalına geçmeden önce ele alınır.
  if (secilenOgrenciId && aktifBolum !== "planlar") {
    const { data: ogrenci } = await okulOkumaClient
      .from("students")
      .select("id, okul_no, profiles!students_id_fkey(ad), schools(ad, tur), classes(seviye, sube)")
      .eq("id", secilenOgrenciId)
      .eq("school_id", teacher.school_id)
      .single();

    type OgrenciRow = {
      id: string;
      okul_no: string | null;
      profiles: { ad: string } | null;
      schools: { ad: string; tur: KurumTuru } | null;
      classes: { seviye: string; sube: string } | null;
    };
    const o = ogrenci as unknown as OgrenciRow | null;

    if (o && (!liseOkulRehberiMi || (o.classes && rehberSeviyeleri.includes(o.classes.seviye)))) {
      // Yazılı analizi dürüstlük engeli: öğrenci öğretmenin okulunda doğrulanıp
      // profili gösterildiği için görüntüleme sayılır (bkz. ogretmen-takip.ts).
      if (role === "ogretmen") ogrenciProfilGoruntulemesiKaydet(userId, secilenOgrenciId);
      const [analiz, konuHakimiyetiOzeti, kohort, denemeKonu, denemeKarneleri] = await Promise.all([
        analizVerisiGetir(okulOkumaClient, secilenOgrenciId, donem),
        konuHakimiyetiOzetiGetir(okulOkumaClient, secilenOgrenciId),
        kohortKarsilastirmasiGetir(okulOkumaClient, secilenOgrenciId),
        denemeKonuAnaliziGetir(okulOkumaClient, [secilenOgrenciId], OGRENCI_DENEME_SAYISI),
        denemeKarneleriGetir(okulOkumaClient, secilenOgrenciId),
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
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs print:hidden" style={{ color: TEXT_MUTED }}>
            <span>Okul: <strong style={{ color: TEXT }}>{o.schools?.ad ?? "—"}</strong></span>
            <span>Sınıf: <strong style={{ color: TEXT }}>{o.classes ? `${o.classes.seviye}-${o.classes.sube}` : "—"}</strong></span>
            <span>{o.schools?.tur === "dershane" ? "Kullanıcı adı" : "Öğrenci no"}: <strong style={{ color: TEXT }}>{o.okul_no || "—"}</strong></span>
          </div>
          <AnalizPaneli veri={analiz} ogrenciAdi={ogrenciAdi}
            konuHakimiyetiSatirlari={konuHakimiyetiOzeti.satirlar} konuHakimiyetiTamGorunum={konuHakimiyetiOzeti.tamGorunum}
            konuHakimiyetiAytAlan={konuHakimiyetiOzeti.aytAlan} ogretmenGorunumu kohortKarsilastirma={kohort} />
          <DenemeKarnesi karneler={denemeKarneleri} />
          <DenemeKonuAnalizi ozet={denemeKonu.ozet} kapsam="ogrenci" hata={denemeKonu.error} />
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

  type OgretmenDersiRow = { id: string; teacher_id: string; class_id: string; ders: string };
  const [{ data: siniflar }, { data: ogretmenDersleriHam }] = await Promise.all([
    okulOkumaClient.from("classes").select("id, seviye, sube").eq("school_id", teacher.school_id),
    supabase.from("ogretmen_dersleri").select("id, teacher_id, class_id, ders").eq("teacher_id", userId),
  ]);
  const kendiDersAtamalari = (ogretmenDersleriHam as unknown as OgretmenDersiRow[] | null) ?? [];
  const tumSiniflar = ((siniflar ?? []) as { id: string; seviye: string; sube: string }[]).sort(sinifSiraKarsilastir);
  // Normal öğretmen yalnız sınıf öğretmenliği yaptığı veya ders verdiği
  // sınıfları görür. Lise okul rehberi atandığı düzeyleri, müdür tüm okulu
  // görür. Dershane rehberinin ayrı yapısı korunur.
  const erisilebilirSinifIdleri = new Set([teacher.class_id, ...kendiDersAtamalari.map((d) => d.class_id)].filter((id): id is string => !!id));
  const sinifListesi = liseOkulRehberiMi
    ? tumSiniflar.filter((sinif) => rehberSeviyeleri.includes(sinif.seviye))
    : role === "ogretmen" && !rehberOgretmenMi
      ? tumSiniflar.filter((sinif) => erisilebilirSinifIdleri.has(sinif.id))
      : tumSiniflar;
  const secilenSinifErisilebilir = secilenSinifId && sinifListesi.some((sinif) => sinif.id === secilenSinifId) ? secilenSinifId : null;
  const varsayilanSinifId = teacher.class_id && sinifListesi.some((sinif) => sinif.id === teacher.class_id)
    ? teacher.class_id
    : sinifListesi[0]?.id ?? null;
  const gorunecekSinifId = secilenSinifErisilebilir || varsayilanSinifId;
  const kendiSinifiMi = gorunecekSinifId === teacher.class_id;

  // Öğrencinin soru çözümü, o sınıf ve derse atanmış branş öğretmeni varsa
  // yalnız o öğretmenin; yoksa sınıf öğretmeninin onayına düşer. Branş
  // öğretmeni sınıf öğretmeni olmasa da kendi dersinin kayıtlarını görebilir.
  const onayAdayiSinifIdleri = [...new Set([teacher.class_id, ...kendiDersAtamalari.map((d) => d.class_id)].filter((id): id is string => !!id))];
  const onayAdmin = createAdminClient();

  const [{ data: ogrenciler }, { data: talepler }, { data: bekleyenOnaylarHam }, { data: sinifDersAtamalariHam }] = await Promise.all([
    gorunecekSinifId
      ? okulOkumaClient.from("students").select("id, okul_no, yurt_ogrencisi, profiles!students_id_fkey(ad)").eq("class_id", gorunecekSinifId)
      : Promise.resolve({ data: [] }),
    teacher.class_id
      ? supabase.from("veli_link_requests").select("*, students!inner(class_id, profiles!students_id_fkey(ad))").eq("students.class_id", teacher.class_id).eq("durum", "bekliyor")
      : Promise.resolve({ data: [] }),
    aktifBolum === "onaylar" && onayAdayiSinifIdleri.length
      ? onayAdmin.from("soru_cozumleri")
          .select("id, student_id, ders, dogru, yanlis, bos, tarih, students!inner(class_id, profiles!students_id_fkey(ad))")
          .in("students.class_id", onayAdayiSinifIdleri)
          .eq("kaynak", "ogrenci")
          .eq("onaylandi_mi", false)
          .order("tarih", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
    aktifBolum === "onaylar" && onayAdayiSinifIdleri.length
      ? onayAdmin.from("ogretmen_dersleri").select("teacher_id, class_id, ders").in("class_id", onayAdayiSinifIdleri)
      : Promise.resolve({ data: [] }),
  ]);

  type OgrenciRow = { id: string; okul_no: string; yurt_ogrencisi: boolean; profiles: { ad: string } | null };
  const ogrenciListesi = ((ogrenciler as unknown as OgrenciRow[]) ?? []).map((o) => ({
    id: o.id, okul_no: o.okul_no, ad: o.profiles?.ad ?? "İsimsiz", yurtOgrencisi: o.yurt_ogrencisi,
  }));

  type TalepRow = {
    id: string; student_id: string; veli_ad: string; veli_telefon: string | null;
    durum: "bekliyor" | "onaylandi" | "reddedildi" | "kullanildi"; kod: string | null;
    onaylayan_ogretmen_id: string | null; created_at: string; onaylanma_at: string | null;
    students: { profiles: { ad: string } | null } | null;
  };
  const talepListesi = ((talepler as unknown as TalepRow[]) ?? []).map((t) => ({
    ...t, ogrenci_ad: t.students?.profiles?.ad ?? "İsimsiz",
  }));

  const gorunenSinif = sinifListesi.find((s) => s.id === gorunecekSinifId);
  const sinifAdi = gorunenSinif ? `${gorunenSinif.seviye}-${gorunenSinif.sube}` : null;

  const ogretmenDersleri = kendiDersAtamalari.map((d) => {
    const sinif = sinifListesi.find((s) => s.id === d.class_id);
    return { id: d.id, classId: d.class_id, ders: d.ders, sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "—" };
  });

  type BekleyenOnayRow = {
    id: string; student_id: string; ders: string; dogru: number; yanlis: number; bos: number; tarih: string;
    students: { class_id: string; profiles: { ad: string } | null } | null;
  };
  type SinifDersAtamasiRow = { teacher_id: string; class_id: string; ders: string };
  const dersAnahtari = (deger: string) => deger.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
  const sinifDersAtamalari = (sinifDersAtamalariHam as unknown as SinifDersAtamasiRow[] | null) ?? [];
  const bekleyenOnaylar = ((bekleyenOnaylarHam as unknown as BekleyenOnayRow[]) ?? []).filter((s) => {
    const classId = s.students?.class_id;
    if (!classId) return false;
    const dersinOgretmenleri = sinifDersAtamalari.filter((atama) => atama.class_id === classId && dersAnahtari(atama.ders) === dersAnahtari(s.ders));
    return dersinOgretmenleri.length > 0
      ? dersinOgretmenleri.some((atama) => atama.teacher_id === userId)
      : teacher.class_id === classId;
  }).map((s) => ({
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
  const ogretmenKurumKonulari = await kurumAltKonulariGetir(supabase, teacher.school_id);
  const dersVerisiGerekli = (aktifBolum === "takvim" || aktifBolum === "dersler") && role === "ogretmen";
  const nobetVerisiGerekli = aktifBolum === "takvim" || dersVerisiGerekli;
  // Okulun yüklediği nöbetler (17.09.2026): okul nöbeti programın başlığında
  // ve takvimde haftalık; yurt nöbetleri Derslerim'de (bugünden sonrası) ve
  // takvimde (son 2 ay dahil, geçmiş soluk görünür). Eski elle doldurulan
  // 2×6'lık yurt nöbeti defteri 18.09.2026'da kaldırıldı.
  const nobetBaslangic = tarihEkle(bugununTarihiTR(), -62);
  const [dersProgramiSatirlari, okulNobetleri, yurtNobetGorevleri] = dersVerisiGerekli || nobetVerisiGerekli
    ? await Promise.all([
        dersVerisiGerekli ? ogretmenProgramiGetir(supabase, userId) : Promise.resolve([]),
        okulNobetiGetir(supabase, userId),
        dershaneMi ? Promise.resolve([]) : yurtNobetGorevleriGetir(supabase, userId, nobetBaslangic),
      ])
    : [[], [], []];

  // Öğretmen kendi yurt nöbetini yalnızca aynı okuldaki başka bir aktif
  // öğretmene devredebilir. Liste yalnız Ajandam/Derslerim açıldığında
  // hazırlanır; sunucu action hedefi ve nöbet sahipliğini yeniden doğrular.
  let nobetDevirOgretmenleri: { id: string; ad: string; brans: string }[] = [];
  if (dersVerisiGerekli && !dershaneMi) {
    const admin = createAdminClient();
    const { data: devirAdaylari } = await admin
      .from("teachers")
      .select("id, brans, profiles!teachers_id_fkey(ad, role, aktif)")
      .eq("school_id", teacher.school_id)
      .neq("id", userId);
    type DevirAdayi = {
      id: string;
      brans: string | null;
      profiles: { ad: string | null; role: string | null; aktif: boolean | null } | null;
    };
    nobetDevirOgretmenleri = ((devirAdaylari ?? []) as unknown as DevirAdayi[])
      .filter((o) => o.profiles?.role === "ogretmen" && o.profiles.aktif === true)
      .map((o) => ({ id: o.id, ad: o.profiles?.ad ?? "İsimsiz", brans: o.brans ?? "" }))
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  }

  // Okul müdürünün "Öğretmenler" bölümü (2026-08-25 kullanıcı isteği:
  // "dershane ve okul müdürü öğretmenlerin programlarını görsün") —
  // dershane müdürü zaten kendi ayrı panelinde (DershaneMudurPaneli)
  // düzenleyebiliyordu; okul müdürü SALT-OKUNUR görsün (kullanıcının
  // ders programı için belirlediği "sadece admin ve dershane müdürü elle
  // ekler" kuralı okul müdürünü kapsamıyor). Müdür kendi okulundaki
  // öğretmenleri (teachers_select_ayni_kurum, migration 0114) ve onların
  // ders programını (ders_programi_select_moderator) normal client ile okur.
  let okulOgretmenleri: { id: string; ad: string; brans: string }[] = [];
  let secilenOgretmenProgrami: DersProgramiSatiri[] = [];
  let secilenOgretmenNobetleri: OkulNobeti[] = [];
  if (aktifBolum === "ogretmenler" && (role === "mudur" || rehberOgretmenMi) && !dershaneMi) {
    const { data: ogretmenlerHam } = await okulOkumaClient
      .from("teachers")
      .select("id, brans, profiles!teachers_id_fkey(ad)")
      .eq("school_id", teacher.school_id)
      .neq("id", userId);
    type OgretmenListeRow = { id: string; brans: string; profiles: { ad: string } | null };
    okulOgretmenleri = ((ogretmenlerHam as unknown as OgretmenListeRow[]) ?? [])
      .map((o) => ({ id: o.id, ad: o.profiles?.ad ?? "İsimsiz", brans: o.brans }))
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
    if (secilenOgretmenId) {
      [secilenOgretmenProgrami, secilenOgretmenNobetleri] = await Promise.all([
        ogretmenProgramiGetir(okulOkumaClient, secilenOgretmenId),
        okulNobetiGetir(okulOkumaClient, secilenOgretmenId),
      ]);
    }
  }

  // Sınıf öğretmeni öğrenci programını görsün — revizyon_2 madde 3
  type OgrenciProgramSatiri = { id:string; ogrenci_tarih:string|null; ogrenci_baslangic_saat:string|null; ogrenci_bitis_saat:string|null; programa_eklendi_mi:boolean; gorevler:{tur:string;ders:string;konu:string|null;tarih:string;son_tarih:string}|null };
  let secilenOgrenciProgrami: OgrenciProgramSatiri[] | null = [];
  let secilenOgrenciAdi: string | null = null;
  if (secilenOgrenciId && role === "ogretmen" && !dershaneMi) {
    const admin = createAdminClient();
    const { data: secilenOgrenci } = await admin.from("students").select("id,class_id,school_id,profiles!students_id_fkey(ad)").eq("id",secilenOgrenciId).maybeSingle();
    const profil = secilenOgrenci?.profiles as unknown as {ad:string}|null;
    if (!teacher.class_id || secilenOgrenci?.class_id !== teacher.class_id || secilenOgrenci?.school_id !== teacher.school_id) {
      secilenOgrenciProgrami = null;
    } else {
      secilenOgrenciAdi = profil?.ad ?? "Öğrenci";
      const { data } = await admin
      .from("gorev_atamalari")
      .select("id, ogrenci_tarih, ogrenci_baslangic_saat, ogrenci_bitis_saat, programa_eklendi_mi, gorevler!inner(tur, ders, konu, tarih, son_tarih)")
      .eq("student_id", secilenOgrenciId)
      .eq("programa_eklendi_mi", true)
      .order("ogrenci_tarih", { ascending: true })
      .limit(200);
      secilenOgrenciProgrami = (data as unknown as OgrenciProgramSatiri[]) ?? [];
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
      konuOnerileri={ortaokulKonulari ?? [...MUFREDAT_KONULARI, ...kurumKonuOnerileri(ogretmenKurumKonulari)]}
      kademe={kademe}
      aktifBolum={aktifBolum}
      dersProgramiSatirlari={dersProgramiSatirlari}
      okulNobetleri={okulNobetleri}
      yurtNobetGorevleri={yurtNobetGorevleri}
      nobetDevirOgretmenleri={nobetDevirOgretmenleri}
      dershaneMi={dershaneMi}
      yurtlu={yurtlu}
      okulOgretmenleri={okulOgretmenleri}
      secilenOgretmenId={secilenOgretmenId}
      secilenOgretmenProgrami={secilenOgretmenProgrami}
      secilenOgretmenNobetleri={secilenOgretmenNobetleri}
      rehberOgretmenMi={rehberOgretmenMi}
      grupMu={grupMu}
      secilenOgrenciId={secilenOgrenciId}
      secilenOgrenciProgrami={secilenOgrenciProgrami}
      secilenOgrenciAdi={secilenOgrenciAdi}
    />
  );
}

async function VeliIcerik({ userId, ad, secilenOgrenciId, donem, aktifBolum }: { userId: string; ad: string; secilenOgrenciId?: string; donem: RaporDonemi; aktifBolum: DashboardBolumu }) {
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
        <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="mb-4 flex items-center gap-2 text-xl font-bold">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: MINT_BG, border: `1px solid ${BORDER_STRONG}` }}>
            <span className="sfec-hosgeldin-kapi h-6 w-6" aria-hidden="true" />
          </span>
          <span>Hoş geldin {ad}</span>
        </h1>
        {cocuklar.length === 0 ? (
          <p style={{ color: TEXT_MUTED }} className="text-sm">Henüz bağlı bir öğrenci yok.</p>
        ) : (
          <div className="sfec-ogrenci-listesi">
            {cocuklar.map((c, i) => {
              const secili = c.students?.id === seciliId;
              return (
                <Link key={i} href={`${aktifBolum === "analiz" ? "/dashboard/analiz" : "/dashboard"}?ogrenci=${c.students?.id}`}
                  className="sfec-btn sfec-ogrenci-satiri px-2 py-3 text-sm font-semibold"
                  style={{ color: secili ? MINT : TEXT, background: secili ? MINT_BG : "transparent" }}>
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

// Sınıf ya da okul genelinde deneme konu analizi — önce kapsamdaki
// öğrenciler, sonra son GRUP_DENEME_SAYISI denemenin konu dökümü.
async function grupDenemeKonuAnaliziGetir(
  client: Awaited<ReturnType<typeof createClient>>,
  kapsam: { schoolId: string; seviyeler?: string[] } | { classId: string },
) {
  if ("schoolId" in kapsam && kapsam.seviyeler?.length === 0) return { error: null, ozet: { denemeler: [], tumu: [], denemeBazli: {} } };
  if ("schoolId" in kapsam && kapsam.seviyeler) {
    const { data, error } = await client.from("students").select("id, classes!inner(seviye)")
      .eq("school_id", kapsam.schoolId).in("classes.seviye", kapsam.seviyeler);
    if (error) return { error: error.message, ozet: { denemeler: [], tumu: [], denemeBazli: {} } };
    return denemeKonuAnaliziGetir(client, ((data ?? []) as { id: string }[]).map((o) => o.id), GRUP_DENEME_SAYISI);
  }
  const sorgu = client.from("students").select("id");
  const { data, error } = "schoolId" in kapsam ? await sorgu.eq("school_id", kapsam.schoolId) : await sorgu.eq("class_id", kapsam.classId);
  if (error) return { error: error.message, ozet: { denemeler: [], tumu: [], denemeBazli: {} } };
  return denemeKonuAnaliziGetir(client, ((data ?? []) as { id: string }[]).map((o) => o.id), GRUP_DENEME_SAYISI);
}

// Veli için Analiz/Rapor sekmesi — analiz verisi + Konu Hakimiyeti özetini
// PARALEL çekip AnalizPaneli'ne geçirir (VeliIcerik'in JSX'i içinde iki
// ayrı await ifadesi yerine, okunabilirlik için ayrı bir async bileşene
// taşındı — aynı Promise.all deseni OgretmenIcerik'teki secilenOgrenciId
// dalıyla tutarlı).
async function VeliAnalizBolumu({ supabase, studentId, donem, ogrenciAdi }: {
  supabase: Awaited<ReturnType<typeof createClient>>; studentId: string; donem: RaporDonemi; ogrenciAdi?: string;
}) {
  const [analiz, konuHakimiyetiOzeti, denemeKonu, denemeKarneleri] = await Promise.all([
    analizVerisiGetir(supabase, studentId, donem),
    konuHakimiyetiOzetiGetir(supabase, studentId),
    denemeKonuAnaliziGetir(supabase, [studentId], OGRENCI_DENEME_SAYISI),
    denemeKarneleriGetir(supabase, studentId),
  ]);
  return (
    <section className="flex flex-col gap-4">
      <AnalizPaneli veri={analiz} ogrenciAdi={ogrenciAdi}
        konuHakimiyetiSatirlari={konuHakimiyetiOzeti.satirlar} konuHakimiyetiTamGorunum={konuHakimiyetiOzeti.tamGorunum}
        konuHakimiyetiAytAlan={konuHakimiyetiOzeti.aytAlan} />
      <DenemeKarnesi karneler={denemeKarneleri} />
      <DenemeKonuAnalizi ozet={denemeKonu.ozet} kapsam="ogrenci" hata={denemeKonu.error} />
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

// Ortaokul "Konu Yeterliliği" içeriği (öğretmen). Veri sorguları burada,
// karar düğmeleri istemci bileşeninde (OrtaokulYeterlilik).
async function OrtaokulYeterlilikIcerik({ supabase, schoolId, seciliOgrenciId, seciliDersId, seciliBolum }: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  schoolId: string;
  seciliOgrenciId?: string;
  seciliDersId?: string;
  seciliBolum?: string;
}) {
  const bolum = bolumCoz(seciliBolum);

  // Kurumun ORTAOKUL sınıflarındaki öğrenciler. Lise sınıfları bu ekrana
  // hiç girmiyor — yeterlilik modeli ortaokul müfredatına bağlı.
  const { data: ham } = await supabase
    .from("students")
    .select("id, profiles!students_id_fkey(ad), classes!inner(seviye, sube)")
    .eq("school_id", schoolId)
    .in("classes.seviye", [...ORTAOKUL_SEVIYELERI]);

  type Satir = { id: string; profiles: { ad: string } | null; classes: { seviye: string; sube: string } | null };
  const ogrenciler = ((ham ?? []) as unknown as Satir[])
    .flatMap((o) => (o.profiles ? [{
      id: o.id,
      ad: o.profiles.ad,
      sinif: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
    }] : []))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

  const seciliOgrenci = ogrenciler.find((o) => o.id === seciliOgrenciId) ?? ogrenciler[0] ?? null;

  // Dersler SEÇİLİ ÖĞRENCİNİN sınıf seviyesine göre (5. sınıfta 6 ders).
  const seviye = seciliOgrenci?.sinif?.split("-")[0] ?? null;
  const dersler = await ortaokulDersTemaSecenekleri(supabase, seviye);
  const seciliDers = dersler.find((d) => d.id === seciliDersId) ?? dersler[0] ?? null;
  const satirlar = seciliOgrenci && seciliDers
    ? await ortaokulYeterlilikGetir(supabase, seciliOgrenci.id, seciliDers, bolum)
    : [];

  return (
    <OrtaokulYeterlilik
      bolum={bolum}
      ogrenciler={ogrenciler}
      seciliOgrenci={seciliOgrenci}
      dersler={dersler}
      seciliDers={seciliDers}
      satirlar={satirlar}
      bugun={bugununTarihiTR()}
    />
  );
}
