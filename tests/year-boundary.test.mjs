import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';
import * as A from '../dist/academic-year.js';
import * as B from '../dist/beta-ui.js';
import * as C from '../dist/career.js';
function game(year=2030){const s=M.newGame({grade:3,count:8});s.day=A.bounds(year).start;B.initialize(s,true);A.acknowledge(s);A.begin(s);return s;}
test('February 27 premature closed saves recover without losing records and reach February 28',()=>{
 const s=game();s.day=A.dayIndex('2031-02-27');s.minute=1000;M.addNote(s,'s0','학년 말에도 보존할 관찰 기록');const note=structuredClone(s.notes.s0);s.ended=true;s.academic.phase='closed';
 const restored=M.migrateSave(JSON.parse(JSON.stringify(s)));B.sync(restored);assert.equal(restored.ended,false);assert.equal(restored.academic.phase,'term');assert.equal(A.closeYear(restored),false);assert.equal(M.nextDay(restored),true);assert.match(M.dateLabel(restored),/2월 28일/);assert.equal(restored.minute,520);assert.deepEqual(restored.notes.s0,note);assert.equal(M.validateSave(restored),true);
});
test('when February 27 is the final weekday, closing leads to next-year assignment and preserved memories',()=>{
 const s=game(2031);s.day=A.dayIndex('2032-02-27');s.minute=1000;assert.equal(s.day,s.academic.end);M.addNote(s,'s0','다음 학년까지 이어지는 메모');const created=s.notes.s0[0].created;assert.equal(M.nextDay(s),false);assert.equal(s.ended,true);C.options(s,{gradeMode:'direct',jobMode:'direct'});assert.ok(C.propose(s,s.career.schoolId,4,'교무').ok);assert.ok(C.accept(s).ok);assert.ok(C.startNext(s).ok);B.initialize(s);assert.equal(s.academic.year,2032);assert.equal(s.academic.phase,'preparation');assert.equal(s.ended,false);assert.equal(s.notes.s0[0].created,created);assert.equal(s.career.archives.length,1);assert.equal(M.validateSave(s),true);
});
test('year closing refuses all earlier dates and can be reopened without duplicating archives',()=>{
 for(const year of [2030,2031,2035]){const s=game(year);s.day=s.academic.end-1;s.minute=1000;assert.equal(A.closeYear(s),false);assert.equal(M.nextDay(s),true);assert.equal(s.day,s.academic.end);assert.equal(s.ended,false);assert.equal(A.closeYear(s),true);assert.equal(A.closeYear(s),true);B.sync(s);assert.equal(s.ended,true);assert.equal(s.career.archives.length,0);assert.equal(M.validateSave(s),true);}
});
