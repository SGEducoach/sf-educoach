import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const data = JSON.parse(await fs.readFile(new URL('./source-data.json', import.meta.url), 'utf8'));
const outDir = new URL('./', import.meta.url);
await fs.mkdir(outDir, { recursive: true });
const outputPath = new URL('konu_haritasi_ogretmen_inceleme_2026-10-11.xlsx', outDir);
const sourceDate = '10.10.2026';
const names = ['Elbistan Bist Fen Lisesi', 'Kariyerim', 'Sefu Ortaokulu'];
const schools = names.map(name => data.schools.find(s => s.ad === name));
if (schools.some(s => !s)) throw new Error('Beklenen kurumlardan biri kaynakta yok.');

const grouped = (items, getKey) => {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
};
const globalSub = grouped(data.globalSubtopics, a => `${a.ders}|${a.ust_konu}`);
const schoolSub = grouped(data.schoolSubtopics, a => `${a.school_id}|${a.ders}|${a.ust_konu}`);
const themes = grouped(data.middleThemes, t => t.ders_id);
const outcomes = grouped(data.middleOutcomes, o => o.tema_id);

// Teacher-facing rows: subject, level, parent, existing title, type, decision,
// proposed title, reason, reviewer, validation status, stable source key.
function makeHighRows(school) {
  const rows = [];
  const seen = new Set();
  const topics = [...data.highTopics].sort((a,b) => a.ders.localeCompare(b.ders,'tr') || a.seviye.localeCompare(b.seviye,'tr') || a.konu.localeCompare(b.konu,'tr'));
  for (const topic of topics) {
    const topicKey = `${topic.ders}|${topic.konu}`;
    rows.push([topic.ders,topic.seviye,'',topic.konu,'Üst konu','','','','','',`${school.id}|ust|${topic.ders}|${topic.seviye}|${topic.konu}`]);
    for (const sub of [...(globalSub.get(topicKey) ?? [])].sort((a,b) => a.sira-b.sira)) {
      rows.push([topic.ders,topic.seviye,topic.konu,sub.alt_baslik,'Alt başlık','','','','','',`${school.id}|ortak|${sub.id}`]);
    }
    for (const sub of schoolSub.get(`${school.id}|${topicKey}`) ?? []) {
      rows.push([topic.ders,topic.seviye,topic.konu,sub.alt_baslik,'Kurum başlığı','','','','','',`${school.id}|kurum|${sub.id}`]);
      seen.add(sub.id);
    }
  }
  for (const sub of data.schoolSubtopics.filter(a => a.school_id === school.id && !seen.has(a.id))) {
    rows.push([sub.ders,'Belirtilmemiş',sub.ust_konu,sub.alt_baslik,'Kurum başlığı','','','','','',`${school.id}|kurum|${sub.id}`]);
  }
  return rows;
}

function makeMiddleRows(school) {
  const review = [], detail = [];
  const courses = [...data.middleCourses].sort((a,b) => Number(a.sinif_seviyesi)-Number(b.sinif_seviyesi) || a.sira-b.sira);
  for (const course of courses) {
    const level = `${course.sinif_seviyesi}. Sınıf`;
    for (const theme of [...(themes.get(course.id) ?? [])].sort((a,b) => a.sira-b.sira)) {
      const kind = theme.tur === 'unite' ? 'Ünite' : theme.tur === 'beceri' ? 'Beceri' : 'Tema';
      review.push([course.ad,level,'',theme.ad ?? '[Başlık boş]',kind,'','','','','',`${school.id}|tema|${theme.id}`]);
      for (const [index, sub] of (theme.alt_basliklar ?? []).entries()) {
        review.push([course.ad,level,theme.ad ?? theme.kod,sub,'Konu başlığı','','','','','',`${school.id}|alt|${theme.id}|${index+1}`]);
      }
      for (const outcome of [...(outcomes.get(theme.id) ?? [])].sort((a,b) => a.sira-b.sira)) {
        detail.push([course.ad,level,theme.ad ?? theme.kod,outcome.metin,'Öğrenme çıktısı','','','','','',`${school.id}|cikti|${outcome.id}`]);
      }
    }
  }
  return {review,detail};
}

const highFen = makeHighRows(schools[0]);
const highKariyerim = makeHighRows(schools[1]);
const middle = makeMiddleRows(schools[2]);
const wb = Workbook.create();
const start = wb.worksheets.add('Nasıl doldurulur');
const fen = wb.worksheets.add('Fen Lisesi');
const kariyerim = wb.worksheets.add('Kariyerim');
const orta = wb.worksheets.add('Sefu Ortaokulu');
const add = wb.worksheets.add('Eksik konu ekle');
const detail = wb.worksheets.add('Ortaokul çıktıları');

const C = {navy:'#173B57',ink:'#1C3340',muted:'#607486',line:'#DCE5EB',pale:'#EAF1F5',yellow:'#FFF2CB',green:'#E5F3E8',red:'#FBE2E2',orange:'#FFE4B0'};
start.tabColor=C.navy; fen.tabColor='#2D6688'; kariyerim.tabColor='#2D6688'; orta.tabColor='#467C5B'; add.tabColor='#A87930'; detail.tabColor='#99AAB5';

function base(sheet, cols, end) {
  sheet.showGridLines=false;
  sheet.getRange(`A1:${cols}${end}`).format.font={name:'Arial',size:10,color:C.ink};
  sheet.getRange(`A1:${cols}${end}`).format.verticalAlignment='center';
  sheet.getRange('A2').format.font={name:'Arial',size:15,bold:true,color:C.navy};
}

function writeReview(sheet, title, rows, tableName, note) {
  const first=9, end=first+rows.length;
  base(sheet,'K',end);
  sheet.getRange('A2').values=[[title]];
  sheet.getRange('A3').values=[['1  Ders filtresinden kendi dersini seç.  2  Sarı Karar alanından seçim yap.  3  Gerekirse yeni başlık veya gerekçe yaz.']];
  sheet.getRange('A4').values=[['Doğru: başka bilgi gerekmez.  Değişecek: yeni başlık zorunlu.  Çıkarılacak: nedenini yaz.  Boş karar: henüz incelenmedi.']];
  sheet.getRange('A5').values=[['İncelenen']];
  sheet.getRange('B5').formulas=[[`=COUNTIF(F${first+1}:F${end},"Doğru")+COUNTIF(F${first+1}:F${end},"Değişecek")+COUNTIF(F${first+1}:F${end},"Çıkarılacak")`]];
  sheet.getRange('C5').values=[['Toplam başlık']];
  sheet.getRange('D5').values=[[rows.length]];
  sheet.getRange('E5').values=[['Eksik bilgi']];
  sheet.getRange('F5').formulas=[[`=COUNTIF(J${first+1}:J${end},"Yeni başlık yazın")+COUNTIF(J${first+1}:J${end},"Gerekçe yazın")`]];
  sheet.getRange('A6').values=[['Yalnız sarı sütunları doldurun. Öğretmen adı paylaşımda izleme içindir; her satırda zorunlu değildir.']];
  sheet.getRange('A7').values=[[note]];
  sheet.getRange('A9:K9').values=[['Ders','Sınıf / düzey','Bağlı olduğu konu','Mevcut başlık','Başlık türü','Karar','Yeni başlık önerim','Gerekçem / notum','İnceleyen öğretmen','Kontrol','Kayıt anahtarı']];
  for(let offset=0;offset<rows.length;offset+=400) {
    const chunk=rows.slice(offset,offset+400);
    sheet.getRangeByIndexes(first+offset,0,chunk.length,11).values=chunk;
  }
  sheet.getRange('J10').formulas=[['=IF(F10="","İncelenmedi",IF(F10="Değişecek",IF(G10="","Yeni başlık yazın","Tamam"),IF(F10="Çıkarılacak",IF(H10="","Gerekçe yazın","Tamam"),"Tamam")))']];
  if(end>10) sheet.getRange(`J10:J${end}`).fillDown();
  sheet.getRange(`F10:I${end}`).format.fill=C.yellow;
  sheet.getRange(`J10:J${end}`).format.fill=C.pale;
  sheet.getRange('A9:K9').format={fill:C.navy,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:35,verticalAlignment:'center',wrapText:true,horizontalAlignment:'center'};
  sheet.getRange(`A10:K${end}`).format.rowHeight=24;
  sheet.getRange(`A10:K${end}`).format.borders={insideHorizontal:{style:'thin',color:C.line}};
  sheet.getRange('A5:F5').format={fill:C.pale,font:{name:'Arial',size:10,bold:true,color:C.navy},rowHeight:28};
  sheet.getRange('A3:K4').format.font={name:'Arial',size:10,color:C.muted};
  sheet.getRange('A6:K7').format.font={name:'Arial',size:10,color:C.muted};
  const widths={A:23,B:16,C:36,D:55,E:19,F:17,G:42,H:39,I:24,J:23,K:43};
  for(const [col,width] of Object.entries(widths)) sheet.getRange(`${col}1:${col}${end}`).format.columnWidth=width;
  sheet.getRange(`F10:F${end}`).dataValidation={rule:{type:'list',values:['Doğru','Değişecek','Çıkarılacak']}};
  sheet.getRange(`F10:F${end}`).conditionalFormats.add('containsText',{text:'Doğru',format:{fill:C.green,font:{color:'#28613B'}}});
  sheet.getRange(`F10:F${end}`).conditionalFormats.add('containsText',{text:'Değişecek',format:{fill:C.orange,font:{color:'#764B00'}}});
  sheet.getRange(`F10:F${end}`).conditionalFormats.add('containsText',{text:'Çıkarılacak',format:{fill:C.red,font:{color:'#9A2C2C'}}});
  sheet.getRange(`J10:J${end}`).conditionalFormats.add('containsText',{text:'yazın',format:{fill:C.red,font:{bold:true,color:'#9A2C2C'}}});
  const table=sheet.tables.add(`A9:K${end}`,true,tableName);
  table.showFilterButton=true;
  sheet.freezePanes.freezeRows(9);
  return end;
}

const sourceNote=`Kaynak: uygulama konu haritası ve kurum kayıtları, ${sourceDate}. Bu form veritabanını kendiliğinden değiştirmez.`;
writeReview(fen,'Fen Lisesi konu incelemesi',highFen,'FenKonuInceleme',sourceNote);
writeReview(kariyerim,'Kariyerim konu incelemesi',highKariyerim,'KariyerimKonuInceleme',sourceNote);
writeReview(orta,'Sefu Ortaokulu konu incelemesi',middle.review,'SefuKonuInceleme',`Ünite, tema ve konu başlıkları burada. Öğrenme çıktıları ayrı sekmede isteğe bağlı incelenir. Kaynak: aktif ortaokul müfredatı, ${sourceDate}.`);
writeReview(detail,'Ortaokul öğrenme çıktıları',middle.detail,'OrtaokulCiktilari',`Bu bölüm ayrıntılı inceleme içindir. Önce “Sefu Ortaokulu” sekmesindeki ünite ve konu başlıklarını kontrol edin. Kaynak: aktif ortaokul müfredatı, ${sourceDate}.`);

base(start,'H',21);
start.getRange('A2').values=[['Konu haritası incelemesi']];
start.getRange('A3').values=[['Öğretmen için kısa kullanım rehberi']];
start.getRange('A5:B5').values=[['Adım','Ne yapacağım?']];
start.getRange('A6:B9').values=[
  ['1','Kurum sekmeni aç. “Ders” başlığındaki filtreyle yalnız kendi dersini göster.'],
  ['2','Her başlığın sarı “Karar” hücresinden Doğru, Değişecek veya Çıkarılacak seç.'],
  ['3','Değişecek ise “Yeni başlık önerim” alanını; Çıkarılacak ise “Gerekçem” alanını doldur.'],
  ['4','Listede hiç olmayan başlığı “Eksik konu ekle” sekmesine yaz. Dosyayı kaydedip geri gönder.'],
];
start.getRange('A11:B11').values=[['Karar','Anlamı']];
start.getRange('A12:B15').values=[
  ['Doğru','Başlık olduğu gibi kalır. Başka alan doldurma.'],
  ['Değişecek','Mevcut başlık yerine önerdiğin yeni adı açıkça yaz.'],
  ['Çıkarılacak','Başlığın neden kaldırılması gerektiğini kısaca açıkla.'],
  ['Boş','Bu satır henüz incelenmedi; karar vermediğin satırı boş bırak.'],
];
start.getRange('A17').values=[['Örnek: “Sözcükte Anlam” başlığı “Sözcük ve Söz Gruplarında Anlam” olmalıysa Karar = Değişecek, yeni başlık alanına öneriyi yaz.']];
start.getRange('A18').values=[['Örnek yalnızca doldurma biçimini gösterir; gerçek müfredat kararı değildir.']];
start.getRange('A20').values=[['Kapsam: Fen Lisesi, Kariyerim ve Sefu Ortaokulu. Mevcut başlıklar değişmeden korunur; öneriler ayrıca incelenir.']];
start.getRange('A5:B5').format={fill:C.navy,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:30};
start.getRange('A11:B11').format={fill:C.navy,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:30};
start.getRange('A6:B9').format.rowHeight=31;
start.getRange('A12:B15').format.rowHeight=29;
start.getRange('A17:B20').format.font={name:'Arial',size:10,color:C.muted};
start.getRange('A1:A21').format.columnWidth=26;
start.getRange('B1:B21').format.columnWidth=100;
start.getRange('C1:H21').format.columnWidth=12;
start.getRange('A6:A9').format.fill=C.pale;
start.getRange('A12').format.fill=C.green;
start.getRange('A13').format.fill=C.orange;
start.getRange('A14').format.fill=C.red;

const addEnd=105;
base(add,'H',addEnd);
add.getRange('A2').values=[['Listede olmayan konuyu ekle']];
add.getRange('A3').values=[['Yalnız mevcut listede hiç bulunmayan başlıkları yazın. Var olan bir başlığı değiştirmek için kurum sekmesindeki sarı alanları kullanın.']];
add.getRange('A4').values=[['Kurum, ders, sınıf/düzey ve önerdiğiniz başlık yeterlidir. “Kontrol” sütunu eksik alanları gösterir.']];
add.getRange('A7:H7').values=[['Kurum','Ders','Sınıf / düzey','Bağlı olduğu konu','Yeni başlık önerim','Gerekçem / notum','İnceleyen öğretmen','Kontrol']];
add.getRange('H8').formulas=[['=IF(COUNTA(A8:G8)=0,"",IF(OR(A8="",B8="",C8="",E8=""),"Kurum, ders, düzey ve başlık yazın","Tamam"))']];
add.getRange(`H8:H${addEnd}`).fillDown();
add.getRange(`A8:G${addEnd}`).format.fill=C.yellow;
add.getRange(`H8:H${addEnd}`).format.fill=C.pale;
add.getRange(`A8:A${addEnd}`).dataValidation={rule:{type:'list',values:names}};
add.getRange('A7:H7').format={fill:C.navy,font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},rowHeight:34,wrapText:true,horizontalAlignment:'center'};
add.getRange(`A8:H${addEnd}`).format.rowHeight=25;
add.getRange(`H8:H${addEnd}`).conditionalFormats.add('containsText',{text:'yazın',format:{fill:C.red,font:{bold:true,color:'#9A2C2C'}}});
const addWidths={A:31,B:24,C:18,D:38,E:54,F:46,G:26,H:40};
for(const [col,width] of Object.entries(addWidths)) add.getRange(`${col}1:${col}${addEnd}`).format.columnWidth=width;
add.tables.add(`A7:H${addEnd}`,true,'EksikKonuOnerileri').showFilterButton=true;
add.freezePanes.freezeRows(7);

wb.recalculate();
for(const [sheetName,range,name] of [
  ['Nasıl doldurulur','A1:B20','guide'],['Fen Lisesi','A1:J15','fen'],
  ['Kariyerim','A1:J15','kariyerim'],['Sefu Ortaokulu','A1:J15','orta'],
  ['Eksik konu ekle','A1:H14','add'],['Ortaokul çıktıları','A1:J15','detail'],
]) {
  const preview=await wb.render({sheetName,range,scale:1.25,format:'png'});
  await fs.writeFile(new URL(`./preview-new-${name}.png`,import.meta.url),new Uint8Array(await preview.arrayBuffer()));
}
const errors=await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:20},summary:'final formula error scan',maxChars:2000});
console.log('ERROR_SCAN',errors.ndjson);
const file=await SpreadsheetFile.exportXlsx(wb);
await file.save(outputPath.pathname.replace(/^\//,''));
console.log(JSON.stringify({output:outputPath.pathname,fen:highFen.length,kariyerim:highKariyerim.length,orta:middle.review.length,ortaCiktilari:middle.detail.length}));
