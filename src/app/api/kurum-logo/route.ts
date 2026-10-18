import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Kurum logosu (migration 0159) — WhatsApp duyuru kartını çizen tarayıcı
// logoyu canvas'a koyar; başka alan adından gelen görsel canvas'ı "kirletip"
// dışa aktarmayı engelleyebileceği için logo aynı siteden sunulur. Logolar
// zaten herkese açık depoda; burada yetki gerekmez.
export async function GET(request: NextRequest) {
  const okul = request.nextUrl.searchParams.get("okul") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(okul)) return new Response("Geçersiz kurum.", { status: 400 });
  const { data, error } = await createAdminClient().storage.from("kurum-logolari").download(`${okul}/logo`);
  if (error || !data) return new Response("Logo yok.", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": data.type || "image/png",
      // Logo değişince adrese ?v= eklenir; aynı adres güvenle önbelleklenir.
      "Cache-Control": "public, max-age=86400",
    },
  });
}
