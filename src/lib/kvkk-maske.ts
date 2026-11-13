// KVKK "veri en aza indirme": iletişim bilgisi varsayılan olarak maskeli
// gösterilir; tam numara yalnız bilerek "Göster"e basınca (ve kayıt altına
// alınarak) açılır. Kayıtlı telefonlar karışık biçimde: 5xxxxxxxxx (çoğu),
// 05xxxxxxxxx, 905xxxxxxxxx ve birkaç serbest biçim.

export function telefonMaskele(telefon: string | null | undefined): string | null {
  const rakamlar = (telefon ?? "").replace(/\D/g, "");
  if (!rakamlar) return null;
  if (rakamlar.length >= 10) {
    const on = rakamlar.slice(-10);
    return `0${on.slice(0, 3)} *** ** ${on.slice(-2)}`;
  }
  return rakamlar.length >= 4 ? `*** ${rakamlar.slice(-2)}` : "***";
}
