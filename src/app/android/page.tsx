import type { Metadata } from "next";
import { SayfaKabugu } from "@/components/SayfaKabugu";

export const metadata: Metadata = {
  title: "Android deneme sürümü | SeFu Koç",
  description: "SeFu Koç Android deneme sürümünü doğrudan indirin.",
  robots: { index: false, follow: false },
};

export default function AndroidIndirmeSayfasi() {
  return <SayfaKabugu>
    <section className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
      <p className="text-sm font-bold text-[#087C78]">Android deneme sürümü</p>
      <h1 className="mt-3 text-3xl font-extrabold text-[#0F2540] sm:text-4xl">SeFu Koç’u Android’e yükleyin</h1>
      <p className="mt-5 leading-7 text-[#3F4B5A]">Bu sürüm Google Play üzerinden dağıtılmıyor. Mevcut SeFu Koç hesabınızla çalışır; verileriniz web sitesiyle aynıdır. Kullanım için internet bağlantısı gerekir.</p>
      <a href="/indir/sefukoc-android-v1.apk" download="sefukoc-android-v1.apk"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#14B8B0] px-7 py-3 font-bold text-white">
        Android APK dosyasını indir
      </a>
      <ol className="mt-9 list-decimal space-y-3 pl-5 leading-7 text-[#3F4B5A]">
        <li>İndirilen dosyayı Android cihazınızda açın.</li>
        <li>Android izin isterse bu indirme kaynağı için kuruluma izin verin.</li>
        <li>Kurulumdan sonra SeFu Koç simgesini açıp <strong>Kullanmaya Başla</strong> düğmesine dokunun.</li>
      </ol>
      <p className="mt-8 rounded-2xl bg-[#F0F7F8] p-4 text-sm leading-6 text-[#3F4B5A]">İlk sürüm Mi Pad 7 üzerinde henüz test edilmedi. Kurulumda veya girişte sorun görürseniz dosyayı yeniden yüklemeyin; ekran görüntüsüyle bize bildirin.</p>
    </section>
  </SayfaKabugu>;
}
