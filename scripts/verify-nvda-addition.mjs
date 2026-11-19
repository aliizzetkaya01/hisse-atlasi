import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
// Keep the comparison reproducible after committing the new archive.
const baseline='e3f59adca0d755a0ebd01c877104ff5c407c9e6d';
const old=p=>JSON.parse(execFileSync('git',['show',baseline+':'+p],{encoding:'utf8',maxBuffer:12000000}));
const current=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=old('dist/catalog.json'),after=current('dist/catalog.json');
assert.equal(after.reports.length,before.reports.length+1);
for(const r of before.reports)assert.deepEqual(after.reports.find(a=>a.id===r.id),r,'Prior catalog record changed '+r.id);
const previous=old('dist/data/manifest.json'),manifest=current('dist/data/manifest.json');
for(const r of previous.reports)assert.deepEqual(manifest.reports.find(a=>a.id===r.id),r,'Prior extracted record changed '+r.id);
const id='1aa2a78dbe7b5d37',nvda=manifest.reports.find(r=>r.id===id);
assert.equal(nvda.date,'2026-11-18');assert.equal(nvda.pageCount,57);
assert.equal(nvda.bytes,1814426);assert.equal(nvda.kpis.spot.value,150.87);
assert.equal(nvda.kpis.target.value,245);assert.equal(nvda.kpis.dcf.value,184.5);
assert.equal(nvda.kpis.outlook.value,'Temkinli');
const detail=current('dist/'+nvda.dataFile);
assert.equal(detail.pages.length,57);
assert(detail.pages.some(p=>p.text.includes('230 USD')));
const build=current('dist/explore/data-app-build.json'),snapshot=current('dist/explore/'+build.snapshot.path);
const row=snapshot.queries.archive.rows.find(r=>r.id===id);
assert.equal(row.target,245);assert(Math.abs(row.potential-(245/150.87-1))<1e-12);
assert.equal(snapshot.buildStatus,'complete');
assert.equal(snapshot.queries.archive.rows.length,97);
assert.equal(snapshot.queries.pages.rows.filter(r=>r.reportId===id).length,57);
for(const [key,file]of [['html','index.html'],['snapshot',build.snapshot.path]]){
 const b=fs.readFileSync('dist/explore/'+file);
 assert.equal(crypto.createHash('sha256').update(b).digest('hex'),build[key].sha256);
}
console.log(JSON.stringify({pass:true,previousReportsPreserved:96,newReportPages:57,documents:97,pages:manifest.coverage.pages,spot:row.spot,target:row.target,dcf:row.dcf,hashesVerified:true}));
