import {getLanguage,saveLanguage,translate} from './i18n.mjs';
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
function tabular(headers,rows,raw){
 exportRows=[headers,...raw];
 return `<div class="lab-table"><table><thead><tr>${headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')}</tr></thead><tbody>${rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')}</tbody></table></div><p><button class="lab-btn" data-export type="button">${csvLabel()}</button></p>`;
}
function plot(rows,unit,mode){
 if(!rows.length)return note(t('Bu filtreye uyan gözlem yok.','No observations match these filters.'));
 const W=760,H=278,l=65,r=32,top=28,b=48, hh=H-top-b,ww=W-l-r;
 const maxv=Math.max(...rows.map(x=>x[1])),minv=Math.min(...rows.map(x=>x[1]));
 const dates=rows.map(x=>Date.parse(x[0])),dateGrid=mode==='step'&&dates.length>1;
 const min=mode==='bar'?0:Math.floor((minv-1)/5)*5,max=Math.max(min+5,Math.ceil((maxv+1)/5)*5);
 const x=i=>dateGrid?l+18+(dates[i]-dates[0])/(dates.at(-1)-dates[0])*(ww-36):l+(i+.5)*ww/rows.length;
 const y=v=>top+hh-(v-min)/(max-min)*hh;
 const points=rows.map((v,i)=>x(i)+','+y(v[1]));
 let drawing='';
 if(mode==='step'&&rows.length>1)drawing=`<path d="M ${points[0]} ${rows.slice(1).map((v,i)=>'H '+x(i+1)+' V '+y(v[1])).join(' ')}" fill="none" stroke="#197664" stroke-width="3"/>`;
 rows.forEach(([label,value],i)=>{
  const cx=x(i), cy=y(value), bar=Math.min(64,ww/rows.length*.5), tip=esc(label+' · '+n(value)+' '+unit);
  drawing+=mode==='bar'?`<rect x="${cx-bar/2}" y="${cy}" width="${bar}" height="${y(0)-cy}" rx="4" fill="#197664"><title>${tip}</title></rect>`:`<circle cx="${cx}" cy="${cy}" r="5" fill="#197664" stroke="#fff" stroke-width="1.5"><title>${tip}</title></circle>`;
  if(!dateGrid||[0,rows.length-1].includes(i))drawing+=`<text x="${cx}" y="${cy-10}" text-anchor="middle" font-size="13">${esc(n(value))}</text><text x="${cx}" y="${H-23}" text-anchor="middle" font-size="12">${esc(label)}</text>`;
 });
 return `<div class="lab-chart-wrap"><svg class="lab-plot" role="img" aria-label="${esc(t('Grafik; tam değerler aşağıdaki tabloda','Chart; exact values in the table below'))}" viewBox="0 0 ${W} ${H}" fill="currentColor"><text x="${l}" y="16" font-size="13">${esc(unit)}</text><path d="M${l},${top} V${H-b} H${W-r}" fill="none" stroke="#91aaa3"/><text x="${l-8}" y="${y(min)+4}" text-anchor="end" font-size="12">${esc(min)}</text><text x="${l-8}" y="${y(max)+4}" text-anchor="end" font-size="12">${esc(max)}</text>${drawing}</svg></div>`;
}
const sourceLabel=()=>t('Kaynak','Source'), dateLabel=()=>t('Tarih','Date');
let selectedFrame='';
const marketSymbols={MCD:'NYSE:MCD',SKHY:'KRX:000660',CLMT:'NASDAQ:CLMT',MXL:'NASDAQ:MXL',TER:'NASDAQ:TER'};
function stockView(all){
 const stocks=all.filter(r=>(r.market==='BIST')===home);
 const choices=[...new Map(stocks.map(r=>[r.ticker,r.company])).entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 if(!choices.some(([k])=>k===ticker))ticker=home?choices[0]?.[0]:choices.find(([k])=>k==='NVDA')?.[0]??choices[0]?.[0];
 const reports=stocks.filter(r=>r.ticker===ticker).sort((a,b)=>b.date.localeCompare(a.date));
 const r=reports.find(r=>r.id===reportId)||reports[0];
 if(!r){view.innerHTML=note(t('Rapor bulunamadı.','No report found.'));return;}
 reportId=r.id;
 controls.innerHTML=`<div class="lab-controls">${select('ticker',t('Hisse','Ticker'),choices.map(([k,v])=>opt(k,k+' · '+v,ticker)).join(''))}${select('report',t('Arşiv raporu','Archived report'),reports.map(q=>opt(q.id,q.date,reportId)).join(''))}${select('range',t('Grafik dönemi','Chart range'),[['1M','1 ay','1 month'],['3M','3 ay','3 months'],['12M','1 yıl','1 year'],['60M','5 yıl','5 years']].map(([id,a,b])=>opt(id,t(a,b),range)).join(''))}<label><span>${t('Karşılaştırma','Compare with')}</span><select id="compare">${opt('yes',home?'BIST 100':'DXY',compare?'yes':'no')}${opt('no',t('Yalnız hisse','Stock only'),compare?'yes':'no')}</select></label></div>`;
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
 view.innerHTML=card(esc(ticker+' · '+r.company),`<div class="lab-links">${links}</div><div id="market-frame"></div>`+note(t('Piyasa grafiği TradingView tarafından sağlanır; gecikme ve kapsam sağlayıcıya bağlıdır. Fintables verisi arşiv rakamlarıyla otomatik eşleştirilmez.','Market chart from TradingView; coverage and delays depend on the provider. Fintables data is not automatically reconciled with archive values.'))+
 href('https://www.tradingview.com/chart/?symbol='+encodeURIComponent(symbol),t('Grafiği TradingView’da aç','Open on TradingView')))+card(t('Raporda yayımlanan göstergeler','Metrics published in the report'),note(t('Tarihli rapor değerleridir; canlı kotasyon veya gerçekleşmiş getiri değildir.','Dated report values, not live quotes or realised returns.'))+tabular(headers,selected.map(([a,b,c,d])=>[esc(a),esc(b),esc(c),href(d,'PDF')]),selected));
 exportRows=[['metric','value','currency','status','report_date','source'],...selected.map(([label,,date,url,value,currency,status])=>[label,value,currency,status,date,new URL(url,location.href).href])];
 if(prev&&selectedFrame===frame){$('#market-frame').append(prev)}else{const f=document.createElement('iframe');f.className='lab-frame';f.title=t('Hisse fiyat grafiği','Stock price chart');f.src=frame;$('#market-frame').append(f);selectedFrame=frame;}
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
 const [all,ref]=await Promise.all([read('../data/market-reports.json'),home?read('../data/markets-reference.json'):null]);
 function render(){buttons();if(home)navRender();if(!home||section==='bist')stockView(all);else rateView(ref);}
 render();
 document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.language){lang=button.dataset.language;saveLanguage(lang);render();}
  if(home&&sections.includes(button.dataset.section)){section=button.dataset.section;history.replaceState(null,'','#'+section);year='all';isin='all';render();nav.querySelector('[data-section="'+section+'"]').focus();}
  if(button.hasAttribute('data-export')){
   const quote=v=>{let s=String(v??'');if(typeof v==='string'&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
   const u=URL.createObjectURL(new Blob(['\uFEFF'+exportRows.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=u;a.download=(section==='bist'?ticker:section)+'-hisse-atlasi.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
  }
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
