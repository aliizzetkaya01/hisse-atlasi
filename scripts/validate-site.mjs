import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root=path.resolve('dist');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(html,/<title>Hisse Atlası<\/title>/);
assert.match(html,/Hisse Atlası ana sayfa/);
assert(!/file:\/\/|C:[\\/]|Users[\\/]/i.test(html),'Local path leaked');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json'),'utf8'));
assert.equal(catalog.title,'Hisse Atlası');
assert(catalog.reports.length>0,'Empty archive');
const ids=new Set();let total=0;
for(const r of catalog.reports){
 assert(!ids.has(r.id),'Duplicate id');ids.add(r.id);
 assert.match(r.id,/^[0-9a-f]{16}$/);assert.match(r.date,/^\d{4}-\d{2}-\d{2}$/);
 assert.match(r.file,/^reports\/[0-9a-f]{16}\.pdf$/);
 const b=fs.readFileSync(path.join(root,r.file));
 assert.equal(b.subarray(0,5).toString(),'%PDF-');
 assert.equal(b.length,r.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),r.sha256);
 assert(r.company&&r.ticker&&r.sector,'Missing metadata');total+=r.bytes;
}
assert(!/Portföy|Portfoy/i.test(JSON.stringify(catalog)),'Personal portfolio metadata found');
for(const [,url]of html.matchAll(/(?:src|href)="([^"]+)"/g)){
 if(url.startsWith('#')||/^https?:/.test(url))continue;
 assert(!url.startsWith('/'),'Root-relative link breaks project Pages');
 assert(fs.existsSync(path.join(root,url)),'Missing asset: '+url);
}
const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert(js.includes("fetch('catalog.json')"),'Catalog must be relative');
assert(!/https?:\/\/|file:\/\/|C:[\\/]/.test(js),'Host-specific app dependency');
assert.equal(spawnSync(process.execPath,['--check',path.join(root,'app.js')]).status,0);
assert(fs.existsSync(path.join(root,'.nojekyll')),'Missing .nojekyll');
console.log(JSON.stringify({passed:true,title:catalog.title,reports:ids.size,companies:new Set(catalog.reports.map(r=>r.ticker)).size,bytes:total,pdfHashesVerified:ids.size,relativeAssetsVerified:true}));
