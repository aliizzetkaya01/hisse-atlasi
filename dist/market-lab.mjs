import {getLanguage,saveLanguage,translate} from './i18n.mjs';
import {financialRows,parseCloseCsv} from './market-financials.mjs';
const $=s=>document.querySelector(s), lab=$('.market-lab'), controls=$('#lab-controls'), view=$('#lab-view');
const home=lab.dataset.market==='yurt-ici';
let lang=getLanguage(), section='bist', ticker='', reportId='', range='12M', compare=true, debt='government', cb='repo', year='all', isin='all';
const t=(tr,en)=>lang==='en'?en:tr;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=x=>Number.isFinite(x)?new Intl.NumberFormat(lang==='en'?'en-US':'tr-TR',{maximumFractionDigits:2}).format(x):'—';
const opt=(v,l,s)=>`<option value="${esc(v)}"${v===s?' selected':''}>${esc(l)}</option>`;
const select=(id,label,opts)=>`<label>${label}<select id="${id}">${opts}</select></label>`;
const href=(u,l)=>`<a href="${esc(u)}">${esc(l)}</a>`;
const card=(title,html)=>`<section class="lab-card"><h2>${title}</h2>${html}</section>`;
const note=s=>`<p class="lab-note">${s}</p>`;
const csvLabel=()=>t('Görünen tabloyu CSV indir','Download visible table as CSV');
let exportRows=[];
const panelExports=new Map();
let nextPanel=3;
const panels=[{id:1,metric:'cfo'},{id:2,metric:'fcf_ppe'}].map(p=>({...p,ticker:'',reportId:'',scale:'absolute',from:'',to:''}));
function tabular(headers,rows,raw,slot=''){
 if(!slot)exportRows=[headers,...raw];
 return `<div class="lab-table"><table><thead><tr>${headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')}</tr></thead><tbody>${rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')}</tbody></table></div><p><button class="lab-btn" data-export="${slot}" type="button">${csvLabel()}</button></p>`;
}
function plot(rows,unit,mode){
 const values=rows.map(x=>x[1]).filter(Number.isFinite);
 if(!values.length)return note(t('Bu filtreye uyan sayısal gözlem yok.','No numeric observations match these filters.'));
 const W=760,H=278,l=65,r=32,top=28,b=48, hh=H-top-b,ww=W-l-r;
 const maxv=Math.max(...values),minv=Math.min(...values);
 const dates=rows.map(x=>Date.parse(x[0])),dateGrid=mode==='step'&&dates.length>1;
 const spread=Math.max(maxv-minv,Math.abs(maxv)*.1,.01);
 const min=mode==='bar'?Math.min(0,minv):minv-spread*.2,max=mode==='bar'?Math.max(min+spread,0,maxv+spread*.12):maxv+spread*.18;
 const x=i=>dateGrid?l+18+(dates[i]-dates[0])/(dates.at(-1)-dates[0])*(ww-36):l+(i+.5)*ww/rows.length;
 const y=v=>top+hh-(v-min)/(max-min)*hh;
 const points=rows.map((v,i)=>Number.isFinite(v[1])?x(i)+','+y(v[1]):null);
 let drawing='';
 if(mode==='step'&&rows.length>1)drawing=`<path d="M ${points[0]} ${rows.slice(1).map((v,i)=>'H '+x(i+1)+' V '+y(v[1])).join(' ')}" fill="none" stroke="#197664" stroke-width="3"/>`;
 if(mode==='line')drawing=points.map((p,i)=>p&&i&&points[i-1]?`<path d="M ${points[i-1]} L ${p}" stroke="#197664" stroke-width="3"/>`:'').join('');
 rows.forEach(([label,value],i)=>{
  if(!Number.isFinite(value))return;
  const cx=x(i), cy=y(value), bar=Math.min(64,ww/rows.length*.5), tip=esc(label+' · '+n(value)+' '+unit);
  drawing+=mode==='bar'?`<rect x="${cx-bar/2}" y="${Math.min(cy,y(0))}" width="${bar}" height="${Math.abs(y(0)-cy)}" rx="4" fill="#197664"><title>${tip}</title></rect>`:`<circle cx="${cx}" cy="${cy}" r="5" fill="#197664" stroke="#fff" stroke-width="1.5"><title>${tip}</title></circle>`;
  if(!dateGrid&&rows.length<10||[0,rows.length-1].includes(i))drawing+=`<text x="${cx}" y="${cy-10}" text-anchor="middle" font-size="13">${esc(n(value))}</text><text x="${cx}" y="${H-23}" text-anchor="middle" font-size="12">${esc(label)}</text>`;
 });
 return `<div class="lab-chart-wrap"><svg class="lab-plot" role="img" aria-label="${esc(t('Grafik; tam değerler aşağıdaki tabloda','Chart; exact values in the table below'))}" viewBox="0 0 ${W} ${H}" fill="currentColor"><text x="${l}" y="16" font-size="13">${esc(unit)}</text><path d="M${l},${top} V${H-b} H${W-r}" fill="none" stroke="#91aaa3"/><text x="${l-8}" y="${y(min)+4}" text-anchor="end" font-size="12">${esc(n(min))}</text><text x="${l-8}" y="${y(max)+4}" text-anchor="end" font-size="12">${esc(n(max))}</text>${drawing}</svg></div>`;
}
const sourceLabel=()=>t('Kaynak','Source'), dateLabel=()=>t('Tarih','Date');
let selectedFrame='';
const marketSymbols={MCD:'NYSE:MCD',SKHY:'KRX:000660',CLMT:'NASDAQ:CLMT',MXL:'NASDAQ:MXL',TER:'NASDAQ:TER'};
const alternativeCharts={ASELS:'https://www.investing.com/equities/aselsan-chart',MPARK:'https://www.investing.com/equities/mlp-saglik-chart'};
const localCloses=new Map();
function localBistChart(){
 const box=$('#bist-local-chart');if(!box)return;
 const rows=localCloses.get(ticker);
 box.innerHTML=rows?note(esc(ticker+' · '+rows.length+' '+t('kapanış · kullanıcı CSV’si','closes · user CSV')))+plot(rows,'TRY', 'line'):'';
}
function stockView(all){
 const stocks=all.filter(r=>(r.market==='BIST')===home);
 const choices=[...new Map(stocks.map(r=>[r.ticker,r.company])).entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 if(!choices.some(([k])=>k===ticker))ticker=home?choices[0]?.[0]:choices.find(([k])=>k==='NVDA')?.[0]??choices[0]?.[0];
 const reports=stocks.filter(r=>r.ticker===ticker).sort((a,b)=>b.date.localeCompare(a.date));
 const r=reports.find(r=>r.id===reportId)||reports[0];
 if(!r){view.innerHTML=note(t('Rapor bulunamadı.','No report found.'));return;}
 reportId=r.id;
 controls.innerHTML=`<div class="lab-controls">${select('ticker',t('Hisse','Ticker'),choices.map(([k,v])=>opt(k,k+' · '+v,ticker)).join(''))}${select('report',t('Arşiv raporu','Archived report'),reports.map(q=>opt(q.id,q.date,reportId)).join(''))}${select('range',t('Grafik dönemi','Chart range'),[['1M','1 ay','1 month'],['3M','3 ay','3 months'],['12M','1 yıl','1 year'],['60M','5 yıl','5 years']].map(([id,a,b])=>opt(id,t(a,b),range)).join(''))+`<label><span>${t('Karşılaştırma','Compare with')}</span><select id="compare">${opt('yes',home?'BIST 100':'DXY',compare?'yes':'no')}${opt('no',t('Yalnız hisse','Stock only'),compare?'yes':'no')}</select></label>`}</div>`;
 const symbol=home?'BIST:'+ticker:marketSymbols[ticker]||'NASDAQ:'+ticker, benchmark=home?'BIST:XU100':'TVC:DXY';
 const cfg={symbol,range,interval:'D',theme:'light',style:'2',locale:lang,autosize:true,allow_symbol_change:true,hide_side_toolbar:true,hide_top_toolbar:false,withdateranges:true,percentage:compare,compareSymbols:compare?[{symbol:benchmark,position:'SameScale'}]:[]};
 const frame='https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale='+lang+'#'+encodeURIComponent(JSON.stringify(cfg));
 const prev=view.querySelector('iframe');
 const selected=['spot','target','dcf','outlook'].filter(k=>r.kpis?.[k]).map(k=>{
  const d=r.kpis[k],label={spot:t('Rapor spotu','Report spot'),target:t('12 aylık baz hedef','12-month base target'),dcf:t('Stratejik DCF','Strategic DCF'),outlook:t('Görüş','View')}[k];
  const fmt=typeof d.value==='string'?translate(d.value,lang):d.value==null?t('Kurulamadı','Not established'):n(d.value)+' '+(d.currency||'');
  return [label,fmt,r.date,'../'+r.file+(d.page?'#page='+d.page:''),d.value,d.currency||'',d.status||''];
 });
 const headers=[t('Gösterge','Metric'),t('Rapor değeri','Report value'),dateLabel(),sourceLabel()];
 const links=href('../'+r.file,'PDF')+' · '+href('../explore/?report='+r.id,t('Ayrıntılı rapor ve veri','Report and detailed data'))+(home?' · '+href('https://fintables.com/sirketler/'+ticker,t('Fintables: fiyat, karşılaştırma ve finansallar','Fintables: price, comparisons and financials')):'');
 const local=home?`<div id="market-frame" class="lab-frame tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>`+
 note(t('Grafik: TradingView. Veri gecikmesi ve sembol kapsamı sağlayıcıya bağlıdır. Grafik görünmezse TradingView’da doğrudan açabilirsiniz.','Chart by TradingView. Data delays and symbol coverage depend on the provider. Open on TradingView directly if the chart is unavailable.'))+
 href('https://www.tradingview.com/chart/?symbol='+encodeURIComponent(symbol),t('Grafiği TradingView’da aç','Open chart on TradingView'))+
 note(t('Kullanım hakkınız olan TRY kapanış dosyasını da yerel olarak grafiğe çevirebilirsiniz; dosya tarayıcınızdan çıkmaz.','You can also chart a permitted TRY closing-price file locally; it stays in your browser.'))+
 `<div class="lab-links">${alternativeCharts[ticker]?href(alternativeCharts[ticker],t('Grafiği Investing.com’da aç','Open chart on Investing.com')):''}</div><label>${t('Kapanış CSV’si seç (date,close; tarih YYYY-AA-GG)','Choose close-price CSV (date,close; date YYYY-MM-DD)')} <input type="file" id="bist-csv" accept=".csv,text/csv"></label><p id="bist-csv-status" role="status"></p><div id="bist-local-chart"></div>`:
 `<div id="market-frame"></div>`+note(t('Piyasa grafiği TradingView tarafından sağlanır; gecikme ve kapsam sağlayıcıya bağlıdır.','Market chart from TradingView; coverage and delays depend on the provider.'))+href('https://www.tradingview.com/chart/?symbol='+encodeURIComponent(symbol),t('Grafiği TradingView’da aç','Open on TradingView'));
 view.innerHTML=card(esc(ticker+' · '+r.company),`<div class="lab-links">${links}</div>`+local)+card(t('Raporda yayımlanan göstergeler','Metrics published in the report'),note(t('Tarihli rapor değerleridir; canlı kotasyon veya gerçekleşmiş getiri değildir.','Dated report values, not live quotes or realised returns.'))+tabular(headers,selected.map(([a,b,c,d])=>[esc(a),esc(b),esc(c),href(d,'PDF')]),selected));
 exportRows=[['metric','value','currency','status','report_date','source'],...selected.map(([label,,date,url,value,currency,status])=>[label,value,currency,status,date,new URL(url,location.href).href])];
 if(home){
  const widget=$('#market-frame');
  widget.querySelector('.tradingview-widget-container__widget').style.height='100%';
  const embed=document.createElement('script');
  embed.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  embed.async=true;embed.textContent=JSON.stringify({...cfg,hide_volume:true});
  widget.append(embed);
  localBistChart();return;
 }
 if(prev&&selectedFrame===frame){$('#market-frame').append(prev)}else{const f=document.createElement('iframe');f.className='lab-frame';f.title=t('Hisse fiyat grafiği','Stock price chart');f.src=frame;$('#market-frame').append(f);selectedFrame=frame;}
}
function financialView(all,data){
 const area=$('#financial-workbench'), foreign=all.filter(r=>r.market!=='BIST'), byId=new Map(foreign.map(r=>[r.id,r]));
 const supported=data.filter(r=>byId.has(r.reportId));
 const names=[...new Map(foreign.filter(r=>r.kpis?.dcf?.value!=null||supported.some(s=>s.reportId===r.id)).map(r=>[r.ticker,r.company])).entries()].sort(([a],[b])=>a.localeCompare(b));
 const optperiod=(values,value)=>opt('',t('Tümü','All'),value)+values.map(v=>opt(v,v,value)).join('');
 panelExports.clear();
 const cards=panels.map(p=>{
  const symbol=p.ticker||ticker, choices=[...new Set(supported.filter(x=>x.ticker===symbol).map(x=>x.reportId))].sort((a,b)=>byId.get(b).date.localeCompare(byId.get(a).date));
  const report=choices.includes(p.reportId)?p.reportId:choices[0];
  const metrics=new Map(supported.filter(x=>x.reportId===report).map(x=>[x.metric,x.label]));
  if(foreign.some(x=>x.ticker===symbol&&x.kpis?.dcf?.value!=null))metrics.set('dcf',t('Stratejik DCF (rapor değeri)','Strategic DCF (reported mark)'));
  const metric=metrics.has(p.metric)?p.metric:metrics.keys().next().value;
  const opts=financialRows(supported,foreign,{ticker:symbol,reportId:report,metric,scale:'absolute'});
  const years=[...new Set(opts.rows.map(x=>x.period))];
  const from=years.includes(p.from)?p.from:'',to=years.includes(p.to)?p.to:'', dc=metric==='dcf';
  const rows=financialRows(supported,foreign,{ticker:symbol,reportId:report,metric,from,to,scale:p.scale});
  const unit=rows.normalized?(p.scale==='index'?t('Başlangıç = 100','Start = 100'):'%'):translate(rows.unit,lang);
  const field=(k,l,o)=>select('fin-'+p.id+'-'+k,l,o);
  const headings=[t('Dönem','Period'),t('Kaynak değeri','Source value'),t('Grafik değeri','Chart value'),t('Kaynak birimi','Source unit'),sourceLabel()];
  const values=rows.rows.map((row,i)=>[esc(row.period),esc(n(row.value)),esc(n(rows.display[i][1])),esc(row.unit),href(row.pdfUrl,'PDF')]);
  panelExports.set(String(p.id),[['ticker','metric','period','value','unit','chart_value','chart_unit','status','report_date','source'],...rows.rows.map((r,i)=>[symbol,metric,r.period,r.value,r.unit,rows.display[i][1],unit,r.status,r.reportDate,new URL(r.pdfUrl,location.href).href])]);
  return `<section class="lab-card fin-card" data-panel="${p.id}"><div class="fin-title"><h3>${esc(symbol+' · '+translate(metrics.get(metric)||'',lang))}</h3><button type="button" class="lab-btn" data-remove="${p.id}" ${panels.length===1?'disabled':''}>${t('Grafiği kaldır','Remove chart')}</button></div>
  <div class="lab-controls">
  ${field('ticker',t('Hisse','Ticker'),opt('',t('Üstteki hisseyi izle','Follow selected ticker'),p.ticker)+names.map(([v,l])=>opt(v,v+' · '+l,p.ticker)).join(''))}
  ${!dc&&choices.length?field('reportId',t('Kaynak rapor','Source report'),choices.map(id=>opt(id,byId.get(id).date,report)).join('')):''}
  ${metrics.size?field('metric',t('Gösterge','Metric'),[...metrics].map(([v,l])=>opt(v,translate(l,lang),metric)).join('')):''}
  ${!dc&&metrics.size?field('scale',t('Ölçek','Scale'),[['absolute',t('Kaynak birimi','Source unit')],['index',t('Başlangıç = 100','Start = 100')],['change',t('İlk döneme göre değişim (%)','Change from first period (%)')]].map(([v,l])=>opt(v,l,p.scale)).join('')):''}
  ${field('from',dc?t('İlk rapor tarihi','First report date'):t('İlk mali yıl','First fiscal year'),optperiod(years,from))}
  ${field('to',dc?t('Son rapor tarihi','Last report date'):t('Son mali yıl','Last fiscal year'),optperiod(years,to))}
  <button class="lab-btn" type="button" data-reset-chart="${p.id}">${t('Grafiği sıfırla','Reset chart')}</button></div>
  ${dc?note(t('Her nokta ayrı bir raporun DCF değeridir; gerçekleşen fiyat veya 12 aylık hedef değildir.','Each mark is a DCF estimate from a separate report, not a market price or 12-month target.')):''}
  ${!metrics.size?note(t('Bu hissede kaynakla eşleştirilmiş grafik serisi yok. Kartın hisse seçicisinden başka şirket seçebilirsiniz.','This ticker has no source-matched chart series. Choose another ticker in this card.')):rows.blocked?note(t('Seçilen ölçek bu seri için uygulanamaz. Pozitif gözlemlerle bir aralık seçin veya kaynak birimine dönün.','This scale cannot be used for the selected series. Choose a positive range or source units.')):plot(rows.display,unit,dc?'bar':'line')}
  ${values.length?`<details><summary>${t('Grafiğin verisini ve kaynaklarını göster','Show chart data and sources')}</summary>${tabular(headings,values,[],String(p.id))}</details>`:''}</section>`;
 }).join('');
 area.innerHTML=`<div class="fin-title"><h2>${t('Finansal grafikleri karşılaştır','Compare financial charts')}</h2><button type="button" class="lab-btn" data-add-chart ${panels.length===8?'disabled':''}>${t('+ Grafik ekle','+ Add chart')} · ${panels.length}/8</button></div>`+
 note(t('Her kartın hisse, gösterge ve dönem seçimi bağımsızdır. Grafiklerin eksenleri ayrı ölçeklenir; aynı metrik ve birimi seçerek büyüklükleri, başlangıç = 100 ile göreli değişimi karşılaştırın. Yıllık seriler yalnızca kaynakla eşleşen raporlarda bulunur.','Ticker, metric and range are independent for each card. Axes scale separately: compare amounts with the same metric and unit, or relative change with Start = 100. Annual series are limited to source-matched reports.'))+`<div class="fin-grid">${cards}</div>`;
}
function rateView(ref){
 const isDebt=section==='tahviller';
 const groups=isDebt?[[t('Devlet tahvilleri','Government bonds'),'government'],[t('Özel sektör borçlanma araçları','Corporate debt'),'corporate']]:[[t('Bir hafta repo faizi','One-week repo rate'),'repo'],[t('Likidite senedi ihaleleri','Liquidity bill auctions'),'bills']];
 const group=isDebt?debt:cb, rows=ref[group];
 const years=[...new Set(rows.map(q=>q[0].slice(0,4)))];
 const ids=group==='repo'?[]:[...new Set(rows.map(q=>q[1]))];
 controls.innerHTML=`<div class="lab-controls">${select('group',t('Veri serisi','Data series'),groups.map(([l,k])=>opt(k,l,group)).join(''))}${select('year',t('Yıl','Year'),opt('all',t('Tümü','All'),year)+years.map(y=>opt(y,y,year)).join(''))}${ids.length?select('isin','ISIN',opt('all',t('Tümü','All'),isin)+ids.map(y=>opt(y,y,isin)).join('')):''}</div>`;
 const scoped=rows.filter(q=>(year==='all'||q[0].startsWith(year))&&(isin==='all'||q[1]===isin));
 const repo=group==='repo', bills=group==='bills', unit='%', rate=repo?t('Politika faizi (%)','Policy rate (%)'):t('Yıllık bileşik faiz (%)','Annual compound rate (%)');
 const head=[dateLabel(),...(!repo?['ISIN']:[]),rate,...(bills?[t('Kabul edilen nominal (bin TL)','Accepted nominal (TRY thousand)')]:[]),sourceLabel()];
 const raw=scoped.map(q=>repo?[q[0],q[1],ref.repoSource]:[q[0],q[1],q[2],...(bills?[q[3]]:[]),bills?ref.billsSource:q[3]]);
 const chart=scoped.map(q=>[q[0],q[repo?1:2]]);
 const caption=repo?t('Resmî oran değişiklikleri; değişmeyen toplantılar ayrı gözlem değildir. Canlı repo getirisi değildir.','Official rate changes only; unchanged decisions are not separate observations. Not a live repo return.'):
 bills?t('Seçili TCMB ihraç ihaleleri: kabul edilen ortalama bileşik faiz. İkincil piyasa getirisi değildir.','Selected CBRT issues: accepted average compound rate. Not a secondary-market yield.'):
 t('Seçili ihraçlar: Hazine ihale gerçekleşmeleri veya KAP’ta açıklanan ihraç oranı. Farklı vade ve ihraççılar aynı seri olarak birleştirilmez.','Selected issues: Treasury auction outcomes or KAP-disclosed issue rates. Different maturities and issuers are not joined as a continuous series.');
 view.innerHTML=card(groups.find(([,k])=>k===group)[0],note(caption)+plot(chart,unit,repo?'step':'bar')+
 (raw.length?tabular(head,raw.map(row=>row.map((v,i)=>i===row.length-1?href(v,sourceLabel()):esc(typeof v==='number'?n(v):v))),raw):''));
}
const read=async u=>{const r=await fetch(u);if(!r.ok)throw new Error('Load failed');return r.json()};
const buttons=()=>{document.documentElement.lang=lang; document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===lang)));};
const nav=document.createElement('nav');
nav.className='lab-tabs';nav.setAttribute('aria-label','Yurt içi bölümleri / Domestic sections');
if(home)controls.before(nav);
function navRender(){nav.innerHTML=[['bist',t('BIST hisseleri','BIST equities')],['tahviller',t('Devlet tahvilleri ve ÖSBA','Government and corporate debt')],['tcmb',t('TCMB repo ve menkul kıymetleri','CBRT repo and securities')]].map(([k,v])=>`<button type="button" aria-pressed="${section===k}" data-section="${k}">${v}</button>`).join('');}
const sections=['bist','tahviller','tcmb'];
function hashSection(){return sections.includes(location.hash.slice(1))?location.hash.slice(1):'bist';}
section=hashSection();buttons();
try{
 const [all,ref,fin]=await Promise.all([read('../data/market-reports.json'),home?read('../data/markets-reference.json'):null,home?null:read('../data/financial-series.json').catch(()=>null)]);
 function renderFinancial(){if(!home)financialView(all,fin?.rows||[]);}
 function render(){buttons();if(home)navRender();if(!home||section==='bist'){stockView(all);if(!home){controls.insertAdjacentHTML('beforeend','<p>'+href('#financial-workbench',t('Finansal grafik karşılaştırmasına git','Jump to financial chart comparison'))+'</p>');view.insertAdjacentHTML('beforeend','<section id="financial-workbench"></section>');renderFinancial();}}else rateView(ref);}
 render();
 document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.language){lang=button.dataset.language;saveLanguage(lang);render();}
  if(!home&&button.hasAttribute('data-add-chart')&&panels.length<8){const p={id:nextPanel++,ticker:'',reportId:'',metric:'revenue',scale:'absolute',from:'',to:''};panels.push(p);renderFinancial();document.getElementById('fin-'+p.id+'-ticker')?.focus();}
  if(!home&&button.dataset.remove&&panels.length>1){const i=panels.findIndex(p=>String(p.id)===button.dataset.remove);if(i>=0){panels.splice(i,1);renderFinancial();$('[data-add-chart]')?.focus();}}
  if(!home&&button.dataset.resetChart){const p=panels.find(p=>String(p.id)===button.dataset.resetChart);if(p){Object.assign(p,{scale:'absolute',from:'',to:''});renderFinancial();$('[data-reset-chart="'+p.id+'"]')?.focus();}}
  if(home&&sections.includes(button.dataset.section)){section=button.dataset.section;history.replaceState(null,'','#'+section);year='all';isin='all';render();nav.querySelector('[data-section="'+section+'"]').focus();}
  if(button.hasAttribute('data-export')){
   const quote=v=>{let s=String(v??'');if(typeof v==='string'&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
   const selectedRows=panelExports.get(button.dataset.export)||exportRows;
   const u=URL.createObjectURL(new Blob(['\uFEFF'+selectedRows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=u;a.download=(section==='bist'?ticker:section)+'-hisse-atlasi.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
 });
 view.addEventListener('change',async ({target})=>{
  if(target.id==='bist-csv'){
   const file=target.files?.[0], symbol=ticker;if(!file)return;
   try{if(file.size>2_000_000)throw Error('File too large');const rows=parseCloseCsv(await file.text());localCloses.set(symbol,rows);if(ticker===symbol&&section==='bist')localBistChart();}
   catch{if(ticker===symbol&&$('#bist-csv-status'))$('#bist-csv-status').textContent=t('Dosya okunamadı:.csv, date ve close sütunları, benzersiz ISO tarihler ve pozitif kapanış değerleri gerekir.','Invalid CSV: date and close columns, unique ISO dates and positive closing prices are required.');}
   return;
  }
  const m=target.id.match(/^fin-(\d+)-(ticker|reportId|metric|scale|from|to)$/);
  if(!m)return;
  const p=panels.find(p=>String(p.id)===m[1]);if(!p)return;
  p[m[2]]=target.value;
  if(['ticker','reportId','metric'].includes(m[2])){p.from='';p.to='';if(m[2]==='ticker')p.reportId='';}
  renderFinancial();document.getElementById(target.id)?.focus();
 });
 controls.addEventListener('change',({target})=>{
  const v=target.value;
  switch(target.id){
   case 'ticker':ticker=v;reportId='';break;
   case 'report':reportId=v;break;
   case 'range':range=v;break;
   case 'compare':compare=v==='yes';break;
   case 'group':if(section==='tahviller')debt=v;else cb=v;year='all';isin='all';break;
   case 'year':year=v;break;
   case 'isin':isin=v;break;
   default:return;
  }
  render();document.getElementById(target.id)?.focus();
 });
 window.addEventListener('hashchange',()=>{if(home){section=hashSection();year='all';isin='all';render();}});
}catch{view.innerHTML=note(t('Veri yüklenemedi. Sayfayı yenileyin veya rapor arşivine dönün.','Data could not load. Refresh or return to the report archive.'))+href('../',t('Rapor arşivi','Report archive'));}
