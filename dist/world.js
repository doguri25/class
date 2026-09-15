// Shared room geometry and navigation. All positions use floor coordinates.
export const ROOM_SIZES={district:[18,14],museum:[22,16],pool:[24,28],health:[14,12],counsel:[14,12],classroom:[12.8,16.4],cafeteria:[22,18],hall:[6,26],playground:[24,28],gym:[24,28],library:[20,16],staff:[18,12],research:[16,11],admin:[12,10],science:[20,16],computer:[20,15],music:[16,14],art:[20,14],audiovisual:[20,24]};
export const LINE_GAP=.50;
export function roomSpec(room){const [width,depth]=ROOM_SIZES[room]||[18,14];return {width,depth,minX:-width/2+.5,maxX:width/2-.5,minZ:-depth/2+.55,maxZ:depth/2-.65};}
export function pupilScale(grade=3){return .89+(Math.max(1,Math.min(6,grade))-1)*.016;}
export function deskScale(grade=3){return .8*pupilScale(grade)/.938;}
export function classroomSeats(count,layout='rows',grade=3){
 const result=[],cols=count<=4?2:count<=12?4:5,scale=deskScale(grade);
 for(let i=0;i<count;i++){let x,z,rotation=0;
  if(layout==='groups'){const group=Math.floor(i/4),local=i%4,perRow=count<=4?1:2;x=(group%perRow-(perRow-1)/2)*4.4+(local%2?.58:-.58);z=-3.75+Math.floor(group/perRow)*2.7+(local>=2?.39:-.39);rotation=local>=2?0:Math.PI;}
  else if(layout==='u'){const side=Math.ceil(count/3);if(i<side){x=-4.25;z=-4.25+i*(9.55/Math.max(1,side-1));rotation=Math.PI/2;}else if(i<side*2){x=4.25;z=-4.25+(i-side)*(9.55/Math.max(1,side-1));rotation=-Math.PI/2;}else{x=-4.1+(i-side*2)*(8.2/Math.max(1,count-side*2-1));z=6.45;}}
  else{x=(i%cols-(cols-1)/2)*1.82;z=-4.45+Math.floor(i/cols)*1.73;}
  result.push({x,z,rotation,scale,home:{x:x+Math.sin(rotation)*.71*scale,z:z+Math.cos(rotation)*.71*scale}});
}return result;
}
export function musicSeats(){return Array.from({length:10},(_,i)=>{const a=Math.PI*.1+i*Math.PI*.085,x=Math.cos(a)*5.4,z=Math.sin(a)*4.2,dx=-x,dz=-5.6-z,len=Math.hypot(dx,dz);return {x,z,rotation:Math.atan2(dx,dz)+Math.PI,forward:{x:dx/len,z:dz/len},stand:{x:x+dx/len*.78,z:z+dz/len*.78}};});}
export function groupSpots(room,count,layout='rows'){if(room==='pool')return Array.from({length:count},(_,i)=>({x:7.7+i%2*1.6,z:-9.7+Math.floor(i/2)*1.45}));if(room==='museum')return Array.from({length:count},(_,i)=>({x:-9+i%7*3,z:[-1.4,0,1.4,5.5][Math.floor(i/7)]}));if(room==='health')return Array.from({length:count},(_,i)=>({x:0,z:2.5+i*1.5}));if(room==='counsel')return Array.from({length:count},(_,i)=>({x:1.7,z:1.2+i*1.5}));
 if(room==='classroom')return classroomSeats(count,layout).map(s=>s.home);
 if(room==='cafeteria')return Array.from({length:count},(_,i)=>{const table=Math.floor(i/6),local=i%6;return {x:[-6,0,6][table%3]+(local%3-1)*1.0,z:-2.5+Math.floor(table/3)*5+(local<3?-.92:.92)};});
 return Array.from({length:count},(_,i)=>({x:(i%5-2)*1.55,z:-1.4+Math.floor(i/5)*1.15}));
}
export function journeyPoints(room,stage,count){const spec=roomSpec(room);let x=spec.maxX-.70;let z=Math.max(spec.minZ+1.25,spec.maxZ-(count-1)*LINE_GAP-.75);z=Math.min(z,-2.5);if(room==='hall'){x=spec.maxX-.7;}
 const head={x,z};const leader={x,z:z-.68};const exit={x,z:spec.minZ+.25};const goal=stage===2?(room==='cafeteria'?{x:0,z:-5.3}:room==='gym'?{x:4,z:spec.minZ+2}:{x:room==='classroom'?3.8:0,z:spec.minZ+1.5}):exit;return {head,leader,goal,queue:Array.from({length:count},(_,i)=>({x,z:z+i*LINE_GAP}))};}
export function blockedPoint(point,blockers,bounds,margin=.15){const {x,z}=point;if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return true;return blockers.some(b=>Math.abs(x-b.x)<b.w/2+margin&&Math.abs(z-b.z)<b.d/2+margin);}
export function findPath(start,goal,blockers,bounds,step=.24){
 const cell=p=>({x:Math.round((p.x-bounds.minX)/step),z:Math.round((p.z-bounds.minZ)/step)}),position=c=>({x:bounds.minX+c.x*step,z:bounds.minZ+c.z*step});
 const width=Math.floor((bounds.maxX-bounds.minX)/step)+1,height=Math.floor((bounds.maxZ-bounds.minZ)/step)+1;let end=cell(goal);const begin=cell(start);const valid=c=>c.x>=0&&c.x<width&&c.z>=0&&c.z<height&&!blockedPoint(position(c),blockers,bounds,.12);
 if(!valid(end)){let best=null,distance=Infinity;for(let dx=-7;dx<=7;dx++)for(let dz=-7;dz<=7;dz++){const p={x:end.x+dx,z:end.z+dz};if(valid(p)&&dx*dx+dz*dz<distance){best=p;distance=dx*dx+dz*dz;}}if(!best)return [];end=best;}
 const key=p=>p.z*width+p.x,queue=[begin],previous=new Map([[key(begin),null]]);let head=0;
 while(head<queue.length){const current=queue[head++];if(current.x===end.x&&current.z===end.z){const route=[];let p=current;while(p&&key(p)!==key(begin)){route.push(position(p));p=previous.get(key(p));}route.reverse();if(route.length&&Math.hypot(route.at(-1).x-goal.x,route.at(-1).z-goal.z)<step*1.5&&!blockedPoint(goal,blockers,bounds,.1))route.push({...goal});return route;}
  for(const [dx,dz] of [[0,-1],[1,0],[-1,0],[0,1],[1,-1],[-1,-1],[1,1],[-1,1]]){const next={x:current.x+dx,z:current.z+dz};if(valid(next)&&(!dx||!dz||valid({x:current.x+dx,z:current.z})&&valid({x:current.x,z:current.z+dz}))&&!previous.has(key(next))){previous.set(key(next),current);queue.push(next);}}
 }return [];
}
export function pointAlongTrail(trail,distance){if(!trail.length)return {x:0,z:0};if(distance<=0)return {...trail[0]};for(let i=1;i<trail.length;i++){const a=trail[i-1],b=trail[i],len=Math.hypot(b.x-a.x,b.z-a.z);if(distance<=len&&len>0){const t=distance/len;return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};}distance-=len;}return {...trail.at(-1)};}
export function clampZoom(value){return Math.max(.5,Math.min(2,Number(value)||1));}
export function surname(name){const compounds=['남궁','황보','제갈','선우','독고','서문','사공','동방'];return compounds.find(v=>String(name).startsWith(v))||Array.from(String(name))[0]||'';}

export function direction8(dx,dz){if(Math.hypot(dx,dz)<.0001)return {x:0,z:0,angle:0};const angle=Math.round(Math.atan2(dx,dz)/(Math.PI/4))*(Math.PI/4);return {x:Math.sin(angle),z:Math.cos(angle),angle};}
