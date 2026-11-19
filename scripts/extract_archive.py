"""Extract the published archive without changing original PDFs.

Outputs preserve PDF/page lineage; parsed cover KPIs are archival observations,
not live quotes or a newly reviewed investment recommendation.
"""
import argparse, csv, hashlib, io, json, re, unicodedata, sys, subprocess
from datetime import datetime, timezone
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'

def norm(s):
    return unicodedata.normalize('NFKC', s).replace('\u2212', '-').replace('\u00a0', ' ')

def number(s):
    s = s.strip().replace(' ', '').replace('$', '').replace('%', '').replace('\u2212','-')
    negative = s.startswith('(') and s.endswith(')')
    s = s.strip('()')
    if ',' in s and '.' in s:
        if s.rfind(',') > s.rfind('.'): s = s.replace('.', '').replace(',', '.')
        else: s = s.replace(',', '')
    elif ',' in s:
        if len(s.split(',')[-1]) == 3: return None
        s = s.replace(',', '.')
    elif '.' in s and len(s.split('.')[-1]) == 3: return None
    if not re.fullmatch(r'-?\d+(?:\.\d+)?', s): return None
    x = float(s)
    return -x if negative else x

SECTIONS = {
    'Şirket': r'şirket ne yapar|iş modeli|company overview|business overview',
    'Finansallar': r'finansal geçmiş|tarihsel finans|gelir tablosu|historical financial|gerçekleşmiş finans',
    'Nakit akışı': r'nakit akışı|nakit dönüşüm|cash flow|cfo/net|fcf',
    'Değerleme': r'değerleme|dcf|wacc|valuation|hedef fiyat',
    'EPS ve seyrelme': r'eps|seyrel|dilut|hisse bazlı',
    'Riskler': r'risk|tezi boz|falsifier|erken uyarı',
    'Emsaller': r'emsal|peer|rakip',
    'Kaynaklar': r'kaynaklar|source register|veri kapsamı',
}

def cover_kpis(pages):
    text = norm(pages[0]['text'])
    lines = [x.strip() for x in text.splitlines() if x.strip()]
    fields = {}
    numeric_line = r'(?:\$)?\s*[\d]+(?:[.,][\d]+)*\s*(?:USD|TL|TRY|KRW|EUR)'
    reversed_layout = any(i>0 and i+2<len(lines) and
        re.fullmatch(r'spot',line,re.I) and
        re.fullmatch(numeric_line,lines[i-1],re.I) and
        re.fullmatch(numeric_line,lines[i+1],re.I) and
        re.match(r'12\s*a\s*baz\s*hedef',lines[i+2],re.I)
        for i,line in enumerate(lines))
    for i, line in enumerate(lines):
        low = line.casefold().replace('\u0307','')
        kind = None
        if re.match(r'^(spot\b|referans fiyat|son normal seans)',low) and not re.search(r'potans|getiri|oran',low): kind='spot'
        elif re.match(r'^12\s*a\s*(?:koşullu\s*)?baz\s*hedef\b|^12\s*aylık\s*(?:koşullu\s*)?(?:baz|kesin)?\s*hedef\b',low): kind='target'
        elif re.match(r'^(?:(?:stratejik|uzun\s*vadeli)\s*)?dcf\b',low): kind='dcf'
        if not kind or kind in fields: continue
        following = lines[i+1] if i+1 < len(lines) else ''
        previous = lines[i-1] if i else ''
        # Some covers place every numeric card value BEFORE its label (ON).
        # Detect the explicit value/label/value/label sequence, never shift
        # a following card's price into the current field.
        numeric_line = r'(?:\$)?\s*[\d]+(?:[.,][\d]+)*\s*(?:USD|TL|TRY|KRW|EUR)'
        reverse = reversed_layout and bool(re.fullmatch(numeric_line,previous,re.I))
        candidate = previous if reverse else following
        if re.fullmatch(r'kurulamad[ıi]|n/?a|n/?m',following.casefold()):
            fields[kind]={'value':None,'currency':None,'status':'kurulamadı','page':1,'quote':line+'\n'+following};continue
        m=re.fullmatch(r'(\$)?\s*([\d]+(?:[.,][\d]+)*)\s*(USD|TL|TRY|KRW|EUR)?',candidate,re.I)
        if not m: continue
        currency = 'USD' if m[1] else {'TL':'TRY','TRY':'TRY','USD':'USD','KRW':'KRW','EUR':'EUR'}.get((m[3] or '').upper())
        value=number(m[2])
        if value is None or currency is None: continue
        fields[kind]={'value':value,'currency':currency,'status':'rapor değeri','page':1,'quote':previous+'\n'+line if reverse else line+'\n'+following}
    outlook=re.search(r'(?:görüş\s*[:·/]|araştırma görüşü\s*\n)\s*(Olumlu|Nötr|Temkinli)',text,re.I)
    if not outlook:
        for i,line in enumerate(lines):
            if re.search(r'görüş',line,re.I):
                nearby=' '.join(lines[i:i+3]);m=re.search(r'\b(Olumlu|Nötr|Temkinli)\b',nearby,re.I)
                if m:outlook=m;break
    if outlook:
        fields['outlook']={'value':outlook[1][0].upper()+outlook[1][1:].lower(),'page':1,'quote':outlook[0]}
    # Reviewed B-stage cover: keep unavailable target separate from narrative DCF.
    if re.search(r'12\s*A baz / PW\s+Kurulamadı',text):
        m=re.search(r'12\s*A baz / PW\s+Kurulamadı',text)
        fields['target']={'value':None,'currency':None,'status':'kurulamadı','page':1,'quote':m[0]}
        m=re.search(r'Koşullu stratejik DCF baz\s+([\d.,]+)\s+USD',text)
        if m:fields['dcf']={'value':number(m[1]),'currency':'USD','status':'koşullu stratejik DCF; 12A hedef değil','page':1,'quote':m[0]}
    return fields

def table_lines(layout):
    rows=[]
    for line in layout.splitlines():
        parts=[p.strip() for p in re.split(r'\s{2,}',line.strip()) if p.strip()]
        numeric=sum(bool(re.fullmatch(r'[-−()$%\d.,]+\s*(?:x|USD|TL|%)?',p)) for p in parts)
        if len(parts)>=3 and numeric>=2:
            rows.append({'cells':parts,'raw':line.rstrip()})
    return rows

def main():
    catalog=json.loads((DIST/'catalog.json').read_text(encoding='utf-8'))
    published_kpis={}
    if '--preserve-published-kpis' in sys.argv:
        published=json.loads(subprocess.check_output(['git','show','HEAD:dist/data/manifest.json'],cwd=ROOT))
        published_kpis={r['id']:r['kpis'] for r in published['reports']}
    out=DIST/'data';(out/'reports').mkdir(parents=True,exist_ok=True)
    inventory=[];search=[];all_pages=[];observations=[];total_tables=0;all_text_chars=0
    for ri,r in enumerate(catalog['reports'],1):
        pdf=DIST/r['file'];raw=pdf.read_bytes();digest=hashlib.sha256(raw).hexdigest()
        assert digest==r['sha256'] and len(raw)==r['bytes'],r['filename']
        previous_path=out/'reports'/f"{r['id']}.json"
        previous=json.loads(previous_path.read_text(encoding='utf-8')) if '--reuse-text' in sys.argv and previous_path.exists() else None
        if previous: assert previous['report']['sha256']==digest
        reader=None if previous else PdfReader(pdf)
        pages=previous['pages'] if previous else []
        tables=previous['tables'] if previous else []
        links=previous['links'] if previous else []
        for pi,page in enumerate(reader.pages if reader else [],1):
            text=norm(page.extract_text() or '')
            tags=[label for label,pattern in SECTIONS.items() if re.search(pattern,text,re.I)]
            item={'page':pi,'text':text,'sections':tags,'characters':len(text),'pdfUrl':'../'+r['file']+'#page='+str(pi)}
            pages.append(item)
            # Layout extraction only on pages with plausible numeric tables.
            if len(re.findall(r'\b(?:20\d\d|FY\s*\d{2,4}|TTM|NTM)\b',text,re.I))>=3 or re.search(r'hesaplama eki|köprü|bridge',text,re.I):
                try:
                    layout=norm(page.extract_text(extraction_mode='layout',layout_mode_space_vertically=False) or '')
                    rows=table_lines(layout)
                    if rows:tables.append({'page':pi,'rows':rows,'status':'otomatik tablo satırları; semantik eşleştirme yapılmadı'})
                except Exception:pass
            for a in page.get('/Annots',[]):
                try:
                    obj=a.get_object();uri=str(obj.get('/A',{}).get('/URI',''))
                    if uri.startswith('https://') and not re.search(r'token=|sig=|key=',uri,re.I):links.append({'page':pi,'url':uri})
                except Exception:pass
        whole='\n'.join(p['text'] for p in pages)
        kpis=published_kpis[r['id']] if r['id'] in published_kpis else cover_kpis(pages)
        row={**r,'pageCount':len(pages),'textPages':sum(p['characters']>40 for p in pages),'characterCount':len(whole),'tablePages':len(tables),'tableRows':sum(len(t['rows']) for t in tables),'replacementCharacters':whole.count('\ufffd'),'kpis':kpis,'dataFile':'data/reports/'+r['id']+'.json'}
        inventory.append(row);search.append({'id':r['id'],'text':whole})
        payload={'schemaVersion':'1.0','report':row,'pages':pages,'tables':tables,'links':links,'license':'CC-BY-NC-4.0','author':'Ali İzzet KAYA','qualification':'PDF arşivinden otomatik aktarım; güncel piyasa verisi veya yeni mali doğrulama değildir. Raster grafikler sayısallaştırılmamıştır.'}
        (out/'reports'/f"{r['id']}.json").write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        total_tables+=row['tableRows'];all_text_chars+=len(whole)
        all_pages.extend({'reportId':r['id'],'ticker':r['ticker'],'company':r['company'],'date':r['date'],'page':p['page'],'sections':', '.join(p['sections']),'characters':p['characters']} for p in pages)
        for metric,k in kpis.items():
            observations.append({'reportId':r['id'],'ticker':r['ticker'],'company':r['company'],'reportDate':r['date'],'metric':metric,**k,'basis':'rapor tarihindeki arşiv gözlemi','sourceFile':r['file']})
        print(json.dumps({'document':ri,'ticker':r['ticker'],'pages':len(pages),'tableRows':row['tableRows'],'kpis':list(kpis)},ensure_ascii=True),flush=True)
    generated=datetime.now(timezone.utc).isoformat()
    manifest={'schemaVersion':'1.0','title':'Hisse Atlası','author':'Ali İzzet KAYA','license':'CC-BY-NC-4.0','generatedAt':generated,'reports':inventory,'coverage':{'documents':len(inventory),'companies':len(set(r['ticker'] for r in inventory)),'pages':len(all_pages),'textPages':sum(r['textPages'] for r in inventory),'tableRows':total_tables,'characters':all_text_chars,'financialSemanticCoverage':'Cover KPIs only where exact label, value and currency are captured. Raw table rows are not normalized financial statements. Charts embedded as images are retained only in PDF.'}}
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (out/'search-index.json').write_text(json.dumps(search,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (out/'pages.json').write_text(json.dumps(all_pages,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (out/'observations.json').write_text(json.dumps(observations,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    with (out/'catalog.csv').open('w',encoding='utf-8-sig',newline='') as f:
        keys=['id','ticker','company','date','sector','market','type','pageCount','textPages','tableRows','sha256','file']
        w=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');w.writeheader();w.writerows(inventory)
    print(json.dumps({'complete':True,**manifest['coverage']},ensure_ascii=True))

if __name__=='__main__':main()
