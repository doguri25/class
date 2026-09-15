import test from 'node:test';import assert from 'node:assert/strict';
import * as M from '../dist/model.js';import * as C from '../dist/civics.js';
const reload=s=>{const r=M.migrateSave(JSON.parse(JSON.stringify(s)));assert.ok(r);return r;};

test('instant travel includes only attending students, finishes once and adds a movement story',()=>{
 const s=M.newGame({count:28});s.minute=730;M.takeAttendance(s,{s1:'질병결석'});const j=M.travelTogether(s,'cafeteria','lunch');assert.ok(j);assert.equal(j.status,'arrived');assert.equal(s.room,'cafeteria');assert.equal(s.minute,734);assert.equal(j.memberIds.length,27);assert.equal(M.movementBusy(s),false);assert.ok(M.canStartGroupActivity(s,'lunch'));assert.equal(M.finishTravelImmediately(s),false);assert.equal(s.minute,734);
 const event=s.pendingEvents.find(e=>e.travelId===j.id);assert.ok(event);assert.notEqual(event.studentId,'s1');const relation=s.students.find(st=>st.id===event.studentId).relation;M.resolveEvent(s,event.id,0);assert.equal(s.minute,734,'event time is included in travel');assert.ok(s.students.find(st=>st.id===event.studentId).relation>relation);assert.equal(M.resolveEvent(s,event.id,0),null);
 M.beginGroupActivity(s,'lunch');s.groupActivity.elapsed=s.groupActivity.duration;M.completeGroupActivity(s,s.groupActivity.id);M.travelTogether(s,'classroom','return');assert.equal(s.minute,790);assert.equal(s.classLocation,'classroom');assert.equal(s.journeyHistory.length,2);reload(s);
});
test('old saves in the corridor resume at destination without repeated travel minutes',()=>{
 const s=M.newGame({count:4});s.minute=730;M.beginJourney(s,'cafeteria','lunch');M.completeJourneyStage(s,s.journey.id,0,s.journey.memberIds);assert.equal(s.minute,731);const loaded=reload(s);assert.equal(loaded.minute,734);assert.equal(loaded.room,'cafeteria');const again=reload(loaded);assert.equal(again.minute,734);assert.equal(again.journeyHistory.length,1);
});
test('travel stories vary and remain read across saves and repeated trips',()=>{
 let s=M.newGame({count:4});const lines=new Set();for(let day=0;day<4;day++){s.day=day;s.minute=730;s.classLocation=s.room='classroom';s.journey=null;M.travelTogether(s,'cafeteria','lunch');const e=s.pendingEvents.find(e=>e.travelId===s.journey.id);assert.ok(e);assert.equal(lines.has(e.line),false);lines.add(e.line);M.resolveEvent(s,e.id,1);s=reload(s);}assert.equal(Object.keys(s.travelSeen).length,4);
});
test('election follows nomination, equal campaigning, vote, stable result and pledge practice',()=>{
 let s=M.newGame({count:28});M.takeAttendance(s,{s3:'질병결석'});assert.ok(C.announce(s).ok);assert.equal(C.announce(s).error.length>0,true);assert.ok(C.prepare(s).ok);const c=C.data(s).election.candidates[0];assert.ok(C.askCandidate(s,c.id).answer);assert.equal(C.askCandidate(s,c.id),false);assert.ok(C.campaign(s,'poster').ok);s=reload(s);assert.ok(C.vote(s).ok);const e=C.data(s).election;assert.equal(e.result.voters,27);assert.equal(e.result.counts.reduce((n,c)=>n+c.votes,e.result.abstain),27);const result=structuredClone(e.result);assert.ok(C.vote(s).error);assert.deepEqual(C.data(reload(s)).election.result,result);assert.equal(s.students[3].memories.length,0);
 const id=e.pledges[0].id;assert.ok(C.enact(s,id).ok);s.minute=580;assert.ok(C.enact(s,id).ok);assert.ok(C.enact(s,id).error);assert.equal(e.pledges[0].steps.every(Boolean),true);reload(s);
});
test('zero or one candidate and empty classrooms have explicit paths',()=>{
 const none=M.newGame({count:4});C.announce(none);for(const c of C.data(none).election.candidates)C.withdraw(none,c.id);C.prepare(none);assert.equal(C.data(none).election.result.method,'무후보 · 공동 자치');assert.equal(C.data(none).election.pledges.length,1);reload(none);
 const one=M.newGame({count:4});C.announce(one);for(const c of C.data(one).election.candidates.slice(1))C.withdraw(one,c.id);C.prepare(one);C.campaign(one,'speech');C.vote(one);assert.equal(C.data(one).election.result.counts.length,1);reload(one);
 const absent=M.newGame({count:4});M.takeAttendance(absent,Object.fromEntries(absent.students.map(s=>[s.id,'질병결석'])));assert.ok(C.announce(absent).error);assert.equal(M.travelTogether(absent,'playground','play'),false);
});
test('school activities do not cross into the next class or use protected traits to choose votes',()=>{
 const s=M.newGame({count:20});s.minute=539;assert.ok(C.announce(s).error);s.minute=540;assert.ok(C.announce(s).error);s.minute=520;C.announce(s);C.prepare(s);C.campaign(s,'poster');const other=structuredClone(s);other.students.forEach(st=>{st.gender=st.gender==='남'?'여':'남';st.relation=100;st.tag='다른 배경';st.scores['국어']=100;});C.vote(s);C.vote(other);assert.deepEqual(C.data(s).election.result,C.data(other).election.result);const bad=structuredClone(s);bad.civics.election.result.counts[0].votes=999;assert.equal(M.validateSave(bad),false);const missing=structuredClone(s);missing.civics.election.result=null;assert.equal(M.validateSave(missing),false);const departed=M.newGame({count:4});departed.minute=990;departed.students.forEach(st=>st.after='하교');assert.ok(C.announce(departed).error);
});
