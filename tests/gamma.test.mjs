import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../dist/model.js';
import * as G from '../dist/school-life.js';
import {portraitFor,portraitKey,TEACHER_PORTRAITS} from '../dist/portraits.js';
import {direction8,findPath,blockedPoint,roomSpec} from '../dist/world.js';

test('every person has a distinct illustrated cell, including all eight teacher choices',()=>{
 const state=M.newGame({count:28});
 const others=[...state.students.flatMap(s=>[s.id,s.parentId]),...M.NPCS.filter(n=>n.id!=='teacher').map(n=>n.id)];
 for(const choice of TEACHER_PORTRAITS){state.config.portrait=choice.id;const ids=['teacher',...others],keys=ids.map(id=>portraitKey(state,id));assert.equal(new Set(keys).size,ids.length);for(const id of ids){const p=portraitFor(state,id);assert.ok(p.cell>=0&&p.cell<16);assert.ok(fs.existsSync(new URL(`../dist/assets/portraits/${p.sheet}.png`,import.meta.url)));}}
});
test('eight headings have equal speed and diagonal routes avoid blocked corners',()=>{
 const angles=new Set();for(let i=0;i<8;i++){const d=direction8(Math.sin(i*Math.PI/4),Math.cos(i*Math.PI/4));assert.ok(Math.abs(Math.hypot(d.x,d.z)-1)<1e-9);angles.add(Math.round(d.angle/(Math.PI/4)));}assert.equal(angles.size,8);
 assert.deepEqual(direction8(0,0),{x:0,z:0,angle:0});
 const bounds={minX:0,minZ:0,maxX:5,maxZ:5},blockers=[{x:2,z:2,w:1,d:2}],start={x:.5,z:.5},goal={x:4.5,z:4.5};
 const route=findPath(start,goal,blockers,bounds,.25);assert.ok(route.length);assert.deepEqual(route.at(-1),goal);
 let last=start;for(const p of route){for(let i=1;i<=10;i++)assert.equal(blockedPoint({x:last.x+(p.x-last.x)*i/10,z:last.z+(p.z-last.z)*i/10},blockers,bounds,.10),false);last=p;}
 assert.notDeepEqual(roomSpec('classroom'),roomSpec('hall'));assert.ok(roomSpec('classroom').depth>roomSpec('classroom').width);assert.ok(roomSpec('gym').width>roomSpec('classroom').width);
});
test('two-round conversations persist and reward one person/topic only once per day',()=>{
 const s=M.newGame();const before=s.students[0].relation;
 assert.ok(G.beginDialogue(s,'s0','learning'));assert.equal(G.dialogueChoices(s).length,3);G.answerDialogue(s,0);assert.equal(s.schoolLife.dialogue.history.length,3);
 const loaded=M.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(loaded);G.answerDialogue(loaded,1);assert.equal(loaded.schoolLife.dialogue.finished,true);assert.equal(loaded.schoolLife.dialogue.history.length,5);assert.equal(loaded.students[0].relation,before+3);assert.match(loaded.students[0].memories[0].date,/2030/);
 assert.equal(G.answerDialogue(loaded,0),false);G.beginDialogue(loaded,'s0','learning');G.answerDialogue(loaded,0);G.answerDialogue(loaded,0);assert.equal(loaded.students[0].relation,before+3);
 for(const grade of [1,6]){const other=M.newGame({grade});G.beginDialogue(other,'s0','autonomy');assert.match(other.schoolLife.dialogue.history[0].text,grade===1?/처음.*같이/:/우리가 정할 수/);}
});
test('messenger answers refer to the correct person, budget, topic and repair state',()=>{
 const s=M.newGame();s.budget=123456;
 const budget=G.sendChat(s,'admin',null,'학습준비물 예산을 알려 주세요');assert.match(budget.reply,/123,456/);assert.equal(s.messages.at(-1).senderId,'admin');
 G.sendChat(s,'parent','p1','친구 관계는 어떤가요?');assert.equal(s.messages.at(-1).senderId,'p1');assert.equal(s.messages.at(-2).recipientId,'p1');assert.equal(s.schoolLife.conversations.p0,undefined);
 assert.match(G.sendChat(s,'parent','p1','그럼 어떤 방법이 좋을까요?').reply,/확인 시점/);
 s.repair='broken';assert.match(G.sendChat(s,'admin',null,'전자칠판 수리를 요청합니다.').reply,/접수/);assert.equal(s.repair,'requested');assert.equal(s.budget,123456);
 G.diagnose(s);s.schoolLife.diagnosis.results[0].areas=['국어'];G.planTutoring(s,['s0']);assert.match(G.sendChat(s,'grade',null,'기초학력지도 예산도 알려 주세요').reply,/150,000/);
 assert.match(G.sendChat(s,'all',null,'전직원회의는 언제인가요?').reply,/금요일/);
 assert.equal(G.sendChat(s,'parent','p0','   '),false);assert.ok(M.validateSave(s));
});
test('diagnosis excludes absentees and allows their later assessment without duplicate records',()=>{
 const s=M.newGame({count:4});M.takeAttendance(s,{s0:'질병결석'});G.diagnose(s);
 assert.equal(s.schoolLife.diagnosis.results[0].status,'미실시');assert.equal(s.schoolLife.diagnosis.results[0].reading,null);assert.equal(s.students[0].records.length,0);assert.equal(s.students[1].records.length,1);assert.ok(M.validateSave(s));assert.equal(G.diagnose(s),false);
 M.nextDay(s);G.diagnose(s);assert.equal(s.schoolLife.diagnosis.results[0].status,'실시');assert.equal(s.students[0].records.length,1);assert.equal(s.students[1].records.length,1);assert.equal(G.diagnose(s),false);
});
test('ten weekly support sessions use a separate 150,000 grant, 40 minutes and actual attendance',()=>{
 const s=M.newGame({count:4,skill1:'기초학력'});s.students[0].scores['국어']=40;G.diagnose(s);const supplies=s.budget;
 assert.ok(G.planTutoring(s,['s0','s1'],2).ok);assert.equal(s.schoolLife.tutoring.balance,150000);assert.ok(G.planTutoring(s,['s0'],2).error);
 for(let week=0;week<10;week++){
  s.day=week*5+2;s.minute=900;M.takeAttendance(s,{s1:week===0?'질병결석':'출석'});const before=s.students[1].scores['국어'];
  assert.ok(M.remainingStudents(s).some(p=>p.id==='s0'));assert.ok(G.runTutoring(s,'practice').ok);assert.equal(s.minute,940);if(week===0)assert.equal(s.students[1].scores['국어'],before);
  const balance=s.schoolLife.tutoring.balance;s.minute=900;assert.ok(G.runTutoring(s,'practice').error);assert.equal(s.schoolLife.tutoring.balance,balance);assert.ok(M.validateSave(s));
 }
 assert.equal(s.schoolLife.tutoring.balance,0);assert.equal(s.schoolLife.tutoring.sessions.length,10);assert.equal(s.budget,supplies);assert.ok(s.students[0].scores['국어']<=s.students[0].initialScores['국어']+25);
 const loaded=M.migrateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded.schoolLife,s.schoolLife);
});
test('late support plans extend the demo, while all-absent sessions spend nothing',()=>{
 const s=M.newGame({count:4});s.day=4;s.minute=1000;s.students[0].scores['국어']=40;G.diagnose(s);assert.ok(G.planTutoring(s,['s0'],2).ok);assert.equal(M.demoDays(s),55);
 s.day=7;s.minute=900;M.takeAttendance(s,{s0:'질병결석'});assert.ok(G.runTutoring(s,'materials').error);assert.equal(s.schoolLife.tutoring.balance,150000);assert.equal(s.minute,900);
 s.day=49;s.minute=1000;assert.equal(M.nextDay(s),true);assert.equal(s.ended,false);assert.ok(M.validateSave(s));
});
test('targeted notices are read and replied to once and survive reload',()=>{
 const s=M.newGame();const n=G.sendNotice(s,'상담 안내','다음 주 함께 이야기해요.',['p0','p2','p2'],true);assert.equal(n.recipients.length,2);assert.equal(n.recipients[0].read,false);
 M.advance(s,3);G.tick(s);assert.equal(n.recipients[0].read,true);assert.equal(n.recipients[1].read,false);M.advance(s,27);G.tick(s);assert.ok(n.recipients.every(r=>r.replied));const messages=s.messages.length;G.tick(s);assert.equal(s.messages.length,messages);
 const loaded=M.migrateSave(s);G.tick(loaded);assert.equal(loaded.messages.length,messages);assert.ok(M.validateSave(loaded));
 const quiet=G.sendNotice(s,'알림','회신이 필요하지 않아요.',['p1'],false);M.advance(s,50);G.tick(s);assert.equal(quiet.recipients[0].read,true);assert.equal(quiet.recipients[0].replied,false);
});
test('counseling prevents timetable collisions and records completed or canceled appointments',()=>{
 const s=M.newGame();s.students[0].scores['국어']=40;G.diagnose(s);G.planTutoring(s,['s0'],2);
 assert.ok(G.bookCounseling(s,'p0',2,920,'학습').error);assert.ok(G.bookCounseling(s,'p0',4,940,'학습').error);assert.ok(G.bookCounseling(s,'p0',0,900,'학습 습관').ok);assert.ok(G.bookCounseling(s,'p1',0,900,'친구').error);
 const c=s.schoolLife.counseling[0];assert.ok(G.completeCounseling(s,c.id,'아직 오전').error);s.minute=900;assert.ok(G.completeCounseling(s,c.id,'집과 학교에서 한 단계씩 안내하기로 함.').ok);assert.equal(s.minute,920);assert.equal(c.status,'완료');assert.match(s.notes.p0[0].created,/15:00/);assert.ok(G.completeCounseling(s,c.id,'중복').error);
 G.bookCounseling(s,'p1',0,940,'친구');assert.ok(G.cancelCounseling(s,'counsel-1'));assert.equal(G.cancelCounseling(s,'counsel-1'),false);assert.match(s.messages.at(-1).text,/취소/);assert.ok(M.validateSave(s));
 const other=M.newGame();G.bookCounseling(other,'p0',2,900,'먼저 잡힌 약속');other.students[0].scores['국어']=40;G.diagnose(other);assert.ok(G.planTutoring(other,['s0'],2).error);
});
test('completed beta saves continue with notes, question history and a unique teacher portrait',()=>{
 const s=M.newGame();s.schema=2;s.version='0.2.0-beta';s.day=4;s.minute=1000;s.ended=true;delete s.schoolLife;delete s.config.portrait;M.addNote(s,'s0','베타의 기억');M.markQuestionSeen(s,'event:3','한 번 본 질문');
 const gamma=M.migrateSave(s);assert.equal(gamma.schema,4);assert.equal(gamma.ended,false);assert.equal(gamma.notes.s0[0].text,'베타의 기억');assert.ok(gamma.dialogueSeen['event:3']);assert.ok(M.nextDay(gamma));assert.equal(M.dateLabel(gamma),'3월 11일 월요일');assert.ok(M.validateSave(gamma));
});
