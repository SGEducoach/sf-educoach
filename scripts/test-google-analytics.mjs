import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
function load(path,deps,globals={}) {
  const exports={};
  const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require:n=>deps[n]??{},...globals});return exports;
}
const requests=[];
let fail=false;
const env={};
const {googleAnalyticsGetir}=load('src/lib/google-analytics.ts',{'google-auth-library':{GoogleAuth:class{async getAccessToken(){return 'test-token';}}}},
  {process:{env},AbortSignal,fetch:async(url,options)=>{
    if(fail)throw new Error('SECRET');
    const body=JSON.parse(options.body);requests.push(body);
    return {ok:true,json:async()=>({rows:body.dimensions?[{dimensionValues:[{value:'20260830'}],metricValues:[{value:'4'}]}]:[{metricValues:[{value:'3'},{value:'9'},{value:'12'},{value:'0.5'}]}]})};
  }});
assert.equal((await googleAnalyticsGetir(28)).durum,'kurulum');assert.equal(requests.length,0);
Object.assign(env,{GA4_PROPERTY_ID:'G-invalid',GA4_CLIENT_EMAIL:'test@example.test',GA4_PRIVATE_KEY:'test'});
assert.equal((await googleAnalyticsGetir(28)).durum,'kurulum');assert.equal(requests.length,0);
env.GA4_PROPERTY_ID='123456';
const data=await googleAnalyticsGetir(999);
assert.equal(data.durum,'hazir');assert.equal(data.gun,28);assert.equal(data.ozet[0],3);assert.equal(data.ozet[3],0.5);
assert.equal(requests.length,4);assert.equal(requests[0].dateRanges[0].endDate,'yesterday');assert.equal(requests[0].dimensions,undefined);
fail=true;const failed=await googleAnalyticsGetir(7);assert.equal(failed.durum,'hata');assert(!JSON.stringify(failed).includes('SECRET'));
for(const role of [null,'ogrenci','ogretmen','mudur']){
  let reads=0;
  const page=load('src/app/yonetici/google-analytics/page.tsx',{
    '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:role?{id:'test'}:null}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role}})})})})})},
    '@/lib/google-analytics':{googleAnalyticsGetir:async()=>{reads++;}},'next/navigation':{redirect:()=>{throw new Error('redirect');}}
  });
  await assert.rejects(page.default({searchParams:Promise.resolve({})}),/redirect/);assert.equal(reads,0);
}
console.log('PASS: missing/invalid configuration, GA totals, date range, safe API failure, and non-admin access prevention.');
