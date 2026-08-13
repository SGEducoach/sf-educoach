import { ShieldCheck } from "lucide-react";
import { BG1, BORDER, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

const YETKILER = [
  "Tüm kullanıcıları rol, ad ve e-posta ile listeleme ve arama",
  "Kullanıcı şifresini geçici şifreyle sıfırlama",
  "Kullanıcının ad, e-posta, telefon ve okul numarası bilgilerini düzenleme",
  "Hesabı pasifleştirme, yeniden aktifleştirme veya kalıcı silme",
  "Öğrenciyi aynı okuldaki başka bir sınıfa taşıma",
  "Veli–öğrenci bağlantılarını ekleme veya kaldırma",
  "Öğrencinin çalışma, soru ve deneme kayıtlarını düzeltme veya silme",
  "Öğretmen ve müdür branşını değiştirme",
  "Okul ve sınıf ekleme, düzenleme ve pasifleştirme",
  "Sınıf öğretmeni atama veya görevden çıkarma",
  "Öğrenci ve öğretmen hesaplarını tekli ya da toplu oluşturma",
  "Deneme sonuçlarını toplu girme ve öğrenci listesini dışa aktarma",
  "Veli bağlantı taleplerini görme, onaylama veya reddetme",
  "Platform duyuruları, konu anlatımları ve kayıt kurallarını yönetme",
  "Yapılan yönetim işlemlerini denetim kaydından izleme",
];

export function YoneticiYetkileri() {
  return (
    <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: MINT_BG }}>
          <ShieldCheck size={14} color={MINT} />
        </div>
        <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Yönetici müdahale yetkileri</h2>
      </div>
      <p className="mb-3 text-xs" style={{ color: TEXT_MUTED }}>Yönetici, kullanıcıların parolasını göremez ve kullanıcı adına giriş yapamaz; aşağıdaki denetimli işlemleri yapabilir:</p>
      <ul className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2" style={{ color: TEXT_MUTED }}>
        {YETKILER.map((yetki) => <li key={yetki} className="flex gap-2"><span style={{ color: MINT }}>✓</span><span>{yetki}</span></li>)}
      </ul>
    </section>
  );
}
