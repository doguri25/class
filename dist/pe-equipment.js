import * as M from './model.js';
export const MAX_TOOLS=3;
export const EQUIPMENT={
 ball:{name:'말랑 공',icon:'circle',desc:'굴리기 · 짝과 주고받기',activity:'공을 굴려 짝에게 전달하고, 받을 준비가 되었는지 서로 확인해요.',rooms:['gym','playground']},
 cones:{name:'표시 고깔',icon:'triangle',desc:'활동 구역 · 지그재그 길',activity:'고깔로 나눈 길을 따라 움직이고, 앞 친구와 간격을 조절해요.',rooms:['gym','playground']},
 hoops:{name:'후프',icon:'circle-dashed',desc:'목표 지점 · 협동 공간',activity:'후프를 바닥에 놓아 목표 지점을 만들고 모둠별 이동 방법을 정해요.',rooms:['gym','playground']},
 beanbags:{name:'콩 주머니',icon:'package',desc:'표적 넣기 · 균형 놀이',activity:'가까운 표적부터 콩 주머니를 보내고 거리를 스스로 선택해요.',rooms:['gym','playground']},
 rope:{name:'줄넘기',icon:'waves',desc:'리듬 맞추기 · 개인 도전',activity:'서로 충분히 떨어져 줄의 리듬에 맞춰 각자의 속도로 연습해요.',rooms:['gym','playground']},
 mats:{name:'활동 매트',icon:'rectangle-horizontal',desc:'실내 스트레칭 · 균형',activity:'매트에서 몸을 천천히 펴고 편안한 균형 자세를 찾아요.',rooms:['gym']},
 baton:{name:'이어달리기 바통',icon:'minus',desc:'전달 연습 · 협동 달리기',activity:'뛰기 전에 바통을 건네는 신호와 순서를 짝과 먼저 맞춰요.',rooms:['gym','playground']},
 cloth:{name:'협동 천',icon:'flag',desc:'함께 들기 · 파도 만들기',activity:'협동 천을 함께 잡고 친구의 신호에 맞춰 천천히 파도를 만들어요.',rooms:['gym','playground']}
};
export const defaults=()=>({gym:[],playground:[]});
export const selected=(s,room=s.room)=>(s.peEquipment?.[room]||[]).filter(id=>EQUIPMENT[id]?.rooms.includes(room));
export const names=ids=>ids.map(id=>EQUIPMENT[id]?.name).filter(Boolean).join(' · ');
function record(s,room,items,action){(s.equipmentHistory??=[]).unshift({date:M.stamp(s),day:s.day,room,items:[...items],action});s.equipmentHistory=s.equipmentHistory.slice(0,100);}
export function canChange(s){return ['gym','playground'].includes(s.room)&&M.allowedRoom(s,s.room)&&!M.movementBusy(s)&&s.sportsDay?.stage!=='running';}
export function toggle(s,id){if(!canChange(s))return {error:'도구는 체육관·운동장에 도착한 뒤, 활동을 시작하기 전에 선택해 주세요.'};if(!EQUIPMENT[id]?.rooms.includes(s.room))return {error:'이 장소에서는 사용할 수 없는 도구입니다.'};s.peEquipment??=defaults();const ids=s.peEquipment[s.room]??=[];const index=ids.indexOf(id);if(index>=0){ids.splice(index,1);record(s,s.room,[id],'반납');return {ok:true};}if(ids.length>=MAX_TOOLS)return {error:'한 번에 3종류까지 사용할 수 있어요. 먼저 도구 하나를 반납해 주세요.'};ids.push(id);record(s,s.room,[id],'대여');return {ok:true};}
export function returnAll(s,room=s.room){const ids=selected(s,room);if(!ids.length)return false;record(s,room,ids,'반납');s.peEquipment[room]=[];return true;}
const validItems=(ids,room)=>Array.isArray(ids)&&ids.length<=MAX_TOOLS&&new Set(ids).size===ids.length&&ids.every(id=>EQUIPMENT[id]?.rooms.includes(room));
export function valid(s){
 if(s.peEquipment!==undefined){if(!s.peEquipment||typeof s.peEquipment!=='object')return false;for(const room of ['gym','playground'])if(!validItems(s.peEquipment[room],room))return false;}
 if(s.groupActivity?.equipment!==undefined&&!validItems(s.groupActivity.equipment,s.groupActivity.room))return false;
 if((s.lessonResults||[]).some(r=>r.equipment!==undefined&&!validItems(r.equipment,r.room)))return false;
 return s.equipmentHistory===undefined||Array.isArray(s.equipmentHistory)&&s.equipmentHistory.length<=100&&s.equipmentHistory.every(e=>e&&typeof e.date==='string'&&['gym','playground'].includes(e.room)&&['대여','반납'].includes(e.action)&&validItems(e.items,e.room));
}
