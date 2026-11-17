import fs from 'node:fs';import crypto from 'node:crypto';import {gzipSync} from 'node:zlib';
const files=fs.readdirSync('dist',{recursive:true}).map(x=>'dist/'+x.replaceAll('\\','/')).filter(x=>fs.statSync(x).isFile()&&!x.endsWith('.pdf')&&!x.endsWith('/.nojekyll')&&!x.endsWith('/interactive-assets.bin'));
const assets=files.map(p=>{const b=fs.readFileSync(p);return{path:p,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}});
const bundle=gzipSync(JSON.stringify(files.map(path=>({path,data:fs.readFileSync(path).toString('base64')}))));
fs.writeFileSync('dist/interactive-assets.bin',bundle);
fs.writeFileSync('interactive-assets.json',JSON.stringify({version:1,bundle:{path:'interactive-assets.bin',bytes:bundle.length,sha256:crypto.createHash('sha256').update(bundle).digest('hex')},assets},null,2));
console.log(JSON.stringify({assets:assets.length,bytes:assets.reduce((s,a)=>s+a.bytes,0)}));
