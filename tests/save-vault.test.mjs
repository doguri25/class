import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';
import {createSaveVault,VAULT_KEY,inspectPayload} from '../dist/save-vault.js';
const memory=()=>{const items=new Map();return {items,getItem:k=>items.get(k)||null,setItem(k,v){if(this.blocked)throw Error('QuotaExceededError');items.set(k,v);}};};
test('three automatic checkpoints and three manual classrooms keep dates, notes and emoji through reload',()=>{
 const storage=memory(),vault=createSaveVault(storage),s=M.newGame({count:4,teacherName:'민서'});assert.equal(vault.boot().status,'new');
 for(let i=0;i<5;i++){s.minute=520+i*10;assert.ok(vault.write(s).ok);}
 assert.deepEqual(vault.slots().rows.filter(r=>r.id.startsWith('auto:')).map(r=>r.meta.minute),[560,550,540]);
 s.notes.teacher=[{date:'3월 4일 09:20',text:'김서준과 책 이야기 📚'}];
 for(let i=0;i<3;i++)assert.ok(vault.write(s,{manual:i,label:'수업 준비 '+i}).ok);
 const before=vault.slots().rows.filter(r=>r.id.startsWith('manual:')).map(r=>r.record.payload);s.budget-=100;vault.write(s);
 assert.deepEqual(vault.slots().rows.filter(r=>r.id.startsWith('manual:')).map(r=>r.record.payload),before);
 assert.equal(createSaveVault(storage).boot().state.notes.teacher[0].text,'김서준과 책 이야기 📚');
});
test('legacy saves migrate without renaming their storage key and remain a checkpoint',()=>{
 const storage=memory(),s=M.newGame({count:4});storage.setItem(M.SAVE_KEY,JSON.stringify(s));const vault=createSaveVault(storage);assert.equal(vault.boot().status,'ready');s.minute=580;assert.ok(vault.write(s).ok);assert.equal(vault.candidate('auto:1').meta.minute,520);assert.equal(JSON.parse(storage.getItem(M.SAVE_KEY)).minute,580);
});
test('corrupt latest saves pause automatic writes, offer previews and preserve original bytes on recovery',()=>{
 const storage=memory(),vault=createSaveVault(storage),s=M.newGame({count:4});vault.write(s);s.minute=560;vault.write(s);const bad=JSON.parse(storage.getItem(VAULT_KEY));bad.auto[0].payload='damaged';storage.setItem(VAULT_KEY,JSON.stringify(bad));const original=storage.getItem(VAULT_KEY);
 assert.equal(vault.boot().status,'recovery');assert.equal(vault.candidate('auto:0').valid,false);assert.equal(vault.candidate('auto:1').meta.minute,520);assert.equal(storage.getItem(VAULT_KEY),original);assert.ok(vault.write(s).error);assert.equal(storage.getItem(VAULT_KEY),original);
 const recovered=vault.restore('auto:1');assert.ok(recovered.ok);assert.equal(recovered.state.minute,520);assert.equal(vault.read().bank.quarantine.vault,original);assert.equal(vault.boot().status,'ready');
});
test('quota failure and invalid imports leave all prior stored values unchanged',()=>{
 const storage=memory(),vault=createSaveVault(storage),s=M.newGame({count:4});vault.write(s);const bank=storage.getItem(VAULT_KEY),legacy=storage.getItem(M.SAVE_KEY);storage.blocked=true;s.minute=580;assert.ok(vault.write(s,{manual:0}).error);assert.equal(storage.getItem(VAULT_KEY),bank);assert.equal(storage.getItem(M.SAVE_KEY),legacy);assert.ok(vault.importSave('{broken').error);assert.equal(storage.getItem(VAULT_KEY),bank);assert.equal(inspectPayload(JSON.stringify({...s,budget:-1})).valid,false);
});
test('a successful atomic vault write remains readable when only the compatibility mirror fails',()=>{
 const storage=memory(),original=storage.setItem;storage.setItem=function(k,v){if(k===M.SAVE_KEY)throw Error('mirror unavailable');original.call(this,k,v);};const vault=createSaveVault(storage),s=M.newGame({count:4});assert.equal(vault.write(s).mirrored,false);assert.equal(vault.boot().state.config.grade,s.config.grade);
});
