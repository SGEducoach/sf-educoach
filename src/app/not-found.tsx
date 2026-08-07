import { redirect } from "next/navigation";

// Var olmayan/hatalı bir adrese gidildiğinde standart 404 sayfası yerine
// doğrudan anasayfaya (o da oturum durumuna göre /dashboard veya /login'e)
// yönlendiriyoruz — hem daha iyi bir kullanıcı deneyimi hem de "bu adres var
// mı yok mu" bilgisini dışarıya sızdırmamak için.
export default function NotFound() {
  redirect("/");
}
