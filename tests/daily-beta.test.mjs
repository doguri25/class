import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';
import * as A from '../dist/academic-year.js';
import * as Beta from '../dist/beta-ui.js';
import * as Care from '../dist/classroom-care.js';
import * as Duty from '../dist/teacher-duty.js';
import * as Sheet from '../dist/lesson-worksheet.js';
import * as C from '../dist/lesson-content.js';
import * as Tutorial from '../dist/tutorial.js';
import * as P from '../dist/planner.js';
const fresh=()=>{const s=M.newGame({grade:3,count:8,region:'newtown',seed:12345});Beta.initialize(s,true);A.acknowledge(s);A.begin(s);s.day=s.academic.calendar.find(d=>d.school&&d.day>s.day).day;s.minute=520;s.teacherPlanner.entries=[];return s;};
const reload=s=>{assert.equal(M.validateSave(s),true);const r=M.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(r);return r;};
test('120 original cards cover every valid grade/subject, and the board retains the completed topic',()=>{
 assert.equal(C.cardCount,120);const ids=new Set();
 for(let grade=1;grade<=6;grade++)for(const subject of M.subjects(grade).concat('창체'))for(const c of C.CATALOG[grade][subject]){assert.equal(c.grade,grade);assert.ok(c.question&&c.board);assert.equal(new Set(c.options).size,3);assert.equal(c.options.filter(x=>x===c.answer).length,1);assert.equal(ids.has(c.id),false);ids.add(c.id);}
 assert.notEqual(C.card(1,'수학').question,C.card(6,'수학').question);
 const s=fresh();s.minute=540;const slot=M.currentSlot(s),before=C.lessonCard(s,slot);M.finishLesson(s,slot.subject,0,'짝 활동',slot.period,{method:'m1'});assert.equal(C.lessonCard(s,{...slot}).id,before.id);reload(s);
});
test('worksheet issue requires actual attendance and time; one response persists without inventing scores',()=>{
 const s=fresh();s.minute=590;assert.ok(Sheet.issue(s).error);M.takeAttendance(s,{s0:'질병결석'});const progress={...s.progress},scores=structuredClone(s.students.map(st=>st.scores));assert.equal(Sheet.issue(s).ok,true);assert.equal(s.minute,595);assert.equal(s.lessonWorksheets[0].participantIds.includes('s0'),false);assert.ok(Sheet.issue(s).error);assert.equal(Sheet.answer(s,1).ok,true);assert.ok(Sheet.answer(s,0).error);assert.deepEqual(s.progress,progress);assert.deepEqual(s.students.map(st=>st.scores),scores);assert.equal(reload(s).lessonWorksheets[0].answer,1);
});
test('clutter appears at matching activity boundaries and is speed-independent and persistent',()=>{
 const fast=fresh(),slow=structuredClone(fast);Care.data(fast);Care.data(slow);M.advance(fast,200);for(let i=0;i<200;i++)M.advance(slow,1);assert.deepEqual(fast.classroomCare.items,slow.classroomCare.items);const count=fast.classroomCare.items.length;assert.ok(count>3);const saved=reload(fast);Care.tick(saved,saved.minute);assert.equal(saved.classroomCare.items.length,count);
});
test('role routines tidy matching items once, then teacher cleaning removes remaining objects',()=>{
 const s=fresh();s.students.forEach(st=>st.role='오늘 일정 안내');Care.data(s);s.minute=720;M.advance(s,170);s.teacherPlanner.entries=[];const before=Care.data(s).items.length;assert.equal(Care.clean(s,20).ok,true);assert.equal(Care.data(s).items.length,0);assert.equal(s.clean,100);assert.ok(before>0);assert.ok(Care.clean(s,5).error);assert.equal(reload(s).classroomCare.items.length,0);
 const a=fresh(),b=structuredClone(a);Care.setEffort(a,'steady');Care.setEffort(b,'together');assert.ok(Care.studentTidy(b).removed>=Care.studentTidy(a).removed);assert.ok(Care.studentTidy(b).error);
});
test('annual and sick leave use separate 480-minute accounts, reject duplicate use, and preserve records',()=>{
 const s=fresh();s.minute=760;const r=Duty.requestLeave(s,{type:'early',day:s.day,start:760,reason:'개인 용무'});assert.equal(r.ok,true);assert.equal(Duty.balance(s,'annual').reserved,240);assert.ok(Duty.approve(s,r.id,false).error);assert.equal(Duty.approve(s,r.id,true).ok,true);assert.equal(Duty.depart(s,r.id).ok,true);assert.equal(s.minute,1000);assert.equal(Duty.balance(s,'annual').used,240);assert.equal(Duty.balance(s,'sick').used,0);assert.ok(Duty.depart(s,r.id).error);assert.ok(Duty.perform(s,'documents').error);assert.equal(M.canVisitRoom(s,'staff'),false);assert.equal(M.makeEvent(s,1),null);assert.equal(Duty.absent(reload(s)),true);
 s.day=s.academic.calendar.find(d=>d.school&&d.day>s.day).day;s.minute=520;Duty.data(s);assert.equal(Duty.absent(s),false);const sick=Duty.requestLeave(s,{type:'sick',day:s.day,reason:'건강 회복'});assert.equal(Duty.approve(s,sick.id,true).ok,true);assert.equal(Duty.depart(s,sick.id).ok,true);assert.equal(Duty.balance(s,'sick').used,480);assert.equal(Duty.balance(s,'annual').used,240);assert.equal(Duty.durationLabel(480),'1일');reload(s);
});
test('reserved sick leave cannot exceed seven days; cancellation refunds reservation without erasing history',()=>{
 const s=fresh(),days=s.academic.calendar.filter(d=>d.school&&d.day>=s.day).slice(0,8);for(const d of days.slice(0,7))assert.equal(Duty.requestLeave(s,{type:'sick',day:d.day,reason:'건강 회복'}).ok,true);assert.equal(Duty.balance(s,'sick').available,0);assert.ok(Duty.requestLeave(s,{type:'sick',day:days[7].day,reason:'건강 회복'}).error);assert.equal(Duty.cancel(s,s.teacherDuty.requests[0].id).ok,true);assert.equal(Duty.balance(s,'sick').available,480);reload(s);
 const r=structuredClone(s);r.teacherDuty.requests[1].minutes=-5;assert.equal(M.validateSave(r),false);
});
test('work and leave respect real meeting conflicts and do not auto-complete documents',()=>{
 const s=fresh();s.minute=900;P.upsert(s,{id:'conflict',title:'학년회의',day:s.day,start:900,end:920,room:'research',type:'meeting',source:'학교톡'});assert.ok(Duty.perform(s,'documents',20).error);const r=Duty.requestLeave(s,{type:'early',day:s.day,start:900,reason:'가족 일정'});assert.equal(r.ok,true);assert.ok(Duty.approve(s,r.id,true).error);P.respond(s,'conflict','불참');assert.equal(Duty.cancel(s,r.id).ok,true);const official=structuredClone(s.computer.official);assert.equal(Duty.perform(s,'documents',20).ok,true);assert.equal(s.minute,920);assert.deepEqual(s.computer.official,official);assert.equal(reload(s).teacherDuty.work.length,1);
});
test('practice tutorial follows actual actions and can be skipped/restarted without advancing time',()=>{
 const s=fresh(),time=s.minute;Tutorial.startPractice(s);assert.equal(Tutorial.currentPractice(s).id,'attendance');M.takeAttendance(s,{});assert.equal(Tutorial.currentPractice(s).id,'lesson');assert.equal(s.minute,time);Tutorial.start(s);Tutorial.finish(s,true);assert.equal(Tutorial.currentPractice(s),null);Tutorial.startPractice(s);assert.equal(Tutorial.currentPractice(s).id,'lesson');reload(s);const bad=structuredClone(s);bad.tutorial.practice.checks='invalid';assert.equal(M.validateSave(bad),false);
});
