// Keep a view's reading position through selection, save and return navigation.
export function createDialogMemory(){
 const views=new Map();
 return {
  clear(){views.clear();},
  capture(modal,area){
   if(!modal.open){views.clear();return;}
   const key=modal.dataset.viewKey;
   if(!key)return;
   const nodes=[...area.querySelectorAll('[id], [data-scroll-key]')];
   const focus=area.ownerDocument.activeElement;
   views.set(key,{top:area.scrollTop,left:area.scrollLeft,outer:modal.scrollTop,
    nested:nodes.filter(n=>n.scrollTop||n.scrollLeft).map(n=>({id:n.id,key:n.dataset.scrollKey,top:n.scrollTop,left:n.scrollLeft})),
    details:[...area.querySelectorAll('details')].map((n,i)=>({id:n.id,index:i,open:n.open})),
    focus:focus&&area.contains(focus)?{id:focus.id,action:focus.dataset.action,item:focus.dataset.id,mode:focus.dataset.mode}:null});
  },
  restore(modal,area,key,options={}){
   const saved=options.preserveScroll===false||options.resetScroll?null:views.get(key);
   if(saved){
    for(const d of saved.details){const n=d.id?area.ownerDocument.getElementById(d.id):area.querySelectorAll('details')[d.index];if(n)n.open=d.open;}
    for(const n of saved.nested){const el=n.id?area.ownerDocument.getElementById(n.id):[...area.querySelectorAll('[data-scroll-key]')].find(el=>el.dataset.scrollKey===n.key);if(el){el.scrollTop=n.top;el.scrollLeft=n.left;}}
    const f=saved.focus;
    const el=f?.id?area.ownerDocument.getElementById(f.id):f?.action?[...area.querySelectorAll('[data-action]')].find(el=>el.dataset.action===f.action&&el.dataset.id===f.item&&el.dataset.mode===f.mode):null;
    if(el&&!el.disabled)el.focus({preventScroll:true});
   }
   area.scrollTop=saved?.top||0;area.scrollLeft=saved?.left||0;modal.scrollTop=saved?.outer||0;
  }
 };
}
