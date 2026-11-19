import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>JSON.parse(fs.readFileSync('dist/'+p,'utf8'));
const reports=read('data/manifest.json').reports;
// Source labels and physical PDF pages, not inferred financial table matches.
const definitions=[
 ['ASELS',25,['FY2023','FY2024','FY2025'],[
  ['Brüt marj','gross_margin','Brüt marj'],['IFRS OP marjı','operating_margin','Faaliyet marjı'],
  ['Çekirdek OP marjı','core_op_margin','Çekirdek faaliyet marjı'],['Geniş FCF marjı','broad_fcf_margin','Geniş FCF marjı'],
  ['CFO / satış','cfo_revenue','CFO / gelir'],['CFO / konsolide net kâr','cfo_ni','CFO / konsolide net kâr']]],
 ['MPARK',30,['FY2022','FY2023','FY2024','FY2025'],[
  ['Brüt marj','gross_margin','Brüt marj'],['Faaliyet marjı','operating_margin','Faaliyet marjı'],['Core marj','core_ebitda_margin','Core FAVÖK marjı']]],
 ['MPARK',31,['FY2022','FY2023','FY2024','FY2025'],[
  ['CFO / satış','cfo_revenue','CFO / gelir'],['CFO / konsolide kâr','cfo_ni','CFO / konsolide net kâr'],
  ['CFO / core FAVÖK','cfo_core_ebitda','CFO / core FAVÖK'],['FCF / core FAVÖK','fcf_core_ebitda','FCF / core FAVÖK']]]
];
const rows=definitions.flatMap(([ticker,sourcePage,periods,metrics])=>{
 const r=reports.find(r=>r.market==='BIST'&&r.ticker===ticker&&r.id===({ASELS:'075b2a2d6c68830c',MPARK:'585169d64f15189b'})[ticker]);
 assert(r);
 const lines=read('data/reports/'+r.id+'.json').pages.find(p=>p.page===sourcePage).text.split(/\r?\n/).map(s=>s.trim());
 return metrics.flatMap(([sourceLabel,metric,label])=>{
  const i=lines.indexOf(sourceLabel);assert(i>=0,sourceLabel);
  return periods.map((period,j)=>{
   const raw=lines[i+1+j];assert.match(raw,/^-?%\d+(,\d+)?$/);
   return {ticker,reportId:r.id,reportDate:r.date,period,metric,label,unit:'%',value:Number(raw.replace('%','').replace(',','.')),sourcePage,pdfUrl:'../'+r.file+'#page='+sourcePage,status:'Yayımlanmış rapor · gerçekleşen'};
  });
 });
});
assert.equal(rows.length,46);
fs.writeFileSync('dist/data/bist-ratios.json',JSON.stringify({rows})+'\n');
