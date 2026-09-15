import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';
import * as G from '../dist/school-life.js';
import * as P from '../dist/planner.js';
import * as C from '../dist/curriculum.js';
import * as S from '../dist/supplies.js';
import {TOPICS} from '../dist/dialogue-bank.js';
import {RELEASE,RECENT_RELEASES} from '../dist/release-info.js';
const reload=s=>{const loaded=M.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(loaded,'state must remain loadable');return loaded;};

test('class time only permits relevant rooms, including arrival across a period boundary',()=>{
 for(const [subject,rooms] of Object.entries(C.SUBJECT_ROOMS)){
  const s=M.newGame();s.schedule[0][0].subject=subject;s.minute=540;
  for(const room of Object.keys(M.ROOMS))assert.equal(M.canVisitRoom(s,room),rooms.includes(room),subject+' '+room);
  s.minute=537;assert.equal(M.canVisitRoom(s,'staff'),false);
  s.minute=536;assert.equal(M.canVisitRoom(s,'staff'),true);
  s.minute=540;s.schedule[0][0].specialist=true;assert.equal(M.canVisitRoom(s,'staff'),true);
 }
});
test('subject lessons rotate through distinct contexts and retain the chosen teaching method',()=>{
 for(let grade=1;grade<=6;grade++)for(const subject of M.subjects(grade).concat('창체')){const first=C.design(subject,0,'m2',grade),next=C.design(subject,1,'m2',grade);assert.notEqual(first.title,next.title);assert.ok(first.contentId.startsWith('g'+grade+'-'));for(const d of [first,next]){assert.ok(d.goal);assert.equal(d.steps.length,3);assert.equal(d.choices.length,3);assert.equal(d.method,C.methods(subject)[2].name);}}
 const s=M.newGame();s.minute=540;assert.equal(M.finishLesson(s,'국어',1,'등장인물의 마음 토론',1,{method:'m1'}),true);assert.equal(s.progress['국어'],1);assert.equal(s.lessonResults[0].method,'m1');assert.equal(s.lessonResults[0].topic,'문단의 중심 생각');reload(s);
});
test('60 supplies: fixed prices, refillable stock, durable items and absent students',()=>{
 assert.equal(S.GOODS.length,60);assert.equal(new Set(S.GOODS.map(g=>g.id)).size,60);
 const s=M.newGame();const budget=s.budget;assert.ok(M.purchase(s,'pencils',1,'wrong price'));assert.equal(s.budget,budget-S.getGood('pencils').cost);assert.equal(M.purchase(s,'pencils'),false);
 M.purchase(s,'sticky');assert.equal(S.stock(s,'sticky'),10);s.minute=540;M.finishLesson(s,'국어',0,'짝 읽기',1,{method:'m0'});assert.equal(S.stock(s,'sticky'),9);M.purchase(s,'sticky');assert.equal(S.stock(s,'sticky'),19);
 const loaded=reload(s);assert.equal(S.stock(loaded,'sticky'),19);assert.equal(loaded.lessonResults[0].materialUsed.id,'sticky');
 const absent=M.newGame();M.purchase(absent,'sticky');absent.attendance[0]=Object.fromEntries(absent.students.map(st=>[st.id,'질병결석']));absent.minute=540;M.finishLesson(absent,'국어',0,'짝 읽기',1,{method:'m0'});assert.equal(S.stock(absent,'sticky'),10);assert.equal(absent.lessonResults[0].count,0);
});
test('sent replies are disabled by recipient and normalized text across reloads',()=>{
 const s=M.newGame();assert.ok(G.sendChat(s,'parent','p0','친구 관계는 집에서 어떤가요?').reply);const n=s.messages.length;
 assert.equal(G.sendChat(s,'parent','p0','친구  관계는 집에서 어떤가요！').duplicate,true);assert.equal(s.messages.length,n);
 const loaded=reload(s);assert.ok(G.replyUsed(loaded,'p0','친구 관계는 집에서 어떤가요?'));assert.ok(G.chatSuggestions(loaded,'parent','p0').includes('친구 관계는 집에서 어떤가요?'));
 assert.ok(G.sendChat(loaded,'parent','p1','친구 관계는 집에서 어떤가요?').reply);
});
test('nine dialogue topics vary on return visits and continue saved unfinished dialogue',()=>{
 assert.equal(Object.keys(TOPICS).length,9);const s=M.newGame();const openings=[];
 for(let i=0;i<3;i++){G.beginDialogue(s,'s0','daily');openings.push(s.schoolLife.dialogue.history[0].text);G.answerDialogue(s,0);G.answerDialogue(s,1);}assert.equal(new Set(openings).size,3);
 G.beginDialogue(s,'s0','roles');G.answerDialogue(s,0);const loaded=reload(s);G.answerDialogue(loaded,2);assert.ok(loaded.schoolLife.dialogue.finished);assert.equal(loaded.schoolLife.dialogue.history.length,5);
});
test('school invitations are recorded once, have correct dates, and omit one-class grade meetings',()=>{
 const s=M.newGame();P.sync(s);const d=P.data(s);assert.equal(d.entries.filter(e=>e.title==='전직원회의').length,1);assert.equal(d.entries.find(e=>e.title==='전직원회의').start,930);assert.equal(d.entries.length,3);const n=s.messages.length;
 P.sync(s);assert.equal(s.messages.length,n);assert.equal(d.entries.length,3);
 G.sendChat(s,'grade',null,'수업 나눔 모임은 언제인가요?');P.sync(s);assert.equal(d.entries.length,3,'an answer listing two events must not invent a fourth');
 M.addMessage(s,'grade','윤서진 선생님','다음 주 수요일 15:10에 자료 나눔 모임이 있습니다.');P.sync(s);const event=d.entries.find(e=>e.day===7);assert.ok(event);assert.equal(event.start,910);assert.ok(s.messages.at(-1).appointmentId);assert.equal(reload(s).teacherPlanner.entries.length,4);
 const rural=M.newGame({region:'rural',count:4});P.sync(rural);assert.equal(P.data(rural).entries.some(e=>e.title==='학년회의'),false);assert.equal(P.data(rural).entries.filter(e=>e.type==='meeting').length,2);
});
test('meeting attendance records notes and refuses skipping remaining homeroom lessons',()=>{
 const s=M.newGame();P.sync(s);const meeting=P.data(s).entries.find(e=>e.title==='전직원회의');assert.ok(P.respond(s,meeting.id,'참석').ok);assert.equal(P.respond(s,meeting.id,'참석'),false);s.day=4;s.room='staff';s.minute=900;assert.ok(P.attend(s,meeting.id,'차시 자료와 역할을 함께 점검함.').ok);assert.equal(s.minute,950);assert.equal(meeting.status,'완료');assert.match(s.notes.teacher[0].text,/차시 자료/);reload(s);assert.ok(P.attend(s,meeting.id,'중복').error);
 const other=M.newGame();P.sync(other);other.day=4;other.room='staff';other.minute=540;other.schedule[4][0].specialist=true;assert.ok(P.attend(other,P.data(other).entries.find(e=>e.title==='전직원회의').id,'수업 전').error);assert.equal(other.minute,540);
});
test('planner prevents counseling, tutoring and personal appointment collisions',()=>{
 const s=M.newGame();P.sync(s);assert.ok(G.bookCounseling(s,'p0',1,900,'학년회의와 겹침').error);assert.ok(P.addPersonal(s,'개인 준비',1,900,920,'classroom').error);
 s.students[0].scores['국어']=40;G.diagnose(s);assert.ok(G.planTutoring(s,['s0'],1).error);assert.ok(G.planTutoring(s,['s0'],2).ok);P.sync(s);assert.equal(P.data(s).entries.filter(e=>e.type==='tutoring').length,10);assert.ok(P.addPersonal(s,'준비',2,900,920,'classroom').error);assert.ok(P.addPersonal(s,'자료 정리',0,960,980,'classroom').ok);reload(s);
});
test('work plans and dated checklists persist and mark the scheduler task complete',()=>{
 const s=M.newGame();const p=P.saveWorkPlan(s,'교무','교과 준비를 함께 확인','자료 수집\n동료 협의',3);assert.ok(p);P.checkWorkStep(s,p.id,0);assert.equal(P.data(s).entries.find(e=>e.id===p.id).status,'예정');P.checkWorkStep(s,p.id,1);assert.equal(P.data(s).entries.find(e=>e.id===p.id).status,'완료');assert.match(p.created,/2030년/);assert.equal(reload(s).teacherPlanner.workPlans[0].steps.filter(s=>s.done).length,2);
});
test('gamma imports retain purchases, notes, dialogue and reject malformed delta state',()=>{
 const gamma=M.newGame();M.purchase(gamma,'books');M.addNote(gamma,'s0','이전 학급의 기록');G.beginDialogue(gamma,'s0','friends');G.answerDialogue(gamma,0);gamma.schema=3;delete gamma.teacherPlanner;delete gamma.inventory;delete gamma.schoolLife.dialogue.script;
 const s=reload(gamma);assert.equal(s.schema,4);assert.ok(S.stock(s,'books'));G.answerDialogue(s,1);assert.ok(s.schoolLife.dialogue.finished);assert.equal(s.notes.s0[0].text,'이전 학급의 기록');P.sync(s);reload(s);
 const bad=structuredClone(s);bad.teacherPlanner.entries={};assert.equal(M.validateSave(bad),false);const badStock=structuredClone(s);badStock.inventory.books=-2;assert.equal(M.validateSave(badStock),false);
});
test('release data shows three dated revisions with the current release first',()=>{assert.equal(M.VERSION,RELEASE.version);assert.equal(RECENT_RELEASES.length,3);assert.equal(RECENT_RELEASES[0].version,RELEASE.version);assert.equal(new Set(RECENT_RELEASES.map(r=>r.version)).size,3);for(const r of RECENT_RELEASES){assert.match(r.date,/^\d{4}-\d{2}-\d{2}$/);assert.ok(r.changes.length);}});
