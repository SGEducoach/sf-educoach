import type { KurumTuru, UserRole } from "@/lib/types";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { etkinlikBransiMi } from "@/lib/etkinlik";

export type DashboardBolumu =
  | "mesajlar"
  | "ozet"
  | "gorevler"
  | "planlar"
  | "veri-girisi"
  | "konu-hakimiyeti"
  | "analiz"
  | "yapay-zeka"
  | "tg-denemeleri"
  | "kapsamim"
  | "gorusmeler"
  | "duyurular"
  | "talepler"
  | "onaylar"
  | "dersler"
  | "kurum-performansi"
  | "ogretmenler"
  | "ogrenciler"
  | "denemeler"
  | "rehberlik"
  | "etkinlikler"
  | "duyuru-gecmisi"
  | "takvim"
  | "yarismalar"
  | "ogrenci-takibi"
  // YÖNETİCİ (admin) paneline özel — bkz. ADMIN_MENUSU
  | "kullanicilar"
  | "google-analytics"
  | "pdf-eslesme"
  // Kullanıcı isteği (29.09.2026): deneme yükleme önemli bir iş ama
  // Okullar sayfasının içinde küçük bir yerde duruyordu — kendi bölümü.
  | "deneme-yukle"
  // Ortaokul paneli (Faz 1) — lise öğrencisinin "dersler" bölümü öğretmen
  // Ajandası için kullanıldığından ayrı bir ad verildi.
  | "ortaokul-dersler"
  // Ortaokul Faz 1: ogrencinin bir ders icin yardim istedigi ekran.
  | "ortaokul-yardim"
  // Ortaokul Maarif|LGS: ogrenci calisma kaydi ve ogretmen yeterlilik karari.
  | "ortaokul-calisma"
  | "ortaokul-yeterlilik"
  | "okullar"
  // Grup Koçluk (18.09.2026) — kurum dışı koç grupları.
  | "grup-kocluk"
  | "moderatorler"
  | "icerik"
  | "blog"
  | "kurallar"
  | "profil"
  // Faz G (2026-08-25) — hata bildirimleri, admin panelinde ayrı bölüm.
  | "hata-bildirimleri"
  // Faz 3 (2026-08-26) — okul admin rolü genişletmesi.
  | "site-ayarlari"
  | "adminler"
  | "islem-gecmisi"
  // Kullanıcı isteği (26.09.2026) — öğrenci hareketleri, İşlem Geçmişi'nden ayrı.
  | "ogrenci-aktivitesi";

export type DashboardIkonu =
  | "ana-sayfa" | "gorev" | "plan" | "veri" | "hakimiyet" | "analiz" | "ai" | "takvim" | "duyuru" | "talep" | "onay" | "ders"
  | "ogretmen" | "ogrenci" | "deneme"
  | "kullanici" | "eslestir" | "okul" | "moderator" | "icerik" | "blog" | "kural" | "profil" | "hata"
  | "ayarlar" | "admin" | "gecmis" | "rehberlik" | "grup";

export interface DashboardMenuOgesi {
  bolum: DashboardBolumu;
  href: string;
  etiket: string;
  ikon: DashboardIkonu;
}

const OGRENCI_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Ana sayfa", ikon: "ana-sayfa" },
  { bolum: "gorevler", href: "/dashboard/gorevler", etiket: "Ödevlerim", ikon: "gorev" },
  { bolum: "planlar", href: "/dashboard/planlar", etiket: "Program yap", ikon: "plan" },
  { bolum: "veri-girisi", href: "/dashboard/veri-girisi", etiket: "Veri girişi", ikon: "veri" },
  { bolum: "konu-hakimiyeti", href: "/dashboard/konu-hakimiyeti", etiket: "Konu Hakimiyeti", ikon: "hakimiyet" },
  { bolum: "analiz", href: "/dashboard/analiz", etiket: "Analiz / Rapor", ikon: "analiz" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "Pano", ikon: "takvim" },
  // Kullanıcı isteği (03.09.2026): öğrenci kendi profilini görebilsin ama
  // SADECE şifresini değiştirebilsin — okul no, sınıf, ad gibi kimlik
  // bilgileri salt-okunur (bkz. OgrenciProfilim).
  { bolum: "profil", href: "/dashboard/profil", etiket: "Profilim", ikon: "profil" },
];

// Ortaokul öğrencisi menüsü (tasarım belgesi §5.1). Lise menüsünün kopyası
// DEĞİL: "Veri girişi", "Analiz / Rapor", "Pano" gibi YKS'ye özgü
// başlıklar yok; dil yaşa uygun ("Ödevlerim" yerine "Görevlerim", "Program
// yap" yerine "Planım").
const ORTAOKUL_OGRENCI_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Bugün", ikon: "ana-sayfa" },
  { bolum: "gorevler", href: "/dashboard/gorevler", etiket: "Görevlerim", ikon: "gorev" },
  { bolum: "ortaokul-dersler", href: "/dashboard/ortaokul-dersler", etiket: "Derslerim", ikon: "hakimiyet" },
  { bolum: "ortaokul-calisma", href: "/dashboard/ortaokul-calisma", etiket: "Çalışmalarım", ikon: "veri" },
  { bolum: "planlar", href: "/dashboard/planlar", etiket: "Planım", ikon: "plan" },
  { bolum: "ortaokul-yardim", href: "/dashboard/ortaokul-yardim", etiket: "Yardım İste", ikon: "talep" },
  { bolum: "profil", href: "/dashboard/profil", etiket: "Profilim", ikon: "profil" },
];

const ORTAOKUL_YETERLILIK_MENU_OGESI: DashboardMenuOgesi = {
  bolum: "ortaokul-yeterlilik", href: "/dashboard/ortaokul-yeterlilik", etiket: "Konu Yeterliliği", ikon: "hakimiyet",
};

const VELI_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Çocuklarım", ikon: "ana-sayfa" },
  { bolum: "analiz", href: "/dashboard/analiz", etiket: "Analiz / Rapor", ikon: "analiz" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "Pano", ikon: "takvim" },
];

const OGRETMEN_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Sınıflarım", ikon: "ana-sayfa" },
  { bolum: "gorevler", href: "/dashboard/gorevler", etiket: "Ödev ver", ikon: "gorev" },
  { bolum: "onaylar", href: "/dashboard/onaylar", etiket: "Bekleyen onaylar", ikon: "onay" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "talepler", href: "/dashboard/talepler", etiket: "Veli talepleri", ikon: "talep" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "Pano", ikon: "takvim" },
];

// Revizyon_2 madde 1 — Ajanda (takvim) menü ögesi yalnızca OKUL öğretmenlerine
// açık (sosyal etkinlik/yarışma bölümü okul kurumlarında faal olacağı için).
const TAKVIM_MENU_OGESI: DashboardMenuOgesi = { bolum: "takvim", href: "/dashboard/takvim", etiket: "Ajandam", ikon: "takvim" };

const MUDUR_MENUSU: DashboardMenuOgesi[] = [
  // 2026-08-25 kullanıcı isteği: "dershane müdürünün ana sayfası okul
  // müdürlerinde de olsun" — dershaneAnaSayfaVerisiGetir/DershaneAnaSayfa
  // aslında kurum türünden bağımsız (sadece school_id alıyor), okul
  // müdürü için de olduğu gibi yeniden kullanıldı (bkz. dashboard/page.tsx
  // OgretmenIcerik). Varsayılan bölüm (dashboard/page.tsx varsayilanBolum)
  // okul müdürü için de buraya çekildi — dershane müdürüyle aynı ilk
  // deneyim.
  { bolum: "kurum-performansi", href: "/dashboard/kurum-performansi", etiket: "Ana Sayfa", ikon: "ana-sayfa" },
  // Bug düzeltmesi (26.08.2026 kullanıcı bulgusu): href bare "/dashboard"
  // idi — dashboard/page.tsx'teki varsayilanBolum mantığı (satır ~105) bu
  // rol/kurum kombinasyonu için varsayılanı zaten "kurum-performansi" (Ana
  // Sayfa ile AYNI) yaptığından, bölüm parametresi olmadan "Sınıflar"a
  // tıklamak "Ana Sayfa"yı tekrar açıyor, hiçbir şey olmuyormuş gibi
  // görünüyordu. Ayrıca müdürün "Öğrenciler (salt-okunur liste/profil/
  // performans)" isteğini de bu bölüm zaten karşılıyor (OgretmenPanel'in
  // "ozet" görünümü — sınıf seç, öğrenciye tıkla, profil+performansı gör;
  // ban/sil gibi müdahale butonu yok) — bu yüzden ayrı bir ekran
  // açmak yerine etiket buna göre güncellendi.
  { bolum: "ozet", href: "/dashboard?bolum=ozet", etiket: "Öğrenciler", ikon: "ogrenci" },
  // 2026-08-25 kullanıcı isteği: "dershane ve okul müdürü öğretmenlerin
  // programlarını görsün" — okul müdürü salt-okunur (bkz. dashboard/page.tsx
  // OgretmenIcerik yorumu; dershane müdürü zaten kendi ayrı panelinde
  // düzenleyebiliyordu).
  { bolum: "ogretmenler", href: "/dashboard/ogretmenler", etiket: "Öğretmenler", ikon: "ogretmen" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "Pano", ikon: "takvim" },
];

// DERSHANE MODU (Faz D3) — dershane müdürü okul müdüründen tamamen farklı
// bir menü görüyor: gözlemci değil, kendi kurumunda öğretmen/öğrenci
// CRUD'u yapabilen bir yönetici (bkz. src/app/dashboard/actions.ts
// requireDershaneMudur). "duyurular"/"tg-denemeleri"/"yapay-zeka" mevcut,
// paylaşılan bölümler — yeniden tanımlanmadı. "ozet" (Ana Sayfa — kademe
// bazlı performans) başlangıçta yoktu, sonradan eklendi ve varsayılan
// (giriş sonrası ilk açılan) sekme yapıldı — bkz. dashboard/page.tsx
// varsayilanBolum.
const DERSHANE_MUDUR_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Ana Sayfa", ikon: "ana-sayfa" },
  { bolum: "ogretmenler", href: "/dashboard/ogretmenler", etiket: "Öğretmenler", ikon: "ogretmen" },
  { bolum: "ogrenciler", href: "/dashboard/ogrenciler", etiket: "Öğrenciler", ikon: "ogrenci" },
  { bolum: "denemeler", href: "/dashboard/denemeler", etiket: "Denemeler", ikon: "deneme" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "Pano", ikon: "takvim" },
];

// Admin (yönetici) paneli de artık diğer roller gibi tek bir sol menü +
// aktif bölüm mantığıyla çalışıyor (bkz. src/app/yonetici/page.tsx) —
// önceden tek bir sayfada üst üste dizilmiş bölümlerdi. "talepler" diğer
// rollerle aynı bölüm adını kasıtlı olarak paylaşıyor (kapsamı platform geneli).
// Rozet sistemi 19.09.2026 kullanıcı isteğiyle kaldırıldı (yerine Başarım
// sistemi gelecek, yalnızca öğrenciye).
// Kullanıcı isteği (27.09.2026): admin menüsü kalabalıklaştı — alt menülü
// gruplara ayrıldı. Grup başlığı yalnız alt menüyü açıp kapatır; bir sayfanın
// yüklenmesi için kullanıcı alt menüdeki sayfayı ayrıca seçer.
// Genel bakış ve Mesajlar grup DEĞİL, ayrı öğeler; Mesajlar Genel bakış'ın
// hemen altında (kullanıcı kararı 27.09.2026).
export interface DashboardMenuGrubu {
  baslik: string;
  ikon: DashboardIkonu;
  ogeler: DashboardMenuOgesi[];
}
export type DashboardMenuKalemi = DashboardMenuOgesi | DashboardMenuGrubu;

export function menuGrubuMu(kalem: DashboardMenuKalemi): kalem is DashboardMenuGrubu {
  return "ogeler" in kalem;
}

const ADMIN_MENU_YAPISI: DashboardMenuKalemi[] = [
  { bolum: "ozet", href: "/yonetici", etiket: "Genel bakış", ikon: "ana-sayfa" },
  { bolum: "mesajlar", href: "/yonetici/mesajlar", etiket: "Mesajlar", ikon: "duyuru" },
  {
    baslik: "Kurumlar ve Kullanıcılar", ikon: "okul", ogeler: [
      { bolum: "okullar", href: "/yonetici/okullar", etiket: "Okullar", ikon: "okul" },
      { bolum: "grup-kocluk", href: "/yonetici/grup-kocluk", etiket: "Grup Koçluk", ikon: "grup" },
      { bolum: "kullanicilar", href: "/yonetici/kullanicilar", etiket: "Kullanıcılar", ikon: "kullanici" },
      { bolum: "talepler", href: "/yonetici/talepler", etiket: "Veli talepleri", ikon: "talep" },
    ],
  },
  {
    baslik: "Deneme ve İçerik", ikon: "deneme", ogeler: [
      { bolum: "deneme-yukle", href: "/yonetici/deneme-yukle", etiket: "Deneme Yükle", ikon: "deneme" },
      { bolum: "pdf-eslesme", href: "/yonetici/pdf-eslesme", etiket: "PDF Eşleştirme", ikon: "eslestir" },
      { bolum: "icerik", href: "/yonetici/icerik", etiket: "Konu özetleri", ikon: "icerik" },
      { bolum: "yapay-zeka", href: "/yonetici/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
      { bolum: "blog", href: "/yonetici/blog", etiket: "Blog", ikon: "blog" },
    ],
  },
  {
    baslik: "İzleme ve Raporlar", ikon: "analiz", ogeler: [
      { bolum: "ogrenci-aktivitesi", href: "/yonetici/ogrenci-aktivitesi", etiket: "Öğrenci Aktivitesi", ikon: "analiz" },
      { bolum: "google-analytics", href: "/yonetici/google-analytics", etiket: "Google Analytics", ikon: "analiz" },
      { bolum: "islem-gecmisi", href: "/yonetici/islem-gecmisi", etiket: "İşlem Geçmişi", ikon: "gecmis" },
      { bolum: "duyuru-gecmisi", href: "/yonetici/duyuru-gecmisi", etiket: "Duyuru Geçmişi", ikon: "duyuru" },
      { bolum: "hata-bildirimleri", href: "/yonetici/hata-bildirimleri", etiket: "Hata Bildirimleri", ikon: "hata" },
    ],
  },
  {
    baslik: "Yetki ve Ayarlar", ikon: "ayarlar", ogeler: [
      { bolum: "adminler", href: "/yonetici/adminler", etiket: "Adminler", ikon: "admin" },
      { bolum: "moderatorler", href: "/yonetici/moderatorler", etiket: "Moderatörler", ikon: "moderator" },
      { bolum: "kurallar", href: "/yonetici/kurallar", etiket: "Kurallar", ikon: "kural" },
      { bolum: "site-ayarlari", href: "/yonetici/site-ayarlari", etiket: "Site ayarları", ikon: "ayarlar" },
    ],
  },
  { bolum: "profil", href: "/yonetici/profil", etiket: "Profilim", ikon: "profil" },
];

// Düz liste (bölüm doğrulaması vb. için) gruplardan türetilir.
const ADMIN_MENUSU: DashboardMenuOgesi[] = ADMIN_MENU_YAPISI.flatMap((k) => (menuGrubuMu(k) ? k.ogeler : [k]));

// 2026-08-26 kullanıcı isteği — Rehber Öğretmen branşındaki bir öğretmene
// ek bir menü ögesi (bkz. REHBER_BRANSI, src/lib/rehberlik.ts). brans
// parametresi opsiyonel — sadece "ogretmen" rolünde ve o branşta anlamlı,
// diğer tüm çağrılarda (admin, öğrenci, veli, müdür) yok sayılır.
const REHBER_OGRETMEN_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "kurum-performansi", href: "/dashboard/kurum-performansi", etiket: "Kurum Performansı", ikon: "ana-sayfa" },
  { bolum: "ozet", href: "/dashboard?bolum=ozet", etiket: "Öğrenciler", ikon: "ogrenci" },
  { bolum: "ogretmenler", href: "/dashboard/ogretmenler", etiket: "Öğretmenler ve Programlar", ikon: "ogretmen" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Rehber Öğretmen Duyurusu", ikon: "duyuru" },
  { bolum: "rehberlik", href: "/dashboard/rehberlik", etiket: "Bireysel Mesaj", ikon: "rehberlik" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "Pano", ikon: "takvim" },
  TAKVIM_MENU_OGESI,
];

// Rehber Radarı Adım 2 (kullanıcı onayı 07.10.2026) — sorumlu olunan TÜM
// düzeylerin öğrencileri tek tabloda. Mevcut "Öğrenciler" bölümü müdür ve
// branş öğretmeniyle ORTAK KOD olduğu için orası değiştirilmedi, ayrı bir
// kalem açıldı: rehberin sınıf bazlı işleri "Öğrenciler"de yerinde kalıyor.
//
// YALNIZ Rehberlik Servisi üyesine gösterilir (aşağıdaki okulRehberi) —
// liste rehberin atandığı sinif_duzeyleri'ne dayanıyor, dershane rehberinde
// ve grup koçunda böyle bir kapsam yok.
const KAPSAMIM_MENU_OGESI: DashboardMenuOgesi = {
  bolum: "kapsamim", href: "/dashboard?bolum=kapsamim", etiket: "Kapsamım", ikon: "ogrenci",
};

// Faz 4 (migration 0145) — rehberin asıl iş ürünü: görüşme kaydı. GİZLİ,
// yalnız servis üyesi ve yalnız kendi kademesindeki öğrenciler için
// (gizlilik RLS'te zorlanıyor, menüde gizlemek yeterli bir kontrol DEĞİL).
const GORUSMELER_MENU_OGESI: DashboardMenuOgesi = {
  bolum: "gorusmeler", href: "/dashboard?bolum=gorusmeler", etiket: "Görüşme Kayıtları", ikon: "rehberlik",
};

// Dershane rehberlik servisi (kullanıcı isteği 13.09.2026): öğrenci adına
// ödev, veri girişi ve program — yalnızca DERSHANE rehber öğretmenine.
const DERSHANE_REHBER_MENUSU: DashboardMenuOgesi[] = [
  ...REHBER_OGRETMEN_MENUSU.slice(0, 2),
  { bolum: "ogrenci-takibi", href: "/dashboard/ogrenci-takibi", etiket: "Öğrenci Takibi", ikon: "gorev" },
  ...REHBER_OGRETMEN_MENUSU.slice(2),
];

// Grup Koçluk koçu (Faz 3, 18.09.2026): kurum dışı koç, tek başına grubunu
// yönetir — "Öğretmenler ve Programlar" ile "Ajandam" (ders programı/nöbet)
// ona anlamsız. Öğrenci yönetimi "Grubum"da, takip rehber modülünde.
const GRUP_KOC_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Grubum", ikon: "grup" },
  { bolum: "ogrenci-takibi", href: "/dashboard/ogrenci-takibi", etiket: "Öğrenci Takibi", ikon: "gorev" },
  { bolum: "denemeler", href: "/dashboard/denemeler", etiket: "Denemeler", ikon: "deneme" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Grubun Konu Haritası", ikon: "ai" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Grup Duyurusu", ikon: "duyuru" },
  { bolum: "rehberlik", href: "/dashboard/rehberlik", etiket: "Bireysel Mesaj", ikon: "rehberlik" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "Pano", ikon: "takvim" },
];

// Ortaokulda YKS'ye ÖZGÜ bölümler menüden düşer (kullanıcı isteği
// 02.10.2026: ortaokul panelini ortaokula göre özelleştir).
//
// "yapay-zeka" = lise Konu Haritası (konu hâkimiyeti, TYT/AYT taksonomisi).
// Ortaokulun karşılığı "Konu Yeterliliği" (Maarif|LGS, migration 0132) —
// ikisini aynı menüde göstermek hem tekrar hem yanlış taksonomi olurdu.
export const ORTAOKULDA_GOSTERILMEYEN: DashboardBolumu[] = ["yapay-zeka"];

function ortaokulaUyarla(menu: DashboardMenuOgesi[]): DashboardMenuOgesi[] {
  return menu.filter((oge) => !ORTAOKULDA_GOSTERILMEYEN.includes(oge.bolum));
}

// Okul rehberinin kimliği: artık branş DEĞİL, Rehberlik Servisi üyeliği
// (migration 0144). `okulRehberi` sunucudan geçilir (bkz.
// src/lib/rehberlik-servisi.ts). `brans === REHBER_BRANSI` karşılaştırması
// yalnız DERSHANE rehberi ve Grup Koçluk koçu için duruyor — onların kimliği
// bilinçli olarak eski haliyle bırakıldı.
export function rehberlikBirimiMi(brans?: string, okulRehberi?: boolean): boolean {
  return okulRehberi === true || brans === REHBER_BRANSI;
}

export function dashboardMenusu(
  role: UserRole,
  kurumTuru?: KurumTuru,
  brans?: string,
  grupMu = false,
  // Ortaokul menüsü YALNIZCA burada devreye girer: kademe "ortaokul" olarak
  // geçilmezse (bayrak kapalıysa çağıran taraf geçmez) hiçbir şey değişmez.
  kademe?: "ortaokul" | "lise" | "ikisi" | null,
  okulRehberi = false,
): DashboardMenuOgesi[] {
  const rehber = rehberlikBirimiMi(brans, okulRehberi);
  if (role === "ogretmen" && grupMu) return GRUP_KOC_MENUSU;
  if (role === "ogrenci" && kademe === "ortaokul") return ORTAOKUL_OGRENCI_MENUSU;
  // Ortaokul ogretmeni: Maarif|LGS yeterlilik karari ekrani (kullanici karari
  // 01.10.2026). Lise menusu aynen korunuyor, yalniz bir kalem EKLENIYOR.
  if (role === "ogretmen" && (kademe === "ortaokul" || kademe === "ikisi") && !rehber) {
    // DÜZELTME (02.10.2026): bu dal önce erken dönüyordu ve aşağıdaki okul
    // dalını atlıyordu — ortaokul öğretmeni "Ajandam"ı KAYBETMİŞTİ. Ortaokul
    // bir okul kurumu, Ajandam ona da ait.
    const taban = kurumTuru === "okul" ? [...OGRETMEN_MENUSU, TAKVIM_MENU_OGESI] : [...OGRETMEN_MENUSU];
    return [...ortaokulaUyarla(taban), ORTAOKUL_YETERLILIK_MENU_OGESI];
  }
  if (role === "ogrenci") return kurumTuru === "okul" ? [...OGRENCI_MENUSU, { bolum:"etkinlikler", href:"/dashboard/etkinlikler", etiket:"Etkinlikler", ikon:"takvim" }] : OGRENCI_MENUSU;
  if (role === "veli") return VELI_MENUSU;
  if (role === "ogretmen" && rehber) {
    if (kurumTuru === "dershane") return DERSHANE_REHBER_MENUSU;
    // "Kapsamım" Kurum Performansı'nın HEMEN ARDINDAN gelir: triyaj girişi.
    return okulRehberi
      ? [REHBER_OGRETMEN_MENUSU[0], KAPSAMIM_MENU_OGESI, GORUSMELER_MENU_OGESI, ...REHBER_OGRETMEN_MENUSU.slice(1)]
      : REHBER_OGRETMEN_MENUSU;
  }
  if (role === "ogretmen") return kurumTuru === "okul" && etkinlikBransiMi(brans) ? [...OGRETMEN_MENUSU, TAKVIM_MENU_OGESI, { bolum:"etkinlikler", href:"/dashboard/etkinlikler", etiket:"Etkinlik Grupları", ikon:"takvim" }] : kurumTuru === "okul" ? [...OGRETMEN_MENUSU, TAKVIM_MENU_OGESI] : OGRETMEN_MENUSU;
  if (role === "mudur") {
    if (kurumTuru === "dershane") return DERSHANE_MUDUR_MENUSU;
    const taban = [...MUDUR_MENUSU, TAKVIM_MENU_OGESI];
    return kademe === "ortaokul" ? ortaokulaUyarla(taban) : taban;
  }
  if (role === "admin") return ADMIN_MENUSU;
  return [];
}

// Menü çizimi için: admin gruplu, diğer roller düz (değişmedi).
export function dashboardMenuYapisi(
  role: UserRole, kurumTuru?: KurumTuru, brans?: string, grupMu = false,
  kademe?: "ortaokul" | "lise" | "ikisi" | null,
  okulRehberi = false,
): DashboardMenuKalemi[] {
  return role === "admin" ? ADMIN_MENU_YAPISI : dashboardMenusu(role, kurumTuru, brans, grupMu, kademe, okulRehberi);
}

export const DASHBOARD_ROUTE_BOLUMLERI = new Set<DashboardBolumu>([
  "gorevler", "planlar", "veri-girisi", "konu-hakimiyeti", "analiz", "yapay-zeka", "tg-denemeleri",
  "duyurular", "talepler", "onaylar", "dersler", "ortaokul-dersler", "ortaokul-yardim", "ortaokul-calisma", "ortaokul-yeterlilik", "kurum-performansi", "ogretmenler", "ogrenciler", "denemeler", "rehberlik", "etkinlikler", "profil", "takvim", "yarismalar", "ogrenci-takibi",
]);
// Yazılı analizinin ayrı sayfası yok (kullanıcı kararı 11.09.2026: yalnızca
// öğretmene özel) — öğretmen Ajandam > Yazılı Analizi sekmesinden girer.

// /yonetici/[bolum] catch-all için.
export const YONETICI_ROUTE_BOLUMLERI = new Set<DashboardBolumu>([
  "mesajlar",
  "kullanicilar", "talepler", "deneme-yukle", "pdf-eslesme", "okullar", "grup-kocluk", "moderatorler", "icerik", "blog", "kurallar", "profil", "hata-bildirimleri",
  "duyuru-gecmisi", "islem-gecmisi", "ogrenci-aktivitesi", "site-ayarlari", "adminler",
]);
