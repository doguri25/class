export const EMOJIS=[['🙂','미소'],['👋','인사'],['👍','좋아요'],['👏','박수'],['🤔','생각 중'],['📚','책'],['🎨','미술'],['🌱','새싹']];
const already=/\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const serious=/아프|아파|다쳤|다쳐|다친|무서|불안|괴롭|폭력|따돌|병원|상처|사고|알레르|알러|안전|비밀|울었|울고|힘들|싫어/;
const moods=[[/고마|감사|기뻐|기뻤|좋았|즐거웠/,'🙂'],[/안녕|좋은 아침|인사/,'👋'],[/책|독서|도서관|읽었/,'📚'],[/그림|색칠|미술|그렸/,'🎨'],[/싹|화분|식물|씨앗/,'🌱'],[/노래|악기|음악|리듬/,'🎵'],[/공놀이|축구|운동장|체육/,'⚽'],[/급식|반찬|점심|맛있/,'🍚'],[/궁금|어떻게|왜 |모르겠|생각해/,'🤔']];
// Presentation only: preserve stored lines and repeat-question identity.
export function studentLine(text){const value=String(text??'');if(already.test(value)||serious.test(value))return value;const mood=moods.find(([pattern])=>pattern.test(value));return mood?value+' '+mood[1]:value;}
export function insertEmoji(input,emoji){if(!input||!EMOJIS.some(([value])=>value===emoji))return false;const start=input.selectionStart??input.value.length,end=input.selectionEnd??start,next=input.value.slice(0,start)+emoji+input.value.slice(end);if(input.maxLength>0&&next.length>input.maxLength)return false;input.value=next;input.focus({preventScroll:true});input.setSelectionRange(start+emoji.length,start+emoji.length);input.dispatchEvent(new input.ownerDocument.defaultView.Event('input',{bubbles:true}));return true;}
