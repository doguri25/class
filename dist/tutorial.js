// A reading guide only: never completes lessons, acknowledges plans or advances time.
export const STEPS = [
  {title:'선생님의 하루와 화면 조작',icon:'clock-3',where:'상단 시간 버튼 · 교실 오른쪽 아래',body:'08:40에 출근해 16:40까지 하루를 보냅니다. 바닥을 누르거나 방향키·조이스틱으로 이동하세요.',tip:'시간은 상단에서 일시정지하거나 ×2로 바꿉니다. 오른쪽 아래 + / −로 확대하며, 대화와 메뉴를 열면 시간이 멈춥니다.',labels:['시간 일시정지','×2 가속','화면 확대·축소']},
  {title:'학교교육과정부터 확인해요',icon:'book-open',where:'학교교육과정 → 학급업무 → 학급교육과정',body:'학교가 제시한 목표·시수·행사를 읽고 문서 아래의 확인 버튼을 누릅니다. 이어서 학급교육과정을 3월 안에 세워 주세요.',tip:'안내를 읽는 것과 실제 확인·제출은 별개입니다. 준비가 되면 문서 아래의 첫 등교일 시작을 누르세요.',labels:['학교 문서 확인','학급 계획 작성','첫 등교일']},
  {title:'출결과 아침활동',icon:'clipboard-check',where:'하단 출결 확인 · 아침활동 버튼',body:'학생의 출결과 건강 상태를 확인하고 아침 독서·대화 등 활동을 고릅니다. 신청한 학생의 아침 우유도 챙깁니다.',tip:'결석계와 체험학습 신청은 학생 지원 화면에서 따로 확인합니다. 첫날 입학·개학 행사는 행사 진행 버튼으로 시작해요.',labels:['출결부','아침활동','서류 확인']},
  {title:'과목에 맞게 수업하기',icon:'pencil-ruler',where:'하단 수업하기 · 시간표 · 학교지도',body:'09:00부터 40분씩 수업합니다. 과목에 맞는 방법과 준비물을 골라 진행해야 진도와 실제 시수에 남습니다.',tip:'급식·체육은 해당 장소로 함께 이동합니다. 다음 일정으로 건너뛰어도 수업은 자동 완료되지 않아요. 전담시간에는 담임 업무를 할 수 있습니다.',labels:['수업 방법','준비물','실제 진도']},
  {title:'학생이 먼저 말을 걸어요',icon:'messages-square',where:'학생 말풍선 · 명렬표 · 인물 메모',body:'학생의 작은 부탁도 들어 주세요. 대화에 따라 서로의 신뢰와 기억이 달라지며 한 번 답장한 문장은 비활성화됩니다.',tip:'나중에 누른 이야기는 명렬표의 기다리는 이야기에서 다시 봅니다. 개인 메모에는 작성 날짜가 붙고 다음 해에도 남습니다.',labels:['이야기 듣기','나중에 확인','날짜 있는 메모']},
  {title:'수업 뒤의 업무와 학교톡',icon:'monitor',where:'교사 PC · 학급업무 · 행정업무',body:'교사 PC에서 공문·명렬표·메모·학교톡을 엽니다. 회의 연락은 내 일정에 자동으로 기록되어 참석 시간을 확인할 수 있습니다.',tip:'학급 준비물은 학생당 60,000원입니다. 기초학력지도 예산은 별도이며, 공용 보조도구는 반납 상태를 확인하고 점검이 끝난 뒤 재대여하세요.',labels:['학교톡','개인 일정','예산·보조도구']},
  {title:'저장하고 다음 날로',icon:'calendar-check',where:'퇴근하기 · 설정 · 인사·경력',body:'퇴근 뒤 하루 기록을 보고 다음 날 출근합니다. 학년도 마지막 근무일에는 배정 제안·수락·인계를 거쳐 새 학년으로 이어집니다.',tip:'기기 안에 자동 저장합니다. 다른 기기로 옮길 때는 설정에서 저장 파일을 내려받으세요. 이 안내는 설정에서 언제든 다시 볼 수 있습니다.',labels:['자동 저장','저장 파일','다음 학년도']}
];
export function valid(s){const t=s.tutorial;return t==null||(t.schema===1&&['active','skipped','completed'].includes(t.status)&&Number.isInteger(t.step)&&t.step>=0&&t.step<STEPS.length);}
export function active(s){return valid(s)&&s.tutorial?.status==='active';}
export function start(s){s.tutorial={schema:1,status:'active',step:0};return s.tutorial;}
export function move(s,direction){if(!active(s)||![-1,1].includes(direction))return false;s.tutorial.step=Math.max(0,Math.min(STEPS.length-1,s.tutorial.step+direction));return true;}
export function finish(s,skipped=false){if(!active(s))return false;s.tutorial.status=skipped?'skipped':'completed';return true;}
