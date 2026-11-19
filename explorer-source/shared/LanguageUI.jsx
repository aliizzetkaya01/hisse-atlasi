import React,{createContext,useContext,useState,useEffect} from 'react';
import {translate,getLanguage,saveLanguage} from './i18n.mjs';
const Context=createContext({lang:'tr',setLang:()=>{}});
export function LanguageProvider({children}){const [lang,update]=useState(getLanguage);useEffect(()=>{document.documentElement.lang=lang},[lang]);const setLang=value=>{saveLanguage(value);update(value)};return <Context.Provider value={{lang,setLang}}>{children}</Context.Provider>}
export const useLocale=()=>useContext(Context);
export function LanguageSwitch(){const {lang,setLang}=useLocale();return <div className="atlas-language" role="group" aria-label={lang==='en'?'Interface language':'Arayüz dili'}><button type="button" lang="tr" aria-pressed={lang==='tr'} onClick={()=>setLang('tr')}>Türkçe</button><button type="button" lang="en" aria-pressed={lang==='en'} onClick={()=>setLang('en')}>English</button></div>}
export function localizeTree(node,lang){
 if(typeof node==='string')return translate(node,lang);
 if(Array.isArray(node))return node.map(n=>localizeTree(n,lang));
 if(!React.isValidElement(node))return node;
 const p={};
 for(const key of ['title','caption','placeholder','aria-label'])if(typeof node.props[key]==='string')p[key]=translate(node.props[key],lang);
 if(Array.isArray(node.props.columns))p.columns=node.props.columns.map(col=>({...col,label:translate(col.label,lang),renderCell:col.renderCell?(...args)=>localizeTree(col.renderCell(...args),lang):v=>typeof v==='string'?translate(v,lang):v}));
 if(node.props.spec){p.spec={...node.props.spec};if(p.spec.yLabel)p.spec.yLabel=translate(p.spec.yLabel,lang);const fields=p.spec.fields||[p.spec.y];p.spec.legend={...p.spec.legend,labels:{...p.spec.legend?.labels,...Object.fromEntries(fields.filter(Boolean).map(f=>[f,translate(p.spec.legend?.labels?.[f]||f,lang)]))}}}
 if(node.props.rowActionLabel)p.rowActionLabel=r=>translate(node.props.rowActionLabel(r),lang);
 // Never translate archived source text or quotations; only authored interface copy.
 const source=node.type==='pre'||node.type==='blockquote'||node.props.className==='atlas-quotes';
 if(!source&&node.props.children!==undefined)p.children=localizeTree(node.props.children,lang);
 return React.cloneElement(node,p);
}
