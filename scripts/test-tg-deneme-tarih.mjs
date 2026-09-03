import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path,deps={}) {
  const exports={};
  const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>deps[name]}); return exports;
}
const dates=load('src/lib/tg-deneme-tarih.ts');
for (const [input,expected] of [
  ['29.08.2026','2026-08-29'],['29/08/2026','2026-08-29'],['2026-08-29','2026-08-29'],
  ['29 Ağustos 2026','2026-08-29'],['29-31 Ağustos 2026','2026-08-31'],
  ['18 Eylül 2026 - 14 Haziran 2027','2027-06-14'],
  ['29.08.2026 - 02.09.2026','2026-09-02'],
  ['2026-2027 Eğitim Öğretim Yılı',null],['31.02.2026',null],['29.02.2028','2028-02-29']
]) assert.equal(dates.tgDenemeBitisTarihi(input),expected,input);
const feed=load('src/lib/tg-denemeleri.ts',{
  '@/lib/tg-deneme-tarih':dates,
  '@/lib/tarih':{bugununTarihiTR:()=> '2026-08-31'},
  '@/lib/tg-deneme-ilanlari':{tgDenemeDosyaUrl:()=>'/test.png'}
});
const notices=[{id:'expired',tarih:'29.08.2026'}, {id:'today',tarih:'31.08.2026'}, {id:'unknown',tarih:'2026-2027 Eğitim Öğretim Yılı'}];
const ids=feed.tgDenemeAkisiOlustur(notices).map(x=>x.id);
assert(!ids.includes('ilan-expired'));
assert(ids.includes('ilan-today'));
assert(ids.includes('ilan-unknown'));
assert(!feed.tgDenemeAkisiOlustur(notices,'2026-09-01').some(x=>x.id==='ilan-today'));
assert.equal(feed.tgDenemeAkisiOlustur([],'2099-01-01').length,0);
console.log('PASS: Turkish/numeric date ranges, invalid dates, expiry boundary, unknown dates, empty feed.');
