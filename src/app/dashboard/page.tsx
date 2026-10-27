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
import { AnalizSekmeleri } from "@/components/dashboard/AnalizSekmeleri";
import { denemeKonuAnaliziGetir } from "@/lib/deneme-konu-verisi";
import { DenemeKarnesi } from "@/components/dashboard/DenemeKarnesi";
import { denemeKarneleriGetir } from "@/lib/deneme-karnesi-verisi";

// Deneme konu analizinde gösterilecek en fazla son deneme sayısı (tarih +
// tür + yayınevi). Sınıf/okul geneli artık Konu Durumu'nda (konu-durumu.ts).
const OGRENCI_DENEME_SAYISI = 12;
import { HosgeldinPopuplari } from "@/components/dashboard/HosgeldinPopuplari";
import { OgretmenEpostaUyarisi } from "@/components/dashboard/OgretmenEpostaUyarisi";
import { ZorunluSifreDegisikligiKapisi } from "@/components/dashboard/ZorunluSifreDegisikligiKapisi";
import { GrupOgrenciAktivasyonu } from "@/components/dashboard/GrupOgrenciAktivasyonu";
import { analizVerisiGetir } from "@/lib/analiz";
import type { RaporDonemi } from "@/lib/analiz";
import { kohortKarsilastirmasiGetir } from "@/lib/analiz-kohort";
import { ogrencininZayifKonulariGetir } from "@/lib/konu-raporu";
import { konuDurumuKapsamlari } from "@/lib/konu-durumu-verisi";
import { sinifKartOzetleriGetir } from "@/lib/sinif-kart-ozeti";
import { KonuDurumuBolumu } from "@/components/dashboard/KonuDurumuBolumu";
import { konuHakimiyetiGetir, konuHakimiyetiOzetiGetir, tamGorunumMu, gerekYokHaritasiGetir } from "@/lib/konu-hakimiyeti";
import { KonuHakimiyetiEkrani } from "@/components/dashboard/KonuHakimiyetiEkrani";
import { AYT_ALAN_ETIKET, sinifSiraKarsilastir, dokuzOnSinifMi, TYT_DERSLERI, AYT_DERSLERI } from "@/lib/types";
import { MUFREDAT_KONULARI, konuOgrenciyeUygunMu, konuSeviyesi } from "@/lib/mufredat-konulari";
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
import { SINIF_OGRETMENI_BRANSI, dashboardMenusu, rehberlikBirimiMi } from "@/lib/dashboard-navigation";
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
import { OrtaokulCalismaOnaylari } from "@/components/dashboard/OrtaokulCalismaOnaylari";
import { ortaokulBekleyenCalismalarGetir } from "@/lib/ortaokul-calisma-onay-sorgu";
import { ORTAOKUL_SEVIYELERI, ilkokulMu, kademeBul } from "@/lib/kademe";
import { kayitsizOgrenciOzetleriGetir, onKayitliDenemeleriniAktar } from "@/lib/on-kayitli-veri";
import { yardimMesaji } from "@/lib/ortaokul-yardim";
import { OrtaokulYardim } from "@/components/dashboard/OrtaokulYardim";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { kullaniciKurumuGetir, kurumDenemeSuresiDolduMu, grupDondurulmus, GRUP_DONDURULDU_MESAJI, GRUP_SALT_OKUNUR_MESAJI } from "@/lib/deneme-suresi";
import { ogretmenProgramiGetir, okulNobetiGetir, yurtNobetGorevleriGetir } from "@/lib/ders-programi";
import type { OkulNobeti } from "@/lib/ders-programi";
import type { DersProgramiSatiri } from "@/lib/ders-programi";
import { dershaneAnaSayfaVerisiGetir } from "@/lib/dershane-ana-sayfa";
import { DershaneAnaSayfa } from "@/components/dashboard/DershaneAnaSayfa";
import { ortaokulKurumOzetiGetir } from "@/lib/ortaokul-kurum-ozeti";
import { OrtaokulKurumPerformansi } from "@/components/dashboard/OrtaokulKurumPerformansi";
import { DenemeSuresiSonaErdiEkrani } from "@/components/DenemeSuresiSonaErdiEkrani";
import { RehberlikPaneli } from "@/components/dashboard/RehberlikPaneli";
import { rehberlikUyeligiGetir } from "@/lib/rehberlik-servisi";
import { IDARE_CEREZI, IDARE_UNVANI, mudurYardimcisiUyeligiGetir, type MudurYardimcisiUyeligi } from "@/lib/mudur-yardimcisi";
import { cookies } from "next/headers";
import { rehberKapsamListesiGetir } from "@/lib/rehber-kapsam-listesi";
import { AltSekmeCubugu } from "@/components/dashboard/AltSekmeCubugu";
import { kurumBolumuAcikMi, kurumErisimiKapaliMi, KURUM_BAGLANTI_HATASI } from "@/lib/kurum-yetkileri";
import { SinifAnaliziPanel } from "@/components/dashboard/SinifAnaliziPanel";
import { sinifAnaliziGetir } from "@/lib/sinif-analizi-verisi";
import { RehberKapsamListesi } from "@/components/dashboard/RehberKapsamListesi";
import { rehberProgramAkibetleri } from "@/app/dashboard/rehber-program-actions";
import { RehberProgramDestegi } from "@/components/dashboard/RehberProgramDestegi";
import { ortaokulVeliRaporuGetir } from "@/lib/ortaokul-veli-raporu";
import { VeliOrtaokulRaporu } from "@/components/dashboard/VeliOrtaokulRaporu";
import { sinifTemaHaritasiGetir } from "@/lib/ortaokul-sinif-haritasi";
import { OrtaokulSinifHaritasi } from "@/components/dashboard/OrtaokulSinifHaritasi";
import { RehberOgrenciTakibi } from "@/components/dashboard/RehberOgrenciTakibi";
import { GrupKocPaneli } from "@/components/dashboard/GrupKocPaneli";
import { DershaneDenemePdfFormu } from "@/components/dashboard/DershaneDenemePdfFormu";
import { grupKocuYetkisi } from "@/lib/grup-koc-auth";
import { grupBekleyenIsSayilari, grupOgrencileriGetir, grupVelileriGetir } from "@/app/dashboard/grup-koc-actions";
import { rehberOgrenciTakibiVerisiGetir } from "@/lib/dershane-rehber";
import { OgrenciProfilim } from "@/components/dashboard/OgrenciProfilim";
import { ogretmenAktifGunuKaydet, ogrenciProfilGoruntulemesiKaydet } from "@/lib/ogretmen-takip";
import { ilkokulOgrenciRaporuGetir, ilkokulSinifEtkinlikleriGetir, ilkokulSinifRaporuGetir, ilkokulSinifSdoGetir, ilkokulSiniflariGetir } from "@/lib/ilkokul-gelisim-sorgu";
import { IlkokulEtkinlikleri } from "@/components/dashboard/IlkokulEtkinlikleri";
import { ayAnahtari, ayEtiketi, donemBilgisi } from "@/lib/ilkokul-gelisim";
import { sinifimOzeti } from "@/lib/ilkokul-sinifim";
import { IlkokulSinifimPanosu } from "@/components/dashboard/IlkokulSinifimPanosu";
import { WhatsappDuyuruStudyosu } from "@/components/dashboard/WhatsappDuyuruStudyosu";
import { DuyuruTuruSekmeleri } from "@/components/dashboard/DuyuruTuruSekmeleri";
import { duyuruSecenekleri, seciliDuyuruAlani, seciliDuyuruTuru, yalnizGenelKartMi } from "@/lib/duyuru-alanlari";
import { takipBildirimleriniGetir, takipBildirimleriniUret, takipKapsamiGetir, takipSonTaramaGetir, yeniTakipSayisi } from "@/lib/rehber-takip-verisi";
import { taramaGerekliMi } from "@/lib/rehber-takip";
import { RehberTakipBildirimleri } from "@/components/dashboard/RehberTakipBildirimleri";
import { yurtDurumlariGetir, yurtVerisiGetir } from "@/lib/yurt-listesi-verisi";
import { YurtOgrencileriListesi } from "@/components/dashboard/YurtOgrencileriListesi";
import { YurtNobetPdfPaneli } from "@/components/dashboard/YurtNobetPdfPaneli";
import { YurtTakasTalepleri } from "@/components/dashboard/YurtTakasTalepleri";
import { BelletmenBasvurulari } from "@/components/yonetici/BelletmenBasvurulari";
import { YurtNobetlerimKutusu } from "@/components/dashboard/NobetDevirPaneli";
import { belletmenMi } from "@/lib/belletmen";
import { sablonAyarlariGetir } from "@/lib/whatsapp-sablon-ayarlari-verisi";
import { etkinSablonlar, kurumaUygunSablonlar, ucretliKurumMu } from "@/lib/whatsapp-sablon-ayarlari";
import { IlkokulGelisimGirisi, IlkokulGelisimSekmeleri } from "@/components/dashboard/IlkokulGelisimGirisi";
import { OrtaokulCiktiGirisi } from "@/components/dashboard/OrtaokulCiktiGirisi";
import { ortaokulCiktiRaporuGetir, ortaokulCiktiSiniflariGetir, senaryoCiktilariGetir, SENARYO_DONEMI, SENARYO_KAYNAGI } from "@/lib/ortaokul-cikti-sorgu";
import { ciktiDersAdi, ciktiDersiMi, sinifCiktiDersleri } from "@/lib/ortaokul-cikti";
import { IlkokulSosyalDuygusalGirisi } from "@/components/dashboard/IlkokulSosyalDuygusalGirisi";
import { IlkokulGelisimRaporu } from "@/components/dashboard/IlkokulGelisimRaporu";
import { bekleyenOgretmenBildirimleriniGonder } from "@/lib/ogretmen-bildirim";

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
  searchParams: Promise<{ sinif?: string; ogrenci?: string; ogretmen?: string; donem?: string; okul?: string; hafta?: string; ders?: string; konu?: string; kisim?: string; bolum?: string; gecmis?: string; ay?: string; kapsam?: string; tur?: string; alan?: string }>;
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
  // kuruma özel deneme süresi (bkz. deneme-suresi.ts) öğrenci/veli/öğretmen
  // için de kontrol edilmesi gerektiğinden.
  // Performans (2026-09-04): bu dört okuma birbirinden bağımsız (hepsi
  // yalnızca user.id/role'e bağlı) — eskiden ardışık await oldukları için
  // TTFB'ye art arda ekleniyorlardı, şimdi Promise.all ile aynı anda
  // gidiyorlar. Deneme bitişi kurum verisiyle birlikte okunuyor.
  // Müdür yardımcısı İdare panelinde mi (migration 0163): çerez tercihi +
  // geçerli üyelik. İdare panelinde menü ve kapsam müdür yardımcısınındır.
  const idareCerezi = (await cookies()).get(IDARE_CEREZI)?.value;
  const [kurum, { data: ogretmenBransHam }, { data: moderatorYetkisi }, { count: okunmamisMesajSayisiHam }, rehberlikUyeligi, mudurYardimcisiUyelik] = await Promise.all([
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
    // Rehberlik Servisi üyeliği (migration 0144): okul rehberinin kimliği
    // artık branş değil, bu üyelik. Menü geçerliliği kontrolünden ÖNCE
    // gerekiyor, bu yüzden burada çekiliyor (bkz. src/lib/rehberlik-servisi.ts).
    role === "ogretmen"
      ? rehberlikUyeligiGetir(supabase, user.id)
      : Promise.resolve(null),
    role === "ogretmen"
      ? mudurYardimcisiUyeligiGetir(supabase, user.id)
      : Promise.resolve(null),
  ]);
  // Müdür yardımcısı üyeliği varsa panel geçişi gösterilir; İdare paneli çerezle seçilir.
  const idareUyeligi = mudurYardimcisiUyelik && idareCerezi === "idare" ? mudurYardimcisiUyelik : null;
  const idareMenusu = idareUyeligi
    ? { yurt: idareUyeligi.yurt, yalnizYurt: idareUyeligi.yurt && idareUyeligi.sinifDuzeyleri.length === 0 }
    : null;

  // Kuruma özel deneme bitişi oturum sırasında da kontrol edilir.
  const kurumTuru = kurum?.tur;
  if (kurumErisimiKapaliMi(kurum)) return <DenemeSuresiSonaErdiEkrani mesaj={KURUM_BAGLANTI_HATASI} />;
  // Yönetici grubu dondurduysa açık oturumlar da durdurulur (girişte de engelli).
  if (grupDondurulmus(kurum)) return <DenemeSuresiSonaErdiEkrani mesaj={GRUP_DONDURULDU_MESAJI} />;
  if (kurumDenemeSuresiDolduMu(kurum)) return <DenemeSuresiSonaErdiEkrani />;

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
  // Okul rehberinin kimliği artık BRANŞ DEĞİL, Rehberlik Servisi üyeliği
  // (kullanıcı kararı 07.10.2026, migration 0144). Dershane rehberi ve Grup
  // Koçluk koçu kimliğini hâlâ branştan alıyor — bu yüzden aşağıdaki
  // kontroller rehberlikBirimiMi() ile İKİSİNİ birlikte kapsıyor.
  const okulRehberi = rehberlikUyeligi !== null;
  const rehberlikBirimi = role === "ogretmen" && rehberlikBirimiMi(brans, okulRehberi);
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
  // Ön kayıtlı öğrencinin üyelikten ÖNCE yüklenmiş denemeleri, üye olduktan sonra
  // ilk panel açılışında hesabına aktarılır (migration 0179). Tekrar çalışması
  // zararsızdır; hata paneli düşürmez.
  if (role === "ogrenci") {
    try { await onKayitliDenemeleriniAktar(createAdminClient(), user.id); }
    catch (hata) { console.warn("Ön kayıtlı denemeler aktarılamadı:", hata); }
  }
  // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür (proje notu).
  const ogrenciSinifSeviyesi = Array.isArray(ogrenciSinifKaydi) ? ogrenciSinifKaydi[0]?.seviye : ogrenciSinifKaydi?.seviye;
  const grupAlanSorulur = !dokuzOnSinifMi(ogrenciSinifSeviyesi);
  const varsayilanBolum: DashboardBolumu = role === "ogretmen" && belletmenMi(brans) ? "yoklama"
    : idareMenusu?.yalnizYurt ? "yurt-ogrencileri"
    : !grupKocu && ((role === "mudur" && kurumTuru !== "dershane") || rehberlikBirimi || idareMenusu)
    ? "kurum-performansi" : "ozet";
  let aktifBolum = (params.bolum ?? varsayilanBolum) as DashboardBolumu;
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
  // Müdürün menüsü de kurumun kademesine göre (16.10.2026): "ortaokul"
  // kurumunda ortaokul uyarlaması ve ilkokul Gelişim Raporu. Önceden kademe
  // müdüre hiç geçirilmiyordu; dashboardMenusu'ndaki müdür uyarlaması
  // bu yüzden hiç devreye girmiyordu.
  const mudurKademesi = role === "mudur" && kurumTuru === "okul" && kurum?.kademe === "ortaokul" && await ortaokulAktifMi(supabase)
    ? "ortaokul" as const
    : null;
  const menuKademesi = ogrenciKademesi ?? ogretmenKademesi ?? mudurKademesi;
  const izinliMenu = dashboardMenusu(role, kurumTuru, brans, grupKocu, menuKademesi, okulRehberi, idareMenusu, kurum?.modulYetkileri);
  if (izinliMenu.length === 0) {
    return <DenemeSuresiSonaErdiEkrani mesaj="Kurumunuz için kullanılabilir modül bulunmuyor. Kurum yetkilinizle görüşün." />;
  }
  // Varsayılan bölüm pakette kapalıysa ilk izinli bölüme aç. Böylece
  // /dashboard yönlendirmesi kendisine geri dönerek döngü yaratmaz.
  if (!params.bolum && !kurumBolumuAcikMi(kurum?.modulYetkileri, aktifBolum)) {
    aktifBolum = izinliMenu[0].bolum;
  }
  // Pano içeriği kademeye göre ayrışıyor ama kaynak KURUMUN kademesiydi:
  // "ikisi" okulunda `kurum.kademe === "ortaokul"` FALSE olduğu için
  // ortaokul öğrencisine LİSE panosu gösteriliyordu (O1 tespiti B3).
  // Artık kaynak kişinin KENDİ sınıf seviyesi.
  //
  // Velide seçili çocuğun seviyesi gerekiyor; sorgu yalnız Pano açıkken ve
  // yalnız veli için çalışır (VeliIcerik aynı seçimi kendi içinde yapıyor).
  const veliPanoSeviyesi = role === "veli" && aktifBolum === "tg-denemeleri"
    ? ((await supabase
        .from("parent_students")
        .select("students!inner(id, classes(seviye))")
        .eq("parent_id", user.id)
        .then(({ data }) => {
          type Satir = { students: { id: string; classes: { seviye: string } | { seviye: string }[] | null } | null };
          const satirlar = ((data ?? []) as unknown as Satir[]).filter((s) => s.students);
          const secili = satirlar.find((s) => s.students!.id === params.ogrenci) ?? satirlar[0];
          // Gömülü ilişki çalışma anında NESNE döner (proje notu).
          const sinif = secili?.students?.classes;
          return Array.isArray(sinif) ? sinif[0]?.seviye : sinif?.seviye;
        })))
    : undefined;
  const panoOrtaokulMu = menuKademesi === "ortaokul"
    || kademeBul(veliPanoSeviyesi) === "ortaokul"
    || kurum?.kademe === "ortaokul";

  const ogrenciProgramiGizliRotasi = role === "ogretmen" && aktifBolum === "planlar" && !!params.ogrenci;
  // Yalnız yurt sorumlusu müdür yardımcısı yurt öğrencisinin profilini açar
  // (Yurt Öğrencileri listesinden); öğrenci listesi menüsünde yok.
  const yurtOgrenciProfili = !!idareMenusu?.yalnizYurt && aktifBolum === "ozet" && !!params.ogrenci;
  if (!kurumBolumuAcikMi(kurum?.modulYetkileri, aktifBolum)) redirect("/dashboard");
  if (!izinliMenu.some((oge) => oge.bolum === aktifBolum) && !ogrenciProgramiGizliRotasi && !yurtOgrenciProfili) redirect("/dashboard");
  // Yazılı analizi dürüstlük engeli: öğretmenin panele girdiği günler sayılır
  // (bkz. src/lib/ogretmen-takip.ts, yazili-erisim.ts).
  if (role === "ogretmen") ogretmenAktifGunuKaydet(user.id);
  // Üyelikte aktarılan ders programının anlık bildirimi ve e-postası (bkz. migration 0104).
  if (role === "ogretmen") bekleyenOgretmenBildirimleriniGonder(user.id);
  // Koçun bekleyen işleri menüde rozet olarak görünür (denetim 27.09.2026).
  const grupRozetleri = grupKocu ? await grupBekleyenIsSayilari() : null;
  // Rehberlik rollerinde yeni takip bildirimi sayısı menüde (bildirim kutusuna gitmez).
  const takipYeni = rehberlikBirimi && !idareUyeligi
    ? await (async () => { const a = createAdminClient(); const k = await takipKapsamiGetir(a, user.id); return k ? yeniTakipSayisi(a, k) : 0; })().catch(() => 0)
    : 0;
  const menuRozetleri = grupRozetleri || takipYeni
    ? { ...(grupRozetleri ? { ozet: grupRozetleri.veliTalebi + grupRozetleri.onayBekleyen } : {}), ...(takipYeni ? { "takip-bildirimleri": takipYeni } : {}) }
    : undefined;
  // Varsayılan dönem "Aylık" (kullanıcı kararı 23.10.2026): "Genel" (tüm zamanlar)
  // en ağır görünüm; hâlâ ?donem=tum ile seçilebilir.
  const donem = (["bugun", "haftalik", "aylik", "tum"].includes(params.donem ?? "") ? params.donem : "aylik") as RaporDonemi;
  const okunmamisMesajSayisi = okunmamisMesajSayisiHam ?? 0;

  return (
    <div className="sfec-dashboard-shell min-h-dvh w-full flex-1 flex flex-col">
      {/* role !== "mudur" şartı: dershane müdürü hesap açılırken otomatik
          olarak school_moderators'a da eklenir (migration 0052) — bu
          öğretmen için olduğu gibi GERÇEK bir ek yetki değil, müdür için
          örtük bir uygulama detayı. Bu yüzden müdürde her zaman "Müdür"
          gösterilir, "Moderatör" etiketi öğretmen+moderatör kombinasyonuna
          özel kalır. */}
      <Header ad={profile.ad} role={role} kurumTuru={kurumTuru} brans={brans} grupMu={grupKocu} okunmamisMesajSayisi={okunmamisMesajSayisi} moderatorMu={!!moderatorYetkisi} rolEtiketi={idareMenusu ? IDARE_UNVANI : moderatorYetkisi && role !== "mudur" ? "Moderatör" : undefined} aktifBolum={aktifBolum} rozetler={menuRozetleri} kademe={menuKademesi} mobilNavigasyon={false} />
      {grupAktivasyonu
        ? <GrupOgrenciAktivasyonu ad={profile.ad} alanSorulur={grupAlanSorulur} />
        : <ZorunluSifreDegisikligiKapisi gecici={profile.gecici_sifre} />}
      <OgretmenEpostaUyarisi email={profile.email} goster={ogretmenEpostaUyarisi} />
      {/* Müdür yardımcısı: öğretmen paneli ↔ İdare paneli (migration 0163).
          Düz <a>: önceden yükleme çerezi yanlışlıkla değiştirmesin. */}
      {mudurYardimcisiUyelik && (
        <div className="mx-auto flex w-full max-w-[100rem] justify-end px-4 pt-3 sm:px-6 print:hidden">
          <a href={`/dashboard/panel?mod=${idareUyeligi ? "ogretmen" : "idare"}`}
            className="sfec-btn rounded-full px-4 py-1.5 text-xs font-bold" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            {idareUyeligi ? "Öğretmen Paneline Geç" : "Müdür Yardımcısı Paneline Geç"}
          </a>
        </div>
      )}
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
        <DashboardYanMenu role={role} kurumTuru={kurumTuru} brans={brans} grupMu={grupKocu} kademe={menuKademesi} aktifBolum={aktifBolum} rozetler={menuRozetleri} okulRehberi={okulRehberi} idare={idareMenusu} modulYetkileri={kurum?.modulYetkileri} />
        <main id="ana-icerik" className="sfec-dashboard-main min-h-[calc(100dvh-10.25rem)] min-w-0 w-full flex-1 flex flex-col gap-6">
          {/* Kullanıcı isteği (03.09.2026): Duyuru Geçmişi artık YALNIZCA admin
              panelinde (bkz. duyuru-gecmisi-actions.ts) — müdür menüsünden ve
              bu dallanmadan kaldırıldı. Yerine öğrencinin kendi "Profilim"
              ekranı geldi (sadece şifre değiştirme). */}
          {aktifBolum === "profil" ? (
            <OgrenciProfilim userId={user.id} ad={profile.ad} kademe={ogrenciKademesi} />
          ) : aktifBolum === "tg-denemeleri" ? (
            <TgDenemeleri bugun={bugununTarihiTR()} dbIlanlar={await tgDenemeIlanlariGetir(supabase, kurum?.id)} ortaokulMu={panoOrtaokulMu} />
          ) : grupKocu && aktifBolum === "ozet" ? (
            <GrupKocIcerik />
          ) : grupKocu && aktifBolum === "denemeler" ? (
            // Kullanıcı kararı: koçlara PDF deneme yükleme yok (Claude maliyeti); elle/Excel.
            <section className="sfec-section"><DershaneDenemePdfFormu yalnizcaExcel /></section>
          ) : (
            <>
              {role === "ogrenci" && <OgrenciIcerik userId={user.id} ad={profile.ad} donem={donem} haftaBaslangic={haftaninPazartesisi(params.hafta)} aktifBolum={aktifBolum} gecmisHafta={Number(params.gecmis ?? 0)} seciliDersId={params.ders} seciliKonu={params.konu} seciliBolum={params.kisim} kademe={ogrenciKademesi} sinifSeviyesi={ogrenciSinifSeviyesi} />}
              {(role === "ogretmen" || role === "mudur") && (
                <OgretmenIcerik userId={user.id} role={role} kurumTuru={kurumTuru} brans={brans} secilenSinifId={params.sinif} secilenOgrenciId={params.ogrenci} secilenOgretmenId={params.ogretmen} donem={donem} aktifBolum={aktifBolum} seciliDersId={params.ders} seciliBolum={params.kisim} kademe={menuKademesi} yurtlu={kurum?.yurtlu === true} grupMu={grupKocu} secilenAy={params.ay} secilenKapsam={params.kapsam} duyuruTuru={params.tur} duyuruAlani={params.alan} idare={idareUyeligi} />
              )}
              {role === "veli" && <VeliIcerik userId={user.id} ad={profile.ad} secilenOgrenciId={params.ogrenci} donem={donem} aktifBolum={aktifBolum} />}
            </>
          )}
        </main>
      </div>
      {/* Mobil gezinme (görsel yenileme 4/4): yan menü mobilde hiç
          görünmüyordu, gezinmenin tek yolu hamburgerdeki dar açılır paneldi.
          Çubuk başparmak erişiminde; Header'a mobilNavigasyon={false}
          geçildiği için hamburgerde yalnızca hesap/mesaj kaldı, gezinme iki
          yerde birden durmuyor. */}
      <AltSekmeCubugu role={role} kurumTuru={kurumTuru} brans={brans} grupMu={grupKocu}
        kademe={menuKademesi} okulRehberi={okulRehberi} idare={idareMenusu} aktifBolum={aktifBolum} rozetler={menuRozetleri} modulYetkileri={kurum?.modulYetkileri} />
      {/* Çubuk sabit konumlu: içeriğin son satırı altında kalmasın. */}
      <div aria-hidden="true" className="lg:hidden print:hidden" style={{ height: "var(--mobile-nav-height)" }} />
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
    const { data: ogrenciKurumu } = await supabase.from("students")
      .select("school_id").eq("id", userId).maybeSingle();
    const dersler = await ortaokulDersTemaSecenekleri(supabase, sinifSeviyesi, ogrenciKurumu?.school_id, bolum);
    const secili = dersler.find((d) => d.id === seciliDersId) ?? dersler[0] ?? null;
    const bugunTarih = bugununTarihiTR();
    const [calisma, yeterlilik] = await Promise.all([
      // Son 30 gün: ekran "bu dönem ne yaptım" sorusuna yanıt veriyor.
      ortaokulCalismalariGetir(supabase, userId, bolum, tarihEkle(bugunTarih, -30), ogrenciKurumu?.school_id),
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

  // Kullanıcı bulgusu (24.08.2026): "önce kutular geliyor içerik geç
  // geliyor" — bu fonksiyon önceden ~7 sorguyu SIRAYLA (her biri bir
  // öncekinin bitmesini bekleyerek) çalıştırıyordu, hiçbiri birbirine
  // muhtaç değilken. loading.tsx tüm sayfayı TEK bir iskelet arkasında
  // tutuyor (bkz. DashboardIskeleti) — o yüzden toplam bekleme, tüm
  // sorguların TOPLAMI kadar sürüyordu. Aşağıda birbirinden bağımsız
  // sorgular tek Promise.all'da paralel çalışıyor — toplam süre artık
  // en YAVAŞ sorgu kadar (toplamı değil).
  const haftaBitis = tarihEkle(haftaBaslangic, 6);
  const konuSecimiGerekli = aktifBolum === "gorevler" || aktifBolum === "planlar" || aktifBolum === "veri-girisi";
  const gorevListesiGerekli = aktifBolum === "ozet" || aktifBolum === "gorevler" || aktifBolum === "planlar";
  const [
    { data: student },
    analiz,
    { data: tamamlananKonularHam },
    zayifKonular,
    gerekYokSeti,
    { data: gorevAtamalariHam },
  ] = await Promise.all([
    supabase.from("students").select("school_id, okul_no, ayt_alan, hedef_bolum, schools(ad, tur), classes(seviye, sube)").eq("id", userId).single(),
    (aktifBolum === "ozet" || aktifBolum === "analiz")
      ? analizVerisiGetir(supabase, userId, donem)
      : Promise.resolve(null),
    // Konu tamamlama sayacı (§1, yenilikler_1.txt): payda = müfredattaki
    // ders başına konu sayısı (MUFREDAT_KONULARI), pay = öğrencinin
    // "hakimim" (hedefe_yakinlik='yakin') işaretlediği FARKLI konu sayısı
    // — aynı konuyu birden fazla kez çalışmış olsa bile bir kez sayılır.
    konuSecimiGerekli
      ? supabase.from("konu_calismalar").select("ders, konu").eq("student_id", userId).eq("hedefe_yakinlik", "yakin")
      : Promise.resolve({ data: [] }),
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
    gorevListesiGerekli
      ? supabase.from("gorev_atamalari")
        .select("id, durum, programa_eklendi_mi, ogrenci_tarih, ogrenci_baslangic_saat, ogrenci_bitis_saat, gorevler!inner(tur, ders, konu, hedef_soru_sayisi, hedef_dakika, tarih, son_tarih, baslangic_saat, bitis_saat, aciklama, olusturan_ogrenci_id)")
        .eq("student_id", userId)
        .gte("gorevler.tarih", haftaBaslangic)
        .lte("gorevler.tarih", haftaBitis)
      : Promise.resolve({ data: [] }),
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

  const kurumKonulari = konuSecimiGerekli ? await kurumAltKonulariGetir(supabase, s.school_id) : [];

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
  // konu seçimi gereken bölümlerde ve sadece ilgili sınıf seviyesinde
  // gerekiyor. Öğrencinin sınıf seviyesi yukarıdaki Promise.all'daki
  // `student` sorgusunun sonucuna muhtaç olduğu için BİLEREK ayrı/sıralı
  // kalıyor — ama küçük ve dar kapsamlı bir sorgu, toplam süreye
  // önceki haliyle kıyasla ihmal edilebilir bir katkısı var.
  let mufredatAltKonulari: { ders: string; ustKonu: string; altBaslik: string }[] = [];
  if (konuSecimiGerekli && ["9", "10", "11", "12"].includes(s.classes?.seviye ?? "")) {
    const { data: altKonularHam } = await supabase.from("mufredat_alt_konular").select("ders, ust_konu, alt_baslik").order("sira");
    mufredatAltKonulari = ((altKonularHam as { ders: string; ust_konu: string; alt_baslik: string }[]) ?? [])
      .map((r) => ({ ders: r.ders, ustKonu: r.ust_konu, altBaslik: r.alt_baslik }))
      .concat(kurumHiyerarsiKonulari(kurumKonulari));
  }

  const anaKonular = MUFREDAT_KONULARI.filter((k) => konuOgrenciyeUygunMu(k, s.classes?.seviye ?? null, s.ayt_alan))
    .map((k) => ({ ...k, seviye: konuSeviyesi(k.seviye) }));
  const anaKonuMap = new Map(MUFREDAT_KONULARI.map((k) => [`${k.ders}|${k.konu}`, k]));
  const konuOnerileri: { ders: string; konu: string; seviye: string; ustKonu?: string }[] = [...anaKonular];
  const gorulenKonular = new Set(konuOnerileri.map((k) => `${k.ders}|${k.konu}`));
  for (const alt of mufredatAltKonulari) {
    const ust = anaKonuMap.get(`${alt.ders}|${alt.ustKonu}`);
    if (!ust || !konuOgrenciyeUygunMu(ust, s.classes?.seviye ?? null, s.ayt_alan)) continue;
    const anahtar = `${alt.ders}|${alt.altBaslik}`;
    if (gorulenKonular.has(anahtar)) continue;
    konuOnerileri.push({ ders: alt.ders, konu: alt.altBaslik, seviye: konuSeviyesi(ust.seviye), ustKonu: alt.ustKonu });
    gorulenKonular.add(anahtar);
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
            <OzetIstatistikKarti Icon={CalendarCheck2} etiket="Konu çalışma" deger={`${analiz!.buHaftaKonuDakika} dk`} aciklama="Bu hafta" />
            <OzetIstatistikKarti Icon={ListChecks} etiket="Çözülen soru" deger={String(analiz!.buHaftaSoru)} aciklama="Bu hafta" />
            <OzetIstatistikKarti Icon={Target} etiket="Son deneme neti" deger={analiz!.sonDenemeNet === null ? "—" : String(analiz!.sonDenemeNet)} aciklama="En güncel sonuç" />
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
        <AnalizSekmeleri
          denemeVarMi={denemeKarneleri.length > 0 || !!denemeKonu}
          gelisim={<AnalizPaneli veri={analiz!} ogrenciAdi={ad} konuHakimiyetiSatirlari={konuHakimiyetiSatirlari} konuHakimiyetiTamGorunum={konuHakimiyetiTamGorunum} konuHakimiyetiAytAlan={s.ayt_alan} hedefDuzenlenebilir />}
          denemeler={<>
            {denemeKarneleri.length > 0 && <DenemeKarnesi karneler={denemeKarneleri} />}
            {denemeKonu && <DenemeKonuAnalizi ozet={denemeKonu.ozet} kapsam="ogrenci" hata={denemeKonu.error} denemeKaydiSayisi={analiz!.donem === "tum" && analiz!.denemeKapsami === "yks" ? analiz!.denemeTrend.length : undefined} />}
          </>}
        />
      </div>}
    </div>
  );
}

async function OgretmenIcerik({ userId, role, kurumTuru, brans, secilenSinifId, secilenOgrenciId, secilenOgretmenId, donem, aktifBolum, seciliDersId, seciliBolum, kademe, yurtlu = false, grupMu = false, secilenAy, secilenKapsam, duyuruTuru, duyuruAlani, idare = null }: {
  // İdare panelindeki müdür yardımcısı (migration 0163): kapsamı rehberinki
  // gibi sınıf düzeyleriyle sınırlı; aşağıda rehber kapsam akışına bağlanır.
  idare?: MudurYardimcisiUyeligi | null;
  userId: string; role: "ogretmen" | "mudur"; kurumTuru?: KurumTuru; brans?: string; secilenSinifId?: string; secilenOgrenciId?: string; secilenOgretmenId?: string; donem: RaporDonemi; aktifBolum: DashboardBolumu;
  // İlkokul Gelişim Raporu'nun ayı (?ay=2026-10).
  secilenAy?: string;
  // Konu Durumu'nun seçili kapsamı (?kapsam=).
  secilenKapsam?: string;
  // Duyurular'da WhatsApp sekmesi (?tur=whatsapp) ve Genel/Yurt bölümü (?alan=yurt).
  duyuruTuru?: string;
  duyuruAlani?: string;
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
  // rehber_sinif_duzeyleri ARTIK OKUNMUYOR — tek kaynak rehberlik_servisi
  // (migration 0144, teachers'taki kolon terk edildi).
  const [{ data: teacher }, gercekRehberlikUyeligi] = await Promise.all([
    supabase.from("teachers").select("school_id, class_id").eq("id", userId).single(),
    idare ? Promise.resolve(null) : rehberlikUyeligiGetir(supabase, userId),
  ]);
  // Müdür yardımcısı, kapsam bakımından rehberle aynı yolu kullanır: sorumlu
  // sınıf düzeyleri; veri service-role ile, kapsam filtresiyle okunur.
  const rehberlikUyeligi = idare
    ? { schoolId: idare.schoolId, sinifDuzeyleri: idare.sinifDuzeyleri, unvan: IDARE_UNVANI }
    : gercekRehberlikUyeligi;

  if (!teacher) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">Öğretmen profili bulunamadı.</p>
      </div>
    );
  }

  // Kurum dışı belletmen (Faz 4, migration 0165): yalnız Yoklama (yurt
  // listesi kartları; WhatsApp'ta paylaş ya da müdür yardımcısına gönder)
  // ve Nöbetlerim (yurt nöbetleri + takas). Menü de yalnız bu ikisini içerir.
  if (role === "ogretmen" && belletmenMi(brans)) {
    const admin = createAdminClient();
    if (aktifBolum === "nobetlerim") {
      const [nobetler, { data: adaylar }] = await Promise.all([
        yurtNobetGorevleriGetir(supabase, userId, bugununTarihiTR()),
        admin.from("teachers").select("id, brans, profiles!teachers_id_fkey(ad, role, aktif)").eq("school_id", teacher.school_id).neq("id", userId),
      ]);
      type Aday = { id: string; brans: string | null; profiles: { ad: string | null; role: string | null; aktif: boolean | null } | null };
      const devirOgretmenleri = ((adaylar ?? []) as unknown as Aday[])
        .filter((o) => o.profiles?.role === "ogretmen" && o.profiles.aktif === true)
        .map((o) => ({ id: o.id, ad: o.profiles?.ad ?? "İsimsiz", brans: o.brans ?? "" }))
        .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
      return (
        <section className="sfec-section">
          <YurtNobetlerimKutusu yurtNobetleri={nobetler.filter((n) => n.tarih >= bugununTarihiTR())} ogretmenler={devirOgretmenleri} />
        </section>
      );
    }
    if (!yurtlu) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Kurumunuzda yurt tanımlı değil; yoklama listesi kullanılmaz.</p>
        </div>
      );
    }
    const [{ data: kurumSatiri }, yurtVerisi, { ayarlar }] = await Promise.all([
      admin.from("schools").select("ad, logo_url").eq("id", teacher.school_id).maybeSingle(),
      yurtVerisiGetir(admin, teacher.school_id, userId, false),
      sablonAyarlariGetir(admin),
    ]);
    const kurumBilgisi = kurumSatiri as { ad: string; logo_url?: string | null } | null;
    return (
      <section className="sfec-section">
        <WhatsappDuyuruStudyosu kurumAdi={kurumBilgisi?.ad ?? "Kurumumuz"} logoAdresi={kurumBilgisi?.logo_url ?? null}
          logoDegistirebilir={false} ogrenciler={[]} genelDuyurular={false} yurt={yurtVerisi} sablonlar={etkinSablonlar(ayarlar)} />
      </section>
    );
  }

  // İlkokul Gelişim Raporu (16.10.2026, migration 0157). Kişinin erişebildiği
  // ilkokul sınıfları ve her birinde hangi kalemleri yazabildiği sunucuda
  // çözülür; veri service-role ile, yetki kontrolünden sonra okunur.
  // 5-8. sınıflar (27.10.2026, migration 0182) aynı bölümde: o sınıf seçilince
  // MEB ortak yazılı senaryolarındaki öğrenme çıktılarının değerlendirmesi açılır.
  if (aktifBolum === "ilkokul-gelisim") {
    const yonetici = createAdminClient();
    const [siniflar, ortaSiniflar] = await Promise.all([
      ilkokulSiniflariGetir(yonetici, userId),
      ortaokulCiktiSiniflariGetir(yonetici, userId),
    ]);
    if (siniflar.length === 0 && ortaSiniflar.length === 0) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">
            Gelişim raporu 1-8. sınıflar içindir. Öğretmeni olduğunuz ya da rehberlik kapsamınızda olan bir sınıf yok.
          </p>
        </div>
      );
    }
    const sinifSecenekleri = [...siniflar, ...ortaSiniflar].sort(sinifSiraKarsilastir)
      .map((s) => ({ id: s.id, ad: `${s.seviye}-${s.sube}`, seviye: s.seviye }));
    const ortaSecili = ortaSiniflar.find((s) => s.id === secilenSinifId)
      ?? (siniflar.length === 0 ? ortaSiniflar[0] : null);
    if (ortaSecili) {
      const dersler = sinifCiktiDersleri(ortaSecili.seviye)
        .map((d) => ({ anahtar: d, ad: ciktiDersAdi(d), yazabilir: ortaSecili.yazabilecegiDersler.includes(d) }));
      const ders = ciktiDersiMi(seciliDersId) && dersler.some((d) => d.anahtar === seciliDersId)
        ? seciliDersId : (ortaSecili.yazabilecegiDersler[0] ?? dersler[0].anahtar);
      const rapor = await ortaokulCiktiRaporuGetir(yonetici, ortaSecili.id, ders);
      return (
        <OrtaokulCiktiGirisi key={`${ortaSecili.id}-${ders}`} siniflar={sinifSecenekleri} seciliSinifId={ortaSecili.id}
          dersler={dersler} seciliDers={ders} ciktilar={senaryoCiktilariGetir(ders, ortaSecili.seviye)}
          ogrenciler={rapor.ogrenciler} kayitlar={rapor.kayitlar}
          donemEtiketi={`${SENARYO_DONEMI.egitimYili} Eğitim Öğretim Yılı ${SENARYO_DONEMI.donem}. Dönem`} kaynak={SENARYO_KAYNAGI} />
      );
    }
    const secili = siniflar.find((s) => s.id === secilenSinifId) ?? siniflar[0];
    const ay = ayAnahtari(secilenAy ?? "") ?? ayAnahtari(bugununTarihiTR())!;
    // Sosyal duygusal beceriler (MEB, dönemlik; migration 0167).
    if (seciliBolum === "sosyal") {
      const donem = donemBilgisi(ay);
      const rapor = await ilkokulSinifRaporuGetir(yonetici, secili.id, ay);
      const sdo = await ilkokulSinifSdoGetir(yonetici, rapor.ogrenciler.map((o) => o.id), donem);
      return (
        <div className="flex flex-col gap-4">
          <IlkokulGelisimSekmeleri sinifId={secili.id} ay={ay} secili="sosyal" />
          <IlkokulSosyalDuygusalGirisi key={`${secili.id}-${donem.egitimYili}-${donem.donem}`}
            siniflar={sinifSecenekleri} seciliSinifId={secili.id} donem={donem} yetkiler={secili.yetkiler}
            ogrenciler={rapor.ogrenciler} kayitlar={sdo.kayitlar} gorusler={sdo.gorusler} hazir={sdo.hazir} />
        </div>
      );
    }
    const [rapor, etkinlikler] = await Promise.all([
      ilkokulSinifRaporuGetir(yonetici, secili.id, ay),
      ilkokulSinifEtkinlikleriGetir(yonetici, secili.id, ay),
    ]);
    return (
      <div className="flex flex-col gap-4">
        <IlkokulGelisimSekmeleri sinifId={secili.id} ay={ay} secili="aylik" />
        <IlkokulGelisimGirisi key={`${secili.id}-${ay}`}
          siniflar={sinifSecenekleri}
          seciliSinifId={secili.id} ay={ay} yetkiler={secili.yetkiler}
          ogrenciler={rapor.ogrenciler} kayitlar={rapor.kayitlar} oncekiAyKayitlari={rapor.oncekiAyKayitlari} notlar={rapor.notlar} />
        <IlkokulEtkinlikleri key={`etkinlik-${secili.id}-${ay}`} classId={secili.id} ay={ay} bugun={bugununTarihiTR()}
          ogrenciler={rapor.ogrenciler} etkinlikler={etkinlikler}
          duzenleyebilir={secili.yetkiler.includes("sinif_ogretmeni") || secili.yetkiler.includes("yonetim")} />
      </div>
    );
  }

  // İlkokul sınıf öğretmeninin "Sınıfım" panosu (kullanıcı kararı 18.10.2026):
  // tek sınıfının bu ayki gelişim raporu, etkinlikleri, veli bağlantısı ve
  // öğrenci listesi. Öğrenci seçilince aşağıdaki öğrenci sayfası açılır.
  if (aktifBolum === "ozet" && role === "ogretmen" && kademe === "ortaokul" && brans === SINIF_OGRETMENI_BRANSI && !secilenOgrenciId) {
    if (!teacher.class_id) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Size henüz bir sınıf atanmamış. Kurum yöneticiniz sınıfınızı atadığında panonuz burada açılır.</p>
        </div>
      );
    }
    const yonetici = createAdminClient();
    const { data: sinif } = await yonetici.from("classes").select("id, seviye, sube").eq("id", teacher.class_id).maybeSingle();
    if (sinif && ilkokulMu(sinif.seviye)) {
      const bugun = bugununTarihiTR();
      const ay = ayAnahtari(bugun)!;
      const [rapor, etkinlikler] = await Promise.all([
        ilkokulSinifRaporuGetir(yonetici, sinif.id, ay),
        ilkokulSinifEtkinlikleriGetir(yonetici, sinif.id, ay),
      ]);
      const idler = rapor.ogrenciler.map((o) => o.id);
      const [{ data: veliBaglari }, { count: bekleyenVeliTalebi }] = await Promise.all([
        idler.length > 0 ? yonetici.from("parent_students").select("student_id").in("student_id", idler) : Promise.resolve({ data: [] }),
        idler.length > 0
          ? yonetici.from("veli_link_requests").select("id", { count: "exact", head: true }).in("student_id", idler).eq("durum", "bekliyor")
          : Promise.resolve({ count: 0 }),
      ]);
      const ozet = sinifimOzeti({
        rapor, etkinlikler, bugun, seviye: sinif.seviye,
        veliBagliIdler: new Set(((veliBaglari ?? []) as { student_id: string }[]).map((v) => v.student_id)),
      });
      return (
        <IlkokulSinifimPanosu sinifId={sinif.id} sinifAdi={`${sinif.seviye}-${sinif.sube}`} ayEtiketi={ayEtiketi(ay)}
          ozet={ozet} bekleyenVeliTalebi={bekleyenVeliTalebi ?? 0} />
      );
    }
  }

  if (aktifBolum === "ortaokul-onaylar") {
    if (role !== "ogretmen" || (kademe !== "ortaokul" && kademe !== "ikisi")) notFound();
    const kayitlar = await ortaokulBekleyenCalismalarGetir(createAdminClient(), {
      teacherId: userId, schoolId: teacher.school_id, kendiSinifId: teacher.class_id,
    });
    return <OrtaokulCalismaOnaylari kayitlar={kayitlar} bugun={bugununTarihiTR()} />;
  }

  // Ortaokul "Konu Yeterliliği" — Maarif | LGS (migration 0132). Kararı
  // YALNIZ öğretmen verir; öğrencinin ekranında aynı bilgi salt okunur.
  // Bölüm menüde yalnız ortaokul kurumunda görünüyor; doğrudan adres yazanı
  // da menü kontrolü (yukarıda) zaten /dashboard'a yönlendiriyor.
  if (aktifBolum === "ortaokul-yeterlilik") {
    // Rehberlik Servisi üyeliği BURADA çekiliyor: bu dal, aşağıdaki
    // okulRehberi/rehberSeviyeleri tanımlarından ÖNCE çalışıyor ve o zinciri
    // yeniden sıralamak ortak akışı riske atardı.
    const yeterlilikUyeligi = role === "ogretmen" ? await rehberlikUyeligiGetir(supabase, userId) : null;
    return (
      <OrtaokulYeterlilikIcerik
        supabase={supabase}
        schoolId={teacher.school_id}
        seciliOgrenciId={secilenOgrenciId}
        seciliDersId={seciliDersId}
        seciliBolum={seciliBolum}
        seciliSinifId={secilenSinifId}
        teacherId={userId}
        kendiSinifId={teacher.class_id}
        tumOgrencileriGorur={role === "mudur" || yeterlilikUyeligi !== null}
        rehberSeviyeleri={yeterlilikUyeligi?.sinifDuzeyleri ?? null}
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

  // Okul rehberi = Rehberlik Servisi üyesi (0144). Dershane rehberi ve grup
  // koçu kimliğini hâlâ branştan alıyor; rehberlikBirimiMi ikisini kapsar.
  const okulRehberi = rehberlikUyeligi !== null;
  const rehberOgretmenMi = role === "ogretmen" && rehberlikBirimiMi(brans, okulRehberi);
  // Kapsam sınırı artık okulun KADEMESİNE değil servis üyeliğine bağlı —
  // böylece ortaokul rehberi de aynı sınırla çalışır (0143'te yalnız lise
  // kapsamdaydı). Boş dizi = atama yapılmamış = hiçbir öğrenciyi görmez.
  const rehberSeviyeleri = rehberlikUyeligi?.sinifDuzeyleri ?? [];
  const okulOkumaClient = rehberOgretmenMi ? createAdminClient() : supabase;

  // Dershane rehberlik servisi (kullanıcı isteği 13.09.2026): öğrenci adına
  // ödev, veri girişi ve program. Yetki sunucu işlemlerinde ayrıca doğrulanır
  // (bkz. rehber-ogrenci-actions.ts, lib/dershane-rehber.ts).
  // Rehber Takip Bildirimleri (20.10.2026, migration 0171). Faz 1 · Adım 1
  // (23.10.2026): açılış taraması yalnız son tarama TARAMA_TAZELIK_SAAT'ten
  // eskiyse çalışır (günlük cron zaten tarıyor); zaman 0172'de tutulur.
  if (aktifBolum === "takip-bildirimleri") {
    const admin = createAdminClient();
    const kapsam = await takipKapsamiGetir(admin, userId);
    if (!kapsam) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Bu bölüm rehberlik servisine ve sınıf öğretmenlerine açıktır (sınıfı olmayan branş öğretmeni ve ilkokul sınıf öğretmeni görmez).</p>
        </div>
      );
    }
    const duzeySiz = !!kapsam.seviyeler && kapsam.seviyeler.length === 0;
    let sonTarama = duzeySiz ? null : await takipSonTaramaGetir(admin, kapsam);
    let taramaHatasi = false;
    if (!duzeySiz && taramaGerekliMi(sonTarama)) {
      // Tarama hatası listeyi engellemesin; ekranda uyarı olarak gösterilir.
      try { await takipBildirimleriniUret(admin, kapsam); sonTarama = new Date().toISOString(); } catch { taramaHatasi = true; }
    }
    const { bildirimler, hazir } = await takipBildirimleriniGetir(admin, kapsam);
    return <RehberTakipBildirimleri bildirimler={bildirimler} hazir={hazir} ogrenciBaglantisi={kapsam.ogrenciBaglantisi}
      duzeySiz={duzeySiz} sonTarama={sonTarama} taramaHatasi={taramaHatasi} sinifOgretmeni={!!kapsam.sinifId} />;
  }

  if (aktifBolum === "ogrenci-takibi") {
    if (!rehberOgretmenMi || kurumTuru !== "dershane") {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Bu bölüm yalnızca dershane rehber öğretmenine açıktır.</p>
        </div>
      );
    }
    const { ogrenciler, secilen } = await rehberOgrenciTakibiVerisiGetir(teacher.school_id, secilenOgrenciId);
    const konuOnerileri: { ders: string; konu: string; seviye: string; ustKonu?: string }[] = secilen
      ? MUFREDAT_KONULARI.filter((k) => konuOgrenciyeUygunMu(k, secilen.sinifSeviyesi, secilen.aytAlan))
        .map((k) => ({ ...k, seviye: konuSeviyesi(k.seviye) }))
      : [];
    if (secilen) {
      const anaKonular = new Map(MUFREDAT_KONULARI.map((k) => [`${k.ders}|${k.konu}`, k]));
      const gorulen = new Set(konuOnerileri.map((k) => `${k.ders}|${k.konu}`));
      for (const alt of secilen.mufredatAltKonulari) {
        const ust = anaKonular.get(`${alt.ders}|${alt.ustKonu}`);
        if (!ust || !konuOgrenciyeUygunMu(ust, secilen.sinifSeviyesi, secilen.aytAlan)) continue;
        const anahtar = `${alt.ders}|${alt.altBaslik}`;
        if (gorulen.has(anahtar)) continue;
        konuOnerileri.push({ ders: alt.ders, konu: alt.altBaslik, seviye: konuSeviyesi(ust.seviye), ustKonu: alt.ustKonu });
        gorulen.add(anahtar);
      }
    }
    return <RehberOgrenciTakibi ogrenciler={ogrenciler} secilen={secilen} konuOnerileri={konuOnerileri} grupMu={grupMu} />;
  }

  // Rehber Öğretmen okulda yalnız atandığı sınıf düzeylerinin
  // öğrencilerine (sınıf öğretmenliği/branş dersi sınırı olmadan) mesaj
  // gönderebiliyor, tek tek veya toplu (bkz. RehberlikPaneli.tsx,
  // rehberMesajGonder). Menüde bu bölüm zaten sadece rehber branşına
  // gösteriliyor (bkz. dashboard-navigation.ts) — burada da savunma
  // amaçlı aynı kontrol tekrarlanıyor (doğrudan URL ile erişim denenirse).
  // Rehber Radarı Adım 2 — sorumlu olunan TÜM düzeyler tek tabloda.
  // Yalnız Rehberlik Servisi üyesine: liste rehberSeviyeleri'ne dayanıyor.
  // Menüde de yalnız ona gösteriliyor (dashboard-navigation.ts), burada
  // doğrudan URL denemesine karşı savunma amaçlı tekrar kontrol ediliyor.
  if (aktifBolum === "kapsamim") {
    if (!okulRehberi) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Bu bölüm sadece Rehberlik Servisi üyelerine açıktır.</p>
        </div>
      );
    }
    const kapsamAdmin = createAdminClient();
    const [satirlar, kayitsizlar] = await Promise.all([
      rehberKapsamListesiGetir(kapsamAdmin, teacher.school_id, rehberSeviyeleri),
      kayitsizOgrenciOzetleriGetir(kapsamAdmin, teacher.school_id, rehberSeviyeleri),
    ]);
    return <RehberKapsamListesi satirlar={satirlar} seviyeler={rehberSeviyeleri} kayitsizlar={kayitsizlar} />;
  }

  // Program desteği (migration 0146) — rehber, kapsamındaki öğrenciyle
  // Oto Program sihirbazını birlikte geçer. Yetki her işlemde SUNUCUDA
  // yeniden doğrulanıyor (programAktoru), buradaki kontrol ek katman.
  if (aktifBolum === "program-destegi") {
    if (!okulRehberi) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Bu bölüm sadece Rehberlik Servisi üyelerine açıktır.</p>
        </div>
      );
    }
    const [{ programlar }, kapsamSatirlari] = await Promise.all([
      rehberProgramAkibetleri(),
      rehberKapsamListesiGetir(createAdminClient(), teacher.school_id, rehberSeviyeleri),
    ]);
    // Oto Program ORTAOKULDA YOK (bkz. oto-program-veri.ts engeli): ders
    // listesi TYT/AYT taksonomisinden geliyor ve ortaokulun kendi "Planım"
    // ekranı var. Rehberin kapsamı 0144 ile 5-12'ye genişlediği için
    // 5-8. sınıf öğrencileri listeden ÇIKARILIYOR — sunucu zaten reddediyor
    // ama rehbere çalışmayacak bir seçenek göstermemek daha doğru.
    const programYapilabilirler = kapsamSatirlari.filter((s) => kademeBul(s.seviye) !== "ortaokul");
    return (
      <RehberProgramDestegi
        ogrenciler={programYapilabilirler.map((s) => ({ id: s.ogrenciId, ad: s.ad, sinifAdi: s.sinifAdi }))}
        akibetler={programlar}
        ilkHafta={haftaninPazartesisi(bugununTarihiTR())}
        seviyeler={rehberSeviyeleri}
      />
    );
  }

  if (aktifBolum === "rehberlik") {
    if (!rehberOgretmenMi) {
      return (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p style={{ color: TEXT_MUTED }} className="text-sm">Bu bölüm sadece Rehberlik Servisi üyelerine açıktır.</p>
        </div>
      );
    }
    const { data: ogrenciler } = okulRehberi && rehberSeviyeleri.length === 0
      ? { data: [] }
      : okulRehberi
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

  // WhatsApp duyuru stüdyosu (kullanıcı isteği 18.10.2026) — müdür ve
  // rehber; Duyurular'ın ikinci sekmesi (?tur=whatsapp, bkz.
  // DuyuruTuruSekmeleri). Dershane müdürü de buraya düşer: bu dal
  // DershaneMudurPaneli'nden önce. Yetkisi olmayan site içi sekmeye düşer.
  // Okul rehberi yalnız atandığı düzeylerin öğrencilerini görür.
  // Yurtlu kurumda her öğretmen yurt listesi kartlarını da hazırlar
  // (kullanıcı isteği 18.10.2026, bkz. YurtListeStudyosu).
  // Yurt sorumlusu müdür yardımcısı: yurt öğrencilerinin gözlemcisi
  // (kullanıcı kararı 18.10.2026); kız/erkek iki grubu da görür.
  if (aktifBolum === "belletmen-basvurulari") {
    if (!idare?.yurt) redirect("/dashboard");
    return <BelletmenBasvurulari />;
  }
  if (aktifBolum === "yurt-nobet-listesi") {
    if (!idare?.yurt || !yurtlu) redirect("/dashboard");
    return <YurtNobetPdfPaneli />;
  }
  if (aktifBolum === "yurt-takas-talepleri") {
    if (!idare?.yurt || !yurtlu) redirect("/dashboard");
    return <YurtTakasTalepleri />;
  }
  if (aktifBolum === "yurt-ogrencileri") {
    if (!idare?.yurt) redirect("/dashboard");
    return <YurtOgrencileriListesi ogrenciler={await yurtDurumlariGetir(createAdminClient(), teacher.school_id)} />;
  }

  // Yalnız yurt sorumlusu müdür yardımcısı yalnız yurt kartlarını hazırlar.
  // Duyurular düzeni (19.10.2026): Site İçi / WhatsApp, altında Genel / Yurt.
  const idareYurt = idare?.yurt ? (idare.sinifDuzeyleri.length === 0 ? "yalniz" as const : "ek" as const) : undefined;
  const duyuruBolumleri = duyuruSecenekleri({ mudur: role === "mudur", rehber: rehberOgretmenMi, sinifOgretmeni: !!teacher.class_id, yurtlu, idareYurt });
  const etkinDuyuruTuru = seciliDuyuruTuru(duyuruBolumleri, duyuruTuru);
  if (aktifBolum === "duyurular" && etkinDuyuruTuru === "whatsapp") {
    const alan = seciliDuyuruAlani(duyuruBolumleri.whatsapp, duyuruAlani) ?? "genel";
    const genelWhatsapp = alan === "genel";
    const admin = createAdminClient();
    const [yurtVerisi, { ayarlar: sablonAyarlari }] = await Promise.all([
      alan === "yurt" ? yurtVerisiGetir(admin, teacher.school_id, userId, role === "mudur" || !!idare?.yurt) : Promise.resolve(null),
      sablonAyarlariGetir(admin),
    ]);
    // logo_url 0159, ozel 0166 ile geldi; sütun yoksa bir öncekine düşülür.
    type DuyuruKurumu = { ad: string; logo_url?: string | null; ozel?: boolean | null };
    const kurumOku = async (): Promise<DuyuruKurumu | null> => {
      for (const sutunlar of ["ad, logo_url, ozel", "ad, logo_url", "ad"]) {
        const r = await admin.from("schools").select(sutunlar).eq("id", teacher.school_id).maybeSingle();
        if (!r.error) return r.data as unknown as DuyuruKurumu | null;
      }
      return null;
    };
    const kurum = await kurumOku();
    const kurumSablonlari = kurumaUygunSablonlar(etkinSablonlar(sablonAyarlari), ucretliKurumMu({ tur: kurumTuru ?? "okul", ozel: kurum?.ozel }));
    // Öğretmen yalnız Genel Duyuru kartını görür (yurt kartları ayrı bölümde).
    const yalnizGenelKart = yalnizGenelKartMi({ mudur: role === "mudur", rehber: rehberOgretmenMi });
    const sablonlar = genelWhatsapp && yalnizGenelKart
      ? Object.fromEntries(Object.entries(kurumSablonlari).map(([a, s]) => [a, a === "genel" ? s : { ...s, gizli: true }]))
      : kurumSablonlari;
    const { data: ogrenciler } = !genelWhatsapp || yalnizGenelKart || (okulRehberi && rehberSeviyeleri.length === 0)
      ? { data: [] }
      : okulRehberi
      ? await admin.from("students")
          .select("id, profiles!students_id_fkey(ad), classes!inner(seviye, sube)")
          .eq("school_id", teacher.school_id).in("classes.seviye", rehberSeviyeleri)
      : await admin.from("students")
          .select("id, profiles!students_id_fkey(ad), classes(seviye, sube)")
          .eq("school_id", teacher.school_id);
    type DuyuruOgrenciRow = { id: string; profiles: { ad: string } | null; classes: { seviye: string; sube: string } | null };
    const ogrenciListesi = ((ogrenciler as unknown as DuyuruOgrenciRow[]) ?? [])
      .map((o) => ({
        id: o.id, ad: o.profiles?.ad ?? "İsimsiz",
        sinif: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
        seviye: o.classes?.seviye ?? null, sube: o.classes?.sube ?? null,
      }))
      .sort((a, b) => (a.seviye && b.seviye && a.sube && b.sube
        ? sinifSiraKarsilastir({ seviye: a.seviye, sube: a.sube }, { seviye: b.seviye, sube: b.sube })
        : (a.seviye ? -1 : b.seviye ? 1 : 0)) || a.ad.localeCompare(b.ad, "tr"));
    return (
      <section className="sfec-section">
        <DuyuruTuruSekmeleri tur="whatsapp" alan={alan} secenekler={duyuruBolumleri} />
        <WhatsappDuyuruStudyosu key={alan} kurumAdi={kurum?.ad ?? "Kurumumuz"} logoAdresi={kurum?.logo_url ?? null}
          logoDegistirebilir={role === "mudur"} ogrenciler={ogrenciListesi} genelDuyurular={genelWhatsapp} yurt={yurtVerisi} sablonlar={sablonlar}
          hedefSecimi={!yalnizGenelKart} />
      </section>
    );
  }


  // Ana Sayfa / kurum performansı (2026-08-25 kullanıcı isteği: "dershane
  // müdürünün ana sayfası okul müdürlerinde de olsun") — dershaneAnaSayfaVerisiGetir
  // kurum türünden bağımsız (sadece school_id alıyor), olduğu gibi
  // yeniden kullanıldı. Sadece okul müdürü (dershane müdürü zaten kendi
  // ayrı panelinde, "ozet" bölümünde, aynı bileşeni kullanıyor).
  if (aktifBolum === "kurum-performansi" && (role === "mudur" || rehberOgretmenMi) && (kurumTuru !== "dershane" || idare)) {
    // Ortaokul kurumunda lise net/deneme grafikleri boş ve yanlış çerçeve
    // olurdu: ortaokulun kendi özeti (çalışma, görev, yeterlilik, yardım).
    // Yetki yukarıdaki rol koşuluyla verildi, okul kapsamı school_id ile
    // sınırlı; ortaokul tabloları için servis istemcisi (Sınıf Analizi gibi).
    if (kademe === "ortaokul") {
      const ortaokulVeri = await ortaokulKurumOzetiGetir(createAdminClient(), teacher.school_id, okulRehberi ? rehberSeviyeleri : undefined);
      return <section className="sfec-section"><OrtaokulKurumPerformansi veri={ortaokulVeri} /></section>;
    }
    const veri = await dershaneAnaSayfaVerisiGetir(okulOkumaClient, teacher.school_id, okulRehberi ? rehberSeviyeleri : undefined);
    return <section className="sfec-section"><DershaneAnaSayfa veri={veri} /></section>;
  }

  // KONU DURUMU (kullanıcı kararı 17.10.2026) — eski Konu Haritası'nın
  // yerine. Kapsam sunucuda kurulur (konuDurumuKapsamlari):
  //  - müdür ve dershane rehberi/grup koçu: tüm okul + sınıflar
  //  - okul rehberi: atandığı seviyeler
  //  - öğretmen: sınıf öğretmeni olduğu sınıf (bütün dersler) + ders verdiği
  //    sınıflar (yalnız o ders); ikisi de yoksa kendi branş dersi tüm okulda.
  // Dershane müdürü ayrı bileşende (DershaneMudurPaneli) ele alınıyor.
  if (aktifBolum === "yapay-zeka" && !(role === "mudur" && kurumTuru === "dershane")) {
    const [{ data: kdSiniflar }, { data: kdDersAtamalari }] = await Promise.all([
      okulOkumaClient.from("classes").select("id, seviye, sube").eq("school_id", teacher.school_id),
      supabase.from("ogretmen_dersleri").select("class_id, ders").eq("teacher_id", userId),
    ]);
    const kapsamlar = konuDurumuKapsamlari({
      tur: role === "mudur" || (rehberOgretmenMi && !okulRehberi) ? "okul-geneli" : okulRehberi ? "okul-rehberi" : "ogretmen",
      siniflar: (kdSiniflar ?? []) as { id: string; seviye: string; sube: string }[],
      rehberSeviyeleri,
      sinifId: teacher.class_id,
      dersAtamalari: ((kdDersAtamalari ?? []) as { class_id: string; ders: string }[]).map((d) => ({ classId: d.class_id, ders: d.ders })),
      brans,
    });
    // Görev kısayolu (Faz 2): yalnız öğretmenin görev verebildiği sınıflar —
    // gorev_atamalari_insert_own kuralıyla aynı (sınıf öğretmenliği + ders ataması).
    const gorevSiniflari = role === "ogretmen"
      ? [...new Set([teacher.class_id, ...((kdDersAtamalari ?? []) as { class_id: string }[]).map((d) => d.class_id)].filter((id): id is string => !!id))]
      : [];
    return (
      <KonuDurumuBolumu schoolId={teacher.school_id} kapsamlar={kapsamlar} seciliAnahtar={secilenKapsam} gorevSiniflari={gorevSiniflari}
        bosMesaj={okulRehberi
          ? "Rehberlik servisinde size henüz bir sınıf seviyesi atanmamış."
          : "Bu görünüm sınıf öğretmenleri ve YKS derslerinden birine giren öğretmenler içindir; size atanmış bir sınıf ya da ders bulunamadı."} />
    );
  }

  // "Öğrenci profili görüntüle" (analiz sayfası, ?ogrenci=) hem okul hem
  // dershane müdürü için ORTAK — dershane dalına geçmeden önce ele alınır.
  if (secilenOgrenciId && aktifBolum !== "planlar") {
    const { data: ogrenci } = await okulOkumaClient
      .from("students")
      .select("id, okul_no, yurt_ogrencisi, profiles!students_id_fkey(ad), schools(ad, tur), classes(seviye, sube)")
      .eq("id", secilenOgrenciId)
      .eq("school_id", teacher.school_id)
      .single();

    type OgrenciRow = {
      id: string;
      okul_no: string | null;
      yurt_ogrencisi: boolean | null;
      profiles: { ad: string } | null;
      schools: { ad: string; tur: KurumTuru } | null;
      classes: { seviye: string; sube: string } | null;
    };
    const o = ogrenci as unknown as OgrenciRow | null;
    if (idare?.yurt && idare.sinifDuzeyleri.length === 0 && !o?.yurt_ogrencisi) redirect("/dashboard/yurt-ogrencileri");

    // Yurt sorumlusu müdür yardımcısı yurt öğrencilerini düzeyden bağımsız izler.
    if (o && (!okulRehberi || (o.classes && rehberSeviyeleri.includes(o.classes.seviye)) || (idare?.yurt && o.yurt_ogrencisi))) {
      // Yazılı analizi dürüstlük engeli: öğrenci öğretmenin okulunda doğrulanıp
      // profili gösterildiği için görüntüleme sayılır (bkz. ogretmen-takip.ts).
      if (role === "ogretmen") ogrenciProfilGoruntulemesiKaydet(userId, secilenOgrenciId);
      // İlkokul öğrencisi (16.10.2026): YKS ya da ortaokul analizi yok,
      // yalnız gelişim raporu.
      if (kademeBul(o.classes?.seviye) === "ilkokul") {
        const ilkokulRaporu = await ilkokulOgrenciRaporuGetir(okulOkumaClient, secilenOgrenciId);
        return (
          <div className="flex flex-col gap-4">
            <Link href={secilenSinifId ? `/dashboard?bolum=ozet&sinif=${secilenSinifId}` : "/dashboard"}
              className="sfec-btn inline-flex items-center gap-1 text-xs font-bold w-fit px-3 py-1.5 rounded-full"
              style={{ background: BG1_ALT, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              <ChevronLeft size={14} /> Listeye dön
            </Link>
            <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold">{o.profiles?.ad ?? "İsimsiz"}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: TEXT_MUTED }}>
              <span>Sınıf: <strong style={{ color: TEXT }}>{o.classes ? `${o.classes.seviye}-${o.classes.sube}` : "—"}</strong></span>
              <span>Öğrenci no: <strong style={{ color: TEXT }}>{o.okul_no || "—"}</strong></span>
            </div>
            <IlkokulGelisimRaporu rapor={ilkokulRaporu} />
          </div>
        );
      }
      // O4 (08.10.2026) — ORTAOKUL öğrencisine tıklayan öğretmen/müdür
      // buraya kadar YKS analizini görüyordu (analizVerisiGetir, konu
      // hâkimiyeti, kohort, deneme karnesi — hepsi TYT/AYT taksonomisi).
      // Ortaokul çocuğu için bu YANLIŞ BİLGİ. Artık ortaokul raporu
      // gösteriliyor; beş ağır YKS sorgusu da hiç çalışmıyor.
      const ortaokulOgrencisi = kademeBul(o.classes?.seviye) === "ortaokul" && await ortaokulAktifMi(supabase);
      const [analiz, konuHakimiyetiOzeti, kohort, denemeKonu, denemeKarneleri, ortaokulRaporu] = ortaokulOgrencisi
        ? [null, null, null, null, null, await ortaokulVeliRaporuGetir(okulOkumaClient, secilenOgrenciId)] as const
        : [...(await Promise.all([
            analizVerisiGetir(okulOkumaClient, secilenOgrenciId, donem),
            konuHakimiyetiOzetiGetir(okulOkumaClient, secilenOgrenciId),
            kohortKarsilastirmasiGetir(okulOkumaClient, secilenOgrenciId),
            denemeKonuAnaliziGetir(okulOkumaClient, [secilenOgrenciId], OGRENCI_DENEME_SAYISI),
            denemeKarneleriGetir(okulOkumaClient, secilenOgrenciId),
          ])), null] as const;
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
          {ortaokulRaporu ? (
            <VeliOrtaokulRaporu rapor={ortaokulRaporu} ogrenciAdi={ogrenciAdi} />
          ) : analiz && konuHakimiyetiOzeti && denemeKarneleri && denemeKonu ? (
            <>
              <AnalizPaneli veri={analiz} ogrenciAdi={ogrenciAdi}
                konuHakimiyetiSatirlari={konuHakimiyetiOzeti.satirlar} konuHakimiyetiTamGorunum={konuHakimiyetiOzeti.tamGorunum}
                konuHakimiyetiAytAlan={konuHakimiyetiOzeti.aytAlan} ogretmenGorunumu kohortKarsilastirma={kohort} />
              <DenemeKarnesi karneler={denemeKarneleri} />
              <DenemeKonuAnalizi ozet={denemeKonu.ozet} kapsam="ogrenci" hata={denemeKonu.error} denemeKaydiSayisi={analiz.donem === "tum" && analiz.denemeKapsami === "yks" ? analiz.denemeTrend.length : undefined} />
            </>
          ) : null}
        </div>
      );
    }
  }

  // DERSHANE MODU (Faz D3): dershane müdürü tamamen ayrı bir panel görüyor
  // — bkz. src/components/dashboard/DershaneMudurPaneli.tsx.
  // Sınıf Analizi dışında: o bölüm aşağıdaki ORTAK dala düşer (kapsam: müdürün
  // kendi school_id sınıfları; sinifAnaliziGetir de school_id ile sınırlı).
  if (role === "mudur" && kurumTuru === "dershane" && aktifBolum !== "sinif-analizi") {
    const { data: dershaneSiniflari } = await supabase
      .from("classes")
      .select("id, seviye, sube")
      .eq("school_id", teacher.school_id);
    return (
      <DershaneMudurPaneli
        siniflar={((dershaneSiniflari ?? []) as { id: string; seviye: string; sube: string }[]).sort(sinifSiraKarsilastir)}
        aktifBolum={aktifBolum}
        schoolId={teacher.school_id}
        secilenKapsam={secilenKapsam}
        duyuruSecenekleri={duyuruBolumleri}
        duyuruAlani={duyuruAlani}
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
  const sinifListesi = okulRehberi
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

  // SINIF ANALİZİ (kullanıcı kararı 09.10.2026) — toplu sınıf görünümü.
  //
  // Kapsam ayrıca HESAPLANMIYOR: yukarıdaki sinifListesi zaten role göre
  // doğru daraltılmış durumda — okul rehberi sorumlu olduğu düzeyleri,
  // dershane rehberi ve müdür tüm kurumu, öğretmen ise sınıf öğretmenliği
  // yaptığı VE ders verdiği sınıfları görüyor.
  //
  // Branş öğretmeni başta kapsam dışıydı (spec "sınıf öğretmeni" diyordu);
  // kullanıcı kararıyla 09.10.2026'da ders verdiği sınıflar da eklendi.
  // Bu, daha önce şikâyet edilen "her öğretmende bütün öğrenciler" durumu
  // DEĞİL: öğretmen yalnızca gerçekten girdiği sınıfları görüyor.
  if (aktifBolum === "sinif-analizi") {
    const analizSiniflari = sinifListesi;
    const analiz = await sinifAnaliziGetir(createAdminClient(), {
      schoolId: teacher.school_id,
      sinifIdleri: analizSiniflari.map((s) => s.id),
    });
    const kapsamEtiketi = role === "mudur" || rehberOgretmenMi
      ? okulRehberi ? `Sorumlu olduğunuz düzeyler: ${rehberSeviyeleri.join(", ")}` : "Tüm kurum"
      : analizSiniflari.length === 1 ? "Sınıfınız" : "Girdiğiniz sınıflar";
    return (
      <SinifAnaliziPanel
        ogrenciler={analiz.ogrenciler}
        denemeSecenekleri={analiz.denemeSecenekleri}
        kayipNesil={analiz.kayipNesil}
        siniflar={analizSiniflari}
        // Tek sınıfı olanda filtre anlamsız; birden çok sınıfa giren branş
        // öğretmeni de artık süzebiliyor.
        sinifSecilebilir={analizSiniflari.length > 1}
        kapsamEtiketi={kapsamEtiketi}
      />
    );
  }

  // Sınıflarım kartlarının özeti (öğrenci, son 7 gün veri giren, bekleyen
  // onay) — yalnız kart ekranı görünecekken çekilir (OgretmenPanel'deki
  // sinifKartlariGoster koşuluyla aynı).
  const sinifKartOzetleri = role === "ogretmen" && aktifBolum === "ozet" && !secilenSinifId && sinifListesi.length > 1
    ? await sinifKartOzetleriGetir(createAdminClient(), { sinifIdleri: sinifListesi.map((s) => s.id), ogretmenId: userId, ogretmenSinifId: teacher.class_id })
    : undefined;

  // Öğrencinin soru çözümü, o sınıf ve derse atanmış branş öğretmeni varsa
  // yalnız o öğretmenin; yoksa sınıf öğretmeninin onayına düşer. Branş
  // öğretmeni sınıf öğretmeni olmasa da kendi dersinin kayıtlarını görebilir.
  const onayAdayiSinifIdleri = [...new Set([teacher.class_id, ...kendiDersAtamalari.map((d) => d.class_id)].filter((id): id is string => !!id))];
  const onayAdmin = createAdminClient();

  const [{ data: ogrenciler }, { data: kayitsizHam }, { data: talepler }, { data: bekleyenOnaylarHam }, { data: sinifDersAtamalariHam }] = await Promise.all([
    gorunecekSinifId
      ? okulOkumaClient.from("students").select("id, okul_no, yurt_ogrencisi, profiles!students_id_fkey(ad)").eq("class_id", gorunecekSinifId)
      : Promise.resolve({ data: [] }),
    // Sisteme üye olmamış (okul listesinde hesapsız) öğrenciler — migration 0179.
    gorunecekSinifId
      ? okulOkumaClient.from("okul_ogrenci_listesi").select("id, okul_no, ad_soyad, class_id").eq("class_id", gorunecekSinifId).is("student_id", null)
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
  // İlkokul (1-4) sisteme girmediği için ön kayıtlı/hesapsız listesi gösterilmez.
  const kayitsizOgrenciListesi = gorunenSinif && ilkokulMu(gorunenSinif.seviye)
    ? []
    : ((kayitsizHam as { id: string; okul_no: string | null; ad_soyad: string; class_id: string }[] | null) ?? [])
        .map((k) => ({ id: k.id, ad: k.ad_soyad, okulNo: k.okul_no, sinifId: k.class_id }))
        .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

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
    id: string; tur: string; ders: string; konu: string | null; tarih: string; son_tarih: string; created_at: string;
    gorev_atamalari: { id: string; student_id: string; durum: "bekliyor" | "tamamlandi" | "tamamlanmadi"; students: { profiles: { ad: string } | null } | null }[];
    // Sisteme üye olmamış öğrenciler: ödev 10 gün bekler (migration 0179).
    bekleyen_gorev_atamalari: { okul_ogrenci_listesi: { ad_soyad: string } | { ad_soyad: string }[] | null }[];
  };
  const { data: verdigimGorevlerHam } = aktifBolum === "onaylar"
    ? await supabase
        .from("gorevler")
        .select("id, tur, ders, konu, tarih, son_tarih, created_at, gorev_atamalari(id, student_id, durum, students(profiles!students_id_fkey(ad))), bekleyen_gorev_atamalari(okul_ogrenci_listesi(ad_soyad))")
        .eq("olusturan_ogretmen_id", userId)
        .order("tarih", { ascending: false })
        .limit(1000)
    : { data: [] as VerdigimGorevRow[] };
  const verdigimGorevler = ((verdigimGorevlerHam as unknown as VerdigimGorevRow[]) ?? []).map((g) => ({
    id: g.id, tur: g.tur as "konu" | "soru" | "deneme", ders: g.ders, konu: g.konu, tarih: g.tarih, sonTarih: g.son_tarih,
    atamalar: (g.gorev_atamalari ?? []).map((a) => ({ id: a.id, durum: a.durum, ogrenciAd: a.students?.profiles?.ad ?? "İsimsiz" })),
    verilmeTarihi: g.created_at,
    bekleyenler: (g.bekleyen_gorev_atamalari ?? []).map((b) => (Array.isArray(b.okul_ogrenci_listesi) ? b.okul_ogrenci_listesi[0] : b.okul_ogrenci_listesi)?.ad_soyad ?? "İsimsiz"),
  }));

  // Mesaj kartı (kullanıcı isteği 18.10.2026): Ödev ver bölümünde öğretmenin
  // son ödevlerinden WhatsApp kartı. Kart tarayıcıda çizilir, saklanmaz;
  // burada yalnız son 3 haftada verilen ödevler ve sınıfları çekilir.
  type KartGorevRow = {
    id: string; tur: string; ders: string; konu: string | null; hedef_soru_sayisi: number | null; hedef_dakika: number | null;
    tarih: string; son_tarih: string; aciklama: string | null;
    gorev_atamalari: { students: { classes: { seviye: string; sube: string } | null } | null }[];
  };
  const [{ data: kartGorevleriHam }, { data: ogretmenProfili }] = aktifBolum === "gorevler" && role === "ogretmen"
    ? await Promise.all([
        supabase.from("gorevler")
          .select("id, tur, ders, konu, hedef_soru_sayisi, hedef_dakika, tarih, son_tarih, aciklama, gorev_atamalari(students(classes(seviye, sube)))")
          .eq("olusturan_ogretmen_id", userId)
          .gte("tarih", tarihEkle(bugununTarihiTR(), -21))
          .order("tarih", { ascending: false })
          .limit(20),
        supabase.from("profiles").select("ad").eq("id", userId).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const mesajKartiGorevleri = ((kartGorevleriHam as unknown as KartGorevRow[]) ?? []).map((g) => {
    const siniflar = new Map<string, { seviye: string; sube: string }>();
    for (const a of g.gorev_atamalari ?? []) {
      const c = a.students?.classes;
      if (c) siniflar.set(`${c.seviye}-${c.sube}`, c);
    }
    return {
      id: g.id, tur: g.tur as "konu" | "soru" | "deneme", ders: g.ders, konu: g.konu,
      hedefSoru: g.hedef_soru_sayisi, hedefDakika: g.hedef_dakika, tarih: g.tarih, sonTarih: g.son_tarih, aciklama: g.aciklama,
      siniflar: [...siniflar.values()].sort(sinifSiraKarsilastir).map((c) => `${c.seviye}-${c.sube}`),
    };
  });

  // Ders Programı + Yurt Nöbeti (2026-08-25 kullanıcı isteği) — sadece
  // "Derslerim" bölümünde gösterildiği için o zaman çekiliyor. Yurt Nöbeti
  // "okul için sadece" (kullanıcı kararı) — dershane'de bu path'e bir
  // öğretmen (müdür değil) de düşebildiğinden kurumTuru burada da kontrol
  // ediliyor.
  const dershaneMi = kurumTuru === "dershane";
  const ogretmenKurumKonulari = await kurumAltKonulariGetir(supabase, teacher.school_id);
  // Ortak alt başlıklar (mufredat_alt_konular, herkese açık okuma): öğretmenin
  // "Ödev ver" konu listesine de girer. Eskiden yalnız kurumun kendi alt
  // başlıkları vardı; öğrenci tarafı ortak olanları zaten gösteriyordu.
  const { data: ortakAltKonularHam } = await supabase.from("mufredat_alt_konular").select("ders, ust_konu, alt_baslik").order("sira");
  const ortakAltKonuOnerileri = ((ortakAltKonularHam ?? []) as { ders: string; ust_konu: string; alt_baslik: string }[]).flatMap((a) => {
    const ust = MUFREDAT_KONULARI.find((u) => u.ders === a.ders && u.konu === a.ust_konu);
    return ust ? [{ ders: a.ders, konu: a.alt_baslik, seviye: ust.seviye as string | null, ustKonu: a.ust_konu }] : [];
  });
  const ogretmenKonuOnerileri = (() => {
    const liste: { ders: string; konu: string; seviye: string | null; ustKonu?: string }[] = [...MUFREDAT_KONULARI, ...kurumKonuOnerileri(ogretmenKurumKonulari)];
    const gorulen = new Set(liste.map((k) => `${k.ders}|${k.konu}`));
    for (const k of ortakAltKonuOnerileri) {
      if (gorulen.has(`${k.ders}|${k.konu}`)) continue;
      gorulen.add(`${k.ders}|${k.konu}`);
      liste.push(k);
    }
    return liste;
  })();
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
      kayitsizOgrenciler={kayitsizOgrenciListesi}
      sinifAdi={sinifAdi}
      siniflar={sinifListesi}
      atanabilirSiniflar={tumSiniflar}
      sinifSecildiMi={!!secilenSinifId}
      sinifKartOzetleri={sinifKartOzetleri}
      gorunecekSinifId={gorunecekSinifId}
      kendiSinifId={teacher.class_id}
      kendiSinifiMi={kendiSinifiMi}
      ogretmenDersleri={ogretmenDersleri}
      bekleyenOnaylar={bekleyenOnaylar}
      verdigimGorevler={verdigimGorevler}
      mesajKartiGorevleri={mesajKartiGorevleri}
      ogretmenAdi={(ogretmenProfili as { ad: string } | null)?.ad ?? null}
      konuOnerileri={ortaokulKonulari ?? ogretmenKonuOnerileri}
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
      idareModu={!!idare}
      duyuruSecenekleri={duyuruBolumleri}
      duyuruAlani={duyuruAlani}
      grupMu={grupMu}
      secilenOgrenciId={secilenOgrenciId}
      secilenOgrenciProgrami={secilenOgrenciProgrami}
      secilenOgrenciAdi={secilenOgrenciAdi}
    />
  );
}

async function VeliIcerik({ userId, ad, secilenOgrenciId, donem, aktifBolum }: { userId: string; ad: string; secilenOgrenciId?: string; donem: RaporDonemi; aktifBolum: DashboardBolumu }) {
  const supabase = await createClient();


  // O1 (08.10.2026) — sınıf seviyesi EKLENDİ. VELI_MENUSU kademeden
  // habersiz olduğu için ortaokul velisi "Analiz / Rapor"da doğrudan
  // AnalizPaneli'ni, yani TYT/AYT net trendini görüyordu (analiz.ts içinde
  // "ortaokul" hiç geçmiyor, AnalizPaneli TYT/AYT çizgilerini sabit
  // kodluyor). Artık çocuğun kademesine göre ayrışıyor.
  const { data: links } = await supabase
    .from("parent_students")
    .select("students(id, okul_no, profiles!students_id_fkey(ad), classes(seviye))")
    .eq("parent_id", userId);

  type LinkRow = { students: { id: string; okul_no: string; profiles: { ad: string } | null; classes: { seviye: string } | { seviye: string }[] | null } | null };
  const cocuklar = ((links as unknown as LinkRow[]) ?? []).filter((l) => l.students);

  const seciliId = secilenOgrenciId || cocuklar[0]?.students?.id;
  const seciliCocuk = cocuklar.find((c) => c.students?.id === seciliId);
  // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür (proje notu).
  const seciliSinifKaydi = seciliCocuk?.students?.classes;
  const seciliSeviye = Array.isArray(seciliSinifKaydi) ? seciliSinifKaydi[0]?.seviye : seciliSinifKaydi?.seviye;
  // Kademe ÇOCUĞUN sınıfından türetiliyor, kurumun kademesinden DEĞİL:
  // "ikisi" okulunda velinin bir çocuğu 5-A, diğeri 11-B olabilir.
  const seciliOrtaokulMu = kademeBul(seciliSeviye) === "ortaokul" && await ortaokulAktifMi(supabase);
  // İlkokul çocuğu (16.10.2026): velinin ana sayfası doğrudan gelişim raporu.
  const seciliIlkokulMu = kademeBul(seciliSeviye) === "ilkokul";
  const ilkokulRaporu = seciliIlkokulMu && seciliCocuk?.students
    ? await ilkokulOgrenciRaporuGetir(supabase, seciliCocuk.students.id)
    : null;

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

      {ilkokulRaporu && seciliCocuk?.students && (
        <IlkokulGelisimRaporu rapor={ilkokulRaporu} ogrenciAdi={seciliCocuk.students.profiles?.ad} />
      )}

      {aktifBolum === "analiz" && seciliCocuk?.students && !seciliIlkokulMu && (
        seciliOrtaokulMu
          ? <VeliOrtaokulRaporu
              rapor={await ortaokulVeliRaporuGetir(supabase, seciliCocuk.students.id)}
              ogrenciAdi={seciliCocuk.students.profiles?.ad}
            />
          : <VeliAnalizBolumu supabase={supabase} studentId={seciliCocuk.students.id} donem={donem} ogrenciAdi={seciliCocuk.students.profiles?.ad} />
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
      <DenemeKonuAnalizi ozet={denemeKonu.ozet} kapsam="ogrenci" hata={denemeKonu.error} denemeKaydiSayisi={analiz.donem === "tum" && analiz.denemeKapsami === "yks" ? analiz.denemeTrend.length : undefined} />
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
async function OrtaokulYeterlilikIcerik({
  supabase, schoolId, seciliOgrenciId, seciliDersId, seciliBolum, seciliSinifId,
  teacherId, kendiSinifId, tumOgrencileriGorur, rehberSeviyeleri,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  schoolId: string;
  seciliOgrenciId?: string;
  seciliDersId?: string;
  seciliBolum?: string;
  teacherId: string;
  kendiSinifId: string | null;
  // Müdür ve Rehberlik Servisi üyesi daha geniş görür (kullanıcı onayı
  // 08.10.2026: "bir Matematik öğretmeninin, girmediği 8-C'nin öğrencilerine
  // tema kararı verebilmesi bana doğru gelmiyor").
  tumOgrencileriGorur: boolean;
  rehberSeviyeleri: string[] | null;
  // ?sinif= verilmişse SINIF tema haritası, verilmemişse mevcut öğrenci
  // görünümü (Faz 2, 08.10.2026). Yeni parametre eklenmedi: `sinif` zaten
  // searchParams'ta var, iki görünüm aynı ekranda onunla ayrışıyor.
  seciliSinifId?: string;
}) {
  const bolum = bolumCoz(seciliBolum);

  if (seciliSinifId) {
    const { data: sinifHam } = await supabase
      .from("classes").select("id, seviye, sube").eq("school_id", schoolId)
      .in("seviye", [...ORTAOKUL_SEVIYELERI]);
    const siniflar = ((sinifHam ?? []) as { id: string; seviye: string; sube: string }[])
      .sort(sinifSiraKarsilastir)
      .map((s) => ({ id: s.id, ad: `${s.seviye}-${s.sube}`, seviye: s.seviye }));
    const seciliSinif = siniflar.find((s) => s.id === seciliSinifId) ?? siniflar[0] ?? null;
    const haritaDersleri = await ortaokulDersTemaSecenekleri(supabase, seciliSinif?.seviye, schoolId, bolum);
    const haritaDersi = haritaDersleri.find((d) => d.id === seciliDersId) ?? haritaDersleri[0] ?? null;
    const harita = seciliSinif && haritaDersi
      ? await sinifTemaHaritasiGetir(supabase, schoolId, seciliSinif.id, haritaDersi, bolum)
      : null;
    return (
      <OrtaokulSinifHaritasi
        bolum={bolum}
        siniflar={siniflar.map(({ id, ad }) => ({ id, ad }))}
        seciliSinifId={seciliSinif?.id ?? ""}
        dersler={haritaDersleri}
        seciliDers={haritaDersi}
        harita={harita}
      />
    );
  }

  // Kurumun ORTAOKUL sınıflarındaki öğrenciler. Lise sınıfları bu ekrana
  // hiç girmiyor — yeterlilik modeli ortaokul müfredatına bağlı.
  //
  // KAPSAM (kullanıcı onayı 08.10.2026): branş öğretmeni YALNIZ girdiği
  // sınıfların öğrencilerini görür. Eskiden okulun TÜM ortaokul öğrencileri
  // her öğretmene açıktı; bir Matematik öğretmeni girmediği 8-C'nin
  // öğrencilerine tema kararı verebiliyordu. Müdür ve Rehberlik Servisi
  // üyesi daha geniş görmeye devam ediyor (rehber kendi kademeleriyle).
  const erisilebilirSiniflar = tumOgrencileriGorur
    ? null
    : await (async () => {
        const { data: atamalar } = await supabase
          .from("ogretmen_dersleri").select("class_id").eq("teacher_id", teacherId);
        return new Set([
          kendiSinifId,
          ...((atamalar ?? []) as { class_id: string | null }[]).map((a) => a.class_id),
        ].filter((id): id is string => !!id));
      })();

  const { data: ham } = await supabase
    .from("students")
    .select("id, profiles!students_id_fkey(ad), classes!inner(id, seviye, sube)")
    .eq("school_id", schoolId)
    .in("classes.seviye", rehberSeviyeleri && rehberSeviyeleri.length > 0
      ? rehberSeviyeleri.filter((s) => (ORTAOKUL_SEVIYELERI as readonly string[]).includes(s))
      : [...ORTAOKUL_SEVIYELERI]);

  type Satir = { id: string; profiles: { ad: string } | null; classes: { id: string; seviye: string; sube: string } | null };
  const ogrenciler = ((ham ?? []) as unknown as Satir[])
    .flatMap((o) => (o.profiles ? [{
      id: o.id,
      ad: o.profiles.ad,
      sinif: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
      sinifId: o.classes?.id ?? null,
    }] : []))
    .filter((o) => !erisilebilirSiniflar || (o.sinifId !== null && erisilebilirSiniflar.has(o.sinifId)))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));

  const seciliOgrenci = ogrenciler.find((o) => o.id === seciliOgrenciId) ?? ogrenciler[0] ?? null;

  // Dersler SEÇİLİ ÖĞRENCİNİN sınıf seviyesine göre (5. sınıfta 6 ders).
  const seviye = seciliOgrenci?.sinif?.split("-")[0] ?? null;
  const dersler = await ortaokulDersTemaSecenekleri(supabase, seviye, schoolId, bolum);
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
      sinifHaritasiSinifId={seciliOgrenci?.sinifId ?? null}
    />
  );
}
