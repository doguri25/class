import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';
import * as A from '../dist/academic-year.js';
import * as Beta from '../dist/beta-ui.js';
import * as People from '../dist/community-life.js';
import * as Tutorial from '../dist/tutorial.js';
const fresh=()=>{const s=M.newGame({grade:3,count:8,region:'newtown',seed:12345});Beta.initialize(s,true);A.acknowledge(s);A.begin(s);s.day=s.academic.calendar.find(d=>d.school&&d.day>s.day).day;s.minute=520;s.teacherPlanner.entries=[];return s;};
test('tutorial is optional, saved, skippable and replayable without changing game progress',()=>{
 const s=fresh(),before=[s.day,s.minute,s.academic.acknowledged,s.lessonResults.length];assert.equal(Tutorial.active(s),false);assert.equal(M.validateSave(s),true);
 Tutorial.start(s);Tutorial.move(s,-1);assert.equal(s.tutorial.step,0);Tutorial.move(s,1);const restored=M.migrateSave(JSON.parse(JSON.stringify(s)));assert.equal(Tutorial.active(restored),true);assert.equal(restored.tutorial.step,1);assert.equal(M.validateSave(restored),true);
 Tutorial.finish(s,true);assert.equal(s.tutorial.status,'skipped');assert.equal(Tutorial.move(s,1),false);Tutorial.start(s);for(let i=0;i<20;i++)Tutorial.move(s,1);assert.equal(s.tutorial.step,Tutorial.STEPS.length-1);Tutorial.finish(s);assert.equal(s.tutorial.status,'completed');assert.deepEqual([s.day,s.minute,s.academic.acknowledged,s.lessonResults.length],before);
 const bad=structuredClone(s);bad.tutorial.step=99;assert.equal(M.validateSave(bad),false);
});
test('a damaged aid stays unavailable until NPC repair notification and receipt; no budget deduction or duplicate notices',()=>{
 const s=fresh(),budget=s.budget;assert.equal(People.lendAid(s,'s0','독서대').ok,true);const l=s.community.loans[0];assert.equal(People.returnAid(s,l.id,'점검 필요').ok,true);assert.equal(People.aidInventory(s)[0].status,'blocked');assert.ok(People.lendAid(s,'s1','독서대').error);
 assert.equal(People.requestAidRepair(s,l.id,'받침이 흔들려 사용 중지, 종이 읽기 자료로 대체').ok,true);assert.ok(People.requestAidRepair(s,l.id,'같은 요청을 다시 보내 봅니다').error);assert.equal(s.teacherPlanner.entries.filter(e=>e.aidLoanId===l.id).length,1);assert.ok(People.confirmAidRepair(s,l.id).error);assert.equal(M.validateSave(s),true);
 s.day=l.repair.due;s.minute=520;People.sync(s);assert.equal(l.repair.status,'ready');const messages=s.messages.length;People.sync(s);assert.equal(s.messages.length,messages);assert.ok(People.lendAid(s,'s1','독서대').error);assert.equal(People.confirmAidRepair(s,l.id).ok,true);assert.equal(People.aidInventory(s)[0].status,'available');assert.equal(s.teacherPlanner.entries.find(e=>e.aidLoanId===l.id).status,'완료');assert.ok(People.confirmAidRepair(s,l.id).error);assert.equal(People.lendAid(s,'s1','독서대').ok,true);assert.equal(s.budget,budget);assert.equal(l.condition,'점검 필요');assert.equal(M.validateSave(s),true);
});
test('legacy damaged returns are blocked; school assets do not follow a teacher transfer',()=>{
 const s=fresh();People.lendAid(s,'s0','확대 자료판');const l=s.community.loans[0];People.returnAid(s,l.id,'점검 필요');delete l.schoolId;delete s.community.aidSchoolId;assert.equal(M.validateSave(s),true);People.data(s);const originalSchool=s.career.schoolId;assert.equal(l.schoolId,originalSchool);assert.equal(People.aidInventory(s).find(x=>x.item===l.item).status,'blocked');
 s.career.schoolId=s.career.schools.find(sc=>sc.id!==originalSchool).id;assert.equal(People.aidInventory(s).find(x=>x.item===l.item).status,'available');assert.ok(People.requestAidRepair(s,l.id,'이전 학교 도구 점검 요청').error);s.career.schoolId=originalSchool;assert.equal(People.aidInventory(s).find(x=>x.item===l.item).status,'blocked');
 s.minute=540;assert.ok(People.requestAidRepair(s,l.id,'수업 중 점검 요청은 제한합니다').error);assert.equal(l.repair,undefined);
});
