// Reading and practice guides observe actions; never complete gameplay or advance time.
export const STEPS = [
  {title:'선생님의 하루와 화면 조작',icon:'clock-3',where:'상단 시간 버튼 · 교실 오른쪽 아래',body:'08:40에 출근해 16:40까지 하루를 보냅니다. 바닥을 누르거나 방향키·조이스틱으로 이동하세요.',tip:'시간은 상단에서 일시정지하거나 ×2로 바꿉니다. 오른쪽 아래 + / −로 확대하며, 대화와 메뉴를 열면 시간이 멈춥니다.',labels:['시간 일시정지','×2 가속','화면 확대·축소']},
  {title:'학교교육과정부터 확인해요',icon:'book-open',where:'학교교육과정 → 학급업무 → 학급교육과정',body:'학교가 제시한 목표·시수·행사를 읽고 문서 아래의 확인 버튼을 누릅니다. 이어서 학급교육과정을 3월 안에 세워 주세요.',tip:'안내를 읽는 것과 실제 확인·제출은 별개입니다. 준비가 되면 문서 아래의 첫 등교일 시작을 누르세요.',labels:['학교 문서 확인','학급 계획 작성','첫 등교일']},
  {title:'출결과 아침활동',icon:'clipboard-check',where:'하단 출결 확인 · 아침활동 버튼',body:'학생의 출결과 건강 상태를 확인하고 아침 독서·대화 등 활동을 고릅니다. 신청한 학생의 아침 우유도 챙깁니다.',tip:'결석계와 체험학습 신청은 학생 지원 화면에서 따로 확인합니다. 첫날 입학·개학 행사는 행사 진행 버튼으로 시작해요.',labels:['출결부','아침활동','서류 확인']},
  {title:'과목에 맞게 수업하기',icon:'pencil-ruler',where:'하단 수업하기 · 시간표 · 학교지도',body:'09:00부터 40분씩 수업합니다. 과목에 맞는 방법과 준비물을 골라 진행해야 진도와 실제 시수에 남습니다.',tip:'급식·체육은 해당 장소로 함께 이동합니다. 다음 일정으로 건너뛰어도 수업은 자동 완료되지 않아요. 전담시간에는 담임 업무를 할 수 있습니다.',labels:['수업 방법','준비물','실제 진도']},
  {title:'학생이 먼저 말을 걸어요',icon:'messages-square',where:'학생 말풍선 · 명렬표 · 인물 메모',body:'학생의 작은 부탁도 들어 주세요. 대화에 따라 서로의 신뢰와 기억이 달라지며 한 번 답장한 문장은 비활성화됩니다.',tip:'나중에 누른 이야기는 명렬표의 기다리는 이야기에서 다시 봅니다. 개인 메모에는 작성 날짜가 붙고 다음 해에도 남습니다.',labels:['이야기 듣기','나중에 확인','날짜 있는 메모']},
  {title:'수업 뒤의 업무와 학교톡',icon:'monitor',where:'교사 PC · 학급업무 · 행정업무',body:'교사 PC에서 공문·명렬표·메모·학교톡을 엽니다. 회의 연락은 내 일정에 자동으로 기록되어 참석 시간을 확인할 수 있습니다.',tip:'학급 준비물은 학생당 60,000원입니다. 기초학력지도 예산은 별도이며, 공용 보조도구는 반납 상태를 확인하고 점검이 끝난 뒤 재대여하세요.',labels:['학교톡','개인 일정','예산·보조도구']},
  {title:'저장하고 다음 날로',icon:'calendar-check',where:'퇴근하기 · 설정 · 인사·경력',body:'퇴근 뒤 하루 기록을 보고 다음 날 출근합니다. 학년도 마지막 근무일에는 배정 제안·수락·인계를 거쳐 새 학년으로 이어집니다.',tip:'기기 안에 자동 저장합니다. 다른 기기로 옮길 때는 설정에서 저장 파일을 내려받으세요. 이 안내는 설정에서 언제든 다시 볼 수 있습니다.',labels:['자동 저장','저장 파일','다음 학년도']}
];
export function valid(s){const t=s.tutorial;if(t==null)return true;if(t.schema!==1||!['active','skipped','completed'].includes(t.status)||!Number.isInteger(t.step)||t.step<0||t.step>=STEPS.length)return false;const p=t.practice;return p==null||(['active','skipped','completed'].includes(p.status)&&typeof p.collapsed==='boolean'&&p.checks!=null&&typeof p.checks==='object'&&!Array.isArray(p.checks)&&Object.entries(p.checks).every(([key,value])=>PRACTICE.some(t=>t.id===key)&&typeof value==='boolean'));}
export function active(s){return valid(s)&&s.tutorial?.status==='active';}
export function start(s){s.tutorial={schema:1,status:'active',step:0};return s.tutorial;}
export function move(s,direction){if(!active(s)||![-1,1].includes(direction))return false;s.tutorial.step=Math.max(0,Math.min(STEPS.length-1,s.tutorial.step+direction));return true;}
export function finish(s,skipped=false){if(!active(s))return false;s.tutorial.status=skipped?'skipped':'completed';if(skipped&&s.tutorial.practice)s.tutorial.practice.status='skipped';if(!skipped)startPractice(s);return true;}

export const PRACTICE=[
 {id:'school',title:'학교교육과정 확인',action:'beta-school',hint:'학교 문서를 읽고 확인하세요. 학급교육과정은 3월 안에 세웁니다.'},
 {id:'attendance',title:'학생 출결 확인',action:'attendance',hint:'첫 등교 후 출결을 확인하고 저장하세요. 안내를 보는 것만으로 출결이 바뀌지는 않아요.'},
 {id:'lesson',title:'첫 수업 진행',action:'primary',hint:'09:00부터 과목에 맞는 방법을 고르고 학생 질문에 응답하세요. 행사일에는 먼저 행사를 진행합니다.'},
 {id:'roles',title:'1인 1역 정하기',action:'roles',hint:'역할표를 저장하세요. 아침·쉬는 시간에 연습하고 하교 전에 역할에 맞게 정리합니다.'},
 {id:'messenger',title:'학교톡 확인',action:'messenger',hint:'학교톡에서 회의 연락을 읽으세요. 참석 연락은 내 일정에 자동으로 남습니다.'},
 {id:'work',title:'수업 뒤 업무 처리',action:'duty-work',hint:'수업 후 또는 전담시간에 업무를 골라 10~30분 동안 처리하세요.'},
 {id:'clean',title:'교실 정리 상태 확인',action:'care-open',hint:'수업 후 교실의 남은 정리 항목을 확인하고 마무리 청소하세요. 깨끗하면 확인만 하면 됩니다.'},
 {id:'finish',title:'퇴근과 다음 날',action:'end-shift',hint:'16:40에 하루를 마감합니다. 일찍 나가려면 근무·휴가에서 조퇴를 신청하세요.'}
];
export function startPractice(s){s.tutorial??={schema:1,status:'completed',step:0};s.tutorial.practice={status:'active',checks:{},collapsed:false};syncPractice(s);}
export function syncPractice(s){const p=s.tutorial?.practice;if(!p||p.status!=='active')return p;
 const checks={school:!!s.academic?.acknowledged,attendance:Object.keys(s.attendanceConfirmed||{}).length>0,lesson:s.lessonResults.length>0,roles:Object.keys(s.completed).some(k=>k.endsWith(':roles')),messenger:s.readChannels.length>0,work:(s.teacherDuty?.work.length||0)>0,clean:(s.classroomCare?.history.some(r=>r.kind==='teacher')||p.checks.clean),finish:s.summaries.length>0};
 for(const [key,value] of Object.entries(checks))if(value)p.checks[key]=true;
 if(PRACTICE.every(t=>p.checks[t.id]))p.status='completed';return p;
}
export function currentPractice(s){const p=syncPractice(s);return p?.status==='active'?PRACTICE.find(t=>!p.checks[t.id]):null;}
