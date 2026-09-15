import {NPCS} from './model.js';

const escapeRegex=s=>s.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
const DATE='(?:\\d{4}년\\s*)?\\d{1,2}월\\s*\\d{1,2}일(?:\\s*(?:[월화수목금토일]요일|\\([월화수목금토일]\\)))?|\\d{4}[-.]\\d{1,2}[-.]\\d{1,2}';
const TIME='(?:[01]?\\d|2[0-3]):[0-5]\\d|(?:오전|오후)?\\s*\\d{1,2}시(?:\\s*\\d{1,2}분)?';
export function personNames(state,extra=[]){return [...new Set([...(state.students||[]).map(s=>s.name),state.config?.teacherName,...NPCS.map(p=>p.name),...Object.values(state.community?.guardians||{}).map(p=>p.name),...extra].filter(s=>typeof s==='string'&&s.length>=2))].sort((a,b)=>b.length-a.length);}
export function segments(text,state,extra=[]){
 const names=personNames(state,extra),namesSet=new Set(names),date=new RegExp('^(?:'+DATE+')$'),pattern=[...names.map(escapeRegex),DATE,TIME].join('|'),parts=[];let start=0;
 for(const m of String(text).matchAll(new RegExp(pattern,'g'))){if(m.index>start)parts.push({text:String(text).slice(start,m.index),kind:'plain'});parts.push({text:m[0],kind:namesSet.has(m[0])?'person':date.test(m[0])?'date':'time'});start=m.index+m[0].length;}
 if(start<String(text).length)parts.push({text:String(text).slice(start),kind:'plain'});return parts;
}
export function emphasize(root,state,extra=[]){
 if(!root)return;const doc=root.ownerDocument,walker=doc.createTreeWalker(root,4),nodes=[];
 while(walker.nextNode()){const n=walker.currentNode;if(!n.parentElement?.closest('script,style,textarea,select,option,input,code,kbd,.text-person,.text-time,.text-date,.portrait'))nodes.push(n);}
 for(const n of nodes){const parts=segments(n.textContent,state,extra);if(!parts.some(p=>p.kind!=='plain'))continue;const fragment=doc.createDocumentFragment();
  for(const p of parts){if(p.kind==='plain')fragment.append(doc.createTextNode(p.text));else{const el=doc.createElement('strong');el.className='text-'+p.kind;el.textContent=p.text;fragment.append(el);}}
  n.replaceWith(fragment);
 }
}
