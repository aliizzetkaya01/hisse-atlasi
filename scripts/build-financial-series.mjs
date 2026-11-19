import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const work=path.resolve('../../work');
const catalog=JSON.parse(fs.readFileSync('dist/catalog.json','utf8'));
const adapters=[
 ['NVDA','nvda_2026-11-18','2026-11-18'],['SITM','sitm_2026-11-15','2026-11-15'],
 ['OLED','oled_2026-11-14','2026-11-14'],['MXL','mxl_2026-11-13','2026-11-13'],
 ['CEVA','ceva_2026-11-16','2026-11-17'],['TSEM','tsem_2026-10-18','2026-10-18'],
 ['ALGM','algm_2026-10-17','2026-10-17'],['KLIC','klic_2026-10-26','2026-10-26'],
 ['COHU','cohu_2026-10-27','2026-10-27'],['UCTT','uctt_2026-10-23','2026-10-23']
];
const metrics={revenue:['Gelir','mn USD'],cfo:['Faaliyet nakit akışı (CFO)','mn USD'],fcf_ppe:['FCF vekili: CFO − nakit PP&E','mn USD'],fcf_company:['Şirket tanımlı FCF','mn USD'],operating_income:['Faaliyet kârı','mn USD'],net_income:['Konsolide net kâr','mn USD'],eps_gaap:['GAAP seyreltilmiş EPS','USD / pay'],gross_margin:['Brüt marj','%'],operating_margin:['Faaliyet marjı','%'],cfo_sales:['CFO / gelir','%'],cfo_ni:['CFO / konsolide net kâr','%']};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const first=(o,keys)=>{for(const k of keys)if(finite(o?.[k]))return o[k];return null};
const rows=[],coverage=[];
for(const [ticker,folder,reportDate]of adapters){
 const report=catalog.reports.find(r=>r.ticker===ticker&&r.date===reportDate&&r.type==='Tam rapor');
 if(!report)throw Error('Published matching report missing '+ticker);
 const bytes=fs.readFileSync(path.join(work,folder,'central_model.json'));
 const j=JSON.parse(bytes.toString().replace(/^\uFEFF/,''));
 const f=j.financials||j;
 let annual=f.annual||j.annual||j.historical||f.rows;
 if(!Array.isArray(annual))annual=Object.entries(annual||{}).map(([year,r])=>({year,...r}));
 annual=annual.filter(r=>/^(?:FY)?20\d\d$/.test(String(r.period??r.year??r.fy)));
 const pdf=JSON.parse(fs.readFileSync('dist/data/reports/'+report.id+'.json','utf8'));
 let count=0;
 for(const r of annual){
  const period=String(r.period??r.year??r.fy).replace(/^(?!FY)/,'FY');
  const income=r.income||r,cf=r.cashflow||r;
  const revenue=first(income,['revenue']),gp=first(income,['gross_profit']);
  const op=first(income,['operating_income','op_income','op']);
  const ni=first(income,['net_income_consolidated','ni_consolidated']);
  const cfo=first(cf,['cfo']);
  const capex=first(cf,['capex_cash_purchases','capex_ppe','capex_cash','capex_investment_line','capex']);
  const values={revenue,cfo,operating_income:op,net_income:ni,
   eps_gaap:first(r.eps||r,['diluted','eps_diluted']),
   fcf_ppe:finite(cfo)&&finite(capex)&&capex>=0?cfo-capex:null,
   fcf_company:ticker==='NVDA'?r.fcf_reported_definition:null,
   gross_margin:revenue>0&&finite(gp)?gp/revenue*100:null,
   operating_margin:revenue>0&&finite(op)?op/revenue*100:null,
   cfo_sales:revenue>0&&finite(cfo)?cfo/revenue*100:null,
   cfo_ni:ni>0&&finite(cfo)?cfo/ni*100:null};
  for(const [metric,value]of Object.entries(values)){
   const notMeaningful=metric==='cfo_ni'&&finite(ni)&&ni<=0&&finite(cfo);
   if(!finite(value)&&!notMeaningful)continue;
   const [label,unit]=metrics[metric];
   const terms={revenue:/gelir|revenue/i,cfo:/CFO|faaliyet nak/i,eps_gaap:/EPS|seyreltil/i,net_income:/net kâr|net income/i,gross_margin:/brüt marj|gross margin/i};
   const representations=finite(value)?[0,1,2,3,4].flatMap(n=>['tr-TR','en-US'].map(locale=>value.toLocaleString(locale,{minimumFractionDigits:n,maximumFractionDigits:n}))):[];
   const numberOnPage=p=>representations.some(s=>p.text.includes(s));
   const hasPeriod=p=>p.text.includes(period)||p.text.includes(period.slice(2))||p.text.includes('FY'+period.slice(-2));
   const p=pdf.pages.find(p=>hasPeriod(p)&&terms[metric]?.test(p.text)&&numberOnPage(p))||pdf.pages.find(p=>hasPeriod(p)&&numberOnPage(p))||pdf.pages.find(hasPeriod)||pdf.pages[0];
   const formula={fcf_ppe:'CFO − positive cash purchases of PP&E; excludes intangible purchases, acquisitions and equipment financing principal.',gross_margin:'gross profit / revenue × 100',operating_margin:'operating income / revenue × 100',cfo_sales:'CFO / revenue × 100',cfo_ni:'CFO / positive consolidated net income × 100; nonpositive denominator omitted.'}[metric]||'Reported archival model field; not a refreshed company filing.';
   rows.push({reportId:report.id,ticker,reportDate,period,periodEnd:r.end||r.period_end||null,metric,label,unit,value,status:notMeaningful?'N/M':'rapor gerçekleşeni',sourcePage:p.page,valueTextFound:finite(value)?numberOnPage(p):null,pdfUrl:'https://aliizzetkaya01.github.io/hisse-atlasi/'+report.file+'#page='+p.page,formula,modelSha256:crypto.createHash('sha256').update(bytes).digest('hex')});
   count++;
  }
 }
 coverage.push({ticker,reportId:report.id,reportDate,periods:annual.length,observations:count});
}
if(rows.length<200)throw Error('Unexpectedly thin financial coverage');
fs.writeFileSync('dist/data/financial-series.json',JSON.stringify({schemaVersion:'1.0',generatedAt:new Date().toISOString(),classification:'user-report-model-actuals',units:'All money in USD millions; EPS USD/share; ratios percentages. Company fiscal years, not common calendar periods.',caveat:'Source is the matching published report and its controlled analysis model. No fresh SEC audit in this website update. Raw PDF table candidates are NOT used as verified financial series. No estimates mixed into these annual rows.',metrics,coverage,rows}));
console.log(JSON.stringify({companies:coverage.length,annualObservations:rows.length,coverage}));
