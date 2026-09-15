import * as THREE from './assets/three.module.js';
import {pupilScale} from './world.js';
import {staffInfo} from './staff-catalog.js';

// Identity affects appearance only. Support labels, grades and family data never do.
export function appearance(data, state, adult=false) {
 const seed=String(data.personKey||data.id).split('').reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,17);
 const staff=adult?staffInfo(data.id):null,selected=staff?staff.hair:data.id==='teacher'?Number(state.config.portrait)||0:seed;
 return {seed,hair:adult?selected%8:seed%10,glasses:adult?[1,3,6].includes(selected%8):seed%7===0,
  outfit:staff?[0,0,2,1,0,2][staff.cell]:seed%4,color:staff?.color||data.color||(adult?'#436d75':'#75988b'),
  hairColor:adult&&((data.id==='teacher'&&state.config.age==='50대')||selected%8===7)?'#77766d':['#302d2a','#4a3930','#594535','#3d3835'][seed%4],
  skin:data.skin||'#e4ba98',accent:['#e6bd69','#ccd5c8','#9fbeca','#d7a79b'][seed%4]};
}

export function createCharacter(scene,data,adult=false) {
 const state=scene.getState(),p=appearance(data,state,adult),g=new THREE.Group();g.userData.id=data.id;g.userData.designVersion=2;
 const upperBody=new THREE.Group();g.add(upperBody);
 const sphere=(r,c,x,y,z,parent=upperBody,sx=1,sy=1,sz=1)=>scene.sphere(r,c,x,y,z,parent,sx,sy,sz);
 const box=(w,h,d,c,x,y,z,parent=upperBody)=>scene.roundedBox(w,h,d,c,x,y,z,parent);
 // Rounded knit silhouette, separate collar/sleeves, hems and flat indoor shoes.
 sphere(.16,p.color,0,.35,0,upperBody,.94,.99,.76);
 box(.255,.06,.20,p.color,0,.243,0);
 if(p.outfit===0){box(.026,.20,.016,p.accent,0,.352,.128);for(const y of [.31,.36,.41])sphere(.008,'#d5d4c8',.018,y,.143);}
 if(p.outfit===1){for(const y of [.29,.35,.41])box(.25,.024,.013,p.accent,0,y,.127);}
 if(p.outfit===2){box(.085,.07,.015,p.accent,.065,.35,.136);box(.064,.012,.018,p.color,.065,.376,.148);}
 if(p.outfit===3){sphere(.105,p.color,0,.435,-.075,upperBody,1,.55,.55);box(.012,.095,.012,p.accent,-.039,.39,.142);box(.012,.095,.012,p.accent,.039,.39,.142);}
 const collar=scene.cylinder(.082,.078,.026,'#e8e8db',0,.455,0,upperBody);
 const headPivot=new THREE.Group();headPivot.position.y=.69;upperBody.add(headPivot);
 sphere(.227,p.skin,0,0,0,headPivot,1,1.055,.94);
 for(const side of [-1,1]){sphere(.04,p.skin,side*.225,-.016,-.004,headPivot,.7,1,.6);sphere(.018,'#c98f77',side*.232,-.015,.016,headPivot,.38,.6,.25);}
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.237,18,12,0,Math.PI*2,0,Math.PI*.55),scene.mat(p.hairColor));cap.position.set(0,.032,-.012);headPivot.add(cap);
 const fringeCount=p.hair%3+2;
 for(let i=0;i<fringeCount;i++){const x=(i-(fringeCount-1)/2)*.075;const fringe=sphere(.065,p.hairColor,x,.165-(i%2)*.026,.124,headPivot,1.04,.57,1);fringe.rotation.z=(p.hair%2?1:-1)*.25;}
 if([1,4,7].includes(p.hair))for(const side of [-1,1])sphere(.082,p.hairColor,side*.205,-.04,-.075,headPivot,.64,1.15,.78);
 if([2,5].includes(p.hair))sphere(.084,p.hairColor,.015,.05,-.225,headPivot,.8,1.3,.75);
 if(p.hair===3)for(const x of [-.10,0,.10])sphere(.07,p.hairColor,x,.226,-.02,headPivot,.9,.6,.8);
 if([6,8].includes(p.hair)){sphere(.095,p.hairColor,.12,.167,-.15,headPivot,.85,.8,.85);sphere(.025,p.accent,.187,.13,-.14,headPivot);}
 if(p.hair===9)for(const side of [-1,1]){sphere(.07,p.hairColor,side*.22,-.09,-.1,headPivot,.8,1.25,.8);sphere(.023,p.accent,side*.207,-.045,-.062,headPivot);}
 const eyes=[],brows=[];
 for(const side of [-1,1]){const eye=new THREE.Group();eye.position.set(side*.077,.005,.207);headPivot.add(eye);sphere(.021,'#f3e9da',0,0,0,eye,1,1.08,.4);sphere(.013,'#292d2e',0,0,.012,eye,.88,1.12,.46);sphere(.004,'#fffef3',-.004,.006,.019,eye);eyes.push(eye);const brow=box(.043,.007,.009,p.hairColor,side*.079,.055,.205,headPivot);brows.push(brow);}
 sphere(.021,p.skin,0,-.037,.219,headPivot,.75,.8,.8);
 for(const side of [-1,1])sphere(.024,'#d99981',side*.139,-.037,.174,headPivot,1,.42,.22);
 const mouth=new THREE.Mesh(new THREE.TorusGeometry(.025,.004,5,12,Math.PI),scene.mat('#986457'));mouth.rotation.z=Math.PI;mouth.position.set(0,-.072,.216);headPivot.add(mouth);
 if(p.glasses){for(const side of [-1,1]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.044,.0048,5,14),scene.mat('#475453'));ring.scale.y=.83;ring.position.set(side*.077,.006,.23);headPivot.add(ring);}box(.043,.008,.009,'#475453',0,.006,.23,headPivot);}
 const arms=[],forearms=[];
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.163,.43,0);upperBody.add(arm);sphere(.049,p.color,0,-.051,0,arm,1,1.65,1);const forearm=new THREE.Group();forearm.position.y=-.10;arm.add(forearm);sphere(.039,p.color,0,-.035,0,forearm,1,1.4,1);sphere(.04,p.skin,0,-.08,.008,forearm,.86,1,.9);arm.rotation.z=-side*.13;arms.push(arm);forearms.push(forearm);}
 const legs=[],lowerLegs=[];
 for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.081,.26,0);g.add(leg);box(.095,.135,.102,adult?'#414e59':'#53687e',0,-.065,0,leg);const shin=new THREE.Group();shin.position.y=-.13;leg.add(shin);box(.09,.10,.10,adult?'#414e59':'#53687e',0,-.048,0,shin);box(.087,.035,.10,'#dfe2d9',0,-.099,0,shin);box(.106,.055,.16,'#f0eee2',0,-.119,.024,shin);box(.108,.014,.16,'#53656a',0,-.144,.024,shin);legs.push(leg);lowerLegs.push(shin);}
 if(adult){box(.07,.085,.016,'#e3d8b9',.07,.38,.143);box(.04,.016,.017,'#557579',.07,.395,.154);}
 g.scale.setScalar(adult?1.15:pupilScale(state.config.grade));
 // One cached radial texture, no extra hit target, and a low-opacity grounding shadow.
 scene.materials??=new Map();const shadowKey='character-contact-shadow';if(!scene.materials.has(shadowKey)){const pixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,falloff=Math.max(0,1-Math.hypot((x-15.5)/15.5,(y-15.5)/15.5));pixels[i]=32;pixels[i+1]=42;pixels[i+2]=37;pixels[i+3]=Math.round(falloff*falloff*255);}const texture=new THREE.DataTexture(pixels,32,32);texture.needsUpdate=true;scene.materials.set(shadowKey,new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.28,depthWrite:false}));}
 const contact=new THREE.Mesh(new THREE.PlaneGeometry(.55,.43),scene.materials.get(shadowKey));contact.rotation.x=-Math.PI/2;contact.position.y=.023;contact.userData.contactShadow=true;g.add(contact);
 g.traverse(o=>{if(o.isMesh&&!o.userData.contactShadow){o.userData.character=data.id;scene.targets.push(o);}});scene.world.add(g);
 return {group:g,data,legs,lowerLegs,upperBody,arms,forearms,headPivot,eyes,brows,mouth,appearance:p,adult,seated:false,target:null,home:new THREE.Vector3(),wander:0,walkPhase:(p.seed%628)/100};
}

export function animateCharacter(actor,now,state,slot,speaking=false){
 if(!actor.headPivot)return;
 const p=actor.appearance,t=now/1000+p.seed%13,walk=actor.walking,phase=t*8;
 const blink=(t%(3.5+p.seed%5*.29))<.12;
 actor.eyes.forEach(e=>e.scale.y=blink?.12:1);
 actor.headPivot.rotation.y=walk?0:Math.sin(t*.65)*.08;
 actor.headPivot.rotation.z=walk?Math.sin(phase)*.02:speaking?Math.sin(t*4)*.05:0;
 actor.headPivot.rotation.x=actor.seated?(['국어','수학','영어'].includes(slot.subject)?.07:0):0;
 actor.mouth.scale.y=speaking?.8+Math.abs(Math.sin(t*8))*.8:(actor.data.mood??75)<45?.3:1;
 actor.brows.forEach((b,i)=>b.rotation.z=(actor.data.mood??75)<45?(i?-.12:.12):0);
 const writing=actor.seated&&['국어','수학','사회','영어','실과'].includes(slot.subject);
 const raised=actor.seated&&!writing&&((Math.floor(t/8)+p.seed)%19===0);
 actor.arms.forEach((arm,i)=>{
  arm.rotation.x=walk?Math.sin(phase+i*Math.PI)*.37:writing?-.78:actor.seated?-.38:0;
  arm.rotation.z=(i?-.13:.13)+(raised&&i===1?-.95:0);
  actor.forearms[i].rotation.x=writing?-.28+Math.sin(t*4+i)*.045:speaking?-.38:0;
 });
 actor.group.userData.activity=walk?'walking':speaking?'talking':writing?'writing':raised?'asking':actor.seated?'listening':'idle';
}
