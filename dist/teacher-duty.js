import * as M from './model.js';
import * as A from './academic-year.js';
import * as P from './planner.js';
import * as Support from './student-support.js';
import {design} from './curriculum.js';

// User-selected game rules, not a statement of statutory teacher leave.
export const LIMITS={annual:21*480,sick:7*480};
export const TYPES={annual:{name:'연가',account:'annual',full:true},early:{name:'조퇴',account:'annual',full:false},sick:{name:'병가',account:'sick',full:true},sickEarly:{name:'병조퇴',account:'sick',full:false}};
export const WORK={prepare:{name:'다음 수업 자료 준비',area:'학급업무',result:'다음 수업의 목표·도입 질문·준비물 목록을 정리했다.'},records:{name:'관찰 기록 검토',area:'학급업무',result:'실제 관찰 기록에서 추가 확인할 내용과 다음 관찰 계획을 정리했다.'},documents:{name:'공문·업무 자료 검토',area:'행정업무',result:'공문 목록과 붙임자료를 검토하고 결재 전 보완할 일을 정리했다.'},planning:{name:'회의 자료·일정 정리',area:'행정업무',result:'예정된 회의 안건과 준비할 자료를 확인했다.'}};
export function data(s){
 const year=s.academic?.year||2030;
 const d=s.teacherDuty??={schema:1,year,requests:[],work:[],history:[],away:null,sequence:0};
 if(d.year!==year){d.history.push({year:d.year,requests:structuredClone(d.requests),work:structuredClone(d.work)});d.year=year;d.requests=[];d.work=[];d.away=null;}
 if(d.away&&!d.requests.some(r=>r.id===d.away&&r.day===s.day&&r.status==='used'))d.away=null;
 return d;
}
export function balance(s,account){const rows=data(s).requests.filter(r=>TYPES[r.type].account===account),used=rows.filter(r=>r.status==='used').reduce((n,r)=>n+r.minutes,0),reserved=rows.filter(r=>['requested','approved'].includes(r.status)).reduce((n,r)=>n+r.minutes,0);return {limit:LIMITS[account],used,reserved,available:LIMITS[account]-used-reserved};}
export function durationLabel(n){const days=Math.floor(n/480),rest=n%480;return [days?days+'일':'',Math.floor(rest/60)?Math.floor(rest/60)+'시간':'',rest%60?rest%60+'분':''].filter(Boolean).join(' ')||'0분';}
export function absent(s){const d=data(s);return !!d.away&&d.requests.some(r=>r.id===d.away&&r.day===s.day);}
export function clashes(s,day,start,end,exclude){return P.conflicts(s,day,start,end,exclude).filter(e=>!e.leaveId);}
export function requestLeave(s,{type,day,start,reason}){
 const d=data(s),t=TYPES[type];
 if(!t||s.academic?.phase==='preparation'||!Number.isInteger(day)||day<s.day||day>=(s.academic?.end??M.demoDays(s)-1)+1||!A.schoolDay(s,day))return {error:'학교교육과정 확인 후 앞으로의 등교일을 선택해 주세요.'};
 start=t.full?520:Number(start);const end=1000,minutes=t.full?480:end-start;
 if(!Number.isInteger(start)||start<520||start>=1000||day===s.day&&start<s.minute)return {error:'이미 근무한 시간은 연가로 소급할 수 없어요. 앞으로의 조퇴 시간을 선택해 주세요.'};
 if(!String(reason||'').trim())return {error:'용무를 선택하거나 기타 사유를 입력해 주세요.'};
 if(d.requests.some(r=>r.day===day&&['requested','approved','used'].includes(r.status)&&r.start<end&&start<r.end))return {error:'같은 날 중복된 휴가·조퇴 신청이 있습니다.'};
 if(balance(s,t.account).available<minutes)return {error:'남은 '+(t.account==='annual'?'연가':'병가')+' 시간이 부족합니다.'};
 if(s.staffWork?.business.some(r=>r.day===day&&!['cancelled','completed'].includes(r.status)&&r.start<end&&start<r.end))return {error:'출장 일정과 겹칩니다. 출장 계획을 먼저 조정해 주세요.'};
 const r={id:'leave-'+d.year+'-'+d.sequence++,type,day,start,end,minutes,reason:String(reason).trim().slice(0,300),status:'requested',requested:M.stamp(s),handoff:'',cover:[]};d.requests.push(r);
 M.addMessage(s,'all','한정우 교감',M.dateLabel({day})+' '+t.name+' 신청을 받았습니다. 수업 자료와 남은 학생의 담당 인계를 확인한 뒤 승인하겠습니다.',{senderId:'principal',plannerScanned:true,leaveId:r.id});return {ok:true,id:r.id};
}
export function approve(s,id,handoff){
 const d=data(s),r=d.requests.find(r=>r.id===id);if(!r||r.status!=='requested')return {error:'검토 중인 신청을 선택해 주세요.'};
 if(r.day<s.day||r.day===s.day&&r.start<s.minute)return {error:'신청 시간이 지났습니다. 취소 후 앞으로의 시간으로 신청해 주세요.'};
 if(!handoff)return {error:'수업 자료와 남은 학생의 담당 인계를 확인해 주세요.'};
 if(clashes(s,r.day,r.start,r.end).length)return {error:'회의·상담·기초학력지도와 겹칩니다. 스케줄러에서 일정 조정 또는 불참 회신 후 승인받아 주세요.'};
 r.status='approved';r.handoff='교감 확인: 수업지원 교사에게 자료·출결 전달, 방과후·늘봄은 기존 담당자에게 확인';r.approved=M.stamp(s);
 r.cover=M.todaySchedule({...s,day:r.day}).filter(l=>!l.specialist&&!l.event&&l.end>r.start).map(l=>({period:l.period,subject:l.subject,start:Math.max(l.start,r.start),end:l.end,status:'planned',teacher:'수업지원 교사'}));
 P.upsert(s,{id:r.id,leaveId:r.id,title:TYPES[r.type].name,day:r.day,start:r.start,end:r.end,room:'staff',type:'personal',response:'참석',source:'교감 승인 · 근무·휴가',note:r.handoff});
 M.addMessage(s,'all','한정우 교감',TYPES[r.type].name+'를 승인했습니다. '+r.handoff,{senderId:'principal',plannerScanned:true,leaveId:r.id});return {ok:true};
}
export function cancel(s,id){const r=data(s).requests.find(r=>r.id===id);if(!r||!['requested','approved'].includes(r.status))return {error:'사용 전 신청만 취소할 수 있어요.'};r.status='cancelled';r.cancelled=M.stamp(s);const e=P.data(s).entries.find(e=>e.id===id);if(e)e.status='취소';return {ok:true};}
export function tick(s,old=s.minute){
 const d=data(s);
 for(const r of d.requests){
  if(['requested','approved'].includes(r.status)&&r.day<s.day){r.status='expired';const e=P.data(s).entries.find(e=>e.id===r.id);if(e)e.status='취소';}
  if(r.status==='approved'&&r.day===s.day&&s.minute>=r.start){r.status='used';r.used=M.stamp({...s,minute:r.start});d.away=r.id;M.log(s,TYPES[r.type].name+' 시작 · '+durationLabel(r.minutes)+' 사용 · 담당 인계 완료');const e=P.data(s).entries.find(e=>e.id===r.id);if(e)e.status='완료';}
  if(r.status!=='used'||r.day!==s.day)continue;
  for(const c of r.cover){
   if(c.status!=='planned'||s.minute<c.end)continue;c.status='completed';c.completed=M.stamp({...s,minute:c.end});
   if(M.done(s,'lesson'+c.period)||c.end-c.start!==40)continue;
   const present=s.students.filter(st=>M.isPresent(s,st.id)&&(!s.support||Support.available(s,st.id))),card=design(c.subject,s.progress[c.subject]||0,'m0',s.config.grade);
   s.lessonResults.push({day:s.day,period:c.period,subject:c.subject,mode:'수업지원 교사 대체지도',teacher:c.teacher,leaveId:r.id,goal:card.goal,topic:card.title,count:present.length,participantIds:present.map(st=>st.id),duration:40});
   s.progress[c.subject]=(s.progress[c.subject]||0)+1;M.complete(s,'lesson'+c.period);
  }
 }
 return d;
}
export function depart(s,id){const r=data(s).requests.find(r=>r.id===id);if(!r||r.status!=='approved'||r.day!==s.day||s.minute>r.start||M.movementBusy(s)||s.staffWork?.away)return {error:'승인된 당일 시작 시간 전, 활동·출장을 마친 뒤 출발해 주세요.'};if(clashes(s,r.day,r.start,r.end).length)return {error:'승인 뒤 추가된 약속을 먼저 조정해 주세요.'};M.advance(s,r.start-s.minute);tick(s);M.advance(s,1000-s.minute);return {ok:true};}
export function perform(s,kind,minutes=20){
 const job=WORK[kind],slot=M.currentSlot(s);if(!job||![10,20,30].includes(minutes)||absent(s)||s.staffWork?.away||M.movementBusy(s)||!['afternoon','specialist'].includes(slot.kind)||s.minute+minutes>Math.min(1000,slot.end)||!['classroom','staff','research'].includes(s.room))return {error:'수업 후 또는 전담시간에 교실·교무실·교사연구실에서 업무를 처리해 주세요.'};
 if(P.conflicts(s,s.day,s.minute,s.minute+minutes).length)return {error:'예정된 회의·상담과 겹칩니다. 먼저 참석하거나 시간을 조정해 주세요.'};
 const start=s.minute;M.advance(s,minutes);const record={id:'work-'+data(s).year+'-'+data(s).sequence++,day:s.day,start,end:s.minute,kind,area:job.area,result:job.result};data(s).work.push(record);M.addNote(s,'teacher',job.name+' · '+minutes+'분: '+job.result);s.teacher.energy=M.clamp(s.teacher.energy-2);M.log(s,job.area+' · '+job.name+' '+minutes+'분');return {ok:true,record};
}
export function valid(s){const d=s.teacherDuty;if(d==null)return true;if(d.schema!==1||!Number.isInteger(d.year)||!Number.isInteger(d.sequence)||d.sequence<0||!Array.isArray(d.requests)||!Array.isArray(d.work)||!Array.isArray(d.history)||new Set(d.requests.map(r=>r.id)).size!==d.requests.length)return false;
 if(d.requests.some(r=>!TYPES[r.type]||!['requested','approved','cancelled','used','expired'].includes(r.status)||!Number.isInteger(r.day)||r.day<0||!Number.isInteger(r.start)||r.start<520||r.start>=1000||r.end!==1000||r.minutes!==1000-r.start||TYPES[r.type].full&&r.start!==520||typeof r.reason!=='string'||!Array.isArray(r.cover)))return false;
 for(const account of Object.keys(LIMITS)){const total=d.requests.filter(r=>TYPES[r.type].account===account&&['requested','approved','used'].includes(r.status)).reduce((n,r)=>n+r.minutes,0);if(total>LIMITS[account])return false;}
 return (!d.away||d.requests.some(r=>r.id===d.away&&r.status==='used'))&&d.work.every(r=>WORK[r.kind]&&Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start>=520&&r.end<=1000&&r.end>r.start);
}
