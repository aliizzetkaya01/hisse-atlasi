import fs from 'node:fs';
const {reports}=JSON.parse(fs.readFileSync('dist/data/manifest.json','utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dataset=reports.map(({id,ticker,company,market,date,file,kpis})=>({id,ticker,company,market,date,file,kpis}));
fs.writeFileSync('dist/data/market-reports.json',JSON.stringify(dataset));
const bi=(tr,en)=>`<span class="tr" lang="tr">${tr}</span><span class="en" lang="en">${en}</span>`;
const tabs=`<nav class="market-tabs" aria-label="Piyasa / Market"><a href="../yurt-disi/">${bi('Yurt Dışı','International')}</a><a href="../yurt-ici/">${bi('Yurt İçi','Türkiye')}</a></nav>`;
for(const [slug,tr,en] of [['yurt-ici','Yurt İçi','Türkiye'],['yurt-disi','Yurt Dışı','International']]){
 const rows=dataset.filter(r=>(r.market==='BIST')===(slug==='yurt-ici'));
 const fallback=rows.map(r=>`<li>${esc(r.ticker)} · ${esc(r.company)} · <a href="../${esc(r.file)}">${esc(r.date)} PDF</a></li>`).join('');
 const nav=tabs.replace('href="../'+slug+'/"','href="../'+slug+'/" aria-current="page"');
 fs.mkdirSync('dist/'+slug,{recursive:true});
 fs.writeFileSync('dist/'+slug+'/index.html',`<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hisse Atlası · ${tr} / ${en}</title><link rel="stylesheet" href="../style.css"><link rel="stylesheet" href="../market-lab.css"></head>
<body><header><a class="brand" href="../">Hisse Atlası</a><a href="../yurt-disi/">${bi('Veri Laboratuvarı','Data Lab')}</a><div class="language-switch"><button type="button" data-language="tr">Türkçe</button><button type="button" data-language="en">English</button></div></header>
<main class="market-lab" data-market="${slug}">${nav}<h1>${bi(tr,en)}</h1><div id="lab-controls"></div><div id="lab-view"><p role="status">${bi('Etkileşimli görünüm hazırlanıyor.','Loading interactive view.')}</p></div><noscript><ul>${fallback}</ul></noscript></main>
<script type="module" src="../market-lab.mjs?v=2"></script></body></html>`);
}
fs.mkdirSync('dist/markets',{recursive:true});
fs.writeFileSync('dist/markets/index.html','<!doctype html><html lang="tr"><meta charset="utf-8"><title>Hisse Atlası · Veri Laboratuvarı</title><meta http-equiv="refresh" content="0; url=../yurt-disi/"><a href="../yurt-disi/">Yurt Dışı / International</a><script>const u=new URL("../yurt-disi/",location.href);u.search=location.search;location.replace(u)</script></html>');
