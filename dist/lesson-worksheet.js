import * as M from './model.js';
import * as Support from './student-support.js';
import {lessonCard} from './lesson-content.js';
export function current(s){const slot=M.currentSlot(s),card=lessonCard(s,slot),id=`worksheet-${s.academic?.year||2030}-${s.day}-${slot.period}`;return {slot,card,id,row:(s.lessonWorksheets||[]).find(r=>r.id===id)};}
export function issue(s){const {slot,card,id,row}=current(s);if(!card||slot.kind!=='lesson'||s.teacherDuty?.away||s.staffWork?.away||M.done(s,'lesson'+slot.period)||s.minute+5>slot.end||!s.attendanceConfirmed[s.day])return {error:'출결 확인 후 담임 수업 시간 안에 질문지를 나누어 주세요. 5분이 필요합니다.'};if(row)return {error:'이번 차시 질문지를 이미 나누었습니다.'};
 const participantIds=s.students.filter(st=>M.isPresent(s,st.id)&&(!s.support||Support.available(s,st.id))).map(st=>st.id);if(!participantIds.length)return {error:'질문지를 받을 학생이 없습니다.'};
 (s.lessonWorksheets??=[]).push({id,day:s.day,period:slot.period,grade:s.config.grade,subject:slot.subject,cardId:card.id,participantIds,issued:M.stamp(s),answer:null});M.advance(s,5);M.log(s,slot.subject+' 질문지 · '+card.title+' · '+participantIds.length+'명에게 제시');return {ok:true};
}
export function answer(s,index){const {card,row,slot}=current(s);if(!row||row.answer!==null||!card||slot.kind!=='lesson'||s.teacherDuty?.away||s.staffWork?.away||![0,1,2].includes(index))return {error:'수업 중 제시한 질문의 응답을 한 번만 기록할 수 있어요.'};row.answer=index;row.feedback=card.options[index]===card.answer?'근거를 확인하고 친구에게 설명하기':'다른 생각을 비교한 뒤 '+card.answer+'의 근거 다시 확인';row.answered=M.stamp(s);return {ok:true,feedback:row.feedback};}
export function valid(s){return s.lessonWorksheets==null||Array.isArray(s.lessonWorksheets)&&new Set(s.lessonWorksheets.map(r=>r.id)).size===s.lessonWorksheets.length&&s.lessonWorksheets.every(r=>Number.isInteger(r.day)&&r.day>=0&&Number.isInteger(r.period)&&r.period>=1&&r.period<=6&&typeof r.cardId==='string'&&Array.isArray(r.participantIds)&&(r.answer===null||[0,1,2].includes(r.answer)));}
