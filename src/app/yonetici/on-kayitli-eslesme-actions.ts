"use server";

// Ön kayıtlı (hesapsız) öğrenciler — yönetici/moderatör onay ekranının sunucu
// işlemleri (migration 0179/0180, plan: docs/ON_KAYITLI_OGRENCI_UYGULAMA_PLANI.md).
// Yüklü deneme sonuçları okul listesindeki öğrenciye bağlanır; öğrenci üye
// olunca (ya da hesabı varsa) hesabına aktarılır. Otomatik bağlama yalnız
// numara + ad benzerliği + sınıf seviyesi birlikte uyuyorsa yapılır (PDF
// yüklemesinde, deneme-pdf-actions.ts). Burada kalan şüpheli/önerilen
// eşleşmeler yönetici onayı bekler.
//
// Yetki kontrolü pdf-eslesme-actions.ts'tekiyle aynı (bkz. oradaki gerekçe):
// service-role client RLS'i bypass ettiğinden her işlem kendi yetkisini kontrol eder.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { denemeModeratorKurumu } from "@/lib/dershane-auth";
import { adaGoreBenzerAday, adaGoreListeOnerisi, numarayaGoreListeBaglantisi, type ListeAdayi } from "@/lib/on-kayitli";
import { listeAdaylariniGetir, onKayitliDenemeleriniAktar } from "@/lib/on-kayitli-veri";

const SAYFA = 1000;

async function requireEslesmeYetkisi(): Promise<{ user: { id: string }; admin: ReturnType<typeof createAdminClient>; kurumFiltresi: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin") return { user, admin: createAdminClient(), kurumFiltresi: null };
  const moderator = await denemeModeratorKurumu();
  if (!moderator) redirect("/dashboard");
  return { user, admin: moderator.admin, kurumFiltresi: moderator.schoolId };
}

function yollariYenile() {
  revalidatePath("/yonetici");
  revalidatePath("/moderator");
}

export interface OnKayitliOnerisi {
  bekleyenId: string;
  adSoyadHam: string;
  ogrenciNo: number | null;
  listeId: string;
  listeAd: string;
  listeNo: string | null;
  listeSeviyesi: string | null;
  hesabiVar: boolean;
  /**
   * "numara": numara eşleşiyor ama ad/sınıf uyuşmuyor (ada benzeyen başka kişi yok);
   * "numara-hatali": ad listedeki TEK bir öğrenciye uyuyor ama PDF'teki numara başka birine ait (numara hatalı kodlanmış olabilir);
   * "ad": numara yok, ad tam aynı ve tek kişi.
   */
  tur: "numara" | "numara-hatali" | "ad";
  /** PDF'teki numaranın listede kime ait olduğu ("Ad (no, sınıf, hesap durumu)"); numara listede yoksa null. */
  numaraSahibi: string | null;
  deneme: string;
}

export interface OnKayitliOzeti {
  schoolId: string;
  okulAdi: string;
  hesapsizBagliSatir: number;
  hesapsizBagliKisi: number;
  hesapliBekleyenSatir: number;
  hesapliBekleyenKisi: number;
  oneriler: OnKayitliOnerisi[];
}

type BekleyenOzetSatiri = {
  id: string; school_id: string; ad_soyad_ham: string; ogrenci_no: number | null; sinif_seviyesi: string | null;
  liste_ogrenci_id: string | null; tarih: string; yayinevi: string;
};

async function bekleyenSatirlariniTopla(admin: ReturnType<typeof createAdminClient>, kurum: string | null): Promise<{ satirlar: BekleyenOzetSatiri[]; error: string | null }> {
  const satirlar: BekleyenOzetSatiri[] = [];
  for (let bas = 0; ; bas += SAYFA) {
    let sorgu = admin.from("pdf_deneme_eslesme_bekleyenler")
      .select("id, school_id, ad_soyad_ham, ogrenci_no, sinif_seviyesi, liste_ogrenci_id, tarih, yayinevi")
      .eq("durum", "bekliyor");
    if (kurum) sorgu = sorgu.eq("school_id", kurum);
    const { data, error } = await sorgu.order("id").range(bas, bas + SAYFA - 1);
    if (error) return { satirlar: [], error: error.message };
    satirlar.push(...((data ?? []) as BekleyenOzetSatiri[]));
    if ((data ?? []).length < SAYFA) break;
  }
  return { satirlar, error: null };
}

export async function onKayitliEslesmeOzetiGetir(kurumId?: string): Promise<{ error: string | null; ozetler: OnKayitliOzeti[] }> {
  const { admin, kurumFiltresi } = await requireEslesmeYetkisi();
  const kurum = kurumFiltresi ?? kurumId ?? null;
  const { satirlar, error } = await bekleyenSatirlariniTopla(admin, kurum);
  if (error) return { error, ozetler: [] };

  const okulIdleri = [...new Set(satirlar.map((s) => s.school_id))];
  const [okulSonucu, ...listeler] = await Promise.all([
    okulIdleri.length > 0 ? admin.from("schools").select("id, ad").in("id", okulIdleri) : Promise.resolve({ data: [] }),
    ...okulIdleri.map((id) => listeAdaylariniGetir(admin, id)),
  ]);
  const okulAdi = new Map(((okulSonucu.data ?? []) as { id: string; ad: string }[]).map((o) => [o.id, o.ad]));

  const ozetler: OnKayitliOzeti[] = [];
  okulIdleri.forEach((okulId, i) => {
    const liste = listeler[i] as ListeAdayi[];
    if (liste.length === 0) return; // dershane / liste yüklenmemiş okul
    const listeById = new Map(liste.map((l) => [l.id, l]));
    const ozet: OnKayitliOzeti = { schoolId: okulId, okulAdi: okulAdi.get(okulId) ?? "Bilinmiyor", hesapsizBagliSatir: 0, hesapsizBagliKisi: 0, hesapliBekleyenSatir: 0, hesapliBekleyenKisi: 0, oneriler: [] };
    const hesapsizKisi = new Set<string>();
    const hesapliKisi = new Set<string>();
    for (const s of satirlar.filter((x) => x.school_id === okulId)) {
      if (s.liste_ogrenci_id) {
        const l = listeById.get(s.liste_ogrenci_id);
        if (!l) continue;
        if (l.studentId) { ozet.hesapliBekleyenSatir++; hesapliKisi.add(l.id); }
        else { ozet.hesapsizBagliSatir++; hesapsizKisi.add(l.id); }
        continue;
      }
      const satir = { adSoyad: s.ad_soyad_ham, ogrenciNo: s.ogrenci_no, sinifSeviyesi: s.sinif_seviyesi };
      const numara = numarayaGoreListeBaglantisi(satir, liste);
      let hedef: { liste: ListeAdayi; tur: OnKayitliOnerisi["tur"] } | null = null;
      if (numara.karar !== "yok") {
        // Numara eşleşse bile ad listedeki BAŞKA tek bir öğrenciye uyuyorsa asıl sahibi odur
        // (PDF'te numara hatalı kodlanmış): numaradaki kişi değil o önerilir.
        const adAdayi = adaGoreBenzerAday(satir, liste);
        hedef = adAdayi && adAdayi.id !== numara.liste.id
          ? { liste: adAdayi, tur: "numara-hatali" }
          : { liste: numara.liste, tur: "numara" };
      } else if (s.ogrenci_no === null) {
        const adayi = adaGoreListeOnerisi(satir, liste);
        if (adayi) hedef = { liste: adayi, tur: "ad" };
      } else {
        // Numara listede hiç yok: ad tek kişiye benziyorsa yine öneri (numara hatalı kodlanmış olabilir).
        const adAdayi = adaGoreBenzerAday(satir, liste);
        if (adAdayi) hedef = { liste: adAdayi, tur: "numara-hatali" };
      }
      if (!hedef) continue;
      const sahip = s.ogrenci_no === null ? null : liste.find((l) => l.okulNo === String(s.ogrenci_no));
      ozet.oneriler.push({
        bekleyenId: s.id, adSoyadHam: s.ad_soyad_ham, ogrenciNo: s.ogrenci_no,
        listeId: hedef.liste.id, listeAd: hedef.liste.adSoyad, listeNo: hedef.liste.okulNo, listeSeviyesi: hedef.liste.seviye,
        hesabiVar: hedef.liste.studentId !== null, tur: hedef.tur,
        numaraSahibi: sahip ? `${sahip.adSoyad} (${sahip.okulNo}${sahip.seviye ? `, ${sahip.seviye}. sınıf` : ""}, ${sahip.studentId ? "hesabı var" : "kayıtsız"})` : null,
        deneme: `${s.tarih} · ${s.yayinevi}`,
      });
    }
    ozet.hesapsizBagliKisi = hesapsizKisi.size;
    ozet.hesapliBekleyenKisi = hesapliKisi.size;
    ozet.oneriler.sort((a, b) => a.adSoyadHam.localeCompare(b.adSoyadHam, "tr"));
    ozetler.push(ozet);
  });
  return { error: null, ozetler };
}

// Hesabı olan öğrencilere bağlı (güvenli eşleşmiş) bekleyen sonuçları şimdi aktarır.
// Normalde öğrencinin bir sonraki panel açılışında kendiliğinden aktarılır.
export async function onKayitliHesaplilaraAktar(kurumId?: string): Promise<{ error: string | null; aktarilan: number; atlanan: number; ogrenciSayisi: number }> {
  const { user, admin, kurumFiltresi } = await requireEslesmeYetkisi();
  const kurum = kurumFiltresi ?? kurumId ?? null;
  const { satirlar, error } = await bekleyenSatirlariniTopla(admin, kurum);
  if (error) return { error, aktarilan: 0, atlanan: 0, ogrenciSayisi: 0 };
  const listeIdleri = [...new Set(satirlar.map((s) => s.liste_ogrenci_id).filter((id): id is string => !!id))];
  if (listeIdleri.length === 0) return { error: null, aktarilan: 0, atlanan: 0, ogrenciSayisi: 0 };
  const { data: listeSatirlari } = await admin.from("okul_ogrenci_listesi").select("id, student_id").in("id", listeIdleri).not("student_id", "is", null);
  const ogrenciIdleri = [...new Set(((listeSatirlari ?? []) as { student_id: string }[]).map((l) => l.student_id))];
  let aktarilan = 0;
  let atlanan = 0;
  for (const studentId of ogrenciIdleri) {
    const sonuc = await onKayitliDenemeleriniAktar(admin, studentId);
    aktarilan += sonuc.aktarilan;
    atlanan += sonuc.atlanan;
  }
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "on_kayitli_hesaplilara_aktar", detay: { kurum_id: kurum, ogrenci_sayisi: ogrenciIdleri.length, aktarilan, atlanan } });
  yollariYenile();
  return { error: null, aktarilan, atlanan, ogrenciSayisi: ogrenciIdleri.length };
}

// Yönetici onayı: şüpheli (numara eşleşiyor, ad/sınıf uyuşmuyor) ya da ad önerisi
// satırları okul listesindeki öğrenciye bağlanır. İstemciden yalnız kimlikler
// gelir; her çift sunucuda yeniden doğrulanır (aynı kurum, hâlâ bekliyor,
// öneri kuralını sağlıyor).
export async function onKayitliOnerileriOnayla(kayitlar: { bekleyenId: string; listeId: string }[]): Promise<{ error: string | null; baglanan: number; aktarilan: number }> {
  const { user, admin, kurumFiltresi } = await requireEslesmeYetkisi();
  const girdi = kayitlar.slice(0, 500);
  if (girdi.length === 0) return { error: "Seçili satır yok.", baglanan: 0, aktarilan: 0 };
  const [{ data: satirlar }, { data: listeSatirlari }] = await Promise.all([
    admin.from("pdf_deneme_eslesme_bekleyenler")
      .select("id, school_id, ad_soyad_ham, ogrenci_no, sinif_seviyesi, liste_ogrenci_id, tarih, yayinevi")
      .in("id", girdi.map((k) => k.bekleyenId)).eq("durum", "bekliyor"),
    admin.from("okul_ogrenci_listesi").select("id, school_id, okul_no, ad_soyad, student_id, classes(seviye)").in("id", [...new Set(girdi.map((k) => k.listeId))]),
  ]);
  type ListeRow = { id: string; school_id: string; okul_no: string | null; ad_soyad: string; student_id: string | null; classes: { seviye: string } | { seviye: string }[] | null };
  const listeById = new Map(((listeSatirlari ?? []) as unknown as ListeRow[]).map((l) => [l.id, l]));
  const satirById = new Map(((satirlar ?? []) as BekleyenOzetSatiri[]).map((s) => [s.id, s]));

  let baglanan = 0;
  const ogrenciIdleri = new Set<string>();
  for (const k of girdi) {
    const s = satirById.get(k.bekleyenId);
    const l = listeById.get(k.listeId);
    if (!s || !l || s.liste_ogrenci_id !== null || s.school_id !== l.school_id) continue;
    if (kurumFiltresi && s.school_id !== kurumFiltresi) continue;
    const aday: ListeAdayi = { id: l.id, okulNo: l.okul_no, adSoyad: l.ad_soyad, seviye: (Array.isArray(l.classes) ? l.classes[0] : l.classes)?.seviye ?? null, studentId: l.student_id };
    const satir = { adSoyad: s.ad_soyad_ham, ogrenciNo: s.ogrenci_no, sinifSeviyesi: s.sinif_seviyesi };
    const numara = numarayaGoreListeBaglantisi(satir, [aday]);
    // Geçerli bağlar: numara bu kişiyle eşleşiyor; ya da numarası yok/yanlış ama ad bu kişiye
    // benziyor (ad tam aynı ya da benzer, sınıf çelişmiyor). İstemci hedefi seçer, kural sunucuda yeniden sınanır.
    const gecerli = numara.karar !== "yok"
      || (s.ogrenci_no === null && adaGoreListeOnerisi(satir, [aday])?.id === aday.id)
      || adaGoreBenzerAday(satir, [aday])?.id === aday.id;
    if (!gecerli) continue;
    const { error } = await admin.from("pdf_deneme_eslesme_bekleyenler").update({ liste_ogrenci_id: l.id }).eq("id", s.id).eq("durum", "bekliyor").is("liste_ogrenci_id", null);
    if (error) continue;
    baglanan++;
    if (l.student_id) ogrenciIdleri.add(l.student_id);
  }
  let aktarilan = 0;
  for (const studentId of ogrenciIdleri) aktarilan += (await onKayitliDenemeleriniAktar(admin, studentId)).aktarilan;
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "on_kayitli_onerileri_onayla", detay: { istenen: girdi.length, baglanan, aktarilan } });
  yollariYenile();
  return { error: null, baglanan, aktarilan };
}
