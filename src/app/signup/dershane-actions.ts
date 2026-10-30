"use server";

// Dershane öğrencisi kaydı yalnız kurumun yetkili personeli tarafından yapılır.
// Eski istemciler bu action'ı doğrudan çağırsa bile hesap oluşturulmaz.
export async function dershaneKayitTamamla() {
  return {
    error: "Dershane öğrencisi hesabı için lütfen kurumunuzun yetkili rehber öğretmeniyle iletişime geçin.",
    sifre: null,
  };
}
