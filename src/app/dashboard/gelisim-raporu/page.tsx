import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IlkokulDonemRaporlari } from "@/components/dashboard/IlkokulDonemRaporlari";
import { ilkokulMu } from "@/lib/kademe";
import { bugununTarihiTR } from "@/lib/tarih";
import { ayAnahtari, donemBilgisi } from "@/lib/ilkokul-gelisim";
import { ilkokulDonemRaporuGetir, ilkokulSiniflariGetir } from "@/lib/ilkokul-gelisim-sorgu";
import type { IlkokulDonemRaporu } from "@/lib/ilkokul-gelisim-sorgu";

// İlkokul dönem sonu gelişim raporu (kullanıcı kararı 19.10.2026): MEB
// Maarif Modeli gelişim raporunun yapısıyla — dersler dört düzey, sosyal
// duygusal öğrenme becerileri, öğretmen görüşü; ek olarak kurumun kendi
// değerlendirmesi. Dikey A4, dolu zemin yok (mürekkep tasarrufu, program
// çıktısıyla aynı ilke). ?ogrenci= tek öğrenci, ?sinif= sınıfın hepsi (her
// öğrenci yeni sayfada). ?ay= dönemi seçer (dönemin herhangi bir ayı).
//
// Erişim: admin; veli kendi çocuğu; kurum personeli gelişim raporuna
// erişebildiği sınıflar (sınıf öğretmeni, rehberlik kapsamı, müdür,
// moderatör). Veri yetki kontrolünden sonra service-role ile okunur.

export const metadata: Metadata = { title: "Gelişim Raporu | SeFu Koç", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function GelisimRaporuSayfasi({ searchParams }: { searchParams: Promise<{ ogrenci?: string; sinif?: string; ay?: string }> }) {
  const { ogrenci, sinif, ay } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: profil } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const rol = profil?.role as string | undefined;

  const donem = donemBilgisi(ayAnahtari(ay ?? "") ?? ayAnahtari(bugununTarihiTR())!);
  const personelSiniflari = rol === "ogretmen" || rol === "mudur" ? new Set((await ilkokulSiniflariGetir(admin, user.id)).map((s) => s.id)) : new Set<string>();

  let ogrenciIdleri: string[] = [];
  if (ogrenci && UUID.test(ogrenci)) {
    const { data: o } = await admin.from("students").select("id, class_id, classes(seviye)").eq("id", ogrenci).maybeSingle();
    const seviye = (o as unknown as { classes: { seviye: string } | null } | null)?.classes?.seviye;
    if (!o || !ilkokulMu(seviye)) notFound();
    let izinli = rol === "admin" || (!!o.class_id && personelSiniflari.has(o.class_id as string));
    if (!izinli && rol === "veli") {
      const { data: bag } = await admin.from("parent_students").select("student_id").eq("parent_id", user.id).eq("student_id", ogrenci).maybeSingle();
      izinli = !!bag;
    }
    if (!izinli) notFound();
    ogrenciIdleri = [ogrenci];
  } else if (sinif && UUID.test(sinif)) {
    if (rol !== "admin" && !personelSiniflari.has(sinif)) notFound();
    const { data: liste } = await admin.from("students").select("id, okul_no").eq("class_id", sinif);
    ogrenciIdleri = ((liste ?? []) as { id: string; okul_no: string }[])
      .sort((a, b) => (a.okul_no ?? "").localeCompare(b.okul_no ?? "", "tr", { numeric: true }))
      .map((o) => o.id);
  } else {
    notFound();
  }

  const raporlar = (await Promise.all(ogrenciIdleri.map((id) => ilkokulDonemRaporuGetir(admin, id, donem))))
    .filter((r): r is IlkokulDonemRaporu => r !== null);

  return <IlkokulDonemRaporlari raporlar={raporlar} donem={donem} />;
}
