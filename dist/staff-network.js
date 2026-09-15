import * as M from './model.js';
import * as A from './academic-year.js';
import * as P from './planner.js';
import {EXTRA_STAFF,staffInfo,staffScene,onDuty} from './staff-catalog.js';

export function data(s){return s.staffNetwork??={schema:1,next:0,queue:[],consultations:[],covers:[]};}
export const availableForConversation=(s,id)=>!staffInfo(id)||onDuty(s,staffInfo(id));
const normalized=text=>String(text).normalize('NFKC').replace(/\s+/g,'').replace(/[.,!?。！？]/g,'').trim();
const life=s=>s.schoolLife;
const school=s=>s.career?.schoolId||'default';
const uid=(s,prefix)=>prefix+'-'+(++data(s).next);
const live=c=>['requested','scheduled'].includes(c.status);
const overlap=(a,day,start,end)=>a.day===day&&a.start<end&&start<a.end;
function message(s,id,text,extra={}){return M.addMessage(s,'staff',staffInfo(id).name,text,{senderId:id,recipientId:'teacher',threadPerson:id,plannerScanned:true,...extra});}
export function used(s,id,text){return !!life(s).replyUsed?.[id+'|'+normalized(text)];}
export function suggestions(s,id){const n=staffInfo(id);return n?[...new Set([...(life(s).conversations[id]?.options||[]),...n.scenes.map(x=>x[1]+'에 대해 의논하고 싶어요.')])]:[];}
function topicFor(s,id,text){const n=staffInfo(id),old=life(s).conversations[id];return n.scenes.find(x=>text.includes(x[1]))?.[0]||(/자료|준비물|도구|물품|기기|고장|수리|식단|서류/.test(text)?'supplies':/이후|다음|후속|다시|결과|귀가/.test(text)?'followup':old?.lastTopic||'learning');}
export function chat(s,id,text){const n=staffInfo(id);text=String(text||'').trim().slice(0,500);if(!n||!text)return false;if(used(s,id,text))return {duplicate:true,id};
 (life(s).replyUsed??={})[id+'|'+normalized(text)]=M.stamp(s);
 const q={id:uid(s,'staff-chat'),personId:id,topic:topicFor(s,id,text),text,day:s.day,minute:s.minute,status:'waiting',schoolId:school(s)};
 data(s).queue.push(q);M.addMessage(s,'staff','나',text,{senderId:'teacher',recipientId:id,threadPerson:id,staffRequestId:q.id,plannerScanned:true});
 if(onDuty(s,n))answer(s,q);return {ok:true,queued:q.status==='waiting'};
}
function answer(s,q){const n=staffInfo(q.personId),scene=staffScene(q.personId,q.topic),old=life(s).conversations[n.id]||{turns:0,lastTopic:q.topic};
 const text=q.text,part=/담당|역할|계획|함께 검토/.test(text)?4:/후속|다음|이후|적용한 뒤/.test(text)?5:3;
 const prefix=q.day<s.day?'남겨 주신 연락을 근무 시간에 확인했습니다. ':old.turns?'앞서 나눈 내용에 이어 말씀드릴게요. ':scene[2]+' ';
 message(s,n.id,prefix+scene[part],{staffRequestId:q.id});q.status='answered';q.answered=M.stamp(s);
 life(s).conversations[n.id]={turns:old.turns+1,lastTopic:q.topic,options:[scene[1]+'의 담당 범위와 준비 자료를 정해요.',scene[1]+'을 적용한 뒤 확인할 점을 나눠요.'],updated:M.stamp(s)};
 const key=M.markKey(s,'staff-chat-'+n.id+'-'+q.topic);if(!s.flags[key]){s.flags[key]=true;s.npcRelations[n.id]=M.clamp((s.npcRelations[n.id]??50)+1);}
}
function slotFree(s,id,day,start,exclude){const n=staffInfo(id),end=start+20;
 if(!n||!Number.isInteger(day)||!Number.isInteger(start)||day<s.day||day>=M.demoDays(s)||!A.schoolDay(s,day)||start<Math.max(900,n.start)||end>n.end||day===s.day&&start<s.minute)return false;
 if(data(s).covers.some(c=>c.personId===id&&c.schoolId===school(s)&&c.status==='scheduled'&&overlap(c,day,start,end)))return false;
 if(M.todaySchedule({...s,day}).some(x=>!x.specialist&&x.start<end&&start<x.end)||P.conflicts(s,day,start,end,exclude).length)return false;
 return !data(s).consultations.some(c=>c.id!==exclude&&c.schoolId===school(s)&&live(c)&&overlap(c,day,start,end));
}
export function availableSlots(s,id){P.sync(s);const slots=[];for(const d of s.academic.calendar.filter(d=>d.school&&d.day>=s.day).slice(0,15))for(const start of [900,920,940,960,980])if(slotFree(s,id,d.day,start))slots.push({day:d.day,start});return slots;}
export function request(s,id,topic,day,start){const n=staffInfo(id);P.sync(s);if(s.staffWork?.away)return {error:'출장 복귀 후 협의 일정을 요청해 주세요.'};if(!n?.scenes.some(x=>x[0]===topic)||!slotFree(s,id,day,start))return {error:'담임 수업·다른 약속과 겹치지 않는 앞으로의 협의 시간을 선택해 주세요.'};
 const c={id:uid(s,'staff-consult'),personId:id,topic,day,start,end:start+20,room:n.room,status:'requested',requestedDay:s.day,requestedMinute:s.minute,schoolId:school(s),note:'',created:M.stamp(s)};
 data(s).consultations.push(c);M.addMessage(s,'staff','나',`${M.dateLabel({day})} ${M.clock(start)} · ${staffScene(id,topic)[1]} 협의를 요청합니다.`,{senderId:'teacher',recipientId:id,threadPerson:id,staffConsultId:c.id,plannerScanned:true});return {ok:true,id:c.id};
}
export function attend(s,id,note){const c=data(s).consultations.find(c=>c.id===id);note=String(note||'').trim().slice(0,1000);
 if(!c||c.status!=='scheduled'||c.schoolId!==school(s))return {error:'회신을 받은 예정 협의를 선택해 주세요.'};
 if(s.staffWork?.away||s.day!==c.day||s.minute<c.start-20||s.minute>c.start||!['afternoon','specialist'].includes(M.currentSlot(s).kind))return {error:'약속한 날 수업 후, 시작 20분 전부터 시작 시각 사이에 참석할 수 있습니다.'};
 if(s.room!==c.room)return {error:M.ROOMS[c.room].name+'로 이동한 뒤 참석해 주세요.'};
 if(!slotFree(s,c.personId,c.day,c.start,c.id)||!note||!P.data(s).entries.some(e=>e.id===c.id))return {error:'겹치는 일정을 조정하고 실제 협의할 내용·확인할 점을 선택해 주세요.'};
 M.advance(s,c.end-s.minute);c.status='completed';c.note=note;c.completed=M.stamp(s);const e=P.data(s).entries.find(e=>e.id===c.id);Object.assign(e,{status:'완료',response:'참석',note,completed:c.completed});
 const n=staffInfo(c.personId);M.addNote(s,'teacher',n.name+' 협의 · '+note);((s.npcMemories??={})[n.id]??=[]).unshift({date:M.stamp(s),text:staffScene(n.id,c.topic)[1]+' 협의에 참석했다. '+note});
 message(s,n.id,staffScene(n.id,c.topic)[5]+' 오늘 남긴 확인 사항: '+note,{staffConsultId:c.id,appointmentId:c.id});M.log(s,n.name+' 협의 참석 · 후속 확인 기록');return {ok:true};
}
export function cancel(s,id){const c=data(s).consultations.find(c=>c.id===id);if(!c||!live(c))return false;c.status='cancelled';c.cancelled=M.stamp(s);const e=P.data(s).entries.find(e=>e.id===id);if(e)e.status='취소';message(s,c.personId,'협의 취소를 확인했습니다. 기록은 남겨 두고 가능한 시간으로 다시 요청해 주세요.',{staffConsultId:id});return {ok:true};}

// Volunteering is optional. A request for school cover is not a completed activity.
export function requestCover(s,v){const prior=data(s).covers.find(c=>c.volunteerId===v.id&&c.schoolId===school(s));if(prior)return prior;
 const c={id:uid(s,'school-cover'),volunteerId:v.id,kind:v.kind,day:v.day,start:v.start,end:v.end,status:'requested',personId:null,room:'playground',schoolId:school(s),created:M.stamp(s)};data(s).covers.push(c);return c;}
export function acknowledgeCover(s,id){const c=data(s).covers.find(c=>c.id===id);if(!c||c.status!=='reported'||c.schoolId!==school(s))return {error:'학교 지원 담당자의 활동 결과가 도착한 뒤 확인해 주세요.'};c.status='confirmed';c.confirmed=M.stamp(s);return {ok:true};}
export function sync(s){const d=data(s);for(const q of d.queue)if(q.status==='waiting'){if(q.schoolId!==school(s)){q.status='cancelled';continue;}if(onDuty(s,staffInfo(q.personId)))answer(s,q);}
 for(const c of d.consultations){if(!live(c))continue;
  if(c.schoolId!==school(s)){c.status='cancelled';const e=P.data(s).entries.find(e=>e.id===c.id);if(e)e.status='취소';continue;}
  if(c.day<s.day||c.day===s.day&&s.minute>c.start){c.status='missed';const e=P.data(s).entries.find(e=>e.id===c.id);if(e)e.status='취소';message(s,c.personId,'예정 시간이 지나 이번 협의는 미실시로 남겼습니다. 가능한 일정으로 다시 요청해 주세요.',{staffConsultId:c.id});continue;}
  if(c.status==='requested'&&onDuty(s,staffInfo(c.personId))&&(s.day>c.requestedDay||s.minute>=c.requestedMinute+2)){
   if(!slotFree(s,c.personId,c.day,c.start,c.id)){c.status='conflict';message(s,c.personId,'회신 전에 다른 일정이 잡혔습니다. 겹치지 않는 시간으로 다시 요청해 주세요.',{staffConsultId:c.id});continue;}
   c.status='scheduled';P.upsert(s,{id:c.id,title:staffInfo(c.personId).role+' 협의 · '+staffScene(c.personId,c.topic)[1],day:c.day,start:c.start,end:c.end,room:c.room,type:'meeting',personId:c.personId,staffConsultId:c.id,source:'학교톡 개별 협의',response:'참석'});
   message(s,c.personId,`${M.dateLabel({day:c.day})} ${M.clock(c.start)}–${M.clock(c.end)} ${M.ROOMS[c.room].name}에서 만나요. 담당 범위를 확인하고 다음에 살필 점을 정하겠습니다.`,{staffConsultId:c.id,appointmentId:c.id});
  }
 }
 for(const c of d.covers){if(['confirmed','unavailable','cancelled'].includes(c.status))continue;if(c.schoolId!==school(s)){c.status='cancelled';continue;}
  if(c.status==='requested'&&c.day<s.day){c.status='unavailable';M.addMessage(s,'all','한정우 교감','요청한 봉사 시간이 지나 대체 활동은 배정하지 않았습니다. 불참 가정과 학생에게 불이익은 없습니다.',{senderId:'principal',plannerScanned:true});continue;}
  if(c.status==='requested'&&s.minute<1000){const id=['facilities','aftercare'].find(id=>{const n=staffInfo(id);return c.start>=n.start&&c.end<=n.end&&!d.covers.some(x=>x.id!==c.id&&x.schoolId===c.schoolId&&x.personId===id&&['scheduled','reported','confirmed'].includes(x.status)&&overlap(x,c.day,c.start,c.end))&&!d.consultations.some(x=>x.personId===id&&x.schoolId===c.schoolId&&live(x)&&overlap(x,c.day,c.start,c.end));});
   if(!id||c.day===s.day&&s.minute>c.start){c.status='unavailable';M.addMessage(s,'all','한정우 교감','이번 학교 지원 인력은 시간이 맞지 않아 배정하지 못했습니다. 다른 희망자를 확인하거나 활동을 조정해 주세요. 학생 불이익은 없습니다.',{senderId:'principal',plannerScanned:true});continue;}
   c.personId=id;c.status='scheduled';c.assigned=M.stamp(s);message(s,id,`${M.dateLabel({day:c.day})} ${M.clock(c.start)}–${M.clock(c.end)} ${c.kind} 학교 지원을 맡았습니다. 학생에게 가정의 참여 여부를 묻거나 부담을 주지 않겠습니다.`,{schoolCoverId:c.id});
  }
  if(c.status==='scheduled'&&(s.day>c.day||s.day===c.day&&s.minute>=c.end)){c.status='reported';c.reported=M.stamp(s);c.report='배정된 시간의 안내와 동선 확인을 마쳤습니다. 학교 지원 활동으로 기록하고 담임 수업·학생 평가에는 합산하지 않습니다.';message(s,c.personId,c.kind+' 결과: '+c.report,{schoolCoverId:c.id});}
 }
 if(s.academic&&A.schoolDay(s)&&!s.staffWork?.away&&['morning','break','afternoon'].includes(M.currentSlot(s).kind)){
  d.introSeen??={};const n=EXTRA_STAFF.find(n=>onDuty(s,n)&&location(s,n.id)===s.room),key=n&&school(s)+':'+s.academic.year+':'+A.term(s)+':'+n.id;
  if(n&&!d.introSeen[key]){d.introSeen[key]=M.stamp(s);message(s,n.id,`선생님, ${n.scenes[(A.term(s)-1)%3][1]}에 관해 함께 이야기할 시간이 있을까요? 궁금한 점은 학교톡에 남겨 주세요. 수업이 끝난 뒤 서로 가능한 시간을 맞추겠습니다.`,{staffProactive:true});}
 }
 return d;
}
export function location(s,id){const c=data(s).covers.find(c=>c.schoolId===school(s)&&c.personId===id&&c.status==='scheduled'&&c.day===s.day&&s.minute>=c.start&&s.minute<c.end);return c?.room||staffInfo(id)?.room;}
export function valid(s){const d=s.staffNetwork;if(d===undefined)return true;const arr=v=>Array.isArray(v),str=v=>typeof v==='string',date=c=>Number.isInteger(c.day)&&c.day>=0&&c.day<M.demoDays(s),time=c=>Number.isInteger(c.start)&&Number.isInteger(c.end)&&c.start>=520&&c.end<=1000&&c.end>c.start;
 if(!d||d.schema!==1||!Number.isInteger(d.next)||d.next<0||!arr(d.queue)||!arr(d.consultations)||!arr(d.covers)||d.introSeen!=null&&(typeof d.introSeen!=='object'||Array.isArray(d.introSeen)||Object.values(d.introSeen).some(v=>!str(v))))return false;
 const all=[...d.queue,...d.consultations,...d.covers];if(new Set(all.map(c=>c.id)).size!==all.length||all.some(c=>!str(c.id)||!str(c.schoolId)))return false;
 if(all.some(c=>!Number.isInteger(Number(c.id.split('-').at(-1)))||Number(c.id.split('-').at(-1))>d.next))return false;
 if(d.consultations.some(c=>!Number.isInteger(c.requestedDay)||c.requestedDay<0||c.requestedDay>c.day||!Number.isInteger(c.requestedMinute)||c.requestedMinute<520||c.requestedMinute>1000))return false;
 if(d.covers.some(c=>!s.democracy?.volunteers.some(v=>v.id===c.volunteerId&&v.day===c.day&&v.start===c.start&&v.end===c.end)||['scheduled','reported','confirmed'].includes(c.status)&&!staffInfo(c.personId)||['reported','confirmed'].includes(c.status)&&!str(c.report)))return false;
 return d.queue.every(q=>staffInfo(q.personId)&&staffInfo(q.personId).scenes.some(x=>x[0]===q.topic)&&str(q.text)&&date(q)&&Number.isInteger(q.minute)&&q.minute>=520&&q.minute<=1000&&['waiting','answered','cancelled'].includes(q.status))&&d.consultations.every(c=>staffInfo(c.personId)&&staffInfo(c.personId).scenes.some(x=>x[0]===c.topic)&&date(c)&&time(c)&&c.end-c.start===20&&!!M.ROOMS[c.room]&&str(c.note)&&['requested','scheduled','completed','cancelled','missed','conflict'].includes(c.status))&&d.covers.every(c=>str(c.volunteerId)&&date(c)&&time(c)&&!!M.ROOMS[c.room]&&(c.personId===null||staffInfo(c.personId))&&['requested','scheduled','reported','confirmed','unavailable','cancelled'].includes(c.status));
}
