import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';
import * as P from '../dist/planner.js';
import * as PC from '../dist/teacher-pc.js';
import * as G from '../dist/school-life.js';
import {script,TOPICS,SMALL_STORIES} from '../dist/dialogue-bank.js';
import {PEER_LINES} from '../dist/everyday-life.js';

const setup=()=>{const s=M.newGame();PC.sync(s);P.sync(s);s.minute=880;return s;};
const reply='학급 학생의 참여 방법과 준비물을 확인하여 계획을 제출합니다. 보유한 도구를 먼저 활용하겠습니다.';
test('Theta migrates prior saves and synchronizes official deadlines once per week',()=>{
 const old=M.newGame();delete old.computer;assert.ok(M.validateSave(old));const s=M.migrateSave(old);assert.deepEqual(s.computer,PC.defaults());PC.sync(s);P.sync(s);const messages=s.messages.length;PC.sync(s);P.sync(s);assert.equal(s.messages.length,messages);assert.equal(s.computer.official.length,2);assert.equal(P.data(s).entries.filter(e=>e.officialId).length,2);s.day=5;PC.sync(s);assert.equal(s.computer.official.length,4);assert.ok(M.validateSave(s));
});
test('private sticky edits preserve creation and unchanged modified dates, with pin and archive',()=>{
 const s=setup(),before=JSON.stringify([s.students,s.npcRelations,s.notes]),n=PC.note(s,null,{title:'다음 활동',text:'<img src=x onerror=alert(1)> 14:40 회의 자료'}),created=n.created;s.day=1;PC.note(s,n.id,{text:'도구를 먼저 확인'});assert.equal(n.created,created);assert.notEqual(n.updated,created);const updated=n.updated;s.day=2;PC.note(s,n.id,{text:n.text,title:n.title});assert.equal(n.updated,updated);PC.note(s,n.id,{color:'blue',pinned:true,archived:true});assert.equal(n.archived,true);PC.note(s,n.id,{archived:false});assert.equal(n.color,'blue');assert.ok(n.pinned);assert.equal(JSON.stringify([s.students,s.npcRelations,s.notes]),before);assert.ok(M.validateSave(s));
});
test('rosters exclude private notes and minutes require actual completed attendance',()=>{
 const s=setup();M.addNote(s,'s0','개인 관찰 비공개 메모');const roster=PC.createFile(s,'roster');assert.match(roster.body,new RegExp(s.students[0].name));assert.doesNotMatch(roster.body,/비공개/);const e=P.data(s).entries.find(e=>e.type==='meeting');assert.equal(PC.createFile(s,'minutes',e.id),null);s.day=e.day;s.minute=e.start-10;s.room=e.room;assert.ok(P.attend(s,e.id,'다음 수업의 관찰 항목을 세 가지로 정함.').ok);const f=PC.createFile(s,'minutes',e.id);assert.match(f.body,/관찰 항목을 세 가지/);assert.match(f.body,new RegExp(M.ROOMS[e.room].name));assert.equal(PC.createFile(s,'minutes',e.id).id,f.id);assert.ok(M.validateSave(s));
});
test('officials require attachments and finished draft contents, preserve submitted snapshots and complete once',()=>{
 const s=setup(),d=s.computer.official[0],budget=s.budget;PC.saveDraft(s,d.id,reply,[]);assert.ok(PC.submit(s,d.id).ok);assert.equal(d.status,'submitted');assert.ok(PC.waitReview(s,d.id).ok);assert.equal(d.status,'revision');assert.match(d.feedback,/첨부/);
 const f=PC.createFile(s,'plan');PC.saveDraft(s,d.id,reply,[f.id]);assert.ok(PC.submit(s,d.id).ok);PC.editFile(s,f.id,f.title,f.body.replaceAll('[작성]','모둠별로 관찰한 장면을 그림과 말로 정리하고 친구에게 설명하기'));assert.ok(PC.waitReview(s,d.id).ok);assert.equal(d.status,'revision','editing the source after submission does not replace its snapshot');assert.match(d.feedback,/작성/);assert.ok(M.validateSave(s));
 PC.saveDraft(s,d.id,reply,[f.id]);assert.ok(PC.submit(s,d.id).ok);assert.ok(PC.waitReview(s,d.id).ok);assert.equal(d.status,'approved');assert.equal(PC.saveDraft(s,d.id,'덮어쓰기',[]),false);assert.ok(PC.finishOfficial(s,d.id).ok);assert.equal(P.data(s).entries.find(e=>e.officialId===d.id).status,'완료');const time=s.minute;assert.ok(PC.finishOfficial(s,d.id).error);assert.equal(s.minute,time);assert.equal(s.budget,budget);assert.equal(d.history.length,8);assert.ok(M.validateSave(s));
});
test('official work cannot consume class or meeting time or backdate a final-day review',()=>{
 const s=setup(),d=s.computer.official[0];PC.saveDraft(s,d.id,reply,[]);s.minute=540;assert.ok(PC.submit(s,d.id).error);assert.equal(s.minute,540);s.minute=850;P.upsert(s,{id:'busy',title:'협의',type:'meeting',room:'research',day:s.day,start:850,end:870,response:'참석'});assert.ok(PC.submit(s,d.id).error);s.day=M.demoDays(s)-1;s.minute=990;assert.ok(PC.submit(s,d.id).error);assert.equal(d.status,'draft');s.day=5;s.minute=850;PC.sync(s);const notice=s.computer.official.find(d=>d.kind==='notice');assert.ok(PC.finishOfficial(s,notice.id).ok);assert.equal(notice.status,'completed');
});
test('corrupted PC data is rejected while a real submission survives JSON export and import',()=>{
 const s=setup(),d=s.computer.official[0];PC.saveDraft(s,d.id,reply,[]);PC.submit(s,d.id);assert.ok(M.validateSave(JSON.parse(JSON.stringify(s))));for(const mutate of [x=>x.computer.official[0].reviewMinute=-1,x=>x.computer.official[0].submission=null,x=>x.computer.official[0].attachments=['missing'],x=>x.computer.official[0].id='bad\" onclick=alert(1)',x=>x.computer.notes.push({id:'bad'})]){const x=structuredClone(s);mutate(x);assert.equal(M.validateSave(x),false);}const n=PC.note(s);const x=structuredClone(s);x.computer.notes.push({...n});assert.equal(M.validateSave(x),false);
});
test('six authored opening variants per topic and role, with contextual computer messenger replies',()=>{
 const s=setup();for(const id of ['s0','p0','colleague','principal'])for(const topic of Object.keys(TOPICS)){const variants=Array.from({length:6},(_,i)=>script(s,G.person(s,id),topic,i).opening);assert.equal(new Set(variants).size,6,id+topic);}assert.ok(SMALL_STORIES.length>=24);assert.notDeepEqual(PEER_LINES.classroom,PEER_LINES.library);const answer=G.sendChat(s,'all',null,'공문 결재는 어디까지 진행됐나요?');assert.match(answer.reply,/2건/);assert.ok(G.sendChat(s,'all',null,'공문 결재는 어디까지 진행됐나요?').duplicate);assert.match(G.sendChat(s,'grade',null,'지난 학년회의 회의록을 정리하려고 해요.').reply,/아직 참석을 완료한 회의가 없습니다/);
});
