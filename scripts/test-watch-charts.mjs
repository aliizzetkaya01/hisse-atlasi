import assert from 'node:assert/strict';
import fs from 'node:fs';
import {financialSeries,widgetUrl,tradingSymbol} from '../explorer-source/watch-utils.mjs';
const data=JSON.parse(fs.readFileSync('dist/data/financial-series.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('dist/catalog.json','utf8'));
assert.equal(data.coverage.length,11);
for(const r of data.rows){
 const p=catalog.reports.find(p=>p.id===r.reportId);assert(p);assert.equal(p.ticker,r.ticker);assert.equal(p.date,r.reportDate);
 assert.match(r.period,/^FY20\d\d$/);assert(r.value===null||Number.isFinite(r.value));
 assert(r.sourcePage>=1);assert(r.pdfUrl.endsWith('#page='+r.sourcePage));
 if(r.value===null)assert.equal(r.status,'N/M');
}
const id='1aa2a78dbe7b5d37',base={reportId:id,metric:'revenue'};
const s=financialSeries(data.rows,base);assert.equal(s.rows.length,5);assert.equal(s.rows[0].value,26914);assert.equal(s.rows.at(-1).value,215938);
const indexed=financialSeries(data.rows,{...base,from:'FY2024',to:'FY2025',mode:'index'});assert.equal(indexed.rows.length,2);assert.equal(indexed.rows[0].displayValue,100);assert(Math.abs(indexed.rows[1].displayValue-130497/60922*100)<1e-10);
assert.equal(financialSeries(data.rows,{...base,from:'FY2026',to:'FY2022'}).rows.length,0);
const sample=[{reportId:'test',metric:'m',period:'FY2021',value:2,unit:'USD'},{reportId:'test',metric:'m',period:'FY2022',value:null,unit:'USD'},{reportId:'test',metric:'m',period:'FY2023',value:4,unit:'USD'}];
assert.equal(financialSeries(sample,{reportId:'test',metric:'m',mode:'index'}).rows[1].displayValue,null);
assert.equal(financialSeries([...sample,{...sample[0],period:'FY2024',value:-1}],{reportId:'test',metric:'m',mode:'index'}).allowed,false);
assert.equal(financialSeries([...sample,{...sample[0],period:'FY2024',value:0}],{reportId:'test',metric:'m',mode:'change'}).allowed,false);
assert.throws(()=>financialSeries([...sample,{...sample[0],unit:'TRY'}],{reportId:'test',metric:'m'}),/Mixed/);
const url=new URL(widgetUrl('NASDAQ:NVDA','12M',true)),config=JSON.parse(decodeURIComponent(url.hash.slice(1)));
assert.equal(url.origin,'https://www.tradingview-widget.com');assert.equal(config.compareSymbols[0].symbol,'TVC:DXY');assert.equal(config.percentage,true);
assert.equal(JSON.parse(decodeURIComponent(new URL(widgetUrl('TVC:DXY','60M',false)).hash.slice(1))).compareSymbols.length,0);
assert.equal(tradingSymbol('MCD'),'NYSE:MCD');assert.throws(()=>tradingSymbol('NVDA&token=secret'));
for(const r of data.rows.filter(r=>r.ticker==='NVDA'&&r.metric==='fcf_ppe')){const c=data.rows.find(c=>c.reportId===id&&c.period===r.period&&c.metric==='cfo');assert(c.value>=r.value);}
const build=JSON.parse(fs.readFileSync('dist/explore/data-app-build.json','utf8'));
const snap=JSON.parse(fs.readFileSync('dist/explore/'+build.snapshot.path,'utf8'));
assert.equal(snap.queries.financials.rows.length,data.rows.length);assert.equal(snap.queries.market_widgets.rows.length,87);
assert.equal(snap.buildStatus,'complete');
assert.equal(JSON.parse(decodeURIComponent(new URL(widgetUrl('NASDAQ:AOSL','12M',true,'','en')).hash.slice(1))).locale,'en');
console.log(JSON.stringify({passed:true,companies:11,observations:data.rows.length,normalizedViewsChecked:true,negativeAndNullRulesChecked:true,providerConfigurationChecked:true}));
