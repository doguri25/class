import {staffInfo} from './staff-catalog.js';
// Original illustrated atlases. Saved cells stay attached to a person after roster changes.
export const TEACHER_PORTRAITS=Array.from({length:8},(_,i)=>({id:i,gender:i<4?'여':'남',age:['20대','30대','40대','50대'][i%4],sheet:'teachers',cell:i}));
const STAFF={colleague:8,principal:9,admin:10,librarian:11,neulbom:12,specialist:13,nurse:14,headteacher:15};
export const SHEETS=['teachers','parents-women','parents-men','students-boys','students-girls','students-boys-v2','students-girls-v2','staff-support'];
export const validPortrait=p=>p&&SHEETS.includes(p.sheet)&&Number.isInteger(p.cell)&&p.cell>=0&&p.cell<(p.sheet==='staff-support'?6:16);
export function teacherPortraitIndex(config){const selected=Number(config.portrait);return Number.isInteger(selected)&&selected>=0&&selected<8?selected:(config.gender==='남'?4:0)+Math.max(0,['20대','30대','40대','50대'].indexOf(config.age));}
export function portraitFor(state,id){
 if(staffInfo(id))return {sheet:'staff-support',cell:staffInfo(id).cell};
 if(id==='counselor')return {sheet:'parents-women',cell:14};
 if(id==='teacher')return {sheet:'teachers',cell:teacherPortraitIndex(state.config)};
 if(Object.hasOwn(STAFF,id))return {sheet:'teachers',cell:STAFF[id]};
 const s=state.students.find(s=>s.id===id||s.parentId===id);
 if(!s){const g=state.community?.guardians?.[id];return validPortrait(g?.portrait)?g.portrait:null;}
 const n=state.students.indexOf(s);
 if(id===s.parentId){const g=state.community?.guardians?.[s.guardianKey];return validPortrait(g?.portrait)?g.portrait:{sheet:n%2?'parents-men':'parents-women',cell:Math.floor(n/2)};}
 if(validPortrait(s.portrait))return s.portrait;
 const sameGender=state.students.filter(p=>p.gender===s.gender);return {sheet:s.gender==='남'?'students-boys-v2':'students-girls-v2',cell:sameGender.findIndex(p=>p.id===s.id)};
}
export function portraitStyle(p){if(!validPortrait(p))return '';if(p.sheet==='staff-support')return `background-image:url('./assets/portraits/staff-support.png');background-size:300% 200%;background-position:${p.cell%3*50}% ${Math.floor(p.cell/3)*100}%`;return `background-image:url('./assets/portraits/${p.sheet}.png');background-position:${p.cell%4/3*100}% ${Math.floor(p.cell/4)/3*100}%`;}
export function portraitKey(state,id){const p=portraitFor(state,id);return p?`${p.sheet}:${p.cell}`:null;}
