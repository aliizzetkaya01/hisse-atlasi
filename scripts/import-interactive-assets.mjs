import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('interactive-assets.json','utf8'));
const origin='https://hisse-arastirma-kutuphanesi.acetictiger2.chatgpt.site/';
for(const a of manifest.assets){
 if(!/^dist\/[a-zA-Z0-9_./-]+$/.test(a.path)||a.path.includes('..'))throw Error('Invalid asset path');
 const file=path.resolve(a.path);const valid=b=>b.length===a.bytes&&crypto.createHash('sha256').update(b).digest('hex')===a.sha256;
 if(fs.existsSync(file)&&valid(fs.readFileSync(file)))continue;
 const response=await fetch(origin+a.path.slice(5));if(!response.ok)throw Error('Asset request '+response.status+' '+a.path);
 const b=Buffer.from(await response.arrayBuffer());if(!valid(b))throw Error('Asset hash mismatch '+a.path);
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,b);
}
console.log('Verified interactive assets: '+manifest.assets.length);
