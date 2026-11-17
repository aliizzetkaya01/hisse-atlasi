import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
// One-time import from the user's existing public archive. Once committed,
// every PDF is served and rebuilt directly from this GitHub repository.
const source=new URL('https://hisse-arastirma-kutuphanesi.acetictiger2.chatgpt.site/');
const catalog=JSON.parse(fs.readFileSync('dist/catalog.json','utf8'));
let imported=0,verified=0;
for(let i=0;i<catalog.reports.length;i+=4){
 await Promise.all(catalog.reports.slice(i,i+4).map(async r=>{
  assert.match(r.file,/^reports\/[0-9a-f]{16}\.pdf$/);
  assert.match(r.sha256,/^[0-9a-f]{64}$/);
  assert(r.bytes>0&&r.bytes<25000000);
  const target=path.join('dist',r.file);let b;
  if(fs.existsSync(target))b=fs.readFileSync(target);
  else{
   const response=await fetch(new URL(r.file,source),{redirect:'error',signal:AbortSignal.timeout(60000)});
   assert(response.ok,`Download failed: ${r.filename}`);
   assert(response.headers.get('content-type')?.includes('pdf'));
   b=Buffer.from(await response.arrayBuffer());
  }
  assert.equal(b.length,r.bytes);assert.equal(b.subarray(0,5).toString(),'%PDF-');
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),r.sha256);
  if(!fs.existsSync(target)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b,{flag:'wx'});imported++}
  verified++;
 }));
}
console.log(JSON.stringify({imported,verified,originalHashesPreserved:true}));
