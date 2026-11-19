import fs from 'node:fs';
import assert from 'node:assert/strict';
import {financialRows,parseCloseCsv} from '../dist/market-financials.mjs';
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
const fin=JSON.parse(read('data/financial-series.json')).rows;
const nvda=fin.find(r=>r.ticker==='NVDA').reportId;
const base={ticker:'NVDA',reportId:nvda,metric:'cfo',scale:'index',from:'FY2024',to:'FY2026'};
const scaled=financialRows(fin,reports,base);
assert.equal(scaled.rows.length,3);assert.equal(scaled.display[0][1],100);
const dcf=financialRows(fin,reports,{...base,metric:'dcf',from:'',to:''});
assert(dcf.rows.length);assert.equal(dcf.normalized,false);assert(dcf.rows.every(r=>/^20\d\d-/.test(r.period)));
const negatives=financialRows([{ticker:'NVDA',reportId:nvda,metric:'cfo',period:'FY2024',unit:'USD',value:-1}],reports,base);
assert.equal(negatives.blocked,true);
assert.deepEqual(parseCloseCsv('Tarih;Kapanış\n2026-01-05;12,4\n2026-01-02;11,5'),[['2026-01-02',11.5],['2026-01-05',12.4]]);
assert.throws(()=>parseCloseCsv('date,close\n2026-01-02,1\n2026-01-02,2'));
console.log('Market routing, archived values and reference observations validated.');
