import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {gunzipSync} from 'node:zlib';
const manifest=JSON.parse(fs.readFileSync('interactive-assets.json','utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const response=await fetch('https://hisse-arastirma-kutuphanesi.acetictiger2.chatgpt.site/interactive-assets.bin');
if(!response.ok)throw Error('Bundle request '+response.status);
const b=Buffer.from(await response.arrayBuffer());
if(b.length!==manifest.bundle.bytes||hash(b)!==manifest.bundle.sha256)throw Error('Bundle integrity mismatch');
const payload=JSON.parse(gunzipSync(b));if(payload.length!==manifest.assets.length)throw Error('Bundle count mismatch');
const seen=new Set();for(const entry of payload){
 const a=manifest.assets.find(x=>x.path===entry.path);if(!a||seen.has(a.path)||!/^dist\/[a-zA-Z0-9_./-]+$/.test(a.path)||a.path.includes('..'))throw Error('Invalid asset path');seen.add(a.path);
 const bytes=Buffer.from(entry.data,'base64');if(bytes.length!==a.bytes||hash(bytes)!==a.sha256)throw Error('Asset integrity mismatch '+a.path);
 const file=path.resolve(a.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);
}
console.log('Verified interactive assets: '+seen.size);
