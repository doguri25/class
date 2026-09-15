import * as M from './model.js';

export const VAULT_KEY='classroom-days-save-vault-v1';
const blank=()=>({schema:1,sequence:0,auto:[],manual:[null,null,null],quarantine:null});
export function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
export function inspectPayload(payload,expected){
 try{if(typeof payload!=='string'||payload.length>25e6||expected&&checksum(payload)!==expected)return {valid:false,error:'저장 내용 확인에 실패했습니다.'};const raw=JSON.parse(payload);if(!M.validateSave(raw))return {valid:false,error:'지원하지 않거나 손상된 게임 기록입니다.'};const state=M.migrateSave(raw);if(!state||!M.validateSave(state))return {valid:false,error:'현재 버전으로 변환할 수 없는 기록입니다.'};return {valid:true,state,meta:{version:raw.version||'이전 버전',schema:raw.schema,year:state.academic?.year||2030,day:state.day,minute:state.minute,name:state.config.teacherName,grade:state.config.grade,count:state.students.length,school:state.career?.schoolId||state.config.region,budget:state.budget,notes:Object.values(state.notes).reduce((n,rows)=>n+(Array.isArray(rows)?rows.length:0),0),lessons:state.lessonResults.length}};}catch{return {valid:false,error:'저장 파일을 읽을 수 없습니다.'};}
}
function validBank(b){return b?.schema===1&&Number.isSafeInteger(b.sequence)&&b.sequence>=0&&Array.isArray(b.auto)&&b.auto.length<=3&&Array.isArray(b.manual)&&b.manual.length===3;}
function inspectRecord(record){return record&&typeof record.id==='string'&&typeof record.digest==='string'?inspectPayload(record.payload,record.digest):{valid:false,error:'비어 있거나 손상된 저장 칸입니다.'};}

export function createSaveVault(storage){
 function read(){try{const raw=storage.getItem(VAULT_KEY),legacy=storage.getItem(M.SAVE_KEY);if(!raw)return {bank:blank(),exists:false,raw,legacy};try{const bank=JSON.parse(raw);return validBank(bank)?{bank,exists:true,raw,legacy}:{bank:blank(),exists:true,corrupt:true,raw,legacy};}catch{return {bank:blank(),exists:true,corrupt:true,raw,legacy};}}catch{return {bank:blank(),blocked:true,error:'이 브라우저에서 저장 공간에 접근할 수 없습니다.'};}}
 function slots(){const source=read(),rows=[];source.bank.auto.forEach((record,i)=>rows.push({id:'auto:'+i,title:'자동 저장 '+(i+1),record,...inspectRecord(record)}));source.bank.manual.forEach((record,i)=>rows.push({id:'manual:'+i,title:'수동 저장 '+(i+1),record,empty:record==null,...inspectRecord(record)}));if((!source.exists||source.corrupt||!inspectRecord(source.bank.auto[0]).valid)&&source.legacy)rows.push({id:'legacy',title:'이전 버전의 마지막 저장',record:{payload:source.legacy},...inspectPayload(source.legacy)});return {source,rows};}
 function boot(){const source=read();if(source.blocked)return {status:'unavailable',error:source.error};if(!source.exists){if(!source.legacy)return {status:'new'};const last=inspectPayload(source.legacy);return last.valid?{status:'ready',state:last.state}:{status:'recovery',error:last.error};}const last=inspectRecord(source.bank.auto[0]);return !source.corrupt&&last.valid?{status:'ready',state:last.state}:{status:'recovery',error:'마지막 저장을 확인하지 못했습니다. 다른 기록을 미리 본 뒤 복구해 주세요.'};}
 function candidate(id){const row=slots().rows.find(r=>r.id===id);return row?.valid?row:{valid:false,error:row?.error||'저장 칸을 찾을 수 없습니다.'};}
 function write(state,{manual=null,label='',forceCheckpoint=false,allowRecovery=false}={}){
  const source=read();if(source.blocked)return {error:source.error};if(manual!==null&&(!Number.isInteger(manual)||manual<0||manual>2))return {error:'수동 저장 칸을 선택해 주세요.'};
  const broken=source.corrupt||source.exists&&!inspectRecord(source.bank.auto[0]).valid||!source.exists&&!!source.legacy&&!inspectPayload(source.legacy).valid;
  if(broken&&!allowRecovery)return {error:'자동 저장을 멈췄습니다. 저장·복구에서 정상 기록을 먼저 선택해 주세요.',recovery:true};
  let copy,payload;try{copy=JSON.parse(JSON.stringify(state));copy.savedAt=M.stamp(copy);payload=JSON.stringify(copy);}catch{return {error:'현재 기록을 저장 파일로 만들 수 없습니다.'};}
  if(!M.validateSave(copy))return {error:'현재 기록 검사에 실패해 이전 저장을 유지했습니다.'};
  const bank=source.bank,sequence=bank.sequence+1,checkpoint=[copy.config.seed,copy.config.teacherName,copy.academic?.year||2030,copy.day,Math.floor(copy.minute/10),copy.academic?.phase||''].join(':'),record={id:'save-'+sequence,label:String(label||'').slice(0,60),created:new Date().toISOString(),checkpoint,payload,digest:checksum(payload)};
  const auto=!forceCheckpoint&&bank.auto[0]?.checkpoint===checkpoint?[record,...bank.auto.slice(1)]:[record,...bank.auto].slice(0,3),next={...bank,sequence,auto,manual:[...bank.manual]};
  if(!source.exists&&source.legacy&&inspectPayload(source.legacy).valid&&auto.length<3&&source.legacy!==payload)next.auto.push({id:'legacy-before-vault',label:'이전 버전 기록',payload:source.legacy,digest:checksum(source.legacy),created:record.created,checkpoint:'legacy'});
  if(manual!==null)next.manual[manual]={...record,id:'manual-'+manual+'-'+sequence,label:record.label||'수동 저장 '+(manual+1)};
  if(broken&&allowRecovery&&!next.quarantine)next.quarantine={saved:new Date().toISOString(),vault:source.raw,legacy:source.legacy};
  try{storage.setItem(VAULT_KEY,JSON.stringify(next));}catch{return {error:'저장 공간이 부족하거나 차단되었습니다. 이전 저장은 유지됩니다. 현재 기록을 파일로 내려받아 주세요.'};}
  // The vault is the atomic source of truth. Keep the legacy key as a compatible mirror.
  let mirrored=true;try{storage.setItem(M.SAVE_KEY,payload);}catch{mirrored=false;}
  return {ok:true,state:copy,record,mirrored};
 }
 function restore(id){const row=candidate(id);if(!row.valid)return {error:row.error};return write(row.state,{forceCheckpoint:true,allowRecovery:true,label:'복구 · '+row.title});}
 function importSave(payload){const row=inspectPayload(payload);return row.valid?write(row.state,{forceCheckpoint:true,allowRecovery:true,label:'가져온 저장 파일'}):{error:row.error};}
 function rawBackup(){const source=read();return JSON.stringify({format:'classroom-save-recovery-originals',vault:source.raw||null,legacy:source.legacy||null,quarantine:source.bank.quarantine||null},null,2);}
 return {read,slots,boot,candidate,write,restore,importSave,rawBackup};
}
