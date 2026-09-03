// Regression test: execute the real server action with isolated Supabase mocks.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name] ?? {}, console });
  return exports;
}
const validators = load('src/lib/validators.ts');
async function scenario(tur, okulNo, expectedError, missingSchool = false) {
  const writes = [];
  const query = (table, admin) => {
    let update;
    const q = {
      select: () => q, eq: () => q,
      single: async () => ({ data: {role:'admin'} }),
      maybeSingle: async () => ({data: table === 'profiles'
        ? {role:'ogrenci',email:'student@example.test'}
        : missingSchool ? null : {schools:{tur}}}),
      update: value => { update = value; return q; },
      insert: async value => { writes.push({table,value}); return {error:null}; },
      then: resolve => { if (update) writes.push({table,value:update,admin}); return Promise.resolve({error:null}).then(resolve); },
    };
    return q;
  };
  const client = {
    from: table => query(table,false),
    auth:{getUser:async()=>({data:{user:{id:'admin'}}})},
  };
  const admin = {
    from: table => query(table,true),
    auth:{admin:{updateUserById:async(id,value)=>{ writes.push({table:'auth',value}); return {error:null}; }}},
  };
  const actions = load('src/app/yonetici/actions.ts', {
    '@/lib/validators':validators,
    '@/lib/supabase/server':{createClient:async()=>client},
    '@/lib/supabase/admin':{createAdminClient:()=>admin},
    'next/cache':{revalidatePath:()=>{}},
    'next/navigation':{redirect:()=>{throw new Error('Unexpected redirect');}},
  });
  const result = await actions.kullaniciProfilGuncelle({userId:'student',ad:'Sedat Güler',
    email:'student@example.test',telefon:'',okulNo});
  if (expectedError) {
    assert.match(result.error,expectedError);
    assert.equal(writes.length,0,'Invalid identifiers must fail before any profile/auth write');
  } else {
    assert.equal(result.error,null);
    assert.equal(writes.find(w=>w.table==='students').value.okul_no,okulNo.trim());
  }
}
await scenario('dershane','sedat_guler',null);
await scenario('dershane','  sedat_guler  ',null);
await scenario('dershane','123456',null);
await scenario('dershane','1234',/Kullanıcı adı/);
await scenario('dershane','sedat güler',/Kullanıcı adı/);
await scenario('dershane','a'.repeat(33),/Kullanıcı adı/);
await scenario('okul','1234',null);
await scenario('okul','sedat_guler',/Okul numarası/);
await scenario('okul','123456',/Okul numarası/);
await scenario('dershane','sedat_guler',/kurum bilgisi/,true);
console.log('PASS: 10 real admin action scenarios; school/username rules, trim, missing institution, and no writes on invalid input.');
