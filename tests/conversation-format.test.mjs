import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as M from '../dist/model.js';
import {segments} from '../dist/rich-text.js';
import {studentLine} from '../dist/conversation-style.js';
test('conversation formatting identifies dates, times, new staff, pupils and additional guardians without altering text',()=>{
 const s=M.newGame({count:4,teacherName:'도구리'});s.community={guardians:{one:{name:'이새봄 보호자'}}};const text=s.students[0].name+' · 오가은 · 이새봄 보호자 · 도구리: 2030년 3월 4일 월요일 09:00, 2030-03-05 오후 2시 30분. 책 1/2권 📚';const parts=segments(text,s);assert.equal(parts.map(p=>p.text).join(''),text);for(const name of [s.students[0].name,'오가은','이새봄 보호자','도구리'])assert.ok(parts.some(p=>p.kind==='person'&&p.text===name),name);assert.equal(parts.filter(p=>p.kind==='date').length,2);assert.equal(parts.filter(p=>p.kind==='time').length,2);assert.ok(parts.some(p=>p.kind==='plain'&&p.text.includes('1/2')));
});
test('student emoji presentation is context-based, stable and does not multiply or decorate health concerns',()=>{
 const line='오늘 책을 끝까지 읽었어요.';assert.equal(studentLine(line),line+' 📚');assert.equal(studentLine(studentLine(line)),studentLine(line));assert.equal(studentLine('선생님 고마워요! 🙂'),'선생님 고마워요! 🙂');assert.equal(studentLine('운동장에서 넘어져 다쳤어요.'),'운동장에서 넘어져 다쳤어요.');assert.equal(studentLine('친구와 노래를 불렀어요.'),'친구와 노래를 불렀어요. 🎵');
});
test('GitHub Pages entry opens the game under the project path and retains query/hash',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];let next;vm.runInNewContext(script,{URL,location:{href:'https://doguri25.github.io/class/?source=pages#continue',search:'?source=pages',hash:'#continue',replace:value=>next=value}});assert.equal(next,'https://doguri25.github.io/class/dist/?source=pages#continue');assert.ok(html.includes('http-equiv="refresh"'));assert.ok(fs.existsSync(new URL('../.nojekyll',import.meta.url)));const game=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.ok(game.includes('今天')===false);assert.match(game,/<title>오늘 우리 교실은/);for(const match of game.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g))assert.ok(fs.existsSync(new URL('../dist/'+match[1],import.meta.url)),match[1]);
});
