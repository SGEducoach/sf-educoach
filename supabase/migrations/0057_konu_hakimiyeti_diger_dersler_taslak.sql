-- Faz H5 (devam) — Fizik, Kimya, Biyoloji, Coğrafya, Tarih, Felsefe,
-- Din Kültürü için 9-10-11. sınıf alt konu TASLAĞI. Matematik'in
-- (migration 0056) devamı — kullanıcı Matematik'i çalıştırıp onayladıktan
-- sonra "edebiyat hariç evet" diyerek diğer derslere genişletilmesini istedi.
-- Edebiyat (ve Türkçe) bilinçli olarak DIŞARIDA — bu ikisi zaten düz TYT/AYT
-- listesi olarak kalıyor, hiyerarşiye girmiyor (bkz. plan, Faz K4 revizyonu).
--
-- ÖNEMLİ: Bu içerik MEB 2024 Maarif Modeli çerçevesine dair genel bilgiyle
-- hazırlanan bir TASLAK — kaynak dokümanla birebir doğrulanmadı (Matematik'in
-- aksine, mevcut 190 konunun kendisi kullanıcının sağladığı çerçeve
-- programlarından geliyordu; bu alt başlıklar İSE Claude'un genel bilgisiyle
-- üretildi). Çalıştırdıktan sonra /yonetici → Konu anlatımları → Müfredat
-- hiyerarşisi ekranından gözden geçirip yanlış/eksik olanları düzeltin/silin.
--
-- Aynı (ders, ust_konu, alt_baslik) satırını tekrar eklememek için
-- "insert ... where not exists" deseni kullanılıyor (0056 ile aynı) —
-- script birden çok kez çalıştırılırsa yinelenmez.

do $$
declare
  v_satirlar jsonb := '[
    {"ders": "Fizik", "ust": "Fizik Bilimi ve Kariyer Keşfi", "altlar": ["Fiziğin tanımı ve alt dalları", "Bilimsel yöntem ve model kavramı", "Fizikle ilgili meslek ve kariyer alanları", "Fiziğin günlük hayattaki uygulamaları"]},
    {"ders": "Fizik", "ust": "Temel-Türetilmiş Nicelikler, Vektörler, Hareket", "altlar": ["Temel ve türetilmiş büyüklükler, birim sistemleri", "Skaler ve vektörel büyüklükler", "Vektörlerin bileşenlerine ayrılması ve toplanması", "Konum, yer değiştirme ve alınan yol"]},
    {"ders": "Fizik", "ust": "Akışkanlar (Basınç, Kaldırma Kuvveti)", "altlar": ["Katı basıncı", "Sıvı basıncı ve Pascal prensibi", "Açık hava basıncı", "Kaldırma kuvveti ve Arşimet prensibi"]},
    {"ders": "Fizik", "ust": "Isı, Sıcaklık ve Hâl Değişimi", "altlar": ["Isı ve sıcaklık kavramları", "Genleşme", "Hâl değişim grafikleri", "Isının yayılma yolları (iletim, taşınım, ışıma)"]},
    {"ders": "Fizik", "ust": "Sabit Hızlı ve Sabit İvmeli Hareket", "altlar": ["Sabit hızlı (düzgün) doğrusal hareket", "Hız-zaman ve konum-zaman grafikleri", "Sabit ivmeli (düzgün değişen) doğrusal hareket", "Serbest düşme hareketi"]},
    {"ders": "Fizik", "ust": "İş, Enerji ve Güç", "altlar": ["İş kavramı ve hesaplanması", "Kinetik ve potansiyel enerji", "Enerjinin korunumu", "Güç ve verim"]},
    {"ders": "Fizik", "ust": "Basit Elektrik Devreleri (Ohm Yasası)", "altlar": ["Elektrik akımı ve gerilim", "Ohm yasası", "Seri ve paralel bağlı devreler", "Elektriksel güç ve enerji"]},
    {"ders": "Fizik", "ust": "Dalgalar (Temel Kavramlar, Periyodik Hareket, Rezonans)", "altlar": ["Periyodik hareket ve titreşim", "Dalga çeşitleri ve temel özellikleri", "Yay dalgaları ve su dalgaları", "Rezonans (çınlama)"]},
    {"ders": "Fizik", "ust": "Newton Hareket Yasaları, Sürtünme, Çembersel Hareket", "altlar": ["Newton'un hareket yasaları", "Sürtünme kuvveti", "Çembersel hareket ve merkezcil kuvvet", "Bağıl hareket"]},
    {"ders": "Fizik", "ust": "Elektrik Alan, Manyetik Alan ve İndüksiyon", "altlar": ["Elektrik alan ve elektrik potansiyeli", "Manyetik alan ve manyetik kuvvet", "Elektromanyetik indüksiyon", "Alternatif akım temelleri"]},
    {"ders": "Fizik", "ust": "Yarı İletkenlik ve Süper İletkenlik", "altlar": ["İletken, yalıtkan ve yarı iletken maddeler", "Diyot ve temel yarı iletken uygulamaları", "Süper iletkenlik kavramı", "Yarı iletken teknolojisinin uygulama alanları"]},
    {"ders": "Fizik", "ust": "Optik (Aynalar, Kırılma, Mercekler)", "altlar": ["Işığın yansıması ve düzlem/küresel aynalar", "Işığın kırılması ve Snell yasası", "Mercekler ve görüntü oluşumu", "Optik araçlar (göz, mikroskop, teleskop)"]},

    {"ders": "Kimya", "ust": "Kimya Bilimine Giriş, Atom Teorileri ve Periyodik Sistem", "altlar": ["Kimyanın çalışma alanları ve önemi", "Atom modellerinin tarihsel gelişimi", "Atomun yapısı ve elektron dizilimi", "Periyodik sistem ve periyodik özellikler"]},
    {"ders": "Kimya", "ust": "Kimyasal Türler Arası Etkileşimler", "altlar": ["Güçlü etkileşimler (iyonik, kovalent, metalik bağ)", "Zayıf etkileşimler (Van der Waals, hidrojen bağı)", "Molekül geometrisi", "Etkileşimlerin madde özelliklerine etkisi"]},
    {"ders": "Kimya", "ust": "Nanoparçacıklar ve Ekolojik Sürdürülebilirlik", "altlar": ["Nanoteknoloji kavramı ve temel ilkeleri", "Nanoparçacıkların özellikleri", "Ekolojik ayak izi", "Sürdürülebilirlik ve kimya"]},
    {"ders": "Kimya", "ust": "Kimyasal Tepkimeler ve Mol Kavramı, Gazlar", "altlar": ["Mol kavramı ve Avogadro sayısı", "Kimyasal tepkime denklemleri ve denkleştirme", "Sınırlayıcı bileşen ve tepkime verimi", "Gazların genel özellikleri ve gaz yasaları"]},
    {"ders": "Kimya", "ust": "Çözeltiler", "altlar": ["Çözünme olayı ve çözünürlüğü etkileyen faktörler", "Derişim birimleri (molarite, kütlece yüzde)", "Karışımların ayrılması", "Koligatif özellikler (temel düzey)"]},
    {"ders": "Kimya", "ust": "Yeşil Kimya ve Çevresel Sürdürülebilirlik", "altlar": ["Yeşil kimyanın 12 ilkesi", "Çevre kirliliği türleri", "Geri dönüşüm ve atık yönetimi", "Sürdürülebilir kimyasal üretim"]},
    {"ders": "Kimya", "ust": "Kimyasal Tepkimelerde Enerji (Entalpi) ve Hız", "altlar": ["Tepkime ısısı ve entalpi", "Ekzotermik ve endotermik tepkimeler", "Tepkime hızını etkileyen faktörler", "Hız denklemi ve aktivasyon enerjisi"]},
    {"ders": "Kimya", "ust": "Kimyasal Denge, Asit-Baz Dengesi", "altlar": ["Dinamik denge kavramı", "Denge sabiti ve Le Chatelier ilkesi", "Asit-baz teorileri", "pH ve pOH hesaplamaları"]},
    {"ders": "Kimya", "ust": "Nanoteknoloji ve Sürdürülebilirlik", "altlar": ["Nanomalzemelerin sınıflandırılması", "Nanoteknolojinin sanayi uygulamaları", "Nanoteknolojide etik ve güvenlik", "Sürdürülebilir nanoteknoloji"]},

    {"ders": "Biyoloji", "ust": "Yaşam Bilimi Biyoloji", "altlar": ["Biyolojinin alt dalları ve canlı bilimlerle ilişkisi", "Bilimsel araştırma yöntemleri", "Biyolojinin günlük yaşam ve teknolojideki yeri", "Biyoetik kavramı"]},
    {"ders": "Biyoloji", "ust": "Hücrenin Temel Bileşenleri", "altlar": ["Hücrenin keşfi ve hücre teorisi", "Prokaryot ve ökaryot hücre yapısı", "Hücre organelleri ve görevleri", "Hücre zarından madde geçişi"]},
    {"ders": "Biyoloji", "ust": "Sınıflandırma ve Biyoçeşitlilik", "altlar": ["Canlıların sınıflandırılma ilkeleri", "Beş alem sistemi", "Biyoçeşitliliğin önemi", "Türkiye'nin biyoçeşitliliği"]},
    {"ders": "Biyoloji", "ust": "Fotosentez ve Hücresel Solunum", "altlar": ["Fotosentezin evreleri (ışık ve karanlık tepkimeler)", "Fotosentezi etkileyen faktörler", "Hücresel solunum evreleri (glikoliz, krebs, ETS)", "Fermantasyon"]},
    {"ders": "Biyoloji", "ust": "Ekosistemler ve Madde Döngüleri", "altlar": ["Ekosistem bileşenleri ve enerji akışı", "Karbon, azot ve su döngüleri", "Popülasyon ekolojisi", "Ekolojik ayak izi ve insan etkisi"]},
    {"ders": "Biyoloji", "ust": "Canlılarda Tepki (Sinir Sistemi ve Hareket)", "altlar": ["Sinir sisteminin yapısı ve nöron", "Merkezi ve çevresel sinir sistemi", "Duyu organları", "Destek ve hareket sistemi"]},
    {"ders": "Biyoloji", "ust": "Homeostazi ve Endokrin Sistem", "altlar": ["Homeostazi kavramı", "Endokrin bezler ve hormonlar", "Hormonal düzenleme mekanizmaları", "Boşaltım sistemi ve homeostazideki rolü"]},

    {"ders": "Coğrafya", "ust": "Coğrafyanın Doğası", "altlar": ["Coğrafyanın konusu ve bölümleri", "Coğrafi bakış açısı", "Coğrafyanın diğer bilimlerle ilişkisi", "Coğrafi araştırma yöntemleri"]},
    {"ders": "Coğrafya", "ust": "Mekânsal Bilgi Teknolojileri — Harita Bilgisi", "altlar": ["Harita çeşitleri ve ölçek kavramı", "Harita projeksiyonları", "İzohips (eş yükselti) haritaları ve profil çıkarma", "Coğrafi Bilgi Sistemleri'ne (CBS) giriş"]},
    {"ders": "Coğrafya", "ust": "İklim Sistemi ve Türleri", "altlar": ["Atmosferin yapısı ve katmanları", "İklim elemanları (sıcaklık, basınç, rüzgar, nem, yağış)", "Dünya'nın iklim tipleri", "Türkiye'nin iklim özellikleri"]},
    {"ders": "Coğrafya", "ust": "Nüfus (Dağılış, Hareketler, Piramitler)", "altlar": ["Nüfusun dağılışını etkileyen faktörler", "Göç ve göç türleri", "Nüfus piramitleri ve yorumlanması", "Türkiye'nin nüfus özellikleri"]},
    {"ders": "Coğrafya", "ust": "Ekonomik Faaliyetleri Etkileyen Coğrafi Faktörler", "altlar": ["Tarımı etkileyen coğrafi faktörler", "Sanayiyi etkileyen coğrafi faktörler", "Ticareti ve ulaşımı etkileyen faktörler", "Turizmi etkileyen coğrafi faktörler"]},
    {"ders": "Coğrafya", "ust": "Afet Türleri ve Bütüncül Afet Yönetimi", "altlar": ["Doğal afet türleri (deprem, sel, heyelan vb.)", "Afetlerin oluşum nedenleri", "Afet risk yönetimi", "Afet öncesi-sırası-sonrası alınacak önlemler"]},
    {"ders": "Coğrafya", "ust": "Bölge ve Bölge Sınırı", "altlar": ["Bölge kavramı ve bölge türleri", "Bölge sınırlarının belirlenmesi", "Türkiye'nin coğrafi bölgeleri", "Kalkınmada öncelikli yöreler"]},
    {"ders": "Coğrafya", "ust": "Coğrafi Bakış, CBS ve Uzaktan Algılama", "altlar": ["Coğrafi Bilgi Sistemleri'nin bileşenleri", "Uzaktan algılama teknikleri", "Küresel Konumlama Sistemi (GPS/GNSS)", "CBS'nin günlük hayatta kullanım alanları"]},
    {"ders": "Coğrafya", "ust": "Yer Şekilleri Oluşumu (Tektonik, Aşınım-Birikim Süreçleri)", "altlar": ["İç kuvvetler (tektonizma, volkanizma, deprem)", "Dış kuvvetler (akarsu, rüzgar, buzul, dalga aşındırması)", "Türkiye'nin yer şekilleri", "Karstik yer şekilleri"]},
    {"ders": "Coğrafya", "ust": "Yerleşmelerin Kuruluşu ve Fonksiyonları", "altlar": ["Yerleşmeyi etkileyen doğal ve beşeri faktörler", "Kır ve şehir yerleşmeleri", "Yerleşme fonksiyonları (idari, ticari, sanayi vb.)", "Türkiye'de şehirleşme süreci"]},
    {"ders": "Coğrafya", "ust": "Türkiye Ekonomisinin Sektörel Dağılımı", "altlar": ["Tarım sektörü ve Türkiye tarımı", "Sanayi sektörü ve Türkiye sanayisi", "Hizmetler sektörü", "Sektörler arası geçişler ve ekonomik gelişmişlik"]},
    {"ders": "Coğrafya", "ust": "Mekânsal Sorunlar Karşısında Coğrafya Bilimi, Web Tabanlı CBS", "altlar": ["Mekânsal sorunların tespiti ve analizi", "Web tabanlı CBS uygulamaları", "Katılımcı haritalama", "Coğrafi verinin karar alma süreçlerinde kullanımı"]},
    {"ders": "Coğrafya", "ust": "Su Kaynakları ve Sürdürülebilir Kullanımı", "altlar": ["Dünya ve Türkiye'nin su kaynakları", "Su kıtlığı ve su stresi", "Sürdürülebilir su yönetimi", "Sınır aşan sular sorunu"]},
    {"ders": "Coğrafya", "ust": "Yerleşmelerin Mekânsal Organizasyonu ve Etki Alanları", "altlar": ["Merkezi yer teorisi", "Şehirlerin etki alanları (hinterlant)", "Metropol ve megapol kavramları", "Kentleşme sorunları"]},
    {"ders": "Coğrafya", "ust": "Tarım, Madencilik, Enerji Kaynakları, Sanayileşme", "altlar": ["Tarım politikaları ve tarımsal verimlilik", "Madenler ve maden işletmeciliği", "Enerji kaynakları (yenilenebilir/yenilenemez)", "Sanayileşme süreçleri ve etkileri"]},
    {"ders": "Coğrafya", "ust": "Küresel İklim Değişikliği", "altlar": ["Küresel iklim değişikliğinin nedenleri", "İklim değişikliğinin etkileri", "Sera gazı emisyonları ve azaltım politikaları", "İklim değişikliğine uyum stratejileri"]},

    {"ders": "Tarih", "ust": "Tarih Bilimine Giriş", "altlar": ["Tarihin tanımı ve konusu", "Tarih biliminin yöntemi ve yardımcı bilimleri", "Zaman ve takvim kavramı", "Tarihi kaynaklar ve tasnifi"]},
    {"ders": "Tarih", "ust": "İlk Uygarlıklar ve Tarım Devrimi", "altlar": ["Tarih öncesi çağlar", "Tarım devriminin toplumsal etkileri", "Mezopotamya, Mısır ve Anadolu uygarlıkları", "İlk yazı ve hukuk sistemleri"]},
    {"ders": "Tarih", "ust": "Orta Çağ'da Dünya (Göçler, Devletler, Ticaret Yolları)", "altlar": ["Kavimler göçü ve etkileri", "Orta Çağ Avrupa'sında feodalite", "İpek ve Baharat yolları", "Orta Çağ İslam dünyası"]},
    {"ders": "Tarih", "ust": "Türklerin İslamiyeti Kabulü ve İlk Türk-İslam Devletleri", "altlar": ["Türklerin İslamiyet öncesi inanç ve devlet gelenekleri", "Türklerin İslamiyeti kabul süreci", "Karahanlılar ve Gazneliler", "Büyük Selçuklu Devleti"]},
    {"ders": "Tarih", "ust": "Beylikten Devlete Osmanlı (Kuruluş Dönemi)", "altlar": ["Anadolu Selçuklu Devleti'nin yıkılışı ve beylikler dönemi", "Osmanlı Devleti'nin kuruluşu", "İlk fetihler ve Balkanlara geçiş", "Devlet teşkilatının temelleri"]},
    {"ders": "Tarih", "ust": "Dünya Gücü Osmanlı (1453-1683)", "altlar": ["İstanbul'un fethi ve sonuçları", "Yavuz Sultan Selim dönemi fetihleri", "Kanuni dönemi ve altın çağ", "Klasik dönem devlet ve toplum yapısı"]},
    {"ders": "Tarih", "ust": "Değişen Dünya Dengeleri Karşısında Osmanlı (1683-1789)", "altlar": ["Duraklama ve gerileme dönemi gelişmeleri", "Coğrafi keşiflerin Osmanlı'ya etkisi", "Islahat hareketlerinin başlaması", "Karlofça ve sonrası antlaşmalar"]},
    {"ders": "Tarih", "ust": "Devrimler Çağında Osmanlı (1789-1908)", "altlar": ["Fransız İhtilali'nin etkileri", "III. Selim ve II. Mahmut dönemi ıslahatları", "Tanzimat ve Islahat fermanları", "I. ve II. Meşrutiyet"]},
    {"ders": "Tarih", "ust": "XX. Yüzyıl Başlarında Osmanlı ve I. Dünya Savaşı (1908-1918)", "altlar": ["Trablusgarp ve Balkan Savaşları", "I. Dünya Savaşı'nın nedenleri ve cepheleri", "Osmanlı'nın savaştaki cepheleri", "Mondros Ateşkes Antlaşması"]},

    {"ders": "Felsefe", "ust": "Felsefenin Anlamı ve Doğuşu", "altlar": ["Felsefenin tanımı ve temel kavramları", "Felsefenin doğuşunu hazırlayan koşullar", "Felsefi düşüncenin özellikleri", "Felsefe ile diğer disiplinlerin ilişkisi"]},
    {"ders": "Felsefe", "ust": "Mantık ve Argümantasyon", "altlar": ["Mantığın konusu ve önemi", "Kavram, önerme ve akıl yürütme", "Argüman türleri (tümdengelim, tümevarım)", "Geçerli ve sağlam argüman ayrımı"]},
    {"ders": "Felsefe", "ust": "Varlık Felsefesi", "altlar": ["Varlık felsefesinin temel soruları", "İdealizm ve materyalizm", "Varlığın yapısına ilişkin görüşler", "Varoluşçu yaklaşımlar"]},
    {"ders": "Felsefe", "ust": "Bilgi Felsefesi", "altlar": ["Bilginin kaynağı sorunu (rasyonalizm-empirizm)", "Doğruluk ölçütleri", "Bilgi türleri", "Septisizm ve dogmatizm"]},
    {"ders": "Felsefe", "ust": "Ahlak Felsefesi", "altlar": ["Ahlaki değer kavramı", "Ahlak yasasının kaynağı sorunu", "Özgürlük ve sorumluluk", "Erdem etiği ve fayda ahlakı"]},
    {"ders": "Felsefe", "ust": "Estetik ve Sanat Felsefesi", "altlar": ["Estetik ve güzellik kavramı", "Sanat eserinin özellikleri", "Sanatta öznellik-nesnellik tartışması", "Sanat ve toplum ilişkisi"]},
    {"ders": "Felsefe", "ust": "Siyaset Felsefesi", "altlar": ["Siyaset felsefesinin temel kavramları (iktidar, otorite, meşruiyet)", "Devlet biçimleri ve yönetim türleri", "Toplum sözleşmesi kuramları", "Özgürlük ve eşitlik tartışmaları"]},
    {"ders": "Felsefe", "ust": "Din Felsefesi", "altlar": ["Din felsefesinin konusu", "Tanrı'nın varlığına ilişkin görüşler", "Din-bilim-felsefe ilişkisi", "Dinin toplumsal işlevi"]},
    {"ders": "Felsefe", "ust": "Bilim Felsefesi", "altlar": ["Bilimin tanımı ve bilimsel yöntem", "Bilim felsefesinin temel sorunları", "Bilimsel açıklama modelleri", "Bilim-teknoloji-toplum ilişkisi"]},
    {"ders": "Felsefe", "ust": "Çevre Felsefesi ve Etik", "altlar": ["Çevre etiğinin temel kavramları", "İnsan merkezci ve doğa merkezci yaklaşımlar", "Sürdürülebilirlik ve gelecek kuşaklara sorumluluk", "Çevre sorunlarına felsefi yaklaşımlar"]},
    {"ders": "Felsefe", "ust": "Teknoloji Felsefesi", "altlar": ["Teknolojinin insan yaşamına etkileri", "Teknoloji ve etik sorunlar", "Yapay zeka ve felsefi tartışmalar", "Teknolojik determinizm"]},
    {"ders": "Felsefe", "ust": "Akıl-İnanç İlişkisi", "altlar": ["Akıl ve inanç kavramlarının felsefi temelleri", "Akıl-inanç ilişkisine dair farklı görüşler", "Din felsefesinde akılcılık", "Fideizm ve rasyonalizm tartışması"]},
    {"ders": "Felsefe", "ust": "Dil, Edebiyat ve Felsefe İlişkisi", "altlar": ["Dilin düşünceyle ilişkisi", "Dil felsefesinin temel sorunları", "Edebiyat ve felsefe etkileşimi", "Anlam ve yorum sorunu"]},
    {"ders": "Felsefe", "ust": "Mutluluk, Varoluş ve Kendi Olma", "altlar": ["Mutluluk kavramına felsefi yaklaşımlar", "Varoluşçu felsefede birey", "Otantiklik ve kendi olma", "Yaşamın anlamı sorunu"]},
    {"ders": "Felsefe", "ust": "Hukuk Felsefesi", "altlar": ["Hukuk felsefesinin temel kavramları", "Doğal hukuk ve pozitif hukuk", "Adalet kavramı", "Hukuk-ahlak ilişkisi"]},

    {"ders": "Din Kültürü", "ust": "İnsan ve İnsanın Yaratılışı", "altlar": ["İnsanın yaratılışına dair dini bilgiler", "İnsanın diğer varlıklardan farkı", "İnsanın Yaratıcı ile ilişkisi", "İnsanın sorumluluk bilinci"]},
    {"ders": "Din Kültürü", "ust": "İman Esasları", "altlar": ["İmanın tanımı ve şartları", "Allah'a iman", "Meleklere, kitaplara, peygamberlere iman", "Ahirete ve kadere iman"]},
    {"ders": "Din Kültürü", "ust": "İslam'da İbadetler", "altlar": ["İbadetin anlamı ve önemi", "Namaz, oruç, zekât, hac ibadetleri", "İbadetlerin bireysel ve toplumsal faydaları", "İbadetlerde kolaylık ilkesi"]},
    {"ders": "Din Kültürü", "ust": "İslam'da Ahlak İlkeleri", "altlar": ["Ahlakın tanımı ve İslam'daki yeri", "Temel ahlaki değerler (doğruluk, adalet, sabır vb.)", "Aile ve toplum ahlakı", "Kötü alışkanlıklardan korunma"]},
    {"ders": "Din Kültürü", "ust": "Hz. Muhammed'in Hayatı ve Örnekliği", "altlar": ["Hz. Muhammed'in doğumu ve gençliği", "Peygamberlik dönemi ve tebliğ süreci", "Hz. Muhammed'in örnek kişiliği", "Hz. Muhammed'in aile ve toplum hayatındaki örnekliği"]},
    {"ders": "Din Kültürü", "ust": "İslam Düşüncesinde Bilgi ve Varlık", "altlar": ["İslam düşüncesinde bilgi kaynakları", "Akıl-vahiy ilişkisi", "Varlık anlayışı", "İslam düşünce ekollerine giriş"]},
    {"ders": "Din Kültürü", "ust": "Allah İnancı ve Sıfatları", "altlar": ["Allah'ın varlığının delilleri", "Allah'ın zati ve subuti sıfatları", "Tevhit inancı", "Allah-insan ilişkisi"]},
    {"ders": "Din Kültürü", "ust": "Tevhit, Adalet ve Barış", "altlar": ["Tevhit ilkesinin toplumsal yansımaları", "İslam'da adalet anlayışı", "Barış ve hoşgörü ilkeleri", "Farklılıklara saygı"]},
    {"ders": "Din Kültürü", "ust": "Çevre, Teknoloji ve Ahlak", "altlar": ["İslam'da çevre bilinci", "Teknoloji kullanımında ahlaki sorumluluk", "Emanet bilinci", "Sürdürülebilir yaşam ve din"]},
    {"ders": "Din Kültürü", "ust": "İslam Düşüncesinde Yorum Farklılıkları (Mezhepler)", "altlar": ["Mezhep kavramı ve oluşum nedenleri", "İtikadi mezhepler", "Fıkhi mezhepler", "Mezhepler arası hoşgörü"]},
    {"ders": "Din Kültürü", "ust": "Kader ve İnsan Sorumluluğu", "altlar": ["Kader ve kaza kavramları", "İnsan iradesi ve özgürlüğü", "Kader-sorumluluk ilişkisi", "Kadere iman ile ilgili yanlış anlayışlar"]},
    {"ders": "Din Kültürü", "ust": "Din, Felsefe, Bilim ve Sanat İlişkisi", "altlar": ["Din-felsefe ilişkisi", "Din-bilim ilişkisi", "Din-sanat ilişkisi", "İslam medeniyetinde bilim ve sanat"]},
    {"ders": "Din Kültürü", "ust": "İslam Medeniyeti", "altlar": ["İslam medeniyetinin oluşumu", "İslam medeniyetinin bilim ve kültüre katkıları", "İslam medeniyetinde önemli merkezler", "İslam medeniyetinin günümüze etkileri"]},
    {"ders": "Din Kültürü", "ust": "Kötülük Problemi ve Dinî-Felsefi Yaklaşımlar", "altlar": ["Kötülük probleminin tanımı", "Kötülüğe dini yaklaşımlar", "Kötülüğe felsefi yaklaşımlar", "Sınav ve imtihan anlayışı"]},
    {"ders": "Din Kültürü", "ust": "Diğer Dinler: Yahudilik ve Hristiyanlık", "altlar": ["Yahudiliğin temel inanç esasları", "Hristiyanlığın temel inanç esasları", "Bu dinlerin kutsal kitapları ve ibadetleri", "İslam'ın diğer semavi dinlerle ortak ve farklı yönleri"]}
  ]'::jsonb;
  v_grup jsonb;
  v_alt text;
  v_sira int;
begin
  for v_grup in select * from jsonb_array_elements(v_satirlar) loop
    v_sira := 0;
    for v_alt in select * from jsonb_array_elements_text(v_grup->'altlar') loop
      if not exists (
        select 1 from public.mufredat_alt_konular
        where ders = (v_grup->>'ders') and ust_konu = (v_grup->>'ust') and alt_baslik = v_alt
      ) then
        insert into public.mufredat_alt_konular (ders, ust_konu, alt_baslik, sira)
        values (v_grup->>'ders', v_grup->>'ust', v_alt, v_sira);
      end if;
      v_sira := v_sira + 1;
    end loop;
  end loop;
end $$;
