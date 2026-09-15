import * as M from './model.js';
import * as A from './academic-year.js';
import * as P from './planner.js';

export const KINDS={paper:'바닥 종이',materials:'흩어진 교구',books:'쌓인 책',dust:'먼지',chair:'비뚤어진 의자'};
const roleTypes={'학급문고 정리':['books'],'자료 나누기':['paper','materials'],'분실물 정리':['materials'],'책상 주변 정리':['paper','chair'],'바닥 휴지 줍기':['paper','dust'],'게시물 정리':['paper'],'모둠 준비물 정리':['materials'],'공용 교구 수량 확인':['materials'],'실내화 정리':['chair']};
export function data(s){
 if(!s.classroomCare){
  s.classroomCare={schema:1,year:s.academic?.year||2030,items:[],events:{},history:[],effort:'steady',sequence:0};
  for(let i=0;i<Math.min(5,Math.floor((100-s.clean)/8));i++)add(s,Object.keys(KINDS)[i%5],'기존 교실 정리 상태');
 }
 const d=s.classroomCare;
 if(d.year!==(s.academic?.year||2030)){d.year=s.academic?.year||2030;d.items=[];d.events={};d.effort='steady';}
 return d;
}
function add(s,type,source){const d=s.classroomCare;if(d.items.length>=32)return;const n=d.sequence++;d.items.push({id:'clutter-'+d.year+'-'+n,type,spot:(n*7+s.config.seed)%18,day:s.day,source});}
function updateClean(s){s.clean=M.clamp(100-data(s).items.length*3);}
export function tick(s,oldMinute){
 const d=data(s);if(s.academic?.phase==='preparation'||!A.schoolDay(s)||!s.students.some(st=>M.isPresent(s,st.id)))return;
 const dismissal=Math.max(790,M.todaySchedule(s).at(-1)?.end||790);
 const events=[...M.todaySchedule(s).map(lesson=>({time:lesson.end,lesson})),...[630,720].map(time=>({time,break:true})),{time:dismissal,tidy:true}].sort((a,b)=>a.time-b.time);
 for(const event of events){if(!(oldMinute<event.time&&s.minute>=event.time))continue;
  const lesson=event.lesson;
  if(lesson&&!d.events[s.day+':lesson'+lesson.period]){
   d.events[s.day+':lesson'+lesson.period]=true;
   if(!lesson.event&&!['체육','음악'].includes(lesson.subject)){
    add(s,['미술','즐거운 생활','실과'].includes(lesson.subject)?'materials':lesson.subject==='국어'?'books':'paper',lesson.subject+' 수업 뒤');
    if(['미술','과학','실과','즐거운 생활'].includes(lesson.subject))add(s,'paper','활동 자료 정리');
   }
  }
  if(event.break&&!d.events[s.day+':break'+event.time]){d.events[s.day+':break'+event.time]=true;add(s,event.time===630?'chair':'dust','쉬는 시간 생활');}
  if(event.tidy)studentTidy(s,'dismissal');
 }
 updateClean(s);
}
export function studentTidy(s,phase='practice'){
 const d=data(s),key=s.day+':roles-'+phase;if(d.events[key])return {error:'이 시간의 역할 정리를 이미 마쳤어요.'};
 const students=s.students.filter(st=>M.isPresent(s,st.id));
 if(!students.length)return {error:'함께 정리할 학생이 없습니다.'};
 const before=d.items.length,participants=[];
 for(const [i,st] of students.entries()){
  // Effort depends on the shared routine, never on background or support labels.
  const active=d.effort==='together'||(i+s.day+s.config.seed)%3!==0;
  if(!active)continue;
  const types=roleTypes[st.role]||[];
  const index=d.items.findIndex(item=>types.includes(item.type));
  if(index>=0){d.items.splice(index,1);participants.push(st.id);}
 }
 d.events[key]=true;const removed=before-d.items.length;
 d.history.push({day:s.day,minute:s.minute,kind:'roles',removed,participants,effort:d.effort});
 M.log(s,'1인 1역 정리 · '+removed+'곳 정돈 · 남은 '+d.items.length+'곳');updateClean(s);return {ok:true,removed};
}
export function setEffort(s,value){if(!['steady','together'].includes(value))return false;data(s).effort=value;return true;}
export function practice(s){const slot=M.currentSlot(s);if(!['morning','break'].includes(slot.kind)||s.minute+5>slot.end||s.staffWork?.away||s.teacherDuty?.away)return {error:'학생들이 있는 아침·쉬는 시간에 5분 동안 역할을 연습해요.'};const result=studentTidy(s);if(result.ok)M.advance(s,5);return result;}
export function clean(s,minutes=10){
 if(![5,10,20].includes(minutes))return {error:'청소 시간을 선택해 주세요.'};
 if(s.room!=='classroom'||M.currentSlot(s).kind!=='afternoon'||s.minute+minutes>1000||s.staffWork?.away||s.teacherDuty?.away||M.movementBusy(s))return {error:'교실에서 수업 후, 근무 시간 안에 청소할 수 있어요.'};
 if(P.conflicts(s,s.day,s.minute,s.minute+minutes).length)return {error:'회의·상담 일정과 겹칩니다. 시간을 조정해 주세요.'};
 const d=data(s);if(!d.items.length)return {error:'교실이 이미 깨끗합니다.'};
 const removed=d.items.splice(0,minutes===20?32:minutes===10?10:4).length;
 d.history.push({day:s.day,minute:s.minute,kind:'teacher',minutes,removed});
 s.teacher.energy=M.clamp(s.teacher.energy-Math.ceil(minutes/2));s.order=M.clamp(s.order+removed);M.complete(s,'clean');M.advance(s,minutes);updateClean(s);
 M.log(s,'교사 마무리 청소 '+minutes+'분 · '+removed+'곳 정리');return {ok:true,removed};
}
export function valid(s){const d=s.classroomCare;return d==null||(d.schema===1&&Number.isInteger(d.year)&&Number.isInteger(d.sequence)&&d.sequence>=0&&Array.isArray(d.items)&&d.items.length<=32&&new Set(d.items.map(i=>i.id)).size===d.items.length&&d.items.every(i=>typeof i.id==='string'&&Object.hasOwn(KINDS,i.type)&&Number.isInteger(i.spot)&&i.spot>=0&&i.spot<18)&&d.events&&typeof d.events==='object'&&Array.isArray(d.history)&&['steady','together'].includes(d.effort));}
