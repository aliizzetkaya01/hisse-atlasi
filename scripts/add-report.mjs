import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Append one reviewed PDF without resyncing or removing unrelated archive files.
const source=process.argv[2];
if(!source)throw Error('A PDF path is required');
const filename=path.basename(source), raw=fs.readFileSync(source);
if(raw.subarray(0,5).toString()!=='%PDF-')throw Error('Not a PDF');
const sha256=crypto.createHash('sha256').update(raw).digest('hex');
const catalog=JSON.parse(fs.readFileSync('dist/catalog.json','utf8'));
if(catalog.reports.some(r=>r.sha256===sha256))throw Error('This exact PDF is already archived');
if(catalog.reports.some(r=>r.filename===filename))throw Error('Filename already exists with different bytes; preserve existing report');
const ticker=filename.split('_')[0], date=filename.match(/\d{4}-\d{2}-\d{2}/)?.[0];
const issuer=catalog.reports.find(r=>r.ticker===ticker);
if(!date||!issuer)throw Error('Date or existing issuer metadata missing; review before adding');
const id=sha256.slice(0,16), file='reports/'+id+'.pdf';
const report={id,ticker,company:issuer.company,date,sector:issuer.sector,market:issuer.market,type:'Tam rapor',revision:false,filename,bytes:raw.length,sha256,file,origin:issuer.origin};
fs.copyFileSync(source,path.join('dist',file));
catalog.reports.push(report);
catalog.reports.sort((a,b)=>b.date.localeCompare(a.date)||a.company.localeCompare(b.company,'tr'));
catalog.catalogDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(new Date());
fs.writeFileSync('dist/catalog.json',JSON.stringify(catalog,null,2));
console.log(JSON.stringify({added:report,reports:catalog.reports.length}));
