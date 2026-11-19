export const TV_BASE='https://www.tradingview-widget.com/embed-widget/advanced-chart/';
export function tradingSymbol(ticker){
 const special={MCD:'NYSE:MCD',ASELS:'BIST:ASELS',MPARK:'BIST:MPARK',SKHY:'KRX:000660'};
 if(!/^[A-Z0-9.-]{1,12}$/.test(ticker||''))throw Error('Invalid ticker');
 return special[ticker]||'NASDAQ:'+ticker;
}
export function widgetUrl(symbol,range='12M',compare=true,pageUri=''){
 if(!['1M','3M','6M','12M','60M'].includes(range)||!/^[A-Z0-9:.-]+$/.test(symbol))throw Error('Invalid market selection');
 const settings={symbol,range,interval:'D',timezone:'Etc/UTC',locale:'tr',theme:'light',style:'2',width:'100%',height:'100%',autosize:true,allow_symbol_change:true,hide_volume:true,hide_side_toolbar:true,hide_top_toolbar:false,withdateranges:true,save_image:false,percentage:compare,compareSymbols:compare?[{symbol:'TVC:DXY',position:'SameScale'}]:[]};
 if(pageUri.startsWith('https://aliizzetkaya01.github.io/'))settings['page-uri']=new URL(pageUri).origin+new URL(pageUri).pathname;
 return TV_BASE+'?locale=tr#'+encodeURIComponent(JSON.stringify(settings));
}
export function financialSeries(rows,{reportId,metric,from='',to='',mode='absolute'}){
 const sourceRows=rows.filter(r=>r.reportId===reportId&&r.metric===metric&&(!from||r.period>=from)&&(!to||r.period<=to)).sort((a,b)=>a.period.localeCompare(b.period));
 const valid=sourceRows.filter(r=>Number.isFinite(r.value));
 if(new Set(valid.map(r=>r.unit)).size>1)throw Error('Mixed financial units');
 const normalized=mode!=='absolute',allowed=!normalized||valid.length>0&&valid.every(r=>r.value>0),first=valid[0]?.value;
 return {sourceRows,allowed,unit:normalized?(mode==='index'?'Başlangıç = 100':'İlk döneme göre %'):valid[0]?.unit||'',rows:allowed?sourceRows.map(r=>({...r,displayValue:Number.isFinite(r.value)?(normalized?(mode==='index'?r.value/first*100:(r.value/first-1)*100):r.value):null})):[],reason:allowed?'':valid.length?'Sıfır/negatif gözlem varken endekslenmiş seri çizilmez. Kaynak birimini seçin.':'Bu aralıkta endekslenebilen gözlem yok.'};
}
