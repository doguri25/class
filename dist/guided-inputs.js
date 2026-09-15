// Choice-first gameplay inputs. Values still pass through the original form handlers.
const groups={
 goal:['서로의 설명을 끝까지 듣고 배운 것을 자기 말로 표현하기','작은 목표를 정해 시도하고 어려운 부분은 도움 요청하기','친구와 역할을 나누고 각자의 참여 방법을 존중하기'],
 support:['말·글·그림 중 편한 표현 방법을 선택하도록 안내하기','핵심 설명을 짧게 나누고 가까운 자료와 짝 도움 제공하기','잠깐 쉬는 방법과 다시 참여하는 순서를 학생과 정하기'],
 method:['개인 생각 정리 → 짝 이야기 → 모둠 공유 → 한 줄 돌아보기','교사의 짧은 시범 → 학생의 직접 시도 → 다른 방법 비교','그림·자료 관찰 → 궁금한 점 고르기 → 근거를 들어 설명하기'],
 materials:['연필·지우개·공책과 교실의 공용 자료 활용','색연필·풀·색종이·도화지를 활동에 필요한 만큼 준비','태블릿을 모둠별로 나누고 종이 자료도 함께 준비'],
 plan:['필요한 자료 확인 → 동료와 역할·일정 협의 → 활동 후 개선점 기록','학생의 희망 확인 → 준비물·공간 점검 → 참여 방법 안내','현재 기록 검토 → 우선순위 선택 → 실행 날짜와 후속 확인 정하기'],
 topic:['학교생활과 학습 습관','친구 관계와 모둠 참여','등교·귀가와 준비물 챙기기'],
 question:['현재 확인된 내용과 추가로 필요한 자료를 나누어 알려 주세요.','학생이 고를 수 있는 참여 방법을 함께 의논하고 싶습니다.','수업과 약속이 겹치지 않는 다음 확인 시간을 정할까요?'],
 reason:['학교 행사와 일정이 겹쳐 담당자와 변경을 협의합니다.','공간·기자재 점검을 위해 대체 장소와 일정을 확인합니다.','학생의 참여 방법을 보완하고 보호자 안내를 다시 확인합니다.'],
 repair:['흔들림을 확인해 사용을 멈추고 학교의 대체 물품을 요청합니다.','작동하지 않아 사용을 중지하고 종이 자료로 수업을 준비합니다.','여닫힘이 불편해 사용을 멈추고 임시 보관 장소를 마련합니다.'],
 consent:['교내 독서 활동과 작품 공유','학교 안 발표·체험 활동 참여','행사 후 귀가 방법 확인'],
 title:['다음 주 학습준비물 안내','학급 활동과 참여 방법 안내','학생 귀가·일정 확인 안내'],
 notice:['다음 주 준비물은 연필·지우개·공책입니다. 교실 공용 자료도 함께 활용합니다. 준비가 어려우면 개별로 알려 주세요.','우리 반은 말·글·그림으로 생각을 표현하는 활동을 합니다. 학생이 편한 참여 방법을 고를 수 있도록 안내하겠습니다.','학생의 하교 후 일정이나 귀가 방법이 바뀌면 담당자에게 미리 알려 주세요. 확인되지 않은 변경은 기존 인계 방법을 유지합니다.'],
 handover:['현재 출결·학습 자료를 담당자와 대조하고 확인되지 않은 부분은 별도로 남깁니다.','학생의 기존 기록과 사용 중인 자료를 확인하여 필요한 범위만 담당자에게 인계합니다.','보호자 연락·동의 범위를 확인한 뒤 다음 담당자와 후속 확인 시간을 협의합니다.'],
 request:['확인할 자료와 담당 범위를 함께 정하고 싶습니다.','학생의 참여 방법과 수업 대안을 함께 검토하고 싶습니다.','다음 일정의 겹침과 인계 방법을 확인하고 싶습니다.']
};
const privateFields=/^(teacher-name|person-note|edit-person-note|pc-note-|pc-file-|bc-search|cx-parent-name|cx-arrival-name|cx-out-school)/;
export function suggestionsFor(id,state,root=null){
 if(privateFields.test(id))return null;
 if(/^(record-text|cx-evidence-|bs-observation|be-feedback|counsel-note|br-reason|bf-evidence|bv-reason)/.test(id)){
  const studentId=root?.querySelector('#record-student')?.value||id.replace('cx-evidence-',''),student=state.students.find(s=>s.id===studentId);
  const records=student?[...(student.records||[]).filter(r=>r.day===state.day),...(student.memories||[]).filter(r=>r.date?.includes(state.academic.year+'')||r.day===state.day)]:[];
  return {title:'실제 기록에서 선택 · 해당 근거가 있을 때만 사용',items:[...new Set(records.map(r=>r.text).filter(Boolean))].slice(0,3),evidence:true};
 }
 if(id==='message-text'||id.startsWith('cx-message-'))return {items:groups.question};
 if(id==='notice-title')return {items:groups.title};if(id==='notice-body')return {items:groups.notice};
 if(id==='bm-item')return {items:['학생 의자','사물함 문','전자칠판','교실 조명']};
 if(id==='bw-trip-title')return {items:['교육지원청 수업 나눔','학교 교육과정 협의','교내외 학생 활동 지원 협의']};
 if(id==='plan-title')return {items:['다음 수업 자료 준비','동료교사와 학생 참여 방법 협의','학급 기록과 준비물 점검']};
 if(/clue/.test(id))return {items:['학생이 이름표와 마지막 사용 장소를 함께 확인했습니다.','학생이 물건의 색과 표시를 설명하고 본인 물건임을 확인했습니다.','학생과 보관 기록을 대조하여 주인을 확인했습니다.'],title:'실제 확인한 내용만 선택'};
 if(/aid-note|bm-detail/.test(id))return {items:groups.repair};
 if(/out-note|bf-detail|bf-revised|form-detail/.test(id))return {items:groups.handover};
 if(/consent/.test(id))return {items:groups.consent};
 if(/goal|bw-project$/.test(id))return {items:groups.goal};
 if(/support/.test(id))return {items:groups.support};
 if(/method|prep-detail/.test(id))return {items:groups.method};
 if(/materials/.test(id))return {items:groups.materials};
 if(/creative/.test(id))return {items:['서로의 강점과 도움 요청 방법 알아보기','학급의 생활 약속 만들고 돌아보기','우리 주변의 일을 알아보고 관심 분야 표현하기']};
 if(/topic/.test(id))return {items:groups.topic};
 if(/reason|closure/.test(id))return {items:groups.reason};
 if(/steps|meeting-note|bw-opinion|pc-reply/.test(id))return {items:groups.plan};
 if(/follow|report|activity|workshop|audit|evidence|note|bt-text|bv-text/.test(id))return {items:groups.request,title:'기록에 맞는 내용 선택 · 관찰 사실은 기타로 구체화'};
 if(/proposal|bu-/.test(id))return {items:['쉬는 시간 공용 물품을 쉽게 찾는 보관 방법 만들기','발표·기록·자료 역할을 번갈아 맡는 방법 의논하기','함께 사용하는 공간의 안내를 글과 그림으로 바꾸기']};
 return null;
}
export function enhance(root,state){
 for(const input of root.querySelectorAll('textarea[id],input[id]:not([type]),input[type="text"][id]')){
  if(input.readOnly||input.disabled||input.closest('.guided-input')||privateFields.test(input.id))continue;
  const config=suggestionsFor(input.id,state,root);if(!config)continue;
  const document=root.ownerDocument,wrap=document.createElement('span'),select=document.createElement('select'),hint=document.createElement('small');wrap.className='guided-input';wrap.setAttribute('role','group');
  select.id=input.id+'-choices';select.className='guided-choice';select.dataset.for=input.id;
  const label=root.querySelector('label[for="'+input.id+'"]');select.setAttribute('aria-label',(label?.textContent.trim()||input.getAttribute('aria-label')||input.placeholder||'내용')+' 보기 선택');
  const add=(value,text,disabled=false)=>{const o=document.createElement('option');o.value=value;o.textContent=text;o.disabled=disabled;select.append(o);};
  add('','보기를 선택해 주세요',true);config.items.forEach((t,i)=>add(String(i),t));add('other','기타 · 직접 입력');
  const original=input.value,matched=config.items.indexOf(original);select.value=original?(matched>=0?String(matched):'other'):'';
  input.before(wrap);wrap.append(select,input,hint);hint.textContent=config.title||'보기에 없으면 마지막 항목 ‘기타’를 선택하세요.';
  let custom=matched<0?original:'';
  const visibility=()=>{input.hidden=select.value!=='other';if(label)label.htmlFor=input.hidden?select.id:input.id;hint.hidden=select.value==='other';};visibility();
  select.addEventListener('change',()=>{const other=select.value==='other';if(other){input.value=custom;}else{if(!input.hidden)custom=input.value;input.value=config.items[Number(select.value)]||'';}visibility();input.dispatchEvent(new document.defaultView.Event('input',{bubbles:true}));input.dispatchEvent(new document.defaultView.Event('change',{bubbles:true}));if(other)input.focus({preventScroll:true});});
  input.addEventListener('input',()=>{if(!input.hidden)custom=input.value;});
 }
}
