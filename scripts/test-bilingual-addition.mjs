import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {translate} from '../dist/i18n.mjs';
const baseline='0d6e7d8f9ca641cad1786553830187115edaf603';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const previous=p=>JSON.parse(execFileSync('git',['show',`${baseline}:${p}`],{encoding:'utf8',maxBuffer:32*1024*1024}));
const catalog=read('dist/catalog.json'),old=previous('dist/catalog.json');
assert.equal(catalog.reports.length,98);assert.equal(new Set(catalog.reports.map(r=>r.company)).size,87);
for(const r of old.reports){
 assert.deepEqual(catalog.reports.find(x=>x.id===r.id),r);
 assert.equal(createHash('sha256').update(fs.readFileSync('dist/'+r.file)).digest('hex'),r.sha256);
}
const manifest=read('dist/data/manifest.json');
for(const r of previous('dist/data/manifest.json').reports)assert.deepEqual(manifest.reports.find(x=>x.id===r.id).kpis,r.kpis);
const aosl=manifest.reports.find(r=>r.ticker==='AOSL');
assert.equal(aosl.bytes,1788214);assert.equal(aosl.sha256,'1619f9e308d3547fbb6454d3a3e8b66a75b9817887662ccbfe6f781b5127fe72');
assert.equal(aosl.kpis.target.value,null);assert.equal(aosl.kpis.target.status,'kurulamadı');assert.equal(aosl.kpis.dcf.value,22.8);
assert.equal(aosl.kpis.spot.value,25.47);assert.equal(aosl.pageCount,47);
const financial=read('dist/data/financial-series.json'),previousFinancial=previous('dist/data/financial-series.json');
assert.deepEqual(financial.rows.filter(r=>r.ticker!=='AOSL'),previousFinancial.rows);
assert.equal(financial.rows.filter(r=>r.ticker==='AOSL').length,50);
assert.equal(translate('Rapor arşivi','en'),'Report archive');
assert.equal(translate('Rapor arşivi','tr'),'Rapor arşivi');
assert.equal(translate('Alpha and Omega Semiconductor 19 Kas 2026 raporunu incele','en'),'Alpha and Omega Semiconductor 19 Kas 2026 view report');
assert.equal(translate('Kurulamadı','en'),'Not established');
for(const f of ['dist/index.html','dist/license.html']){
 const html=fs.readFileSync(f,'utf8');assert(html.includes('data-language="tr"'));assert(html.includes('data-language="en"'));
}
assert(fs.readFileSync('explorer-source/shared/LanguageUI.jsx','utf8').includes('Array.isArray(node.props.columns)'));
console.log(JSON.stringify({passed:true,baseline,originalReportsUnchanged:old.reports.length,originalFinancialObservationsUnchanged:previousFinancial.rows.length,aoslTargetNotInvented:true,bilingualUiChecks:true}));
