export function financialRows(data,reports,config){
 const {ticker,reportId,metric,from,to,scale}=config, valuation=metric==='dcf';
 const rows=(valuation?reports.filter(x=>x.ticker===ticker&&x.kpis?.dcf?.value!=null).map(x=>({
  period:x.date,value:x.kpis.dcf.value,unit:x.kpis.dcf.currency,reportDate:x.date,pdfUrl:'../'+x.file+'#page='+x.kpis.dcf.page,status:x.kpis.dcf.status||''
 })):data.filter(x=>x.ticker===ticker&&x.reportId===reportId&&x.metric===metric))
 .filter(x=>(!from||x.period>=from)&&(!to||x.period<=to)).sort((a,b)=>a.period.localeCompare(b.period));
 const valid=rows.filter(x=>Number.isFinite(x.value));
 const units=new Set(valid.map(x=>x.unit));
 const normalized=!valuation&&scale!=='absolute', blocked=units.size>1||normalized&&valid.some(x=>x.value<=0);
 const first=valid[0]?.value;
 return {rows,blocked,unit:valid[0]?.unit||'',normalized,display:rows.map(x=>[x.period,!blocked&&Number.isFinite(x.value)?normalized?(scale==='index'?x.value/first*100:(x.value/first-1)*100):x.value:null])};
}
export function parseCloseCsv(text){
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 const sep=lines[0]?.includes(';')?';':',';
 const cols=lines[0]?.toLowerCase().split(sep).map(x=>x.trim().replace(/^"|"$/g,''));
 const date=cols?.findIndex(x=>['date','tarih'].includes(x)), close=cols?.findIndex(x=>['close','kapanış','kapanis'].includes(x));
 if(date<0||close<0||lines.length<3||lines.length>10001)throw Error('Invalid header or row count');
 const seen=new Set();
 return lines.slice(1).map(line=>{
  const fields=line.split(sep).map(x=>x.trim().replace(/^"|"$/g,''));
  const d=fields[date], raw=fields[close]||'', v=Number(sep===';'?raw.replace(',','.'):raw);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(Date.parse(d))||new Date(d).toISOString().slice(0,10)!==d||!(v>0)||seen.has(d))throw Error('Invalid date, value or duplicate date');
  seen.add(d);return [d,v];
 }).sort(([a],[b])=>a.localeCompare(b));
}
