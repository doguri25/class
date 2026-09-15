import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';
import * as B from '../dist/beta-ui.js';
import * as A from '../dist/academic-year.js';
import * as P from '../dist/planner.js';
import * as G from '../dist/school-life.js';
import * as People from '../dist/community-life.js';
import * as Vote from '../dist/school-democracy.js';
import * as Detail from '../dist/school-review.js';
import * as Review from '../dist/record-review.js';
import * as Career from '../dist/career.js';
import * as Staff from '../dist/staff-work.js';
import * as Library from '../dist/library-life.js';
import * as Support from '../dist/student-support.js';
import * as Ops from '../dist/school-operations.js';
import {portraitKey} from '../dist/portraits.js';
import {EXPANDED_SCENES,storyFor} from '../dist/dialogue-expansion.js';
import {SMALL_STORIES} from '../dist/dialogue-bank.js';
import {appearance,createCharacter,animateCharacter} from '../dist/character-rig.js';
import * as THREE from '../dist/assets/three.module.js';

function ready(grade=3,count=8){const s=B.initialize(M.newGame({grade,count,seed:1703}),true);A.acknowledge(s);A.begin(s);s.day=1;s.minute=520;s.teacherPlanner.entries=[];return s;}
function afternoon(s,day=s.day){s.day=day;s.minute=900;s.room=s.classLocation='classroom';s.journey=null;s.groupActivity=null;s.teacherPlanner.entries=[];return s;}
function check(s){assert.equal(People.valid(s),true,'community');assert.equal(Vote.valid(s),true,'democracy');assert.equal(Detail.valid(s),true,'schoolReview');assert.equal(M.validateSave(JSON.parse(JSON.stringify(s))),true,'whole save');}
const rationale='학생이 직접 설명한 과정과 실제 확인한 자료를 기록했다.';

test('32 new student portraits are stable and current people have distinct cells after roster edits',()=>{
 const s=ready(3,28);const keys=s.students.map(st=>[st.personKey,portraitKey(s,st.id)]);assert.ok(keys.every(([,key])=>key.includes('-v2:')));assert.equal(new Set(keys.map(x=>x[1])).size,28);
 const parents=s.students.map(st=>portraitKey(s,st.parentId));assert.equal(new Set(parents).size,28);assert.equal(parents.includes(portraitKey(s,'counselor')),false);
 afternoon(s);assert.ok(People.transferOut(s,'s0','가람초등학교',rationale).ok);assert.ok(People.transferIn(s,'남해솔','여').ok);
 for(const st of s.students.filter(st=>st.id!=='s101')){const key=keys.find(x=>x[0]===st.personKey);if(key)assert.equal(portraitKey(s,st.id),key[1]);}
 assert.equal(new Set(s.students.map(st=>portraitKey(s,st.id))).size,28);assert.equal(new Set(s.students.map(st=>portraitKey(s,st.parentId))).size,28);check(s);
});

test('transfers preserve notes, assessment, support, book and conversation histories without reallocating their identities',()=>{
 const s=ready(),st=s.students[0];M.addNote(s,st.id,'처음 관찰한 배움의 과정');st.records.push({kind:'behavior',day:s.day,date:M.stamp(s),text:rationale,order:1});const report=Review.draft(s,st.id,[0]);Review.save(s,report.id,rationale,true);G.beginDialogue(s,st.id);G.answerDialogue(s,0);G.answerDialogue(s,0);G.diagnose(s);Library.lend(s,'umbrella',st.id);Library.returnLoan(s,s.libraryLife.loans[0].id);Support.open(s,st.id,'order',rationale);Support.submitDocument(s,{studentId:st.id,kind:'family',from:5,to:6,detail:rationale,evidence:'보호자 신청 자료'});
 afternoon(s);const before=s.budget,stamp=s.notes[st.id][0].created;assert.ok(People.transferOut(s,st.id,'바다빛초등학교',rationale).ok);assert.equal(s.students.length,7);assert.equal(s.budget,before);assert.equal(People.former(s,st.id).personKey,st.personKey);assert.equal(G.person(s,st.parentId).child.personKey,st.personKey);assert.equal(s.community.transfers[0].notes[0].created,stamp);assert.equal(s.support.cases[0].closed,true);assert.ok(s.support.documents[0].transferred);assert.ok(Support.documentAction(s,s.support.documents[0].id,'approve',rationale).error);check(s);
 const r=People.transferIn(s,'유은결','남');assert.ok(r.ok);assert.equal(s.students.at(-1).id,r.id);assert.notEqual(r.id,st.id);assert.equal(s.budget,before+60000);assert.equal(s.schoolLife.diagnosis.results.length,8);assert.ok(s.community.followups.some(f=>f.key===s.students.at(-1).personKey));check(s);
});

test('transfers block unresolved individual loans and active movement but accept an arrived journey',()=>{
 const s=ready();Library.lend(s,'umbrella','s0');afternoon(s);assert.ok(People.transferOut(s,'s0','가람초',rationale).error);Library.returnLoan(s,s.libraryLife.loans[0].id);
 s.journey={status:'moving'};assert.ok(People.transferIn(s,'남별하','여').error);s.journey={status:'arrived'};assert.ok(People.transferOut(s,'s0','가람초',rationale).ok);assert.equal(s.journey,null);check(s);
});

test('a guardian has child-scoped consent, communication and record permissions, with no sibling message spill',()=>{
 const s=ready(),a=s.students[0],b=s.students[1];const key=a.guardianKey;assert.ok(People.linkSibling(s,b.id,key).ok);assert.equal(People.permitted(s,b.parentId,b.id),false);assert.ok(G.sendChat(s,'parent',b.parentId,'학교 생활이 궁금합니다').error);assert.ok(People.familyMessage(s,key,b.id,'학교 생활 안내').error);assert.ok(People.consent(s,b.id,key,'독서 활동',true).error);
 assert.ok(People.permissions(s,key,b.id,{verified:true,messages:true,consent:true,pickup:false,records:false}).ok);assert.ok(People.familyMessage(s,key,b.id,'학교 생활에 필요한 자료 안내').ok);assert.ok(People.familyMessage(s,key,b.id,'학교 생활에 필요한 자료 안내').error);assert.ok(G.sendChat(s,'parent',b.parentId,'성적 평가가 궁금합니다').error);assert.ok(People.consent(s,b.id,key,'독서 활동',false).ok);assert.equal(s.community.consents[0].agree,false);
 const familyNotes=People.guardian(s,key).notes.filter(n=>n.studentKey);assert.equal(familyNotes.every(n=>n.studentKey===b.personKey),true);assert.equal(People.permitted(s,key,a.id,'records'),true);check(s);
});

test('additional guardians start unverified and keep unique illustrations',()=>{
 const s=ready();const r=People.addGuardian(s,'s0','한별 보호자');assert.ok(r.ok);assert.equal(People.permitted(s,r.id,'s0'),false);const keys=Object.values(s.community.guardians).map(g=>g.portrait.sheet+g.portrait.cell);assert.equal(new Set(keys).size,keys.length);check(s);
});

test('desk and locker checks respect consent, use time, and cannot award twice a day',()=>{
 const s=ready(),before=s.students[0].relation;assert.ok(People.inspect(s,'s0','desk',false).ok);assert.equal(s.minute,520);assert.equal(s.students[0].relation,before);assert.ok(People.inspect(s,'s0','desk',true).ok);assert.equal(s.minute,525);assert.ok(People.inspect(s,'s0','desk',true).error);assert.equal(s.community.checks.length,2);check(s);
});

test('lost property requires correct ownership and aids require a physical return state',()=>{
 const s=ready(),item=People.items(s,'s0')[0];assert.ok(People.moveItem(s,'s0',item.id,'lost').ok);assert.ok(People.returnLost(s,item.id,'s1','이름표와 색을 함께 확인').error);assert.ok(People.returnLost(s,item.id,'s0','이름표와 색을 함께 확인').ok);assert.equal(item.place,'bag');assert.ok(People.lendAid(s,'s0','독서대').ok);assert.ok(People.lendAid(s,'s1','독서대').error);assert.ok(People.returnAid(s,s.community.loans[0].id,'점검 필요').ok);assert.equal(s.community.loans[0].condition,'점검 필요');assert.equal(Detail.auditFindings(s).find(f=>f.id==='aids').ok,false);check(s);
});

test('support followups deduplicate, have real due dates and preserve actual followup notes',()=>{
 const s=ready(),key=s.students[0].personKey;assert.equal(People.scheduleFollowup(s,key,'학습 참여 다시 확인',3),true);assert.equal(People.scheduleFollowup(s,key,'학습 참여 다시 확인',3),false);const f=s.community.followups[0];assert.ok(People.finishFollowup(s,f.id,rationale).error);afternoon(s,f.day);assert.ok(People.finishFollowup(s,f.id,rationale).ok);assert.equal(f.note,rationale);assert.ok(People.finishFollowup(s,f.id,rationale).error);check(s);
});

test('peer and staff interactions have stable relationship edges and bounded live feeds',()=>{
 const s=ready();People.socialTick(s);const n=Object.keys(s.community.edges).length;People.socialTick(s);assert.equal(Object.keys(s.community.edges).length,n);assert.equal(s.community.socialFeed.length,1);afternoon(s);People.socialTick(s);assert.ok(Object.values(s.community.edges).some(e=>s.community.people[e.a].kind==='staff'));for(let i=0;i<100;i++){s.minute=520;s.day=i;People.socialTick(s);}assert.ok(s.community.socialFeed.length<=60);check(s);
});

test('240 authored small situations have no duplicate opening text and relationship/grade variants change conversation',()=>{
 assert.equal(EXPANDED_SCENES.length,216);assert.equal(SMALL_STORIES.length,240);assert.equal(new Set(EXPANDED_SCENES.map(x=>x.line)).size,216);
 const s=ready(1),st={...s.students[0],kind:'student',relation:20};const low=storyFor(s,st,'learning',0);st.relation=90;const close=storyFor(s,st,'learning',0);assert.notEqual(low.opening,close.opening);s.config.grade=6;assert.match(storyFor(s,st,'learning',0).opening,/우리가 정할 수/);assert.notEqual(storyFor(s,st,'learning',1).opening,low.opening);
});

test('whole-school election records individual ballots and aggregate totals exactly once without using background labels',()=>{
 const s=ready(5,8);assert.ok(Vote.start(s).ok);assert.ok(Vote.start(s).error);const candidates=Vote.candidates(s).slice(0,3);for(let i=0;i<3;i++)assert.ok(Vote.nominate(s,candidates[i].key,Vote.PLEDGES[i][0]).ok);afternoon(s);assert.ok(Vote.campaign(s,'poster').ok);assert.ok(Vote.campaign(s,'debate').ok);M.takeAttendance(s,{s0:'질병결석'});const twin=structuredClone(s);twin.students.forEach(st=>{st.tags=['다른 지원 정보'];st.scores.국어=5;});assert.ok(Vote.vote(s).ok);assert.ok(Vote.vote(twin).ok);const e=Vote.current(s);assert.deepEqual(e.result,twin.democracy.elections[0].result);assert.equal(e.ballots.length,e.voters.length);assert.equal(e.result.absent,1);assert.equal(Object.values(e.result.counts).reduce((a,b)=>a+b,0)+e.result.abstain+e.result.absent,e.voters.length);assert.ok(Vote.vote(s).error);check(s);
 const tampered=structuredClone(s);tampered.democracy.elections[0].result.counts[candidates[0].key]++;assert.equal(M.validateSave(tampered),false);const wrongWinner=structuredClone(s);wrongWinner.democracy.elections[0].result.winners=['forged'];assert.equal(M.validateSave(wrongWinner),false);
});

test('committee election and voluntary cover reject double-booked or unknown replacements without mutation',()=>{
 const s=ready();afternoon(s);assert.ok(Vote.committeeElection(s,true).ok);assert.equal(s.staffWork.committeeMember,s.democracy.committee[0].elected.includes('teacher'));const [a,b]=s.students.map(st=>st.guardianKey);assert.ok(Vote.volunteer(s,'학부모회',a,5,520,540).ok);assert.ok(Vote.volunteer(s,'등하굣길 안전 봉사',a,5,530,550).error);assert.ok(Vote.volunteer(s,'학부모회',b,5,520,540).ok);const id=s.democracy.volunteers[0].id;assert.ok(Vote.replaceVolunteer(s,id,b).error);assert.ok(Vote.replaceVolunteer(s,id,'missing').error);assert.equal(s.democracy.volunteers[0].status,'예정');assert.ok(Vote.replaceVolunteer(s,id,'school').ok);assert.equal(s.democracy.volunteers[0].studentPenalty,0);check(s);
});

test('assessment consumes actual minutes, excludes absentees and freezes evidence after confirmation',()=>{
 const s=ready();const lesson=Object.entries(s.academic.schoolPlan.days).flatMap(([day,rows])=>rows.map(r=>({...r,day:+day}))).find(r=>r.day>0&&r.subject==='국어');s.day=lesson.day;s.minute=lesson.start;M.takeAttendance(s,{s0:'질병결석'});const r=Detail.assess(s,'국어','unit',10,['s0','s1'],rationale);assert.ok(r.ok);assert.equal(s.minute,lesson.start+10);assert.ok(Detail.finalize(s,r.id).error);assert.ok(Detail.editAssessment(s,r.id,{s0:{level:'잘함',evidence:rationale},s1:{level:'잘함',evidence:rationale}}).error);assert.ok(Detail.editAssessment(s,r.id,{s0:{level:'미실시',evidence:''},s1:{level:'잘함',evidence:rationale}}).ok);assert.ok(Detail.finalize(s,r.id).ok);assert.equal(s.students[0].records[0].level,'미실시');assert.equal(s.students[1].records[0].minutes,10);assert.ok(Detail.editAssessment(s,r.id,{}).error);check(s);
});

test('specialist assessment requires next-school-day teacher handoff and low grades never get a specialist owner',()=>{
 const s=ready(4);afternoon(s);s.students.forEach(st=>st.after='늘봄');const subject=Object.values(s.academic.schoolPlan.days).flat().find(r=>r.specialist).subject;const r=Detail.assess(s,subject,'performance',10,['s0'],rationale);assert.ok(r.ok);const a=s.schoolReview.assessments[0];assert.equal(a.owner,'specialist');Detail.editAssessment(s,r.id,{s0:{level:'보통',evidence:rationale}});assert.ok(Detail.finalize(s,r.id).ok);assert.equal(a.status,'review');assert.ok(Detail.finalize(s,r.id).error);s.day=a.readyDay;assert.ok(Detail.finalize(s,r.id).ok);check(s);
 const low=afternoon(ready(1));low.students[0].after='늘봄';assert.ok(Detail.assess(low,'국어','unit',10,['s0'],rationale).ok);assert.equal(low.schoolReview.assessments[0].owner,'teacher');check(low);
});

test('all 20 skills have usable preparation areas, bounded time savings and a real energy tradeoff',()=>{
 assert.equal(Object.keys(Detail.SKILL_EFFECTS).length,20);for(const [skill,[area]]of Object.entries(Detail.SKILL_EFFECTS)){const s=afternoon(ready());s.teacher.skills=[{name:skill,level:5}];s.career.activeSkills=[skill];const energy=s.teacher.energy;assert.ok(Detail.prepare(s,area,rationale).ok,skill);assert.equal(s.minute,925);assert.ok(s.teacher.energy<energy-4);assert.ok(Detail.prepare(s,area,rationale).error);check(s);}
});

test('future closure removes planned hours, cancels reservations and can be reversed without invented actual hours',()=>{
 const s=ready(),day=7;P.upsert(s,{id:'extra-meeting',title:'학년 자료 협의',day,start:940,end:960,type:'meeting',room:'research',response:'참석'});const before=A.hourReport(s).reduce((n,r)=>n+r.planned,0);assert.ok(Detail.closure(s,day,'학교가 결정한 시설 점검 휴업').ok);assert.equal(A.schoolDay(s,day),false);assert.ok(A.hourReport(s).reduce((n,r)=>n+r.planned,0)<before);assert.equal(s.lessonResults.length,0);assert.equal(s.teacherPlanner.entries[0].status,'취소');assert.ok(Detail.undoClosure(s,day).ok);assert.equal(A.schoolDay(s,day),true);assert.equal(s.teacherPlanner.entries[0].status,'취소');check(s);
});

test('closure keeps ten same-weekday tutoring sessions within the semester and preserves separate funds',()=>{
 const s=ready();s.students[0].scores.국어=s.students[0].scores.수학=30;G.diagnose(s);assert.ok(G.planTutoring(s,['s0'],2).ok);const p=s.schoolLife.tutoring,day=p.days[1];const balance=p.balance;assert.ok(Detail.closure(s,day,'학교 시설 점검에 따른 임시 휴업').ok);assert.equal(p.days.length,10);assert.ok(!p.days.includes(day));assert.ok(p.days.every(d=>d%5===2&&A.schoolDay(s,d)&&A.info(s,d).term===1));assert.equal(p.balance,balance);check(s);
});

test('original books have librarian, fictional author and student creation records that spend actual time',()=>{
 const s=afternoon(ready());for(const mode of ['librarian','author','create'])assert.ok(Detail.workshop(s,'umbrella',mode,rationale).ok);assert.equal(s.minute,945);assert.equal(s.schoolReview.workshops.length,3);assert.ok(s.schoolReview.workshops.every(w=>w.reply));check(s);
});

test('new design uses distinct rigs with blink, conversation, writing and eight-direction-compatible walking',()=>{
 const s=ready(),scene={getState:()=>s,world:new THREE.Group(),targets:[],mat:c=>new THREE.MeshBasicMaterial({color:c})};
 function mesh(geometry,c,x,y,z,parent){const m=new THREE.Mesh(geometry,scene.mat(c));m.position.set(x,y,z);parent.add(m);return m;}
 scene.sphere=(r,c,x,y,z,p,sx=1,sy=1,sz=1)=>{const m=mesh(new THREE.SphereGeometry(r,8,6),c,x,y,z,p);m.scale.set(sx,sy,sz);return m;};scene.roundedBox=(w,h,d,c,x,y,z,p)=>mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,p);scene.cylinder=(a,b,h,c,x,y,z,p)=>mesh(new THREE.CylinderGeometry(a,b,h,8),c,x,y,z,p);
 const a=createCharacter(scene,s.students[0]);assert.equal(a.group.userData.designVersion,2);assert.equal(a.arms.length,2);assert.equal(a.eyes.length,2);assert.notDeepEqual(appearance(s.students[0],s),appearance(s.students[1],s));const before=appearance(s.students[0],s);s.students[0].tags=['支援'];assert.deepEqual(appearance(s.students[0],s),before);
 a.seated=true;animateCharacter(a,1000,s,{subject:'수학'});assert.equal(a.group.userData.activity,'writing');animateCharacter(a,1500,s,{subject:'수학'},true);assert.equal(a.group.userData.activity,'talking');a.walking=true;animateCharacter(a,2000,s,{});assert.equal(a.group.userData.activity,'walking');assert.ok(new THREE.Box3().setFromObject(a.group).max.y<1.5);
 const ys=new Set();for(let t=0;t<10000;t+=30){animateCharacter(a,t,s,{});ys.add(a.eyes[0].scale.y);}assert.ok(ys.has(.12)&&ys.has(1));
});

test('twenty annual transitions preserve transferred identities, early notes, relationship edges and annual growth limits',()=>{
 const s=ready(1);afternoon(s);const incoming=People.transferIn(s,'유은결','남');assert.ok(incoming.ok);const student=s.students.find(st=>st.id===incoming.id),key=student.personKey;M.addNote(s,student.id,'전입 첫날 함께 확인한 준비 순서');People.edge(s,s.students[0].personKey,key,2,'새 친구와 책장을 살펴봄');const stamp=s.notes[student.id][0].created;
 for(let i=0;i<20;i++){s.day=s.academic.end;s.minute=1000;s.ended=true;Career.options(s,{gradeMode:'direct',jobMode:'direct'});assert.ok(Career.propose(s,s.career.schoolId,s.config.grade===6?1:s.config.grade+1,'행정').ok);Career.accept(s);assert.ok(Career.startNext(s).ok);B.initialize(s);A.acknowledge(s);A.begin(s);check(s);assert.ok(s.teacher.skills.reduce((n,x)=>n+x.level,0)<=14);}
 assert.equal(s.career.archives.length,20);assert.equal(s.community.people[key].notes[0].created,stamp);assert.ok(Object.values(s.community.edges).some(e=>e.a===key||e.b===key));assert.ok(JSON.stringify(s).length<5000000);
});

test('save validation rejects forged guardian, portrait, belongings and assessment records',()=>{
 const s=ready();for(const mutate of [x=>x.students[0].portrait.sheet='https://bad.example/img',x=>x.community.guardians[x.students[0].guardianKey].permissions[x.students[0].personKey].records='true',x=>x.community.belongings[x.students[0].personKey][0].owner='unknown',x=>x.community.followups.push({key:x.students[0].personKey,title:'test',day:-1,status:'예정'})]){const c=structuredClone(s);mutate(c);assert.equal(M.validateSave(c),false);}check(s);
});
