import {translate,getLanguage,saveLanguage} from './i18n.mjs';
const texts=new WeakMap(),attrs=new WeakMap(),originalTitle=document.title;
export function localizeDocument(){
 const lang=getLanguage();document.documentElement.lang=lang;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
 while(n=walker.nextNode()){
  if(n.parentElement?.closest('script,style,iframe,[data-original-source]'))continue;
  if(!texts.has(n))texts.set(n,n.textContent);n.textContent=translate(texts.get(n),lang);
 }
 for(const el of document.querySelectorAll('[aria-label],[placeholder]')){
  let original=attrs.get(el);if(!original){original={};for(const a of ['aria-label','placeholder'])if(el.hasAttribute(a))original[a]=el.getAttribute(a);attrs.set(el,original)}
  for(const [a,v]of Object.entries(original))el.setAttribute(a,translate(v,lang));
 }
 document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===lang)));
 document.title=translate(originalTitle,lang);
}
document.addEventListener('click',e=>{const button=e.target.closest('[data-language]');if(!button)return;saveLanguage(button.dataset.language);localizeDocument();document.dispatchEvent(new CustomEvent('atlas-language-change'))});
document.addEventListener('DOMContentLoaded',localizeDocument,{once:true});
localizeDocument();
