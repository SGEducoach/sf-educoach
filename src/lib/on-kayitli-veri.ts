import type { SupabaseClient } from "@supabase/supabase-js";
import { kademeBul } from "@/lib/kademe";
import { ogretmenDenemeSonucuKaydet, type DenemeDersSonucu } from "@/lib/deneme-sonucu-kaydet";
import type { DenemeTuru } from "@/lib/types";
import { denemeToplamNeti } from "@/lib/sinif-analizi";
import type { KayitsizOgrenciOzeti, ListeAdayi } from "@/lib/on-kayitli";

// Ön kayıtlı (hesapsız) okul öğrencileri — sunucu yardımcıları. Plan:
// docs/ON_KAYITLI_OGRENCI_UYGULAMA_PLANI.md, migration 0179. Yazmalar service
// role ile yapılır; çağıran, yetkiyi KENDİ kontrolünden geçirdikten sonra çağırır.

// Projedeki diğer veri modülleriyle aynı imza (createAdminClient jenerik parametreleri `any`).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

const PARCA = 500;

/**
 * Kapsamdaki hesapsız (okul_ogrenci_listesi.student_id boş) öğrencilerin liste
 * kimlikleri. İlkokul (1-4) sisteme girmediği için dışarıda tutulur.
 * `sinifIdleri` ya da `schoolId` verilmeli; ikisi de yoksa boş döner.
 */
export async function kayitsizListeIdleri(
  istemci: Istemci,
  kapsam: { schoolId?: string; sinifIdleri?: string[]; seviyeler?: string[] },
): Promise<string[]> {
  if (!kapsam.schoolId && !(kapsam.sinifIdleri?.length)) return [];
  let sorgu = istemci.from("okul_ogrenci_listesi").select("id, classes!inner(seviye)").is("student_id", null);
  if (kapsam.schoolId) sorgu = sorgu.eq("school_id", kapsam.schoolId);
  if (kapsam.sinifIdleri?.length) sorgu = sorgu.in("class_id", kapsam.sinifIdleri);
  if (kapsam.seviyeler?.length) sorgu = sorgu.in("classes.seviye", kapsam.seviyeler);
  const { data } = await sorgu;
  type Satir = { id: string; classes: { seviye: string } | { seviye: string }[] | null };
  return ((data ?? []) as unknown as Satir[])
    .filter((s) => kademeBul((Array.isArray(s.classes) ? s.classes[0] : s.classes)?.seviye) !== "ilkokul")
    .map((s) => s.id);
}

/** Kurumun okul öğrenci listesi (eşleştirme adayları). İlkokul dışarıda; liste boşsa dershane/yüklenmemiş okul. */
export async function listeAdaylariniGetir(istemci: Istemci, schoolId: string): Promise<ListeAdayi[]> {
  const { data } = await istemci
    .from("okul_ogrenci_listesi")
    .select("id, okul_no, ad_soyad, student_id, classes(seviye)")
    .eq("school_id", schoolId);
  type Satir = { id: string; okul_no: string | null; ad_soyad: string; student_id: string | null; classes: { seviye: string } | { seviye: string }[] | null };
  return ((data ?? []) as unknown as Satir[]).map((s) => ({
    id: s.id,
    okulNo: s.okul_no,
    adSoyad: s.ad_soyad,
    seviye: (Array.isArray(s.classes) ? s.classes[0] : s.classes)?.seviye ?? null,
    studentId: s.student_id,
  }));
}

/**
 * Rehber ekranı için: kapsamdaki hesapsız (ön kayıtlı) öğrenciler ve yüklü
 * denemelerinin özeti. Aktiflik/risk hesabı YOK — veri girişi olmayan öğrenciye
 * yanlış alarm üretir; yalnız "kayıtlı değil" ve deneme bilgisi gösterilir.
 * `seviyeler` verilmezse kısıtsız döner (admin/moderatör: tüm sınıf seviyeleri, ilkokul dahil).
 */
export async function kayitsizOgrenciOzetleriGetir(istemci: Istemci, schoolId: string, seviyeler?: string[]): Promise<KayitsizOgrenciOzeti[]> {
  if (seviyeler?.length === 0) return [];
  let sorgu = istemci
    .from("okul_ogrenci_listesi")
    .select("id, ad_soyad, okul_no, classes!inner(seviye, sube)")
    .eq("school_id", schoolId).is("student_id", null);
  if (seviyeler) sorgu = sorgu.in("classes.seviye", seviyeler);
  const { data } = await sorgu;
  type Satir = { id: string; ad_soyad: string; okul_no: string | null; classes: { seviye: string; sube: string } | { seviye: string; sube: string }[] | null };
  const ogrenciler = ((data ?? []) as unknown as Satir[])
    .map((s) => ({ ...s, sinif: Array.isArray(s.classes) ? s.classes[0] : s.classes }))
    .filter((s) => s.sinif && (!seviyeler || kademeBul(s.sinif.seviye) !== "ilkokul"));
  if (ogrenciler.length === 0) return [];
  const { data: bekleyenler } = await istemci
    .from("pdf_deneme_eslesme_bekleyenler")
    .select("liste_ogrenci_id, tarih, ders_sonuclari")
    .eq("durum", "bekliyor").in("liste_ogrenci_id", ogrenciler.map((o) => o.id));
  const denemeler = new Map<string, { tarih: string; net: number }[]>();
  for (const b of (bekleyenler ?? []) as { liste_ogrenci_id: string; tarih: string; ders_sonuclari: unknown }[]) {
    const sinif = ogrenciler.find((o) => o.id === b.liste_ogrenci_id)?.sinif;
    const kademe = kademeBul(sinif?.seviye) === "ortaokul" ? "ortaokul" as const : "lise" as const;
    const net = denemeToplamNeti(Array.isArray(b.ders_sonuclari) ? b.ders_sonuclari as { dogru: number; yanlis: number }[] : [], kademe);
    denemeler.set(b.liste_ogrenci_id, [...(denemeler.get(b.liste_ogrenci_id) ?? []), { tarih: b.tarih, net }]);
  }
  return ogrenciler.map((o) => {
    const liste = (denemeler.get(o.id) ?? []).sort((a, b) => b.tarih.localeCompare(a.tarih));
    return {
      listeId: o.id, ad: o.ad_soyad, okulNo: o.okul_no, sinifAdi: `${o.sinif!.seviye}-${o.sinif!.sube}`,
      denemeSayisi: liste.length, sonNet: liste[0]?.net ?? null, sonDenemeTarihi: liste[0]?.tarih ?? null,
    };
  }).sort((a, b) => a.sinifAdi.localeCompare(b.sinifAdi, "tr", { numeric: true }) || a.ad.localeCompare(b.ad, "tr"));
}

async function parcaParca(satirlar: Record<string, string>[], yaz: (parca: Record<string, string>[]) => PromiseLike<{ error: { message: string } | null }>): Promise<number> {
  let yazilan = 0;
  for (let i = 0; i < satirlar.length; i += PARCA) {
    const parca = satirlar.slice(i, i + PARCA);
    const { error } = await yaz(parca);
    if (error) console.warn("Ön kayıtlı bekleyen yazılamadı:", error.message);
    else yazilan += parca.length;
  }
  return yazilan;
}

/** Ödevi (gorevler satırı zaten açılmış) hesapsız öğrencilere 10 gün bekletmek üzere bağlar. */
export async function bekleyenGorevAtamalariniYaz(admin: Istemci, gorevId: string, listeIdleri: string[]): Promise<number> {
  const benzersiz = [...new Set(listeIdleri)];
  return parcaParca(
    benzersiz.map((l) => ({ gorev_id: gorevId, liste_ogrenci_id: l })),
    (parca) => admin.from("bekleyen_gorev_atamalari").upsert(parca, { onConflict: "gorev_id,liste_ogrenci_id", ignoreDuplicates: true }),
  );
}

/** Duyuruyu (duyurular satırı zaten açılmış) hesapsız öğrencilere 10 gün bekletmek üzere bağlar. */
export async function bekleyenDuyuruAlicilariniYaz(admin: Istemci, duyuruId: string, listeIdleri: string[]): Promise<number> {
  const benzersiz = [...new Set(listeIdleri)];
  return parcaParca(
    benzersiz.map((l) => ({ duyuru_id: duyuruId, liste_ogrenci_id: l })),
    (parca) => admin.from("bekleyen_duyuru_aliciler").upsert(parca, { onConflict: "duyuru_id,liste_ogrenci_id", ignoreDuplicates: true }),
  );
}

/**
 * Öğrenci üye olduktan sonra, listeye bağlı bekleyen deneme sonuçlarını gerçek
 * hesabına yazar. Okul kaydı tarayıcıdan yapıldığı için bu adım ilk panel
 * açılışında çalışır; tekrar çalışması zarar vermez (satır önce "atandi" diye
 * sahiplenilir, yazma başarısızsa "bekliyor"a geri döner).
 */
export async function onKayitliDenemeleriniAktar(
  admin: Istemci,
  studentId: string,
): Promise<{ aktarilan: number; atlanan: number }> {
  const sonuc = { aktarilan: 0, atlanan: 0 };
  // Tek sorgu: öğrencinin liste satırına bağlı, henüz aktarılmamış sonuçlar.
  // Çoğu açılışta boş döner (her panel açılışında çalıştığı için hafif tutuldu).
  const { data: bekleyenler } = await admin
    .from("pdf_deneme_eslesme_bekleyenler")
    .select("id, ders_sonuclari, yayinevi, tarih, tur, olusturan_mudur_id, okul_ogrenci_listesi!inner(student_id)")
    .eq("okul_ogrenci_listesi.student_id", studentId)
    .eq("durum", "bekliyor");
  for (const b of bekleyenler ?? []) {
    // Sahiplen: başka bir istek aynı satırı aynı anda yazmasın.
    const { data: sahiplenen } = await admin.from("pdf_deneme_eslesme_bekleyenler")
      .update({ durum: "atandi", atanan_student_id: studentId })
      .eq("id", b.id).eq("durum", "bekliyor").select("id");
    if (!sahiplenen?.length) continue;
    const yazim = await ogretmenDenemeSonucuKaydet(admin, {
      studentId,
      tarih: String(b.tarih),
      tur: String(b.tur) as DenemeTuru,
      yayinevi: String(b.yayinevi),
      pdfAktoruId: b.olusturan_mudur_id ? String(b.olusturan_mudur_id) : undefined,
      dersSonuclari: b.ders_sonuclari as unknown as DenemeDersSonucu[],
    });
    if (yazim.error) {
      await admin.from("pdf_deneme_eslesme_bekleyenler").update({ durum: "bekliyor", atanan_student_id: null }).eq("id", b.id);
      sonuc.atlanan++;
    } else {
      sonuc.aktarilan++;
    }
  }
  return sonuc;
}
