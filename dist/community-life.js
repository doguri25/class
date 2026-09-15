import * as M from './model.js';
import {staffInfo,onDuty} from './staff-catalog.js';
import * as A from './academic-year.js';
import * as P from './planner.js';
import * as Support from './student-support.js';
import {validPortrait} from './portraits.js';

export const aidTypes=['독서대','소음 완화 도구','확대 자료판','필기 보조 그립'];
export const tidyPlaces={desk:'책상 속',locker:'사물함',bag:'가방',lost:'분실물 보관함',home:'집'};
export const personalGoods=['필통','연필','지우개','자','독서 공책','알림장','색연필','풀','실내화 주머니','물통','체육복','손수건'];
const hash=s=>String(s).split('').reduce((n,c)=>(n*33+c.charCodeAt(0))>>>0,7);
const clean=(s,n=500)=>String(s||'').trim().slice(0,n);
export function data(s){
 const d=s.community??={schema:1,people:{},guardians:{},edges:{},transfers:[],families:[],belongings:{},checks:[],loans:[],followups:[],consents:[],next:100,year:s.academic?.year||2030,budgetLimit:s.students.length*60000,annualIncoming:0,seen:{},socialFeed:[]};
 d.aidSchoolId??=s.career?.schoolId||s.config.region;for(const l of d.loans)l.schoolId??=d.aidSchoolId;
 if(d.year!==(s.academic?.year||2030)){d.year=s.academic.year;d.budgetLimit=s.students.length*60000;d.annualIncoming=0;}
 for(const st of s.students){
  st.personKey??='y'+(s.academic?.year||2030)+'-'+st.id;
  st.guardianKey??='guardian-'+st.personKey;
  st.portrait??=portraitSlot(s,st);
  const old=d.people[st.personKey];d.people[st.personKey]={...old,key:st.personKey,id:st.id,name:st.name,kind:'student',grade:s.config.grade,school:s.career?.schoolId||s.config.region,lastYear:d.year,active:true,portrait:st.portrait};
  d.guardians[st.guardianKey]??={key:st.guardianKey,name:st.name+' 보호자',children:[],permissions:{},notes:[],portrait:guardianPortrait(s)};
  const parent=d.guardians[st.guardianKey];if(!parent.children.includes(st.personKey))parent.children.push(st.personKey);
  parent.permissions[st.personKey]??={verified:true,messages:true,consent:true,pickup:true,records:true,confirmed:M.stamp(s)};
  d.belongings[st.personKey]??=personalGoods.slice(0,8).map((name,i)=>({id:st.personKey+'-item-'+i,name,owner:st.personKey,place:i<4?'desk':'locker',state:i===5?'정리 필요':'정돈',history:[]}));
 }
 for(const npc of M.NPCS)d.people[npc.id]??={key:npc.id,id:npc.id,name:npc.id==='teacher'?s.config.teacherName:npc.name,kind:'staff',active:true};
 return d;
}
function portraitSlot(s,st){const sheet=st.gender==='남'?'students-boys-v2':'students-girls-v2',same=s.students.filter(x=>x.gender===st.gender),used=new Set(same.filter(x=>x!==st).map(x=>x.portrait?.sheet+':'+x.portrait?.cell));for(const bank of [sheet,sheet.replace('-v2','')])for(let cell=0;cell<16;cell++)if(!used.has(bank+':'+cell))return {sheet:bank,cell};return {sheet,cell:same.indexOf(st)%16};}
function guardianPortrait(s){const active=new Set(s.students.map(st=>st.personKey));const used=new Set(Object.values(s.community?.guardians||{}).filter(g=>g.children.some(k=>active.has(k))).map(g=>g.portrait?.sheet+':'+g.portrait?.cell));for(const sheet of ['parents-women','parents-men'])for(let cell=0;cell<16;cell++)if(cell!==14&&!used.has(sheet+':'+cell))return {sheet,cell};return null;}
export function former(s,id){return (s.community?.transfers||[]).findLast(t=>t.kind==='out'&&t.year===s.academic?.year&&(t.student.id===id||t.student.parentId===id))?.student||null;}
export function knownIds(s){return new Set([...s.students.map(x=>x.id),...(s.community?.transfers||[]).filter(t=>t.year===(s.academic?.year||2030)&&t.kind==='out').map(t=>t.student.id)]);}
export function guardian(s,id){const d=data(s),st=s.students.find(x=>x.parentId===id);const key=st?.guardianKey||id;return d.guardians[key]||null;}
export function children(s,g){return s.students.filter(st=>g?.children.includes(st.personKey));}
export function permitted(s,parentId,studentId,scope='messages'){const st=s.students.find(x=>x.id===studentId),g=guardian(s,parentId),p=st&&g?.permissions[st.personKey];return !!(p?.verified&&p[scope]);}
export function addGuardian(s,studentId,name){const st=s.students.find(x=>x.id===studentId),d=data(s);if(!st||!clean(name,30)||/[<>]/.test(name))return {error:'학생과 가상 보호자 이름을 확인해 주세요.'};if(Object.values(d.guardians).filter(g=>g.children.includes(st.personKey)).length>=3)return {error:'학생별 연락 보호자는 최대 3명입니다.'};const portrait=guardianPortrait(s);if(!portrait)return {error:'현재 인물의 삽화는 중복하지 않습니다. 추가 보호자 삽화 30종을 모두 사용 중입니다.'};const key='g'+d.next++;d.guardians[key]={key,name:clean(name,30),children:[st.personKey],permissions:{[st.personKey]:{verified:false,messages:false,consent:false,pickup:false,records:false}},notes:[],portrait};return {ok:true,id:key};}
export function permissions(s,key,studentId,patch){const st=s.students.find(x=>x.id===studentId),g=guardian(s,key);if(!st||!g?.children.includes(st.personKey))return false;const p=g.permissions[st.personKey];for(const scope of ['verified','messages','consent','pickup','records'])p[scope]=patch[scope]===true;p.confirmed=M.stamp(s);g.notes.unshift({date:M.stamp(s),text:st.name+' 연락·동의 범위 확인 기록'});return {ok:true};}
export function linkSibling(s,studentId,key){const st=s.students.find(x=>x.id===studentId),g=guardian(s,key),d=data(s);if(!st||!g||g.children.includes(st.personKey))return {error:'다른 학생과 연결된 보호자를 선택해 주세요.'};const previous=st.guardianKey;d.guardians[previous].children=d.guardians[previous].children.filter(k=>k!==st.personKey);delete d.guardians[previous].permissions[st.personKey];st.guardianKey=g.key;g.children.push(st.personKey);g.permissions[st.personKey]={verified:false,messages:false,consent:false,pickup:false,records:false};d.families.push({studentKey:st.personKey,guardianKey:g.key,date:M.stamp(s),action:'형제자매 보호자 연결 · 권한 확인 대기'});return {ok:true};}
export function consent(s,studentId,parentId,topic,agree){if(!permitted(s,parentId,studentId,'consent'))return {error:'이 학생의 동의 권한이 확인된 보호자를 선택해 주세요.'};if(!clean(topic,80))return false;const d=data(s),g=guardian(s,parentId),st=s.students.find(x=>x.id===studentId);d.consents.push({id:'consent-'+d.next++,studentKey:st.personKey,guardianKey:g.key,topic:clean(topic,80),agree:agree===true,date:M.stamp(s)});return {ok:true};}
export function familyMessage(s,key,studentId,text){const st=s.students.find(x=>x.id===studentId),g=guardian(s,key);if(!permitted(s,key,studentId,'messages')||!clean(text))return {error:'연락 권한과 메시지 내용을 확인해 주세요.'};const normalized=clean(text).replace(/\s/g,''),d=data(s);if(d.seen['family:'+g.key+':'+st.personKey+':'+normalized])return {error:'이 보호자에게 이미 보낸 내용입니다. 새 질문을 작성해 주세요.'};d.seen['family:'+g.key+':'+st.personKey+':'+normalized]=M.stamp(s);const response=st.name+'에 관한 안내를 확인했습니다. 다른 자녀의 기록과 구분해서 말씀드릴게요.';g.notes.unshift({date:M.stamp(s),text:clean(text),studentKey:st.personKey,response});if(st.guardianKey===g.key){M.addMessage(s,'parent','나',clean(text),{recipientId:st.parentId,guardianKey:g.key,studentKey:st.personKey});M.addMessage(s,'parent',g.name,response,{senderId:st.parentId,guardianKey:g.key,studentKey:st.personKey,threadPerson:st.parentId,plannerScanned:true});}return {ok:true};}
export function snapshot(s){const d=data(s);for(const st of s.students)Object.assign(d.people[st.personKey],{student:structuredClone(st),notes:structuredClone(s.notes[st.id]||[]),parentNotes:structuredClone(s.notes[st.parentId]||[]),lastSeen:M.stamp(s)});return d;}
export function transferOut(s,id,destination,reason){
 const st=s.students.find(x=>x.id===id),d=data(s);if(!st||s.students.length<=4)return {error:'현재 데모는 재학생 4명 이상을 유지합니다.'};
 if(M.currentSlot(s).kind!=='afternoon'||M.movementBusy(s)||s.staffWork?.away||!clean(destination,60)||clean(reason).length<8)return {error:'수업 후 전출 학교와 인계 사유를 작성해 주세요.'};
 if(!Support.available(s,id)||(s.libraryLife?.loans||[]).some(l=>l.studentId===id&&!l.returned)||d.loans.some(l=>l.studentKey===st.personKey&&!l.returned))return {error:'개별 지원 인계와 개인 대출·보조기기 반납을 먼저 확인해 주세요.'};
 if(s.operations?.market)s.operations.market.initialStock??=s.students.length*2;s.journey=null;snapshot(s);d.transfers.push({id:'transfer-'+d.next++,year:d.year,kind:'out',day:s.day,date:M.stamp(s),destination:clean(destination,60),reason:clean(reason),student:structuredClone(st),notes:structuredClone(s.notes[st.id]||[])});d.people[st.personKey].active=false;
 s.students=s.students.filter(x=>x!==st);s.seats=s.seats.filter(x=>x!==id);s.config.count=s.students.length;
 for(const child of s.students)if(child.friend===id)child.friend=s.students.find(x=>x.id!==child.id)?.id;
 s.pendingEvents=s.pendingEvents.filter(e=>e.studentId!==id);if([id,st.parentId].includes(s.schoolLife.dialogue?.personId))s.schoolLife.dialogue=null;
 for(const c of s.schoolLife.counseling)if(c.parentId===st.parentId&&c.status==='예약')c.status='취소';for(const f of d.followups)if(f.key===st.personKey&&f.status==='예정'){f.status='인계';f.note='전출 학교에 후속 확인 인계';const p=P.data(s).entries.find(x=>x.id===f.id);if(p)p.status='취소';}
 for(const c of s.support?.cases||[])if(c.studentId===id&&!c.closed){c.closed=true;c.history.push({date:M.stamp(s),note:'전출 학교로 지원 기록 인계'});}
 for(const doc of s.support?.documents||[])if(doc.studentId===id){doc.transferred=M.stamp(s);doc.history.push({action:'transfer',text:'전출 학교로 서류와 남은 확인 인계',date:M.stamp(s)});}if(s.schoolLife.diagnosis)s.schoolLife.diagnosis.results=s.schoolLife.diagnosis.results.filter(r=>r.studentId!==id);
 M.log(s,st.name+' 전출 인계 · 과거 평가·메모·관계 보존');return {ok:true};
}
export function transferIn(s,name,gender){
 const d=data(s);if(s.students.length>=28||M.currentSlot(s).kind!=='afternoon'||s.staffWork?.away||M.movementBusy(s))return {error:'수업 후 재학생 28명 미만일 때 전입을 접수합니다.'};
 if(!/^[\p{L} ._-]{2,20}$/u.test(clean(name,20))||s.students.some(st=>st.name===name)||!['남','여'].includes(gender))return {error:'중복되지 않는 가상 학생 이름과 성별을 확인해 주세요.'};
 if(!guardianPortrait(s))return {error:'새 보호자용 삽화가 모두 사용 중입니다. 추가 보호자 연결 범위를 확인해 주세요.'};if(s.operations?.market)s.operations.market.initialStock??=s.students.length*2;s.journey=null;const n=d.next++,fresh=M.newGame({...s.config,count:4,seed:s.config.seed+n}).students[gender==='남'?1:0];const id='s'+n,st={...fresh,id,parentId:'p'+n,name:clean(name,20),gender,personKey:'arrival-'+d.year+'-'+n,friend:s.students[0].id,memories:[],records:[],peerRelations:{}};
 s.students.push(st);s.seats.push(id);s.config.count=s.students.length;d.annualIncoming++;d.budgetLimit+=60000;s.budget+=60000;data(s);
 d.transfers.push({id:'transfer-'+d.next++,kind:'in',year:d.year,day:s.day,date:M.stamp(s),student:structuredClone(st),destination:s.career?.schoolId||s.config.region,reason:'학적 담당 전입 확인 · 기존 학생의 진도와 별개로 학습 파악'});
 for(const item of Object.values(s.libraryLife?.reading||{}))item.students[id]=0;
 if(s.schoolLife.diagnosis)s.schoolLife.diagnosis.results.push({studentId:id,status:'미실시',reading:null,math:null,areas:[]});
 scheduleFollowup(s,st.personKey,'전입 적응과 이전 학교 학습 확인',2);M.addMessage(s,'grade','학적 담당교사',st.name+' 학생의 전입을 확인했습니다. 친구 소개와 개인 학습 확인 시간을 잡아 주세요.',{senderId:'colleague',plannerScanned:true});return {ok:true,id};
}
export function items(s,id){const st=s.students.find(x=>x.id===id);return st?data(s).belongings[st.personKey]||[]:[];}
function free(s,min,studentId=null){const slot=M.currentSlot(s);return !s.staffWork?.away&&!M.movementBusy(s)&&['morning','break','afternoon'].includes(slot.kind)&&s.minute+min<=slot.end&&!P.conflicts(s,s.day,s.minute,s.minute+min).length&&(!studentId||(M.isPresent(s,studentId)&&Support.available(s,studentId)&&M.remainingStudents(s).some(st=>st.id===studentId)));}
export function inspect(s,id,scope,consented){const st=s.students.find(x=>x.id===id),d=data(s);if(!st||!['desk','locker'].includes(scope)||!free(s,5,id))return {error:'학생이 학교에 있을 때 수업·약속과 겹치지 않는 5분이 필요합니다.'};if(consented!==true){d.checks.push({id:'check-'+d.next++,studentKey:st.personKey,scope,consent:false,date:M.stamp(s),result:'공개하지 않고 학생의 자율 정리 안내'});return {ok:true};}const dayKey=st.personKey+':'+s.day+':'+scope;if(d.seen['inspect:'+dayKey])return {error:'오늘 같은 공간은 이미 확인했습니다.'};M.advance(s,5);const list=items(s,id).filter(x=>x.place===scope);list.forEach(x=>{x.state='정돈';x.history.push({date:M.stamp(s),action:'학생 동의·함께 정리'});});d.checks.push({id:'check-'+d.next++,studentKey:st.personKey,scope,consent:true,date:M.stamp(s),items:list.map(x=>x.name),result:'함께 정리'});d.seen['inspect:'+dayKey]=true;s.clean=M.clamp(s.clean+1);M.remember(s,st,'자기 물건을 함께 살피고 다음 사용할 자리를 정했다.',1);return {ok:true};}
export function moveItem(s,id,itemId,place){const st=s.students.find(x=>x.id===id),item=items(s,id).find(x=>x.id===itemId);if(!st||!item||!Object.hasOwn(tidyPlaces,place)||item.place===place)return false;if(!free(s,2,id))return {error:'학생과 물건 위치를 확인할 2분이 필요합니다.'};M.advance(s,2);const from=item.place;item.place=place;item.history.push({date:M.stamp(s),from,to:place});if(place==='lost')scheduleFollowup(s,st.personKey,'분실물 '+item.name+' 주인 확인',2);return {ok:true};}
export function returnLost(s,itemId,id,clue){const owner=s.students.find(x=>x.id===id),d=data(s),item=Object.values(d.belongings).flat().find(x=>x.id===itemId);if(!owner||!item||item.place!=='lost'||clean(clue).length<5)return {error:'분실물의 특징·본인 확인 내용을 적어 주세요.'};if(item.owner!==owner.personKey)return {error:'확인한 주인이 다릅니다. 임의로 다른 학생에게 전달하지 않습니다.'};if(!free(s,2,id))return {error:'학생과 인계할 2분을 확보해 주세요.'};M.advance(s,2);item.place='bag';item.history.push({date:M.stamp(s),action:'주인 확인 후 인계',clue:clean(clue)});return {ok:true};}
export function lendAid(s,id,item){const st=s.students.find(x=>x.id===id),d=data(s);if(!st||!aidTypes.includes(item)||aidInventory(s).find(x=>x.item===item)?.status!=='available')return {error:'대여 가능한 보조도구를 선택해 주세요.'};if(!free(s,3,id))return {error:'학생과 사용 방법을 확인할 3분을 확보해 주세요.'};M.advance(s,3);d.loans.push({id:'aid-'+d.next++,studentKey:st.personKey,item,schoolId:s.career?.schoolId||s.config.region,day:s.day,date:M.stamp(s),returned:false,condition:'양호'});return {ok:true};}
export function returnAid(s,id,condition){const l=data(s).loans.find(x=>x.id===id);if(!l||l.returned||!['양호','점검 필요'].includes(condition))return false;if(!free(s,3))return {error:'수업 밖 3분이 필요합니다.'};M.advance(s,3);l.returned=true;l.condition=condition;l.returnedAt=M.stamp(s);return {ok:true};}
export function aidInventory(s){
 const d=data(s),school=s.career?.schoolId||s.config.region;
 return aidTypes.map(item=>{const loans=d.loans.filter(l=>l.item===item&&l.schoolId===school),loan=loans.find(l=>!l.returned)||loans.at(-1);let status='available';if(loan&&!loan.returned)status='loaned';else if(loan?.condition==='점검 필요'&&loan.repair?.status!=='closed')status=loan.repair?.status||'blocked';return {item,status,loan};});
}
export function requestAidRepair(s,id,note){
 const l=data(s).loans.find(x=>x.id===id),a=aidInventory(s).find(x=>x.loan?.id===id);note=clean(note).replace(/[<>]/g,'');
 if(!l||a?.status!=='blocked'||note.length<6)return {error:'점검 필요한 도구의 증상과 임시 대안을 적어 주세요. 이미 접수한 요청은 반복하지 않습니다.'};
 const dates=s.academic.calendar.filter(d=>d.school&&d.day>s.day),due=(dates[1]||dates[0])?.day;
 if(due==null)return {error:'학년도 말에는 도구를 사용 중지하고, 다음 학년도에 담당자에게 점검을 요청해 주세요.'};
 if(!free(s,3))return {error:'수업·약속과 겹치지 않는 3분에 행정실로 요청할 수 있습니다.'};
 M.advance(s,3);l.repair={status:'requested',due,note,requestedAt:M.stamp(s),entryId:'aid-repair-'+l.id};
 P.upsert(s,{id:l.repair.entryId,title:l.item+' · 점검 결과·반납 확인',day:due,start:980,end:990,type:'task',room:'admin',source:'행정실 보조도구 점검',response:'참석',aidLoanId:l.id});
 M.addMessage(s,'admin',M.NPCS.find(n=>n.id==='admin').name,l.item+' 점검을 접수했습니다. '+M.dateLabel({day:due})+' 이후 결과를 안내하겠습니다. 그동안 다른 도구나 종이 자료를 사용해 주세요.',{senderId:'admin',appointmentId:l.repair.entryId,plannerScanned:true});
 M.log(s,l.item+' 사용 중지 · 행정실 점검 요청');return {ok:true};
}
export function syncAidRepairs(s){
 const d=data(s),school=s.career?.schoolId||s.config.region;
 for(const l of d.loans){const r=l.repair;if(!r||l.schoolId!==school||r.status!=='requested'||s.day<r.due||!A.schoolDay(s))continue;
  r.status='ready';r.readyAt=M.stamp(s);
  P.upsert(s,{id:r.entryId,title:l.item+' · 점검 결과·반납 확인',day:s.day,start:980,end:990,type:'task',room:'admin',source:'행정실 보조도구 점검',response:'참석',aidLoanId:l.id});
  M.addMessage(s,'admin',M.NPCS.find(n=>n.id==='admin').name,l.item+'의 담당자 점검·수리를 마쳤습니다. 상태를 확인하고 수령해 주세요. 수령 확인 전까지 대여를 보류합니다.',{senderId:'admin',appointmentId:r.entryId,plannerScanned:true});
 }
}
export function confirmAidRepair(s,id){
 syncAidRepairs(s);const l=data(s).loans.find(x=>x.id===id),a=aidInventory(s).find(x=>x.loan?.id===id);
 if(!l||a?.status!=='ready')return {error:'담당자의 점검 완료 안내를 받은 뒤 수령 확인할 수 있습니다.'};
 if(!free(s,3))return {error:'수업 밖 3분에 도구의 사용 상태를 확인해 주세요.'};
 M.advance(s,3);l.repair.status='closed';l.repair.closedAt=M.stamp(s);
 const plan=P.data(s).entries.find(x=>x.id===l.repair.entryId);if(plan)plan.status='완료';
 M.log(s,l.item+' 담당자 점검 결과·수령 확인 · 재대여 가능');return {ok:true};
}
export function scheduleFollowup(s,key,title,days=3){const d=data(s);if(d.followups.some(x=>x.key===key&&x.title===title&&x.status==='예정'))return false;const date=s.academic.calendar.find(x=>x.school&&x.day>=s.day+days);if(!date)return false;const f={id:'follow-'+d.next++,key,title,day:date.day,status:'예정',created:M.stamp(s)};d.followups.push(f);P.upsert(s,{id:f.id,title:(d.people[key]?.name||'학생')+' · '+title,day:f.day,start:980,end:990,type:'task',room:'classroom',source:'학생 지원 후속 확인',response:'참석'});return true;}
export function finishFollowup(s,id,note){const f=data(s).followups.find(x=>x.id===id);if(!f||f.status!=='예정'||s.day<f.day||clean(note).length<8)return {error:'예정일 이후 직접 확인한 변화와 다음 방법을 적어 주세요.'};if(!free(s,5))return {error:'후속 기록을 정리할 5분이 필요합니다.'};M.advance(s,5);f.status='완료';f.note=clean(note);f.completed=M.stamp(s);const plan=P.data(s).entries.find(x=>x.id===id);if(plan)plan.status='완료';return {ok:true};}
export function edge(s,a,b,change,text){const d=data(s),key=[a,b].sort().join('|');const e=d.edges[key]??={a,b,trust:50,history:[]};e.trust=M.clamp(e.trust+change);e.history.unshift({date:M.stamp(s),text});e.history=e.history.slice(0,12);return e;}
const SOCIAL=[['도서관에서 고른 책의 장면을 서로 소개합니다.','그 장면은 나와 다르게 읽었네. 왜 그렇게 생각했어?',2],['모둠 역할을 번갈아 맡을 방법을 의논합니다.','이번에는 네가 먼저 고르고 다음에는 바꿔 보자.',2],['차례를 두고 의견이 달라 잠깐 멈춥니다.','나는 먼저 부탁했다고 생각했어. 순서를 같이 확인할까?',-1],['떨어진 준비물을 함께 주워 제자리에 둡니다.','내 것도 같이 찾아 줘서 고마워.',2],['혼자 쉴 시간이 필요한지 먼저 묻습니다.','지금은 조용히 있을게. 다음 쉬는 시간에 이야기하자.',1],['풀이가 달라 각자의 과정을 설명합니다.','답이 같아도 생각한 길은 다르구나.',2]];
export function socialTick(s){const d=data(s),slot=M.currentSlot(s),block=Math.floor(s.minute/10),key=d.year+':'+s.day+':'+block;if(!A.schoolDay(s)||!['break','morning','afternoon'].includes(slot.kind)||d.lastSocial===key||s.staffWork?.away)return;d.lastSocial=key;const students=M.remainingStudents(s).filter(st=>Support.available(s,st.id)),index=hash(key);let a,b,story;
 if(students.length>1&&s.minute<900){a=students[index%students.length];b=students[(index+1)%students.length];story=SOCIAL[index%SOCIAL.length];edge(s,a.personKey,b.personKey,story[2],story[0]);a.peerRelations[b.id]=M.clamp((a.peerRelations[b.id]||50)+story[2]);b.peerRelations[a.id]=M.clamp((b.peerRelations[a.id]||50)+story[2]);}
 else {const list=M.NPCS.filter(n=>['colleague','specialist','librarian','admin','principal'].includes(n.id)||staffInfo(n.id)&&onDuty(s,n));a=list[index%list.length];b=list[(index+1)%list.length];const specialist=staffInfo(a.id)||staffInfo(b.id),scene=specialist?.scenes[index%3];story=scene?[specialist.role+'와 동료가 '+scene[1]+'을 의논합니다.',scene[4],1]:[['교직원이 수업 자료와 다음 일정의 겹침을 확인합니다.','자료는 제가 정리할게요. 가능한 사용 시간을 함께 맞춰요.',1],['동료들이 공동 교구의 보관 장소를 확인합니다.','다음에 쓰는 학급도 찾기 쉽도록 반납 위치를 같게 둘까요?',1],['교직원이 다음 협의에서 나눌 질문을 정리합니다.','바로 결정하지 못한 점도 남겨 두고 확인한 자료부터 비교해요.',1]][index%3];edge(s,a.id,b.id,1,story[0]);}
 d.socialFeed.unshift({id:'social-'+key,a:a.id,b:b.id,nameA:a.name,nameB:b.name,text:story[0],line:story[1],date:M.stamp(s)});d.socialFeed=d.socialFeed.slice(0,60);
}
export function sync(s){const d=data(s);syncAidRepairs(s);for(const c of s.support?.cases||[])if(c.closed&&!d.seen['case:'+c.id]){const st=s.students.find(x=>x.id===c.studentId);if(st)scheduleFollowup(s,st.personKey,'지원 후 학교생활 다시 확인',3);d.seen['case:'+c.id]=true;}socialTick(s);}
export function valid(s){
 const d=s.community;if(d==null)return true;
 const arr=Array.isArray,text=v=>typeof v==='string'&&v.length<=2000&&!/[<>]/.test(v),obj=v=>v&&typeof v==='object'&&!arr(v),day=n=>Number.isInteger(n)&&n>=0&&n<M.demoDays(s),key=k=>text(k)&&!!d.people[k];
 return d.schema===1&&Number.isInteger(d.next)&&d.next>=100&&d.next<10000&&Number.isFinite(d.budgetLimit)&&d.budgetLimit>=s.students.length*60000&&d.budgetLimit<=20000000&&obj(d.people)&&Object.values(d.people).every(p=>text(p.key)&&text(p.name)&&['student','staff'].includes(p.kind)&&(!p.portrait||validPortrait(p.portrait)))&&s.students.every(st=>key(st.personKey)&&validPortrait(st.portrait))&&obj(d.guardians)&&Object.values(d.guardians).every(g=>text(g.key)&&text(g.name)&&validPortrait(g.portrait)&&arr(g.children)&&new Set(g.children).size===g.children.length&&g.children.every(key)&&obj(g.permissions)&&g.children.every(k=>obj(g.permissions[k])&&['verified','messages','consent','pickup','records'].every(scope=>typeof g.permissions[k][scope]==='boolean'))&&arr(g.notes)&&g.notes.every(n=>text(n.text)))&&obj(d.edges)&&Object.values(d.edges).every(e=>key(e.a)&&key(e.b)&&Number.isFinite(e.trust)&&e.trust>=0&&e.trust<=100&&arr(e.history))&&arr(d.transfers)&&d.transfers.every(t=>['in','out'].includes(t.kind)&&Number.isInteger(t.year)&&text(t.student?.id)&&text(t.student?.name)&&key(t.student.personKey))&&obj(d.belongings)&&Object.values(d.belongings).every(items=>arr(items)&&items.every(i=>text(i.id)&&text(i.name)&&key(i.owner)&&Object.hasOwn(tidyPlaces,i.place)&&arr(i.history)))&&arr(d.checks)&&d.checks.every(c=>key(c.studentKey)&&['desk','locker'].includes(c.scope)&&typeof c.consent==='boolean')&&arr(d.loans)&&d.loans.every(l=>key(l.studentKey)&&text(l.item)&&typeof l.returned==='boolean'&&['양호','점검 필요'].includes(l.condition)&&(l.schoolId==null||text(l.schoolId))&&(l.repair==null||(l.returned&&l.condition==='점검 필요'&&['requested','ready','closed'].includes(l.repair.status)&&Number.isInteger(l.repair.due)&&l.repair.due>=0&&l.repair.due<M.demoDays(s)&&text(l.repair.note)&&text(l.repair.requestedAt)&&text(l.repair.entryId)&&['readyAt','closedAt'].every(k=>l.repair[k]==null||text(l.repair[k])))))&&arr(d.followups)&&d.followups.every(f=>key(f.key)&&text(f.title)&&day(f.day)&&['예정','완료','인계'].includes(f.status))&&arr(d.consents)&&d.consents.every(c=>key(c.studentKey)&&!!d.guardians[c.guardianKey]&&typeof c.agree==='boolean'&&text(c.topic))&&arr(d.families)&&arr(d.socialFeed)&&d.socialFeed.every(f=>text(f.text)&&text(f.line))&&obj(d.seen);
}
