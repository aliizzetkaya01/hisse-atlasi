import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync('dist/'+p,'utf8');
const ref=JSON.parse(read('data/markets-reference.json'));
const reports=JSON.parse(read('data/market-reports.json'));
const canon=JSON.parse(read('data/manifest.json')).reports;
assert.equal(reports.length,canon.length);
for(const {id,kpis,file} of reports){const r=canon.find(r=>r.id===id);assert.equal(r.file,file);assert.deepEqual(r.kpis,kpis);}
assert.equal(ref.repo.at(-1)[1],36);
assert(ref.repo.every(([d,v],i)=>Number.isFinite(v)&&(!i||d>ref.repo[i-1][0])));
for(const group of ['government','corporate','bills'])for(const [date,isin,rate,source] of ref[group]){
 assert.match(date,/^\d{4}-\d{2}-\d{2}$/);assert.match(isin,/^TR[A-Z0-9]{10}$/);
 assert(Number.isFinite(rate));
 if(group==='bills')assert(Number.isFinite(source));else assert.match(source,/^https:\/\//);
}
assert.match(read('index.html'),/href="yurt-disi\/">Veri laboratuvarı/);
assert.match(read('markets/index.html'),/url=\.\.\/yurt-disi\//);
assert.match(read('yurt-disi/index.html'),/data-market="yurt-disi"/);
assert.doesNotMatch(read('yurt-disi/index.html'),/ASELS ·/);
assert.match(read('yurt-ici/index.html'),/ASELS ·/);
console.log('Market routing, archived values and reference observations validated.');
