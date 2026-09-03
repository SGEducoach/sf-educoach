export const ETKINLIK_BRANSLARI = ["Beden Eğitimi", "Müzik"] as const;
export function etkinlikBransiMi(brans:string|null|undefined):boolean{return ETKINLIK_BRANSLARI.includes(brans as typeof ETKINLIK_BRANSLARI[number]);}
export type EtkinlikAtamaDurumu="karar_bekliyor"|"kabul"|"reddedildi";
export interface EtkinlikOgrencisi{id:string;ad:string;sinifId:string|null;sinifAdi:string}
export interface EtkinlikGrubu{id:string;isim:string;uyeler:EtkinlikOgrencisi[]}
export interface EtkinlikAtamasi{id:string;grupIsmi:string;etkinlikIsmi:string;tarih:string;baslangicSaat:string;bitisSaat:string;durum:EtkinlikAtamaDurumu;cakisiyor:boolean;redGerekcesi:string|null}
