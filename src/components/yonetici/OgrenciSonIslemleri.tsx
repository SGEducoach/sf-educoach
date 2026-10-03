import { Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { zamanGoster } from "@/lib/ogrenci-aktivitesi";
import { BG1, BORDER, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

interface Islem { id: string; zaman: string; metin: string }

// Yetki burada da doğrulanır; bileşen başka bir sayfaya eklense bile
// servis anahtarıyla öğrenci hareketleri admin dışına açılmaz.
export async function OgrenciSonIslemleri({ studentId }: { studentId: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role !== "admin") return null;

  const admin = createAdminClient();
  const [konu, soru, deneme, goruntuleme] = await Promise.all([
    admin.from("konu_calismalar").select("id, ders, konu, sure_dakika, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(20),
    admin.from("soru_cozumleri").select("id, ders, dogru, yanlis, sure_dakika, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(20),
    admin.from("denemeler").select("id, tarih, tur, yayinevi, kaynak, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(20),
    admin.from("ogretmen_profil_goruntulemeleri").select("teacher_id, gun, created_at").eq("student_id", studentId).order("created_at", { ascending: false }).limit(20),
  ]);
  const hata = konu.error ?? soru.error ?? deneme.error ?? goruntuleme.error;
  if (hata) return <p role="alert" className="text-xs" style={{ color: TEXT_MUTED }}>Son işlemler alınamadı: {hata.message}</p>;

  const ogretmenIds = [...new Set((goruntuleme.data ?? []).map((g) => g.teacher_id))];
  const { data: ogretmenler } = ogretmenIds.length
    ? await admin.from("profiles").select("id, ad").in("id", ogretmenIds)
    : { data: [] };
  const ogretmenAdi = new Map((ogretmenler ?? []).map((o) => [o.id, o.ad]));
  const islemler: Islem[] = [
    ...(konu.data ?? []).map((r) => ({ id: `konu-${r.id}`, zaman: r.created_at, metin: `Konu çalışması: ${r.ders} / ${r.konu} · ${r.sure_dakika} dk` })),
    ...(soru.data ?? []).map((r) => ({ id: `soru-${r.id}`, zaman: r.created_at, metin: `Soru çözümü: ${r.ders} · ${r.dogru} D / ${r.yanlis} Y · ${r.sure_dakika} dk` })),
    ...(deneme.data ?? []).map((r) => ({ id: `deneme-${r.id}`, zaman: r.created_at, metin: `${r.kaynak === "ogretmen" ? "Okulun yüklediği" : "Öğrencinin girdiği"} deneme: ${r.tarih} · ${r.tur}${r.yayinevi ? ` · ${r.yayinevi}` : ""}` })),
    ...(goruntuleme.data ?? []).map((r) => ({ id: `goruntuleme-${r.teacher_id}-${r.gun}`, zaman: r.created_at, metin: `Profili görüntüleyen öğretmen: ${ogretmenAdi.get(r.teacher_id) ?? "Bilinmiyor"}` })),
  ].sort((a, b) => b.zaman.localeCompare(a.zaman)).slice(0, 20);

  return (
    <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}><Clock3 size={17} color={MINT} /> Son işlemler</h2>
      <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Öğrenci kayıtları ve öğretmenlerin profil görüntülemeleri, en yeni işlem üstte.</p>
      {islemler.length === 0
        ? <p className="mt-3 text-sm" style={{ color: TEXT_MUTED }}>Henüz işlem kaydı yok.</p>
        : <ol className="sfec-liste mt-3 max-h-96 overflow-y-auto">
            {islemler.map((islem) => <li key={islem.id} className="sfec-liste-satiri flex gap-3 px-2 py-2.5 text-xs" style={{ color: TEXT }}>
              <time className="w-24 shrink-0 tabular-nums" style={{ color: TEXT_MUTED }} dateTime={islem.zaman}>{zamanGoster(islem.zaman)}</time>
              <span>{islem.metin}</span>
            </li>)}
          </ol>}
    </section>
  );
}
