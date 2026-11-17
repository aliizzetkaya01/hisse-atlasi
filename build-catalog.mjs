import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
const archiveRoot=process.argv[2]??path.join(os.homedir(),'Desktop','Nasdaq Hisse Analizi');
const roots=[[path.join(archiveRoot,'Günlük NASDAQ Hisse Analizleri'),'Şirket araştırması'],[path.join(archiveRoot,'BIST Hisse Analizleri'),'BIST araştırması']];
const names={ACLS:'Axcelis Technologies',ADI:'Analog Devices',ADP:'Automatic Data Processing',AEIS:'Advanced Energy Industries',ALAB:'Astera Labs',ALGM:'Allegro MicroSystems',AMAT:'Applied Materials',AMBA:'Ambarella',AMKR:'Amkor Technology',ARM:'Arm Holdings',ASELS:'Aselsan',ASML:'ASML Holding',AVGO:'Broadcom',CAMT:'Camtek',CDNS:'Cadence Design Systems',CEVA:'Ceva',CHKP:'Check Point Software',CLMT:'Calumet',CMCSA:'Comcast',COHU:'Cohu',CRDO:'Credo Technology',CRUS:'Cirrus Logic',DIOD:'Diodes Incorporated',ENTG:'Entegris',FORM:'FormFactor',FTNT:'Fortinet',GFS:'GlobalFoundries',GILD:'Gilead Sciences',HIMX:'Himax Technologies',ICHR:'Ichor Holdings',INTC:'Intel',ISRG:'Intuitive Surgical',KLAC:'KLA Corporation',KLIC:'Kulicke & Soffa',LAES:'SEALSQ',LRCX:'Lam Research',LSCC:'Lattice Semiconductor',MCD:"McDonald’s",MCHP:'Microchip Technology',MDLZ:'Mondelez International',MKSI:'MKS Instruments',MPWR:'Monolithic Power Systems',MRVL:'Marvell Technology',MTSI:'MACOM Technology Solutions',MU:'Micron Technology',MXL:'MaxLinear',NVDA:'NVIDIA',NVMI:'Nova',NXPI:'NXP Semiconductors',OLED:'Universal Display',ON:'onsemi',PANW:'Palo Alto Networks',PLAB:'Photronics',POWI:'Power Integrations',PYPL:'PayPal',QRVO:'Qorvo',RMBS:'Rambus',SIMO:'Silicon Motion',SITM:'SiTime',SKHY:'SK hynix',SMTC:'Semtech',SNPS:'Synopsys',SWKS:'Skyworks Solutions',TER:'Teradyne',TSEM:'Tower Semiconductor',UCTT:'Ultra Clean Holdings',MPARK:'MLP Sağlık'};
Object.assign(names,{AAPL:'Apple',ADBE:'Adobe',AMD:'Advanced Micro Devices',AMZN:'Amazon',APP:'AppLovin',BKNG:'Booking Holdings',COST:'Costco Wholesale',CSCO:'Cisco Systems',GOOGL:'Alphabet',INTU:'Intuit',MELI:'MercadoLibre',META:'Meta Platforms',MSFT:'Microsoft',NFLX:'Netflix',PEP:'PepsiCo',QCOM:'Qualcomm',SBUX:'Starbucks',TSLA:'Tesla',TXN:'Texas Instruments'});
const groups={
 'Yazılım & güvenlik':['ADP','CDNS','SNPS','CHKP','FTNT','PANW','ADBE','INTU','MSFT'],
 'Ekipman & malzeme':['ACLS','AMAT','AMKR','ASML','CAMT','COHU','ENTG','FORM','ICHR','KLAC','KLIC','LRCX','MKSI','NVMI','PLAB','TER','UCTT'],
 'Sağlık':['GILD','ISRG','MPARK'],
 'Tüketim & diğer':['CLMT','MCD','MDLZ','PEP','SBUX','COST'],
 'İnternet & medya':['CMCSA','APP','GOOGL','META','NFLX'],
 'E-ticaret & seyahat':['AMZN','MELI','BKNG'],
 'Finansal teknoloji':['PYPL'],
 'Donanım & otomotiv':['AAPL','TSLA'],
 'Savunma':['ASELS'],
 'Güç & altyapı':['AEIS']
};
fs.mkdirSync('dist/reports',{recursive:true});
const reports=[];const hashes=new Set();
for(const [root,origin]of roots){for(const filename of fs.readdirSync(root).filter(x=>x.endsWith('.pdf')).sort()){
 const src=path.join(root,filename),bytes=fs.readFileSync(src),sha=crypto.createHash('sha256').update(bytes).digest('hex');
 if(hashes.has(sha))continue;hashes.add(sha);
 const ticker=filename.split('_')[0],date=filename.match(/\d{4}-\d{2}-\d{2}/)?.[0];if(!date)throw Error('Tarih bulunamadı: '+filename);
 if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('PDF değil: '+filename);
 const id=sha.slice(0,16),file='reports/'+id+'.pdf';fs.copyFileSync(src,path.join('dist',file));
 const sector=Object.entries(groups).find(([,v])=>v.includes(ticker))?.[0]??'Yarı iletken & IP';
 reports.push({id,ticker,company:names[ticker]??ticker,date,sector,market:['ASELS','MPARK'].includes(ticker)?'BIST':ticker==='SKHY'?'Diğer borsa':'NASDAQ / ABD',type:filename.includes('Tek_Sayfa')?'Karar özeti':filename.includes('Bilanco')?'Bilanço sonrası':filename.includes('Ozel')||filename.includes('Tek_Seferlik')?'Özel araştırma':'Tam rapor',revision:/revize/i.test(filename),filename,bytes:bytes.length,sha256:sha,file,origin});
}}
reports.sort((a,b)=>b.date.localeCompare(a.date)||a.company.localeCompare(b.company,'tr'));
const data={title:'Hisse Atlası',catalogDate:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(new Date()),reports};
fs.writeFileSync('dist/catalog.json',JSON.stringify(data,null,2));
console.log(JSON.stringify({reports:reports.length,companies:new Set(reports.map(x=>x.ticker)).size,totalBytes:reports.reduce((n,r)=>n+r.bytes,0),hashVerified:reports.every(r=>crypto.createHash('sha256').update(fs.readFileSync(path.join('dist',r.file))).digest('hex')===r.sha256)}));
