import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';
import * as A from '../dist/academic-year.js';
import * as B from '../dist/beta-ui.js';
import * as P from '../dist/planner.js';
import * as G from '../dist/school-life.js';
import * as N from '../dist/staff-network.js';
import * as V from '../dist/school-democracy.js';
import {EXTRA_STAFF,staffScript} from '../dist/staff-catalog.js';
import {portraitFor,portraitStyle,validPortrait} from '../dist/portraits.js';
import {appearance} from '../dist/character-rig.js';
import {suggestionsFor} from '../dist/guided-inputs.js';
const fresh=()=>{const s=B.initialize(M.newGame({grade:3,count:8,region:'newtown',seed:4567}),true);A.acknowledge(s);A.begin(s);s.day=s.academic.calendar.find(d=>d.school&&d.day>s.day).day;s.minute=520;s.teacherPlanner.entries=[];return s;};
test('six new staff have unique atlas cells, matching rig colors and 18 authored topic openings',()=>{
 const s=fresh(),cells=new Set(),openings=new Set();for(const n of EXTRA_STAFF){const p=portraitFor(s,n.id);assert.equal(validPortrait(p),true);cells.add(p.sheet+':'+p.cell);assert.match(portraitStyle(p),/300% 200%/);const rig=appearance(n,s,true);assert.equal(rig.hair,n.hair);assert.equal(rig.color,n.color);for(const x of n.scenes){const script=staffScript(s,n,x[0],0);openings.add(script.opening);assert.equal(script.choices.length,2);assert.ok(script.answers.flat().every(t=>t.length>20));}assert.equal(s.community.people[n.id].kind,'staff');}
 assert.equal(cells.size,6);assert.equal(openings.size,18);assert.equal(validPortrait({sheet:'staff-support',cell:6}),false);assert.equal(M.validateSave(s),true);
});
test('off-duty staff replies wait for duty, deduplicate across reload and stay in the right thread',()=>{
 let s=fresh();const before=s.messages.length,question=N.suggestions(s,'aftercare')[0];assert.equal(G.beginDialogue(s,'aftercare'),false);assert.equal(G.sendChat(s,'staff','aftercare',question).queued,true);assert.equal(s.messages.length,before+1);assert.ok(G.sendChat(s,'staff','aftercare',question.replaceAll(' ', '')).duplicate);N.sync(s);assert.equal(s.messages.length,before+1);s=M.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(s);s.minute=780;N.sync(s);assert.equal(s.staffNetwork.queue[0].status,'answered');assert.equal(s.messages.at(-1).threadPerson,'aftercare');const count=s.messages.length;N.sync(s);assert.equal(s.messages.length,count);assert.equal(G.replyUsed(s,'aftercare',question),true);assert.equal(G.replyUsed(s,'ict',question),false);assert.ok(G.beginDialogue(s,'aftercare'));assert.equal(M.validateSave(s),true);
});
test('a staff consultation needs a reply, one scheduler entry, actual room/time and a followup note',()=>{
 const s=fresh(),slot=N.availableSlots(s,'ict')[0],result=N.request(s,'ict','learning',slot.day,slot.start),c=N.data(s).consultations[0];assert.ok(result.ok);assert.equal(c.status,'requested');assert.ok(N.request(s,'nutrition','learning',slot.day,slot.start).error);assert.ok(N.attend(s,c.id,'확인할 점').error);N.sync(s);assert.equal(c.status,'requested');s.minute+=2;N.sync(s);assert.equal(c.status,'scheduled');assert.equal(s.teacherPlanner.entries.filter(e=>e.id===c.id).length,1);const count=s.messages.length;N.sync(s);assert.equal(s.messages.length,count);
 s.day=c.day;s.minute=c.start-10;s.room='classroom';assert.ok(N.attend(s,c.id,'역할을 나누고 접속 없이 쓸 대안을 확인합니다.').error);s.room=c.room;assert.ok(N.attend(s,c.id,'').error);const lessons=s.lessonResults.length,budget=s.budget;assert.ok(N.attend(s,c.id,'역할을 나누고 접속 없이 쓸 대안을 확인합니다.').ok);assert.equal(s.minute,c.end);assert.equal(c.status,'completed');assert.equal(s.teacherPlanner.entries.find(e=>e.id===c.id).status,'완료');assert.ok(s.npcMemories.ict[0].text.includes('협의'));assert.equal(s.lessonResults.length,lessons);assert.equal(s.budget,budget);assert.ok(N.attend(s,c.id,'반복 참석').error);assert.equal(M.validateSave(s),true);
});
test('new timetable conflicts, cancellation and missed dates do not invent completed consultations',()=>{
 const s=fresh(),slot=N.availableSlots(s,'inclusion')[0];N.request(s,'inclusion','supplies',slot.day,slot.start);const c=N.data(s).consultations[0];P.upsert(s,{id:'late-conflict',day:c.day,start:c.start,end:c.end,title:'다른 약속',type:'personal',room:'classroom'});s.minute+=2;N.sync(s);assert.equal(c.status,'conflict');assert.equal(s.teacherPlanner.entries.some(e=>e.id===c.id),false);
 const next=N.availableSlots(s,'nutrition')[0];N.request(s,'nutrition','learning',next.day,next.start);const cancelled=N.data(s).consultations.at(-1);assert.ok(N.cancel(s,cancelled.id).ok);assert.equal(N.cancel(s,cancelled.id),false);
 const later=N.availableSlots(s,'facilities')[0];N.request(s,'facilities','supplies',later.day,later.start);s.minute+=2;N.sync(s);const missed=N.data(s).consultations.at(-1);s.day=missed.day;s.minute=missed.end;N.sync(s);assert.equal(missed.status,'missed');assert.equal(s.teacherPlanner.entries.find(e=>e.id===missed.id).status,'취소');assert.equal(s.staffNetwork.consultations.some(c=>c.status==='completed'),false);assert.equal(M.validateSave(s),true);
});
test('school cover has distinct request, assignment, activity report and receipt with no student penalty',()=>{
 const s=fresh(),parents=Object.values(s.community.guardians).slice(0,3),budget=s.budget,day=s.academic.calendar.find(d=>d.school&&d.day>s.day).day;
 for(const g of parents){assert.ok(V.volunteer(s,'학부모회',g.key,day,900,920).ok);assert.ok(V.replaceVolunteer(s,s.democracy.volunteers.at(-1).id,'school').ok);}
 const [a,b,c]=N.data(s).covers;assert.equal(a.status,'requested');N.sync(s);assert.equal(a.personId,'facilities');assert.equal(b.personId,'aftercare');assert.equal(c.status,'unavailable');assert.equal(a.status,'scheduled');assert.ok(N.acknowledgeCover(s,a.id).error);s.day=day;s.minute=900;N.sync(s);assert.equal(N.location(s,a.personId),'playground');s.minute=920;N.sync(s);assert.equal(a.status,'reported');assert.equal(N.location(s,a.personId),'admin');const messages=s.messages.length;N.sync(s);assert.equal(s.messages.length,messages);assert.ok(N.acknowledgeCover(s,a.id).ok);assert.ok(N.acknowledgeCover(s,a.id).error);assert.equal(s.democracy.volunteers.every(v=>v.status==='취소'&&v.studentPenalty===0),true);assert.equal(s.budget,budget);assert.equal(M.validateSave(s),true);
});
test('staff cover conflicts prevent consultation double-booking and requests do not cross a school transfer',()=>{
 const s=fresh(),g=Object.values(s.community.guardians)[0],day=s.academic.calendar.find(d=>d.school&&d.day>s.day).day;V.volunteer(s,'등하굣길 안전 봉사',g.key,day,900,920);V.replaceVolunteer(s,s.democracy.volunteers[0].id,'school');N.sync(s);assert.ok(N.request(s,'facilities','supplies',day,900).error);const q=N.suggestions(s,'aftercare')[0];N.chat(s,'aftercare',q);s.career.schoolId=s.career.schools.find(sc=>sc.id!==s.career.schoolId).id;N.sync(s);assert.equal(s.staffNetwork.queue[0].status,'cancelled');assert.equal(s.staffNetwork.covers[0].status,'cancelled');assert.equal(M.validateSave(s),true);
});
test('guided gameplay fields offer choices but keep private names and notes free, and never fabricate evidence',()=>{
 const s=fresh();for(const id of ['be-goal','be-support','cx-prep-detail','notice-body','message-text','staff-note-id'])assert.ok(suggestionsFor(id,s).items.length>=3);for(const id of ['teacher-name','person-note','pc-note-text','cx-parent-name'])assert.equal(suggestionsFor(id,s),null);const root={querySelector:()=>({value:'s0'})};assert.deepEqual(suggestionsFor('record-text',s,root).items,[]);s.students[0].records.push({day:s.day,text:'관찰한 한 가지 장면'});assert.deepEqual(suggestionsFor('record-text',s,root).items,['관찰한 한 가지 장면']);
});
test('legacy games initialize lazily and malformed staff imports are rejected',()=>{
 const s=fresh();delete s.staffNetwork;assert.equal(M.validateSave(s),true);B.initialize(s);assert.equal(s.staffNetwork.schema,1);N.chat(s,'nutrition',N.suggestions(s,'nutrition')[0]);const slot=N.availableSlots(s,'ict')[0];N.request(s,'ict','learning',slot.day,slot.start);
 for(const mutate of [x=>x.staffNetwork.queue[0].personId='unknown',x=>x.staffNetwork.consultations[0].day=9999,x=>x.staffNetwork.consultations[0].end=1001,x=>x.staffNetwork.queue[0].status='fake']){const bad=structuredClone(s);mutate(bad);assert.equal(M.validateSave(bad),false);}assert.equal(M.validateSave(M.migrateSave(JSON.parse(JSON.stringify(s)))),true);
});

test('a staff member initiates one room-based school message per term, remembered after reload',()=>{
 let s=fresh();s.minute=900;s.room='cafeteria';N.sync(s);assert.equal(s.messages.filter(m=>m.staffProactive).length,1);assert.equal(s.messages.at(-1).senderId,'nutrition');N.sync(s);assert.equal(s.messages.filter(m=>m.staffProactive).length,1);s=M.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(s);N.sync(s);assert.equal(s.messages.filter(m=>m.staffProactive).length,1);s.day=s.academic.calendar.find(d=>d.school&&d.term===2).day;N.sync(s);assert.equal(s.messages.filter(m=>m.staffProactive).length,2);
});
