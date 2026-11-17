import fs from 'node:fs';import crypto from 'node:crypto';
const files=fs.readdirSync('dist',{recursive:true}).map(x=>'dist/'+x.replaceAll('\\','/')).filter(x=>fs.statSync(x).isFile()&&!x.endsWith('.pdf')&&!x.endsWith('/.nojekyll'));
const assets=files.map(p=>{const b=fs.readFileSync(p);return{path:p,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}});
fs.writeFileSync('interactive-assets.json',JSON.stringify({version:1,assets},null,2));
console.log(JSON.stringify({assets:assets.length,bytes:assets.reduce((s,a)=>s+a.bytes,0)}));
