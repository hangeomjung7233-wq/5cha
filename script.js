'use strict';
/* =====================================================================
   쑥쑥이 복약 도우미 (서버 없이 동작 / 데이터는 localStorage)
   ===================================================================== */

/* ---------- 시연용 설정 상수 (여기만 고치면 됩니다) ---------- */
const SIDE_MS   = 10 * 1000;   // 복용 기록 후 부작용 알림까지의 시간. 시연 10초 → 실제 30분은 30*60*1000
const REMIND_MS = 10 * 1000;   // "식사 후 30분 뒤에 다시 알려주기" 대기 시간. 시연 10초 → 실제 30분은 30*60*1000
const USER_NAME = '홍길동';     // 1번 홈·6번 챗봇·보호자/의료진 화면이 모두 같은 이름을 사용
const USER_AGE  = 72;

const SLOT_TIME  = { '아침': '08:00', '점심': '12:00', '저녁': '18:00', '잠자기 전': '22:00' };
const SLOT_ORDER = ['아침', '점심', '저녁', '잠자기 전'];
const STAGES = ['seed', 'sprout', 'bud', 'flower'];
const STAGE_NAME  = { seed: '씨앗', sprout: '새싹', bud: '꽃봉오리', flower: '꽃' };
const STAGE_EMOJI = { seed: '🌰', sprout: '🌱', bud: '🌷', flower: '🌸' };
const STAGE_DAYS  = [0, 7, 14, 21];           // 단계별 누적 복약 O 일수
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const SIDE_TEXT = '약을 복용하신지 30분이 지났습니다. 불편하신 점이 있으신가요?';
const SYMS = [['어지러움', '💫'], ['졸림', '😴'], ['두통', '🤕'], ['속쓰림', '🔥'], ['메스꺼움', '🤢'],
  ['발진이나 가려움', '🔴'], ['호흡곤란', '😮‍💨'], ['심한 복통', '😣'], ['없음', '🙂']];
const FACES = [
  ['😄', '증상이 없어요'], ['🙂', '조금 불편해요'], ['😐', '보통으로 불편해요'], ['😣', '많이 불편해요'], ['😫', '매우 심하게 불편해요']
];

/* ---------- 참고용 샘플 데이터 ----------
   ※ 실제 서비스에서는 식약처 의약품 API / 약학정보원(KPIC) API, 병원 검색 API를 서버에서 호출해
      아래 DB 대신 사용해야 합니다(API 키·CORS 때문에 서버 없는 HTML만으로는 호출할 수 없음). */
const DRUG_DB = [
  { name: '타이레놀정', strength: '500mg', ingredient: '아세트아미노펜', form: '정제(알약)',
    efficacy: '열을 내리고, 두통·치통·근육통 같은 통증을 줄여 줘요.',
    how: '필요할 때 물과 함께 드세요. 먹는 사이에 4시간 이상 간격을 두세요.',
    caution: '정해진 하루 양을 넘기지 마세요. 간이 안 좋거나 술을 자주 드시면 의사와 먼저 상의하세요.',
    side: '드물게 발진, 메스꺼움이 있을 수 있어요.' },
  { name: '암로디핀정', strength: '5mg', ingredient: '암로디핀베실산염', form: '정제(알약)',
    efficacy: '혈압을 낮춰 주고 가슴 통증을 줄여 줘요.',
    how: '매일 같은 시간에 드세요. 식사와 상관없이 드실 수 있어요.',
    caution: '갑자기 끊지 마세요. 어지러울 수 있으니 천천히 일어나세요.',
    side: '발목이 붓거나, 두통, 얼굴이 화끈거림, 어지러움이 있을 수 있어요.' },
  { name: '메트포르민정', strength: '500mg', ingredient: '메트포르민염산염', form: '정제(알약)',
    efficacy: '혈당을 낮춰 줘요. (제2형 당뇨병)',
    how: '식사 중이나 식사 직후에 드세요.',
    caution: '심한 구토·설사가 있으면 의사에게 알리세요. 조영제 검사 전에는 의사와 상의하세요.',
    side: '메스꺼움, 설사, 속 불편함이 있을 수 있어요.' },
  { name: '아토르바스타틴정', strength: '10mg', ingredient: '아토르바스타틴칼슘', form: '정제(알약)',
    efficacy: '혈액 속 나쁜 콜레스테롤을 낮춰 줘요.',
    how: '하루 한 번 같은 시간에 드세요.',
    caution: '이유 없는 근육통이나 힘 빠짐이 있으면 병원에 알리세요. 자몽주스를 많이 드시지 마세요.',
    side: '근육통, 소화불량, 두통이 있을 수 있어요.' },
  { name: '오메프라졸캡슐', strength: '20mg', ingredient: '오메프라졸', form: '캡슐',
    efficacy: '위산을 줄여 위염·위궤양·역류성 식도염을 도와줘요.',
    how: '아침 식사 30분 전에 물과 함께 삼키세요. 캡슐은 씹지 마세요.',
    caution: '오래 드실 때는 의사와 상의하세요.',
    side: '두통, 설사, 복통이 있을 수 있어요.' },
  { name: '셀레콕시브캡슐', strength: '200mg', ingredient: '셀레콕시브', form: '캡슐',
    efficacy: '관절염의 통증과 염증을 줄여 줘요.',
    how: '식사 후에 물과 함께 드세요.',
    caution: '심장·혈압·위장 질환이 있으면 먼저 의사와 상의하세요.',
    side: '속쓰림, 복통, 붓기가 있을 수 있어요.' },
  { name: '모사프리드정', strength: '5mg', ingredient: '모사프리드시트르산염', form: '정제(알약)',
    efficacy: '위장의 움직임을 도와 더부룩함과 속쓰림을 줄여 줘요.',
    how: '정해진 시간에 식사 전후로 드세요.',
    caution: '증상이 좋아지면 오래 드시지 말고 의사와 상의하세요.',
    side: '설사, 입마름, 복통이 있을 수 있어요.' },
  { name: '아스피린장용정', strength: '100mg', ingredient: '아스피린', form: '장용정(알약)',
    efficacy: '피가 굳어 혈관이 막히는 것을 막아 줘요.',
    how: '식후에 물과 함께 삼키세요. 씹거나 부수지 마세요.',
    caution: '멍이 잘 들거나 피가 나면 알리세요. 수술·치과 시술 전에는 꼭 말씀하세요.',
    side: '속쓰림, 멍이 잘 드는 증상이 있을 수 있어요.' }
];

/* 시연용 처방전 인식 결과 (실제로는 OCR 결과가 들어갑니다) */
const SAMPLE_RX = [
  [ { raw: '타이레놀정500mg', dose: 1, times: 3, days: 3, how: '식후 30분' },
    { raw: '암로디핀정5mg', dose: 1, times: 1, days: 30, how: '아침 식후' },
    { raw: '오메프라졸캡슐20mg', dose: 1, times: 1, days: 14, how: '식전 30분' } ],
  [ { raw: '메트포르민정500mg', dose: 1, times: 2, days: 30, how: '식사 직후' },
    { raw: '아토르바스타틴정10mg', dose: 1, times: 1, days: 30, how: '저녁 식후' } ],
  [ { raw: '셀레콕시브캡슐200mg', dose: 1, times: 2, days: 7, how: '식후 30분' },
    { raw: '모사프리드정5mg', dose: 1, times: 3, days: 7, how: '식전' },
    { raw: '아토르바스타틴정1Omg', dose: 1, times: 1, days: 30, how: '저녁 식후' } ]
];

const HOSPITAL_DB = [
  { name: '행복내과의원', dept: '내과', addr: '전북 전주시 완산구 중앙로 112', tel: '063-111-0101' },
  { name: '푸른정형외과', dept: '정형외과', addr: '전북 전주시 덕진구 기린대로 245', tel: '063-111-0202' },
  { name: '연두안과의원', dept: '안과', addr: '전북 전주시 완산구 효자로 77', tel: '063-111-0303' },
  { name: '사랑가정의학과', dept: '가정의학과', addr: '전북 전주시 덕진구 백제대로 530', tel: '063-111-0404' },
  { name: '온누리이비인후과', dept: '이비인후과', addr: '전북 전주시 완산구 서신로 33', tel: '063-111-0505' },
  { name: '튼튼심장내과', dept: '순환기내과', addr: '전북 전주시 덕진구 송천중앙로 18', tel: '063-111-0606' },
  { name: '해맑은피부과', dept: '피부과', addr: '전북 전주시 완산구 홍산로 90', tel: '063-111-0707' },
  { name: '전주중앙병원', dept: '종합병원', addr: '전북 전주시 완산구 전주천동로 300', tel: '063-111-0808' },
  { name: '하늘치과의원', dept: '치과', addr: '전북 전주시 덕진구 건산로 61', tel: '063-111-0909' }
];

/* =====================================================================
   저장소 (localStorage는 항상 try/catch)
   ===================================================================== */
const KEY = 'ssuk_state_v2', CKEY = 'ssuk_chat_v2';
const memStore = {};
function lsGet(k) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : (memStore[k] || null); }
  catch (e) { return memStore[k] || null; }
}
function lsSet(k, v) {
  memStore[k] = v;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가여도 정상 동작 */ }
}
function lsDel(k) { delete memStore[k]; try { localStorage.removeItem(k); } catch (e) {} }

/* ---------- 날짜 도우미 ---------- */
const pad = n => String(n).padStart(2, '0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dstr(new Date());
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); };
const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const fmtMD = s => { const d = parseD(s); return `${d.getMonth() + 1}월 ${d.getDate()}일(${WD[d.getDay()]})`; };
const fmtSlash = s => { const d = parseD(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fmtTimeKo = t => { const [h, m] = t.split(':').map(Number); return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(m)}`; };
const fmtNum = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* =====================================================================
   상태
   ===================================================================== */
function defaultState() {
  return {
    startDate: todayStr(),   // 복약등록 당일(오늘)부터 1일째
    meds: [], hospitals: [], appts: [], guardians: [],
    records: {},             // { "2026-10-01": { "아침": true, "점심": false } }
    peak: 'seed',            // 식물은 퇴행하지 않음
    sideAlerts: [],          // 복용 기록 후 예약되는 부작용 알림
    medShown: {},            // { 날짜: { 시간대: true } }  하루 한 번만
    reminders: [],           // "식사 후 다시 알려주기"
    asked: {},               // 챗봇에서 이미 물어본 시간대
    apptShown: {},
    scores: [], guardianAlerts: [], doctorAlerts: [],
    seq: 1
  };
}
let S = Object.assign(defaultState(), lsGet(KEY) || {});
let chat = Object.assign({ msgs: [], greeted: false, seq: 1 }, lsGet(CKEY) || {});
const save = () => lsSet(KEY, S);
const saveChat = () => lsSet(CKEY, chat);

const ui = {
  screen: 'home', viewPeriod: null,
  calY: 0, calM: 0, apptY: 0, apptM: 0,
  drugView: 'input', rxItems: [], rxPhoto: '',
  hosp: { q: '', sel: null },
  care: { form: false, rel: '', name: '', phone: '' },
  side: { score: null, done: false },
  medId: null, apptDraft: null
};
let draft = { name: '', photo: '' };
const newForm = () => ({ dose: null, times: null, timesVal: '', slots: [], customOn: false, customTime: '', days: null, daysVal: '' });
const forms = { main: newForm(), edit: newForm() };

/* =====================================================================
   계산 (모든 숫자는 기록에서 계산)
   ===================================================================== */
const slotTime = s => SLOT_TIME[s] || s;
const slotMin = s => { const [h, m] = slotTime(s).split(':').map(Number); return h * 60 + m; };
const slotWord = s => /^\d/.test(s) ? `${s} 약` : (['아침', '점심', '저녁'].includes(s) ? `${s}약` : `${s} 약`);
const recordOf = (d, s) => (S.records[d] || {})[s];

function daySlots() {
  if (!S.meds.length) return ['아침'];            // 등록된 약이 없으면 하루 1번
  const set = new Set();
  S.meds.forEach(m => m.slots.forEach(s => set.add(s)));
  return [...set].sort((a, b) => slotMin(a) - slotMin(b));
}
function dayStatus(d) {
  if (d < S.startDate) return null;
  const slots = daySlots(), r = S.records[d] || {};
  if (slots.some(s => r[s] === false)) return 'X';
  if (slots.every(s => r[s] === true)) return 'O';
  if (d < todayStr()) return 'X';
  return null;
}
const periodOf = d => Math.floor(diffDays(S.startDate, d) / 7) + 1;
const periodDates = p => Array.from({ length: 7 }, (_, i) => addDays(S.startDate, (p - 1) * 7 + i));
function periodStats(p) {
  let o = 0, x = 0, rec = false;
  const dates = periodDates(p);
  dates.forEach(d => {
    const st = dayStatus(d);
    if (st === 'O') o++;
    if (st === 'X') x++;
    if (S.records[d] && Object.keys(S.records[d]).length) rec = true;
  });
  return { o, x, rec, dates };
}
function currentPeriod() {
  let p = Math.max(1, periodOf(todayStr()));
  for (let i = 0; i < 60; i++) {
    if (periodStats(p).o === 7 && periodStats(p + 1).rec) p++; else break;
  }
  return p;
}
const maxPeriod = () => Math.max(5, currentPeriod());
function cumO() { let n = 0; Object.keys(S.records).forEach(d => { if (dayStatus(d) === 'O') n++; }); return n; }
const stageOf = n => n >= 21 ? 'flower' : n >= 14 ? 'bud' : n >= 7 ? 'sprout' : 'seed';
function stageNow() {
  const c = stageOf(cumO());
  return STAGES.indexOf(c) > STAGES.indexOf(S.peak) ? c : S.peak;
}
function daysToNext() {
  const idx = STAGES.indexOf(stageNow());
  if (idx >= 3) return 0;
  return Math.max(1, STAGE_DAYS[idx + 1] - cumO());
}
const medEnd = m => addDays(m.startDate, m.days - 1);
function medTaken(m) {
  let t = 0;
  Object.keys(S.records).forEach(d => {
    if (d < m.startDate || d > medEnd(m)) return;
    m.slots.forEach(s => { if (S.records[d][s] === true) t += m.dose; });
  });
  return Math.min(t, m.total);
}
const medFull = m => `${m.name}${m.strength ? ' ' + m.strength : ''}`;

/* 복약 기록 (7번 챗봇 / 11번 달력 공통). 한 번 기록한 시간대는 다시 바꿀 수 없음 */
let pendingGrowth = null;
function recordSlot(date, slot, val) {
  S.records[date] = S.records[date] || {};
  if (S.records[date][slot] !== undefined) return false;
  const before = stageNow();
  S.records[date][slot] = val;
  const c = stageOf(cumO());
  if (STAGES.indexOf(c) > STAGES.indexOf(S.peak)) S.peak = c;
  if (val === true && date === todayStr()) {
    S.sideAlerts.push({ id: S.seq++, date, slot, due: Date.now() + SIDE_MS, done: false, dismissed: false });
  }
  save();
  const after = stageNow();
  if (after !== before) pendingGrowth = { from: before, to: after, days: STAGE_DAYS[STAGES.indexOf(after)] };
  return true;
}
function showGrowthIfAny() {
  if (!pendingGrowth) return;
  const g = pendingGrowth; pendingGrowth = null;
  openModal(`<div class="growth">
    <p class="g1">🎉 ${g.days}일 복약 달성!</p>
    <p class="g2">식물이 ${STAGE_NAME[g.from]}에서 ${STAGE_NAME[g.to]} 단계로 자랐어요!</p>
    <div class="gp">${plantSVG(g.to, 200)}</div>
    <button class="btn btn-primary" data-act="close-modal">확인</button></div>`);
}

/* =====================================================================
   화분 캐릭터 (모든 화면이 이 함수 하나로 그림)
   ===================================================================== */
function plantSVG(stage, w) {
  const stem = y => `<path d="M100 92 Q95 ${Math.round((92 + y) / 2)} 100 ${y}" stroke="#5aa63a" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  const leaf = (cx, cy, rot) => `<ellipse cx="${cx}" cy="${cy}" rx="17" ry="8" transform="rotate(${rot} ${cx} ${cy})" fill="#7bc14b"/>`;
  let top = '', seed = '';
  if (stage === 'sprout') {
    top = stem(54) + leaf(84, 50, -28) + leaf(116, 50, 28);
  } else if (stage === 'bud') {
    top = stem(40) + leaf(85, 68, -26) + leaf(115, 68, 26) +
      `<path d="M100 10 C113 22 113 38 100 44 C87 38 87 22 100 10Z" fill="#f7a8c4"/>
       <path d="M100 16 C103 26 103 34 100 40" stroke="#e98bac" stroke-width="2" fill="none"/>
       <path d="M89 42 Q100 35 111 42 Q100 49 89 42Z" fill="#6bb04a"/>`;
  } else if (stage === 'flower') {
    let petals = '';
    for (let a = 0; a < 360; a += 45) petals += `<ellipse cx="100" cy="26" rx="9" ry="15" transform="rotate(${a} 100 44)" fill="#f7a8c4"/>`;
    top = stem(46) + leaf(85, 72, -26) + leaf(115, 72, 26) + petals +
      `<circle cx="100" cy="44" r="11" fill="#ffd34d" stroke="#f0b429" stroke-width="2"/>`;
  } else {
    seed = `<ellipse cx="100" cy="100" rx="24" ry="12" fill="#4e3220"/>
      <ellipse cx="100" cy="100" rx="11" ry="7" transform="rotate(-35 100 100)" fill="#a06f3c"/>
      <ellipse cx="96" cy="97" rx="3.2" ry="1.8" transform="rotate(-35 96 97)" fill="#fff" opacity=".7"/>
      <path d="M100 82 L100 93" stroke="#f5c518" stroke-width="3" stroke-dasharray="3 4" stroke-linecap="round"/>`;
  }
  return `<svg class="plant" width="${w}" viewBox="0 0 200 224" role="img" aria-label="화분 캐릭터 ${STAGE_NAME[stage]} 단계">
    ${top}
    <path d="M38 120 C46 96 72 82 100 80 C128 82 154 96 162 120 Z" fill="#7a5233"/>
    <path d="M52 108 C62 94 80 86 100 85 C120 86 138 94 148 108" stroke="#94673f" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${seed}
    <path d="M44 128 H156 L148 204 Q147 214 136 214 H64 Q53 214 52 204 Z" fill="#edaa82"/>
    <rect x="34" y="108" width="132" height="24" rx="12" fill="#f6c9a6"/>
    <rect x="46" y="112" width="108" height="5" rx="2.5" fill="#fff" opacity=".45"/>
    <ellipse cx="66" cy="170" rx="7" ry="28" transform="rotate(4 66 170)" fill="#fff" opacity=".3"/>
    <ellipse cx="80" cy="162" rx="7.5" ry="9.5" fill="#3b2a20"/><circle cx="82.5" cy="158.5" r="2.8" fill="#fff"/>
    <ellipse cx="120" cy="162" rx="7.5" ry="9.5" fill="#3b2a20"/><circle cx="122.5" cy="158.5" r="2.8" fill="#fff"/>
    <ellipse cx="65" cy="179" rx="9" ry="6" fill="#f58fa0" opacity=".65"/>
    <ellipse cx="135" cy="179" rx="9" ry="6" fill="#f58fa0" opacity=".65"/>
    <path d="M89 176 Q100 192 111 176 Z" fill="#8b2f3c"/>
    <ellipse cx="100" cy="184" rx="5.5" ry="3.6" fill="#f58fa0"/>
  </svg>`;
}

/* =====================================================================
   토스트 / 모달
   ===================================================================== */
let toastT;
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
}
function openModal(html) { const m = $('#modal'); m.innerHTML = `<div class="modal-card">${html}</div>`; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
function confirmModal(text, onYes) {
  openModal(`<h2>${esc(text)}</h2>
    <button class="btn btn-red" data-act="confirm-yes">네, 초기화할게요</button>
    <button class="btn btn-neutral" data-act="close-modal">닫기</button>`);
  confirmModal.fn = onYes;
}

/* =====================================================================
   화면 이동
   ===================================================================== */
const TABS = ['record', 'plant', 'side'];
const R = {};   // 화면별 렌더 함수
function go(name) {
  ui.screen = name; ui.viewPeriod = null; closeModal();
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 's-' + name));
  $('#s-chat').classList.toggle('chat-screen', name === 'chat');
  if (name === 'side') { ui.side = { score: null, done: false }; if (cur && cur.kind === 'side') cur = null; }
  if (name === 'drugreg') { ui.drugView = 'input'; ui.rxItems = []; draft = { name: '', photo: '' }; forms.main = newForm(); }
  if (name === 'hospital') ui.hosp = { q: '', sel: null };
  if (name === 'care') ui.care = { form: false, rel: '', name: '', phone: '' };
  if (name === 'mymeds') ui.medId = null;
  if (name === 'record') { const d = new Date(); ui.calY = d.getFullYear(); ui.calM = d.getMonth(); }
  if (name === 'appt') { const d = new Date(); ui.apptY = d.getFullYear(); ui.apptM = d.getMonth(); }
  $('#tabbar').hidden = !TABS.includes(name);
  R[name]();
  renderTabbar(); renderBelow();
  const sc = $('#s-' + name); if (sc) sc.scrollTop = 0;
  refreshBanner();
}
function refreshAll() { R[ui.screen](); renderTabbar(); renderBelow(); }

const header = (title, back = 'back-home') =>
  `<header class="top"><button class="back" data-act="${back}" aria-label="뒤로가기">←</button><h1>${title}</h1></header>`;

function renderTabbar() {
  const tb = $('#tabbar');
  const tab = (id, ic, lb) => `<button class="tab${ui.screen === id ? ' on' : ''}" data-act="tab" data-tab="${id}"><span class="ti">${ic}</span><span class="lb">${lb}</span></button>`;
  tb.innerHTML = tab('record', '📅', '복약 기록') + tab('plant', plantSVG(stageNow(), 32), '내 식물') + tab('side', '🙂', '부작용 상태');
}

/* =====================================================================
   1. 홈
   ===================================================================== */
R.home = function () {
  const t = todayStr();
  const n = S.meds.filter(m => t >= m.startDate && t <= medEnd(m)).length;
  $('#s-home').innerHTML = `
    <div class="home-head">
      <h1 class="hello">안녕하세요, ${esc(USER_NAME)}님</h1>
      <p class="hello-sub">${n ? `오늘 복용할 약 <b>${n}개</b>가 있어요` : '오늘 복용할 약이 없어요'}</p>
    </div>
    <div class="menu-grid">
      <button class="menu-card" data-act="go" data-to="drugreg"><span class="mi">💊</span>약물 등록</button>
      <button class="menu-card" data-act="go" data-to="hospital"><span class="mi">🏥</span>병원 등록</button>
    </div>
    <button class="home-plant" data-act="go" data-to="record" aria-label="복약 기록 보기">${plantSVG(stageNow(), 250)}</button>
    <div class="center"><button class="btn btn-orange" style="width:86%" data-act="go" data-to="mymeds">나의 등록된 약물 보기</button></div>
    <div class="menu-grid">
      <button class="menu-card" data-act="go" data-to="appt"><span class="mi">📅</span>다음 진료 일정</button>
      <button class="menu-card" data-act="go" data-to="care"><span class="mi">🤝</span>보호자·의료진<br>연계</button>
    </div>
    <div class="fab-wrap"><button class="fab" data-act="open-chat" aria-label="챗봇 쑥쑥이">${plantSVG('sprout', 46)}쑥쑥이</button></div>`;
};

/* =====================================================================
   2. 약물 등록  (① 처방전 촬영 → ② 약물 자동 확인 → ③ 내용 확인 → ④ 등록 완료)
   ===================================================================== */
const norm = s => String(s).replace(/\s+/g, '').replace(/[()]/g, '').toLowerCase();
function dist(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur2 = [i];
    for (let j = 1; j <= n; j++) cur2[j] = Math.min(prev[j] + 1, cur2[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur2;
  }
  return prev[n];
}
function findExact(text) {
  const t = norm(text); if (!t) return null;
  let hit = DRUG_DB.find(d => norm(d.name + d.strength) === t);
  if (hit) return hit;
  const part = DRUG_DB.filter(d => norm(d.name).startsWith(t) && t.length >= 2);
  if (part.length === 1) return part[0];
  hit = DRUG_DB.filter(d => norm(d.name) === t);
  return hit.length === 1 ? hit[0] : null;
}
function findCandidates(text) {
  const t = norm(text); if (!t) return [];
  return DRUG_DB.map(d => ({ d, s: dist(t, norm(d.name + d.strength)) }))
    .filter(x => x.s <= 4 || norm(x.d.name).includes(t.slice(0, 2)))
    .sort((a, b) => a.s - b.s).slice(0, 3).map(x => x.d);
}
const slotsForTimes = n => ({ 1: ['아침'], 2: ['아침', '저녁'], 3: ['아침', '점심', '저녁'], 4: ['아침', '점심', '저녁', '잠자기 전'] }[n] || ['아침']);

/* 입력 폼 (직접 입력용 / 수정용 공통) */
const chip = (label, on, act, key, val) =>
  `<button type="button" class="chip${on ? ' on' : ''}" data-act="${act}" data-form="${key}" data-val="${val}">${label}</button>`;
const fTimes = f => f.times === 'custom' ? (parseInt(f.timesVal) || 0) : (f.times || 0);
const fDays = f => f.days === 'custom' ? (parseInt(f.daysVal) || 0) : (f.days || 0);
const fSlots = f => { const a = f.slots.slice(); if (f.customOn && f.customTime) a.push(f.customTime); return a; };
function formHTML(key) {
  const f = forms[key];
  return `
    <div class="q"><h2>한 번에 몇 정 드세요?</h2>
      <div class="chips">${[0.5, 1, 2].map(v => chip(`${v}정`, f.dose === v, 'f-dose', key, v)).join('')}</div></div>
    <div class="q"><h2>하루에 몇 번 드세요?</h2>
      <div class="chips four">${[1, 2, 3].map(v => chip(`${v}번`, f.times === v, 'f-times', key, v)).join('')}${chip('직접 입력', f.times === 'custom', 'f-times', key, 'custom')}</div>
      ${f.times === 'custom' ? `<input class="field" type="number" min="1" max="10" inputmode="numeric" placeholder="하루 몇 번" data-in="${key}:timesVal" value="${esc(f.timesVal)}">` : ''}</div>
    <div class="q"><h2>언제 드세요?</h2>
      <div class="chips four">${SLOT_ORDER.map(s => chip(s, f.slots.includes(s), 'f-slot', key, s)).join('')}${chip('직접 입력', f.customOn, 'f-slot', key, 'custom')}</div>
      ${f.customOn ? `<input class="field" type="time" aria-label="원하는 시간" data-in="${key}:customTime" value="${esc(f.customTime)}">` : ''}</div>
    <div class="q"><h2>며칠 동안 드세요?</h2>
      <div class="chips four">${[7, 14, 30].map(v => chip(`${v}일`, f.days === v, 'f-days', key, v)).join('')}${chip('직접 입력', f.days === 'custom', 'f-days', key, 'custom')}</div>
      ${f.days === 'custom' ? `<input class="field" type="number" min="1" max="365" inputmode="numeric" placeholder="며칠" data-in="${key}:daysVal" value="${esc(f.daysVal)}">` : ''}</div>
    <p class="total" data-total="${key}"></p>`;
}
function updateTotal(key) {
  const f = forms[key], el = $(`[data-total="${key}"]`); if (!el) return;
  const t = fTimes(f), d = fDays(f);
  el.innerHTML = (f.dose && t && d)
    ? `총 ${fmtNum(f.dose * t * d)}정<small>${fmtNum(f.dose)}정 × 하루 ${t}번 × ${d}일</small>` : '';
}
function refreshForm(key) { const box = $('#formBox-' + key); if (box) { box.innerHTML = formHTML(key); updateTotal(key); } }
function trimSlots(f) {
  const t = fTimes(f); if (!t) return;
  while (fSlots(f).length > t) { if (f.slots.length) f.slots.shift(); else f.customOn = false; }
}
function validateForm(f) {
  if (!f.dose) return '한 번에 몇 정 드실지 골라 주세요';
  const t = fTimes(f); if (!t) return '하루에 몇 번 드실지 골라 주세요';
  const sl = fSlots(f);
  if (!sl.length) return '언제 드실지 골라 주세요';
  if (sl.length !== t) return `하루 ${t}번이니 시간을 ${t}개 골라 주세요`;
  if (new Set(sl).size !== sl.length) return '같은 시간이 두 번 들어갔어요';
  if (!fDays(f)) return '며칠 동안 드실지 골라 주세요';
  return '';
}
const sortSlots = arr => arr.slice().sort((a, b) => slotMin(a) - slotMin(b));
function makeMed(base, f, photo) {
  const sl = sortSlots(fSlots(f)), days = fDays(f);
  return Object.assign({
    id: S.seq++, name: '', strength: '', ingredient: '', form: '', efficacy: '', how: '', caution: '', side: '', rxHow: '',
    photo: photo || '', dose: f.dose, slots: sl, days, total: f.dose * sl.length * days,
    startDate: todayStr(), regAt: Date.now()
  }, base);
}
function addMeds(list) {
  if (!S.meds.length && !Object.keys(S.records).length) S.startDate = todayStr();
  list.forEach(m => S.meds.push(m));
  save();
}
function showDone() {
  openModal(`<div class="done-box"><div class="done-check">✔</div><p>약물 등록이 완료되었습니다</p></div>`);
  setTimeout(() => { if (!$('#modal').hidden) { closeModal(); go('home'); } }, 1300);
}
const stepBar = n => `<div class="steps">${['① 처방전 촬영', '② 약물 확인', '③ 내용 확인', '④ 등록 완료'].map((s, i) =>
  `<div class="step${i + 1 === n ? ' on' : i + 1 < n ? ' past' : ''}">${s}</div>`).join('')}</div>`;

R.drugreg = function () {
  const el = $('#s-drugreg');
  if (ui.drugView === 'loading') {
    el.innerHTML = header('약물 정보 등록') + stepBar(2) +
      `<div class="loading"><div class="spinner"></div><p>처방전을 읽고 있어요</p></div>`;
  } else if (ui.drugView === 'confirm') {
    el.innerHTML = header('약물 정보 등록', 'rx-back') + stepBar(3) +
      `<p class="confirm-title">처방전에서 다음 약물을 확인했습니다</p>` +
      ui.rxItems.map(rxItemHTML).join('') +
      `<div class="sticky-bottom"><button class="btn btn-primary" data-act="rx-register">이대로 약물 등록하기</button></div>`;
  } else {
    el.innerHTML = header('약물 정보 등록') + stepBar(1) + `
      <button class="photo-btn" data-act="pick-drug-photo">
        ${draft.photo ? `<img src="${draft.photo}" alt="약물 사진">` : `<span class="cam">📷</span>`}
        <span>약물 사진을 찍어주세요</span>
      </button>
      <button class="rx-btn" data-act="pick-rx"><span class="ic">🧾</span><span>처방전을 촬영하면 입력이 돼요</span></button>
      <div class="name-block"><h2>약물명</h2>
        <input class="field" type="text" placeholder="약 이름" autocomplete="off" data-in="draftName" value="${esc(draft.name)}"></div>
      <div id="formBox-main">${formHTML('main')}</div>
      <div style="margin-top:22px"><button class="btn btn-primary" data-act="manual-register">등록하기</button>
      <p class="note">입력한 정보가 맞는지 확인해주세요.</p></div>`;
    updateTotal('main');
  }
};
function rxItemHTML(it) {
  const unresolved = !it.resolved;
  const sub = `1회 ${fmtNum(it.dose)}정 · 하루 ${it.times}번 · ${it.days}일${it.how ? ' · ' + esc(it.how) : ''}`;
  if (unresolved) {
    return `<div class="card rx-item">
      <div class="rx-top"><button class="chk" disabled aria-label="선택 불가"></button><div><div class="rx-name">${esc(it.raw)}</div><div class="rx-sub">${sub}</div></div></div>
      <div class="warn">약물명을 정확하게 확인하지 못했습니다. 직접 확인해주세요.</div>
      ${it.cands.length ? `<div class="cand-list">${it.cands.map((c, i) => `<button class="btn btn-ghost" data-act="rx-cand" data-id="${it.id}" data-i="${i}">${esc(c.name)} ${esc(c.strength)}</button>`).join('')}</div>` : ''}
      <div class="rx-btns"><button class="btn btn-orange" data-act="rx-direct" data-id="${it.id}">직접 입력</button></div></div>`;
  }
  return `<div class="card rx-item">
    <div class="rx-top"><button class="chk${it.checked ? ' on' : ''}" data-act="rx-toggle" data-id="${it.id}" aria-label="선택">${it.checked ? '✓' : ''}</button>
      <div><div class="rx-name">${esc(it.name)} ${esc(it.strength)}</div><div class="rx-sub">${sub}</div></div></div>
    <div class="rx-btns"><button class="btn btn-ghost" data-act="rx-info" data-id="${it.id}">정보 확인</button>
      <button class="btn btn-ghost" data-act="rx-edit" data-id="${it.id}">수정</button></div></div>`;
}
/* 처방전 사진 → (OCR 분석 시연) → 약물 DB 대조 */
function runRx(file) {
  ui.drugView = 'loading'; R.drugreg();
  const sample = SAMPLE_RX[(file && file.size ? file.size : 0) % SAMPLE_RX.length];
  setTimeout(() => {
    ui.rxItems = sample.map((s, i) => {
      const hit = findExact(s.raw);
      return { id: i + 1, raw: s.raw, dose: s.dose, times: s.times, days: s.days, how: s.how,
        slots: slotsForTimes(s.times), db: hit, resolved: !!hit, checked: !!hit,
        name: hit ? hit.name : '', strength: hit ? hit.strength : '', cands: hit ? [] : findCandidates(s.raw) };
    });
    ui.drugView = 'confirm';
    if (ui.screen === 'drugreg') R.drugreg();
  }, 1600);
}
const rxById = id => ui.rxItems.find(x => x.id === +id);
function rxInfoModal(it) {
  const d = it.db;
  openModal(`<h2>${esc(it.name)} ${esc(it.strength)}</h2>
    <dl class="info-list">
      ${d ? `<dt>성분명</dt><dd>${esc(d.ingredient)}</dd><dt>함량</dt><dd>${esc(d.strength)}</dd><dt>제형</dt><dd>${esc(d.form)}</dd>
      <dt>효능·효과</dt><dd>${esc(d.efficacy)}</dd><dt>주요 복용 방법</dt><dd>${esc(d.how)}</dd><dt>주요 주의사항</dt><dd>${esc(d.caution)}</dd>`
      : `<dt>약 정보</dt><dd>직접 입력한 약이라 자세한 정보가 없어요.</dd>`}
      <dt>처방 내용 (처방전 기준)</dt><dd>1회 ${fmtNum(it.dose)}정 · 하루 ${it.times}번 · ${it.days}일${it.how ? ' · ' + esc(it.how) : ''}</dd>
    </dl><button class="btn btn-primary" data-act="close-modal">닫기</button>`);
}
function rxEditModal(it) {
  forms.edit = newForm();
  const f = forms.edit;
  f.dose = it.dose; f.times = [1, 2, 3].includes(it.times) ? it.times : 'custom'; f.timesVal = String(it.times);
  it.slots.forEach(s => { if (SLOT_ORDER.includes(s)) f.slots.push(s); else { f.customOn = true; f.customTime = s; } });
  f.days = [7, 14, 30].includes(it.days) ? it.days : 'custom'; f.daysVal = String(it.days);
  ui.editId = it.id; ui.editName = it.raw && !it.resolved ? '' : it.name + it.strength;
  openModal(`<h2>약 정보 수정</h2>
    <div class="name-block" style="margin-top:0"><h2 style="text-align:left">약물명</h2>
    <input class="field" type="text" data-in="editName" value="${esc(ui.editName)}"></div>
    <div id="formBox-edit">${formHTML('edit')}</div>
    <div class="btn-row"><button class="btn btn-neutral" data-act="close-modal">취소</button><button class="btn btn-primary" data-act="rx-edit-save">저장</button></div>`);
  updateTotal('edit');
}
function rxDirectModal(it, text, cands) {
  openModal(`<h2>약물명을 입력해 주세요</h2>
    <input class="field" id="directName" type="text" data-in="directName" value="${esc(text || '')}" placeholder="약 이름">
    <button class="btn btn-primary" data-act="rx-direct-ok" data-id="${it.id}">확인</button>
    ${cands ? `<p class="note">${cands.length ? '이 약이 맞나요?' : '일치하는 약을 찾지 못했어요.'}</p>
      <div class="cand-list">${cands.map((c, i) => `<button class="btn btn-ghost" data-act="rx-direct-cand" data-id="${it.id}" data-i="${i}">${esc(c.name)} ${esc(c.strength)}</button>`).join('')}
      <button class="btn btn-orange" data-act="rx-direct-asis" data-id="${it.id}">입력한 이름 그대로 등록할게요</button></div>` : ''}
    <button class="btn btn-neutral" data-act="close-modal">닫기</button>`);
  ui.directCands = cands || [];
}
function resolveItem(it, db) {
  it.db = db; it.resolved = true; it.checked = true; it.name = db.name; it.strength = db.strength; it.cands = [];
}

/* =====================================================================
   3. 병원 등록
   ===================================================================== */
function hospResultsHTML() {
  const q = norm(ui.hosp.q); if (!q) return '';
  const list = HOSPITAL_DB.filter(h => norm(h.name + h.dept + h.addr).includes(q));
  if (!list.length) return `<p class="empty">찾는 병원이 없어요</p>`;
  return list.map(h => `<button class="hosp-card${ui.hosp.sel === h.name ? ' sel' : ''}" data-act="hosp-pick" data-name="${esc(h.name)}">
    <span class="tick">✓</span><div class="hn">${esc(h.name)}</div><div class="hd">${esc(h.dept)}</div>
    <div class="ha">${esc(h.addr)}</div><div class="ht">📞 ${esc(h.tel)}</div></button>`).join('');
}
R.hospital = function () {
  $('#s-hospital').innerHTML = header('병원 등록') + `
    <div class="search"><span class="ico">🔍</span>
      <input class="field" type="search" placeholder="다니는 병원을 검색해주세요" autocomplete="off" data-in="hospQ" value="${esc(ui.hosp.q)}"></div>
    <div id="hospResults">${hospResultsHTML()}</div>
    <div class="sticky-bottom"><button class="btn btn-primary" data-act="hosp-reg">이 병원 등록하기</button></div>`;
};

/* =====================================================================
   4. 다음 외래 일정
   ===================================================================== */
const apptDT = a => `${a.date} ${a.time}`;
function nowDT() { const n = new Date(); return `${dstr(n)} ${pad(n.getHours())}:${pad(n.getMinutes())}`; }
const fmtApptLong = a => { const d = parseD(a.date); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일 ${fmtTimeKo(a.time)}`; };
function monthCells(y, m) {
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  return { first, days };
}
R.appt = function () {
  const y = ui.apptY, m = ui.apptM, { first, days } = monthCells(y, m), today = todayStr();
  const mark = new Set(S.appts.map(a => a.date));
  let cells = '';
  for (let i = 0; i < first; i++) cells += `<div class="dcell blank"></div>`;
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${pad(m + 1)}-${pad(d)}`;
    cells += `<div class="dcell${ds === today ? ' today' : ''}">${d}${mark.has(ds) ? '<span class="dot">🏥</span>' : ''}</div>`;
  }
  const up = S.appts.filter(a => apptDT(a) >= nowDT()).sort((a, b) => apptDT(a).localeCompare(apptDT(b)));
  const next = up[0], rest = up.slice(1);
  $('#s-appt').innerHTML = header('다음 외래 일정') + `
    <div class="cal-nav small-nav"><button class="round" data-act="appt-prev" aria-label="이전 달">‹</button><strong>${y}년 ${m + 1}월</strong><button class="round" data-act="appt-next" aria-label="다음 달">›</button></div>
    <div class="wd">${WD.map(w => `<span>${w}</span>`).join('')}</div>
    <div class="grid7">${cells}</div>
    <h2 class="sec-title">가장 가까운 진료 일정</h2>
    ${next ? `<div class="card next-card"><div class="nd">${fmtApptLong(next)}</div><div class="nh">${esc(next.hospital)}</div>${next.dept ? `<div class="np">${esc(next.dept)}</div>` : ''}</div>`
      : `<div class="card"><p class="empty">예정된 진료가 없어요</p></div>`}
    ${rest.length ? `<h2 class="sec-title">이후 진료 일정</h2>` + rest.map(a => `<div class="card appt-row"><div class="info"><div class="ad">${fmtApptLong(a)}</div><div class="ah">${esc(a.hospital)}${a.dept ? ' · ' + esc(a.dept) : ''}</div></div><button class="btn btn-ghost" data-act="appt-edit" data-id="${a.id}">수정</button></div>`).join('') : ''}
    <div class="sticky-bottom"><button class="btn btn-primary" data-act="appt-add">진료 일정 추가하기</button></div>`;
};
function openApptModal() {
  const d = ui.apptDraft;
  const hosp = S.hospitals.map(h => `<option value="${esc(h.name)}">`).join('');
  openModal(`<h2>${d.id ? '진료 일정 수정' : '진료 일정 추가'}</h2>
    <div class="q" style="margin-top:0"><h2 style="text-align:left;font-size:21px">병원</h2>
      <input class="field" list="hospList" type="text" placeholder="병원 이름" data-in="appt:hospital" value="${esc(d.hospital)}"><datalist id="hospList">${hosp}</datalist></div>
    <div class="q" style="margin-top:16px"><h2 style="text-align:left;font-size:21px">진료 날짜</h2>
      <input class="field" type="date" data-in="appt:date" value="${esc(d.date)}"></div>
    <div class="q" style="margin-top:16px"><h2 style="text-align:left;font-size:21px">진료 시간</h2>
      <button class="time-btn${d.time ? ' set' : ''}" data-act="appt-time">${d.time ? fmtTimeKo(d.time) : '진료 시간'}</button>
      ${d.panel ? timePanelHTML(d) : ''}</div>
    <div class="q" style="margin-top:16px"><h2 style="text-align:left;font-size:21px">진료과</h2>
      <input class="field" type="text" placeholder="예: 내과" data-in="appt:dept" value="${esc(d.dept)}"></div>
    <div class="btn-row" style="margin-top:14px"><button class="btn btn-neutral" data-act="close-modal">취소</button><button class="btn btn-primary" data-act="appt-save">저장</button></div>`);
}
function timePanelHTML(d) {
  const [h, m] = (d.time || '14:00').split(':').map(Number);
  const hh = h % 12 || 12, ap = h < 12 ? 0 : 1;
  return `<div class="time-panel">
    <select id="tpAp"><option value="0"${ap === 0 ? ' selected' : ''}>오전</option><option value="1"${ap === 1 ? ' selected' : ''}>오후</option></select>
    <select id="tpH">${Array.from({ length: 12 }, (_, i) => i + 1).map(v => `<option value="${v}"${v === hh ? ' selected' : ''}>${v}시</option>`).join('')}</select>
    <select id="tpM">${Array.from({ length: 12 }, (_, i) => i * 5).map(v => `<option value="${v}"${v === m ? ' selected' : ''}>${pad(v)}분</option>`).join('')}</select>
    <button class="btn btn-primary" style="width:auto;min-height:56px;margin:0;font-size:19px" data-act="appt-time-ok">확인</button></div>`;
}

/* =====================================================================
   5. 보호자 연계 & 의료진 연계
   ===================================================================== */
R.care = function () {
  const c = ui.care;
  $('#s-care').innerHTML = header('보호자 연계 & 의료진 연계') + `
    <div class="half"><div class="half-top"><h2>등록된 보호자</h2>
      <button class="add-g" data-act="care-add"><span class="ic">👨‍👩‍👧</span>보호자 추가하기</button></div>
      ${c.form ? `<div class="gform">
        <input class="field" type="text" placeholder="환자와의 관계 (예: 아들)" data-in="care:rel" value="${esc(c.rel)}">
        <input class="field" type="text" placeholder="보호자 이름" data-in="care:name" value="${esc(c.name)}">
        <input class="field" type="tel" inputmode="tel" placeholder="전화번호" data-in="care:phone" value="${esc(c.phone)}">
        <div class="btn-row"><button class="btn btn-neutral" data-act="care-cancel">취소</button><button class="btn btn-primary" data-act="care-reg">등록</button></div></div>` : ''}
      ${S.guardians.map(g => `<div class="person"><div class="pn">${esc(g.rel)} ${esc(g.name)}님<small>${esc(g.phone)}</small></div>
        <a class="btn btn-orange" style="text-decoration:none;display:grid;place-items:center" href="tel:${esc(g.phone.replace(/[^0-9+]/g, ''))}">연락하기</a></div>`).join('')}
    </div>
    <div class="half"><div class="half-top"><h2>등록된 병원</h2></div>
      ${S.hospitals.length ? S.hospitals.map(h => `<div class="person"><div class="pn">${esc(h.name)}</div>
        <a class="btn btn-orange" style="text-decoration:none;display:grid;place-items:center" href="tel:${esc(h.tel.replace(/[^0-9+]/g, ''))}">문의하기</a></div>`).join('') : '<div class="half-empty"></div>'}
    </div>`;
};

/* =====================================================================
   6~8. 챗봇 쑥쑥이 (대화는 localStorage에 저장)
   ===================================================================== */
R.chat = function () {
  $('#s-chat').innerHTML = header('쑥쑥이') + `<div id="chatMsgs" class="chat-msgs"></div>`;
  renderChat();
};
const medsForSlot = slot => S.meds.filter(m => m.slots.includes(slot));
const medByName = name => S.meds.find(m => m.name === name);
function msgHTML(m) {
  if (m.t === 'user') return `<div class="row user"><div class="bubble">${esc(m.text)}</div></div>`;
  const wrap = inner => `<div class="row"><div class="avatar">${plantSVG('sprout', 40)}</div><div class="col"><div class="bname">쑥쑥이</div>${inner}</div></div>`;
  const dis = v => v ? ' disabled' : '';
  if (m.k === 'text') return wrap(`<div class="bubble">${esc(m.text)}</div>`);
  if (m.k === 'drugq') {
    const pills = medsForSlot(m.slot).map(md => `<div class="pillcard">${md.photo ? `<img src="${md.photo}" alt="${esc(md.name)}">` : '<span class="ph">💊</span>'}<span class="pname">${esc(md.name)}</span></div>`).join('');
    const ans = m.ans;
    return wrap(`<div class="bubble">${esc(m.slot === '아침' || m.slot === '점심' || m.slot === '저녁' ? m.slot + '약' : m.slot + ' 약')} 드셨나요?</div>
      <div class="pills">${pills}</div>
      <div class="opts"><button class="opt yes${ans === '예' ? ' on' : ''}" data-act="chat-drug" data-id="${m.id}" data-ans="예"${dis(ans)}>예</button>
      <button class="opt${ans === '아니요' ? ' on' : ''}" data-act="chat-drug" data-id="${m.id}" data-ans="아니요"${dis(ans)}>아니요</button></div>`);
  }
  if (m.k === 'meal') {
    const a = m.ans;
    return wrap(`<div class="bubble">혹시 식사를 안 하셨나요?</div>
      <div class="opts"><button class="opt${a === '아직 안 먹었어요' ? ' on' : ''}" data-act="chat-meal" data-id="${m.id}" data-ans="아직 안 먹었어요"${dis(a)}>아직 안 먹었어요</button>
      <button class="opt${a === '식사했어요' ? ' on' : ''}" data-act="chat-meal" data-id="${m.id}" data-ans="식사했어요"${dis(a)}>식사했어요</button></div>`);
  }
  if (m.k === 'act') {
    return wrap(`${m.text ? `<div class="bubble">${esc(m.text)}</div>` : ''}
      <div class="opts"><button class="opt${m.done ? ' on' : ''}" data-act="chat-act" data-id="${m.id}"${dis(m.done)}>${esc(m.label)}</button></div>`);
  }
  if (m.k === 'sym') {
    const a = m.ans;
    return wrap(`<div class="bubble">${SIDE_TEXT}</div>
      <div class="sym-grid">${SYMS.map(([n, e]) => `<button class="sym${a === n ? ' on' : ''}" data-act="chat-sym" data-id="${m.id}" data-sym="${esc(n)}"${dis(a)}><span class="se">${e}</span>${n}</button>`).join('')}</div>
      ${a && !SYMS.some(s => s[0] === a) ? `<div class="bubble" style="margin-top:10px">직접 입력: ${esc(a)}</div>` : ''}
      ${a ? '' : `<div class="free"><input class="field" type="text" id="free-${m.id}" placeholder="직접 적어 주세요"><button class="btn btn-primary" data-act="chat-sym-free" data-id="${m.id}">보내기</button></div>`}`);
  }
  return '';
}
function renderChat() {
  const box = $('#chatMsgs'); if (!box) return;
  box.innerHTML = chat.msgs.map(msgHTML).join('');
  const sc = $('#s-chat'); sc.scrollTop = sc.scrollHeight;
}
const botText = text => chat.msgs.push({ id: chat.seq++, t: 'bot', k: 'text', text });
const userText = text => chat.msgs.push({ id: chat.seq++, t: 'user', k: 'text', text });
const chatMsg = id => chat.msgs.find(m => m.id === +id);
function hasUnanswered() {
  return chat.msgs.some(m => (['drugq', 'meal', 'sym'].includes(m.k) && m.ans === null) || (m.k === 'act' && !m.done));
}
function markShown(slot) { const t = todayStr(); S.medShown[t] = S.medShown[t] || {}; S.medShown[t][slot] = true; save(); }
function pushDrugQ(slot, force) {
  const today = todayStr();
  if (!S.meds.length || recordOf(today, slot) !== undefined) return false;
  if (!force && S.asked[today + '|' + slot]) return false;
  if (chat.msgs.some(m => m.k === 'drugq' && m.date === today && m.slot === slot && m.ans === null)) return false;
  S.asked[today + '|' + slot] = true; markShown(slot);
  chat.msgs.push({ id: chat.seq++, t: 'bot', k: 'drugq', slot, date: today, ans: null });
  return true;
}
const firstPendingSide = () => S.sideAlerts.find(a => !a.done && !a.dismissed && a.due <= Date.now());
function pushSym(a) {
  if (chat.msgs.some(m => m.k === 'sym' && m.alertId === a.id)) return false;
  chat.msgs.push({ id: chat.seq++, t: 'bot', k: 'sym', alertId: a.id, ans: null });
  return true;
}
function dueReminderSlots() {
  const today = todayStr(), out = [];
  S.reminders.forEach(r => {
    if (r.done || r.due > Date.now()) return;
    r.done = true; out.push(r.slot);
  });
  if (out.length) save();
  return out.filter(s => recordOf(today, s) === undefined);
}
function enterChat(opt = {}) {
  go('chat');
  if (!chat.greeted) { chat.greeted = true; botText(`안녕하세요? 저는 ${USER_NAME}님의 건강 길잡이 쑥쑥이라고 해요!`); }
  const side = firstPendingSide();
  if (side) pushSym(side);
  dueReminderSlots().forEach(s => pushDrugQ(s, true));
  if (opt.slot) pushDrugQ(opt.slot, true);
  else if (!side && !hasUnanswered()) {
    const next = daySlots().find(s => recordOf(todayStr(), s) === undefined && !S.asked[todayStr() + '|' + s]);
    if (next) pushDrugQ(next, false);
  }
  saveChat(); renderChat();
}
function chatRecord(slot) {
  recordSlot(todayStr(), slot, true);
  saveChat();
}

/* =====================================================================
   9. 부작용 상태 탭
   ===================================================================== */
R.side = function () {
  const s = ui.side, el = $('#s-side');
  if (s.done) {
    el.innerHTML = `<div class="thanks"><div class="big">🌱</div><p>답해 주셔서 감사합니다.</p><p>오늘 상태가 잘 기록되었어요.</p></div>`;
    return;
  }
  el.innerHTML = header('부작용 상태') + `
    <h2 class="side-title">약을 드신 지 30분 지났어요. 지금 부작용 상태는 어떠세요?</h2>
    <p class="side-sub">불편한 정도에 맞는 얼굴을 눌러 주세요</p>
    <div class="scale">${FACES.map((f, i) => `<button class="face s${i + 1}${s.score === i + 1 ? ' on' : ''}" data-act="side-pick" data-s="${i + 1}" aria-label="${i + 1}점 ${f[1]}"><span class="fe">${f[0]}</span><span class="fn">${i + 1}</span></button>`).join('')}</div>
    <div class="ends"><span>1 증상 없음</span><span>5 증상 매우 심함</span></div>
    <div class="chosen">${s.score ? `<span class="ce">${FACES[s.score - 1][0]}</span><span class="cn">${s.score}점</span><span class="cd">${FACES[s.score - 1][1]}</span>` : ''}</div>
    <div style="margin-top:16px"><button class="btn btn-primary" data-act="side-done">선택 완료</button></div>`;
};
function recordScore(score) {
  const today = todayStr();
  S.scores.push({ date: today, score, ts: Date.now() });
  if (score >= 3) {
    S.guardians.forEach(g => S.guardianAlerts.push({ id: S.seq++, gid: g.id, rel: g.rel, name: g.name, phone: g.phone, score, date: today }));
    const cnt = S.scores.filter(x => x.date === today && x.score >= 3).length;
    if (cnt >= 3) {
      S.hospitals.forEach(h => {
        const key = today + '|' + h.id;
        S.doctorAlerts = S.doctorAlerts.filter(a => a.key !== key);
        S.doctorAlerts.push({ key, hid: h.id, hname: h.name, htel: h.tel, date: today, name: USER_NAME, age: USER_AGE,
          meds: S.meds.map(medFull), scores: S.scores.map(x => ({ date: x.date, score: x.score })) });
      });
    }
  }
  save();
}

/* =====================================================================
   10·11. 내 식물 / 복약 기록 (같은 데이터에서 계산)
   ===================================================================== */
function periodRange(p) { const d = periodDates(p); return `${fmtSlash(d[0])}~${fmtSlash(d[6])}`; }
function periodNav(view, cur2, titleCur, titleOther, sub) {
  const maxP = maxPeriod();
  return `<div class="per-head">
    <button class="round" data-act="per-prev" aria-label="이전 주차"${view <= 1 ? ' disabled' : ''}>‹</button>
    <div class="ct"><h2>${view === cur2 ? titleCur : `${view}주차 ${titleOther}`}</h2><div class="sub">${sub}</div></div>
    <button class="round" data-act="per-next" aria-label="다음 주차"${view >= maxP ? ' disabled' : ''}>›</button></div>`;
}
R.plant = function () {
  const cur2 = currentPeriod(), view = ui.viewPeriod || cur2, st = periodStats(view), today = todayStr();
  const pct = Math.round(st.o / 7 * 100), stage = stageNow(), left = daysToNext();
  const dots = st.dates.map(d => {
    const s = dayStatus(d);
    return `<div><div class="dot7${s === 'O' ? ' o' : s === 'X' ? ' x' : ''}${d === today ? ' today' : ''}">${s === 'O' ? '✓' : s === 'X' ? '×' : ''}</div><div class="dd">${fmtSlash(d)}</div></div>`;
  }).join('');
  $('#s-plant').innerHTML = header('내 식물') +
    periodNav(view, cur2, '이번 주 복약 달성률', '복약 달성률', `${view}주차 · ${periodRange(view)} (7일 단위로 한 달 진행)`) + `
    <div class="per-nums"><span class="n1">${st.o}/7일</span><span class="n2">${pct}%</span></div>
    <div class="bar" style="margin-top:8px"><i style="width:${pct}%"></i></div>
    <div class="dots">${dots}</div>
    <div class="plant-main"><button data-act="go" data-to="record" aria-label="복약 기록으로 이동">${plantSVG(stage, 260)}</button></div>
    <p class="stage-line">현재 단계: ${STAGE_NAME[stage]} ${STAGE_EMOJI[stage]}</p>
    <p class="stage-next">${left ? `다음 성장까지 ${left}일 남았어요!` : '꽃이 활짝 피었어요! 지금처럼 챙겨 드세요'}</p>`;
};
function bubbleText() {
  const cur2 = currentPeriod(), st = periodStats(cur2);
  if (st.o === 7) return '대단하세요! 이번 주 약을 모두 드셨어요';
  if (!st.rec) return '오늘 약을 드셨나요?';
  if (st.x > 0) return '괜찮아요, 오늘부터 다시 챙겨 드세요';
  return '꾸준히 복약하고 계시네요!';
}
R.record = function () {
  const y = ui.calY, m = ui.calM, { first, days } = monthCells(y, m), today = todayStr();
  const lastOk = (() => { const d = parseD(S.startDate); d.setMonth(d.getMonth() + 1); d.setDate(d.getDate() - 1); return dstr(d); })();
  let cells = '';
  for (let i = 0; i < first; i++) cells += `<div class="cell blank"></div>`;
  for (let d = 1; d <= days; d++) {
    const ds = `${y}-${pad(m + 1)}-${pad(d)}`, st = dayStatus(ds), ok = ds >= S.startDate && ds <= lastOk;
    const cls = `cell${st === 'O' ? ' o' : st === 'X' ? ' x' : ' off'}${ds === today ? ' today' : ''}`;
    const inner = `${d}${st ? `<small>복약 ${st}</small>` : ''}`;
    cells += ok ? `<button class="${cls}" data-act="cal-day" data-date="${ds}" aria-label="${m + 1}월 ${d}일">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
  }
  const cur2 = currentPeriod(), view = ui.viewPeriod || cur2, st = periodStats(view);
  const pct = Math.round(st.o / 7 * 100), stage = stageNow(), left = daysToNext();
  $('#s-record').innerHTML = header('복약 기록') + `
    <div class="mascot">${plantSVG(stage, 112)}<div class="speech">${bubbleText()}</div></div>
    <p class="mascot-small">${left ? `${left}일 더 드시면 식물이 자라요` : '꽃이 활짝 피었어요'} · 현재 ${STAGE_NAME[stage]} ${STAGE_EMOJI[stage]}</p>
    <div class="cal-nav" style="margin-top:14px"><button class="round" data-act="rec-prev" aria-label="이전 달">‹</button><strong>${y}년 ${m + 1}월</strong><button class="round" data-act="rec-next" aria-label="다음 달">›</button></div>
    <div class="wd">${WD.map(w => `<span>${w}</span>`).join('')}</div>
    <div class="grid7">${cells}</div>
    <p class="cal-hint">날짜를 누르면 약을 먹었는지 기록할 수 있어요.</p>
    <hr class="divider">
    ${periodNav(view, cur2, '이번 주기 복약 달성률', '복약 달성률', `${view}주차 · ${periodRange(view)}`)}
    <div class="ach">
      <div class="ach-left"><div class="ach-ic">${plantSVG(stage, 46)}</div>
        <div class="ach-bar"><div class="bar"><i style="width:${pct}%"></i></div><div class="pc">${pct}%</div></div></div>
      <div class="ach-box"><div class="a1"><b>${st.o}일</b>복용완료</div><div class="a2"><b>${st.x}일</b>미복용</div></div>
    </div>`;
};
function openDateModal(date) {
  const slots = daySlots();
  const rows = slots.map(s => {
    const v = recordOf(date, s);
    const label = /^\d/.test(s) ? s : s;
    if (v === undefined) return `<div class="slot-row"><h3>${esc(label)}</h3>
      <button class="btn btn-primary" data-act="rec-set" data-date="${date}" data-slot="${esc(s)}" data-v="1">예, 먹었어요</button>
      <button class="btn btn-red" data-act="rec-set" data-date="${date}" data-slot="${esc(s)}" data-v="0">아니요, 안 먹었어요</button></div>`;
    return `<div class="slot-row"><h3>${esc(label)}</h3><div class="res ${v ? 'o' : 'x'}">${v ? 'O 먹었어요' : 'X 안 먹었어요'}</div>
      <button class="btn btn-primary" disabled>예, 먹었어요</button><button class="btn btn-red" disabled>아니요, 안 먹었어요</button></div>`;
  }).join('');
  openModal(`<h2>${fmtMD(date)} 약을 드셨나요?</h2>${rows}<button class="btn btn-neutral" data-act="close-modal">닫기</button>`);
}

/* =====================================================================
   12. 나의 등록된 약물
   ===================================================================== */
const medPhoto = m => m.photo ? `<img src="${m.photo}" alt="${esc(m.name)}">` : '💊';
R.mymeds = function () {
  const el = $('#s-mymeds');
  if (ui.medId) {
    const m = S.meds.find(x => x.id === ui.medId);
    if (!m) { ui.medId = null; return R.mymeds(); }
    const tk = medTaken(m), pct = Math.round(tk / m.total * 100);
    const rows = [['약물명', medFull(m)], ['복용량', `1회 ${fmtNum(m.dose)}정`], ['하루 복용 횟수', `${m.slots.length}번 (${m.slots.join('·')})`],
      ['복용 기간', `${m.days}일`], ['전체 처방량', `${fmtNum(m.total)}정`], ['현재까지 복용한 양', `${fmtNum(tk)}정`],
      ['남은 약 개수', `${fmtNum(m.total - tk)}정`], ['복용률', `${pct}%`], ['복용 시작일', fmtMD(m.startDate)], ['복용 종료 예정일', fmtMD(medEnd(m))]];
    el.innerHTML = header('약물 상세', 'med-back') +
      `<div class="det-photo"><div class="med-ph">${medPhoto(m)}</div></div><p class="det-name">${esc(medFull(m))}</p>
      <div class="det-table">${rows.map(r => `<div><b>${r[0]}</b><span>${esc(r[1])}</span></div>`).join('')}</div>
      <div class="det-info">
        <div class="blk"><h3>약물 용도 및 효능</h3><p>${esc(m.efficacy || '등록된 정보가 없어요.')}</p></div>
        <div class="blk"><h3>올바른 복용 방법</h3><p>${esc(m.how || '등록된 정보가 없어요.')}${m.rxHow ? `<br>처방: ${esc(m.rxHow)}` : ''}</p></div>
        <div class="blk warnb"><h3>특별 주의사항</h3><p>${esc(m.caution || '등록된 정보가 없어요.')}</p></div>
        <div class="blk"><h3>예상되는 주요 부작용</h3><p>${esc(m.side || '등록된 정보가 없어요.')}</p></div>
      </div>`;
    return;
  }
  el.innerHTML = header('나의 등록된 약물') + (S.meds.length ? S.meds.map(m => {
    const tk = medTaken(m), pct = Math.round(tk / m.total * 100), left = m.total - tk;
    return `<button class="med-card" data-act="med-open" data-id="${m.id}">
      <div class="med-top"><div class="med-ph">${medPhoto(m)}</div><div class="med-name">${esc(medFull(m))}</div></div>
      <div class="med-prog">복용 ${fmtNum(tk)}정 / 전체 ${fmtNum(m.total)}정</div>
      <div class="bar" style="margin-top:8px"><i style="width:${pct}%"></i></div>
      <div class="med-pc"><span>복용률 ${pct}%</span><span>${fmtNum(left)}정 남음</span></div>
      <div class="med-good">처방대로 잘 복용하고 있어요</div></button>`;
  }).join('') : `<p class="empty">등록된 약물이 없어요</p>`);
};

/* =====================================================================
   앱 아래 영역 : 보호자용 / 의료진용
   ===================================================================== */
function renderBelow() {
  const ga = S.guardianAlerts;
  const groups = {};
  ga.forEach(a => { (groups[a.gid] = groups[a.gid] || { g: a, list: [] }).list.push(a); });
  $('#guardianBody').innerHTML = ga.length ? Object.values(groups).map(x => `<div class="sg">
    <div class="who">${esc(x.g.rel)} ${esc(x.g.name)} · ${esc(x.g.phone)}</div>
    ${x.list.map(a => `<p>${esc(USER_NAME)}님의 부작용이 3점 이상(${a.score}점)으로 기록되었어요.(${fmtMD(a.date)})</p>`).join('')}</div>`).join('')
    : `<p class="empty">받은 알림이 없어요</p>`;
  const da = S.doctorAlerts, dg = {};
  da.forEach(a => { (dg[a.hid] = dg[a.hid] || { h: a, list: [] }).list.push(a); });
  $('#doctorBody').innerHTML = da.length ? Object.values(dg).map(x => `<div class="sg">
    <div class="who">${esc(x.h.hname)} · ${esc(x.h.htel)}</div>
    ${x.list.map(a => `<p><b>3점 이상 누적 3회 이상으로 알람이 왔어요.</b></p>
      <p class="meta">이름 ${esc(a.name)} · 나이 ${a.age}세</p>
      <p class="meta">복용약 ${a.meds.length ? esc(a.meds.join(', ')) : '없음'}</p>
      <p class="meta">점수 이력 ${a.scores.map(s => `${fmtMD(s.date)} ${s.score}점`).join(' / ')}</p>`).join('')}</div>`).join('')
    : `<p class="empty">받은 알림이 없어요</p>`;
}

/* =====================================================================
   상단 알림 (부작용 알림 > 약 먹을 시간 알림 > 진료 하루 전 알림)
   ===================================================================== */
let cur = null;   // 지금 떠 있는 알림
const medText = slot => `${slotWord(slot)} 드실 시간이에요. 약 드셨나요?`;
function eligibleSlot() {
  if (!S.meds.length) return null;
  const today = todayStr(), now = Date.now(), shown = S.medShown[today] || {};
  for (const s of daySlots()) {
    if (recordOf(today, s) !== undefined || shown[s]) continue;
    const [h, m] = slotTime(s).split(':').map(Number);
    const T = new Date(); T.setHours(h, m, 0, 0);
    if (now < T.getTime()) continue;
    const regs = S.meds.filter(md => md.slots.includes(s) && today >= md.startDate && today <= medEnd(md));
    if (regs.some(md => md.regAt <= T.getTime())) return s;   // 등록 전에 이미 지난 시각의 알림은 없음
  }
  return null;
}
function bannerValid(b) {
  if (ui.screen === 'chat') return false;
  if (b.kind === 'side') {
    if (ui.screen === 'side') return false;
    const a = S.sideAlerts.find(x => x.id === b.id); return !!a && !a.done && !a.dismissed;
  }
  if (b.kind === 'med') return recordOf(todayStr(), b.slot) === undefined;
  return true;
}
function pickBanner() {
  const now = Date.now(), today = todayStr();
  if (ui.screen !== 'side') {
    const a = S.sideAlerts.find(x => !x.done && !x.dismissed && x.due <= now);
    if (a) return { kind: 'side', id: a.id, text: SIDE_TEXT };
  }
  const rem = S.reminders.find(r => !r.done && r.due <= now);
  if (rem) {
    rem.done = true; save();
    if (recordOf(today, rem.slot) === undefined) return { kind: 'med', slot: rem.slot, text: medText(rem.slot) };
  }
  const el = eligibleSlot();
  if (el) { markShown(el); return { kind: 'med', slot: el, text: medText(el) }; }
  const tm = addDays(today, 1);
  const ap = S.appts.find(a => a.date === tm && !S.apptShown[a.id + '|' + tm]);
  if (ap) { S.apptShown[ap.id + '|' + tm] = true; save(); return { kind: 'appt', id: ap.id, text: `내일 ${ap.hospital} 진료가 있어요` }; }
  return null;
}
function refreshBanner() {
  if (cur && !bannerValid(cur)) cur = null;
  if (!cur && ui.screen !== 'chat') cur = pickBanner();
  const el = $('#banner');
  const key = cur ? `${cur.kind}|${cur.id || cur.slot}|${cur.text}` : '';
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  if (!cur) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `<button class="b-body" data-act="banner-open"><span class="b-ic">${plantSVG('sprout', 42)}</span>
    <span class="b-txt"><b>쑥쑥이</b><span>${esc(cur.text)}</span></span></button>
    <button class="b-x" data-act="banner-close" aria-label="알림 닫기">✕</button>`;
  el.classList.remove('drop'); void el.offsetWidth; el.classList.add('drop');
}
function tick() {
  if (ui.screen === 'chat') {
    let changed = false;
    const side = firstPendingSide();
    if (side && pushSym(side)) changed = true;
    dueReminderSlots().forEach(s => { if (pushDrugQ(s, true)) changed = true; });
    const el = eligibleSlot();
    if (el && pushDrugQ(el, true)) changed = true;
    if (changed) { saveChat(); renderChat(); }
  }
  refreshBanner();
}

/* =====================================================================
   이벤트
   ===================================================================== */
const ACT = {
  'go': el => go(el.dataset.to),
  'back-home': () => go('home'),
  'med-back': () => { ui.medId = null; R.mymeds(); },
  'rx-back': () => go('drugreg'),
  'open-chat': () => enterChat({}),
  'close-modal': () => closeModal(),
  'confirm-yes': () => { const f = confirmModal.fn; closeModal(); if (f) f(); },
  'tab': el => go(el.dataset.tab),

  /* 2번 */
  'pick-drug-photo': () => { const f = $('#fileDrug'); f.value = ''; f.click(); },
  'pick-rx': () => { const f = $('#fileRx'); f.value = ''; f.click(); },
  'f-dose': el => { forms[el.dataset.form].dose = parseFloat(el.dataset.val); refreshForm(el.dataset.form); },
  'f-times': el => { const f = forms[el.dataset.form], v = el.dataset.val; f.times = v === 'custom' ? 'custom' : parseInt(v); trimSlots(f); refreshForm(el.dataset.form); },
  'f-slot': el => {
    const f = forms[el.dataset.form], v = el.dataset.val;
    if (v === 'custom') f.customOn = !f.customOn;
    else { const i = f.slots.indexOf(v); if (i >= 0) f.slots.splice(i, 1); else f.slots.push(v); }
    trimSlots(f); refreshForm(el.dataset.form);
  },
  'f-days': el => { const f = forms[el.dataset.form], v = el.dataset.val; f.days = v === 'custom' ? 'custom' : parseInt(v); refreshForm(el.dataset.form); },
  'manual-register': () => {
    const f = forms.main, name = draft.name.trim();
    if (!name) return toast('약물명을 입력해 주세요');
    const err = validateForm(f); if (err) return toast(err);
    const hit = findExact(name);
    const base = hit ? { name: hit.name, strength: hit.strength, ingredient: hit.ingredient, form: hit.form, efficacy: hit.efficacy, how: hit.how, caution: hit.caution, side: hit.side }
      : { name };
    addMeds([makeMed(base, f, draft.photo)]);
    showDone();
  },
  'rx-toggle': el => { const it = rxById(el.dataset.id); it.checked = !it.checked; R.drugreg(); },
  'rx-info': el => rxInfoModal(rxById(el.dataset.id)),
  'rx-edit': el => rxEditModal(rxById(el.dataset.id)),
  'rx-edit-save': () => {
    const it = rxById(ui.editId), f = forms.edit, name = (ui.editName || '').trim();
    if (!name) return toast('약물명을 입력해 주세요');
    const err = validateForm(f); if (err) return toast(err);
    const hit = findExact(name);
    it.dose = f.dose; it.times = fSlots(f).length; it.days = fDays(f); it.slots = sortSlots(fSlots(f));
    if (hit) resolveItem(it, hit); else { it.db = null; it.resolved = true; it.checked = true; it.name = name; it.strength = ''; }
    closeModal(); R.drugreg();
  },
  'rx-cand': el => { const it = rxById(el.dataset.id); resolveItem(it, it.cands[+el.dataset.i]); R.drugreg(); },
  'rx-direct': el => rxDirectModal(rxById(el.dataset.id), '', null),
  'rx-direct-ok': el => {
    const it = rxById(el.dataset.id), text = $('#directName').value.trim();
    if (!text) return toast('약물명을 입력해 주세요');
    const hit = findExact(text);
    if (hit) { resolveItem(it, hit); closeModal(); R.drugreg(); return; }
    rxDirectModal(it, text, findCandidates(text));
    ui.directText = text;
  },
  'rx-direct-cand': el => { const it = rxById(el.dataset.id); resolveItem(it, ui.directCands[+el.dataset.i]); closeModal(); R.drugreg(); },
  'rx-direct-asis': el => {
    const it = rxById(el.dataset.id), text = ($('#directName').value || ui.directText || '').trim();
    if (!text) return toast('약물명을 입력해 주세요');
    it.db = null; it.resolved = true; it.checked = true; it.name = text; it.strength = ''; it.cands = [];
    closeModal(); R.drugreg();
  },
  'rx-register': () => {
    const sel = ui.rxItems.filter(i => i.resolved && i.checked);
    if (!sel.length) return toast('등록할 약을 골라 주세요');
    const list = sel.map(it => {
      const d = it.db;
      const f = { dose: it.dose, slots: it.slots, customOn: false, customTime: '', times: it.times, timesVal: '', days: it.days, daysVal: '' };
      const base = d ? { name: d.name, strength: d.strength, ingredient: d.ingredient, form: d.form, efficacy: d.efficacy, how: d.how, caution: d.caution, side: d.side, rxHow: it.how }
        : { name: it.name, rxHow: it.how };
      const m = makeMed(base, f, sel.length === 1 ? draft.photo : '');
      m.slots = sortSlots(it.slots); m.total = it.dose * m.slots.length * it.days;
      return m;
    });
    addMeds(list);
    showDone();
  },

  /* 3번 */
  'hosp-pick': el => { ui.hosp.sel = el.dataset.name; $('#hospResults').innerHTML = hospResultsHTML(); },
  'hosp-reg': () => {
    const h = HOSPITAL_DB.find(x => x.name === ui.hosp.sel);
    if (!h) return toast('병원을 먼저 골라 주세요');
    if (S.hospitals.some(x => x.name === h.name)) return toast(`${h.name}은 이미 등록되어 있어요`);
    S.hospitals.push({ id: S.seq++, name: h.name, dept: h.dept, addr: h.addr, tel: h.tel }); save();
    toast(`${h.name}이 등록되었습니다.`, 2600);
    setTimeout(() => { if (ui.screen === 'hospital') go('home'); }, 900);
  },

  /* 4번 */
  'appt-prev': () => { const d = new Date(ui.apptY, ui.apptM - 1, 1); ui.apptY = d.getFullYear(); ui.apptM = d.getMonth(); R.appt(); },
  'appt-next': () => { const d = new Date(ui.apptY, ui.apptM + 1, 1); ui.apptY = d.getFullYear(); ui.apptM = d.getMonth(); R.appt(); },
  'appt-add': () => { ui.apptDraft = { id: 0, hospital: '', date: '', time: '', dept: '', panel: false }; openApptModal(); },
  'appt-edit': el => { const a = S.appts.find(x => x.id === +el.dataset.id); ui.apptDraft = Object.assign({ panel: false }, a); openApptModal(); },
  'appt-time': () => { ui.apptDraft.panel = !ui.apptDraft.panel; openApptModal(); },
  'appt-time-ok': () => {
    let h = +$('#tpH').value; const ap = +$('#tpAp').value, mi = +$('#tpM').value;
    h = h % 12 + (ap ? 12 : 0);
    ui.apptDraft.time = `${pad(h)}:${pad(mi)}`; ui.apptDraft.panel = false; openApptModal();
  },
  'appt-save': () => {
    const d = ui.apptDraft;
    if (!d.hospital.trim()) return toast('병원 이름을 입력해 주세요');
    if (!d.date) return toast('진료 날짜를 골라 주세요');
    if (!d.time) return toast('진료 시간을 골라 주세요');
    const rec = { id: d.id || S.seq++, hospital: d.hospital.trim(), date: d.date, time: d.time, dept: d.dept.trim() };
    const i = S.appts.findIndex(x => x.id === rec.id);
    if (i >= 0) S.appts[i] = rec; else S.appts.push(rec);
    save(); closeModal();
    const dt = parseD(rec.date); ui.apptY = dt.getFullYear(); ui.apptM = dt.getMonth();
    R.appt(); refreshBanner();
  },

  /* 5번 */
  'care-add': () => { ui.care.form = true; R.care(); },
  'care-cancel': () => { ui.care = { form: false, rel: '', name: '', phone: '' }; R.care(); },
  'care-reg': () => {
    const c = ui.care;
    if (!c.rel.trim() || !c.name.trim() || !c.phone.trim()) return toast('관계, 이름, 전화번호를 모두 입력해 주세요');
    S.guardians.push({ id: S.seq++, rel: c.rel.trim(), name: c.name.trim(), phone: c.phone.trim() }); save();
    ui.care = { form: false, rel: '', name: '', phone: '' }; R.care();
  },

  /* 6~8번 챗봇 */
  'chat-drug': el => {
    const m = chatMsg(el.dataset.id); if (!m || m.ans) return;
    m.ans = el.dataset.ans; userText(m.ans);
    if (m.ans === '예') chatRecord(m.slot);
    else chat.msgs.push({ id: chat.seq++, t: 'bot', k: 'meal', ans: null, slot: m.slot });
    saveChat(); renderChat(); renderTabbar(); renderBelow(); showGrowthIfAny(); refreshBanner();
  },
  'chat-meal': el => {
    const m = chatMsg(el.dataset.id); if (!m || m.ans) return;
    m.ans = el.dataset.ans; userText(m.ans);
    if (m.ans === '아직 안 먹었어요') {
      botText('아, 식사 전이시군요! 빈속에 약을 드시면 속이 쓰릴 수 있어요. 식사를 가볍게 하신 후에 약을 드시는 것이 좋답니다.');
      chat.msgs.push({ id: chat.seq++, t: 'bot', k: 'act', action: 'remind', slot: m.slot, text: '식사 후에 약을 드시면 알림을 다시 보내드릴까요?', label: '식사 후 30분 뒤에 다시 알려주기', done: false });
    } else {
      botText('식사를 챙겨 드셨군요! 다행이에요. 그럼 지금 바로 물과 함께 약을 드셔주세요.');
      chat.msgs.push({ id: chat.seq++, t: 'bot', k: 'act', action: 'done', slot: m.slot, text: '', label: '약 복용 완료했어요', done: false });
    }
    saveChat(); renderChat();
  },
  'chat-act': el => {
    const m = chatMsg(el.dataset.id); if (!m || m.done) return;
    m.done = true; userText(m.label);
    if (m.action === 'remind') {
      S.reminders.push({ slot: m.slot, date: todayStr(), due: Date.now() + REMIND_MS, done: false }); save();
    } else chatRecord(m.slot);
    saveChat(); renderChat(); renderTabbar(); renderBelow(); showGrowthIfAny();
  },
  'chat-sym': el => answerSym(el.dataset.id, el.dataset.sym),
  'chat-sym-free': el => {
    const inp = $('#free-' + el.dataset.id), v = inp ? inp.value.trim() : '';
    if (!v) return toast('불편한 점을 적어 주세요');
    answerSym(el.dataset.id, v);
  },
  'banner-open': () => {
    const b = cur; cur = null; refreshBanner(); if (!b) return;
    if (b.kind === 'side') enterChat({}); else if (b.kind === 'med') enterChat({ slot: b.slot }); else go('appt');
  },
  'banner-close': () => {
    if (cur && cur.kind === 'side') { const a = S.sideAlerts.find(x => x.id === cur.id); if (a) { a.dismissed = true; save(); } }
    cur = null; refreshBanner();
  },

  /* 9번 */
  'side-pick': el => { ui.side.score = +el.dataset.s; R.side(); },
  'side-done': () => {
    if (!ui.side.score) return toast('얼굴을 눌러 주세요');
    recordScore(ui.side.score);
    ui.side.done = true; $('#tabbar').hidden = true; R.side(); renderBelow();
    setTimeout(() => { if (ui.screen === 'side' && ui.side.done) go('home'); }, 2300);
  },

  /* 10·11번 */
  'per-prev': () => { ui.viewPeriod = Math.max(1, (ui.viewPeriod || currentPeriod()) - 1); R[ui.screen](); },
  'per-next': () => { ui.viewPeriod = Math.min(maxPeriod(), (ui.viewPeriod || currentPeriod()) + 1); R[ui.screen](); },
  'rec-prev': () => { const d = new Date(ui.calY, ui.calM - 1, 1); ui.calY = d.getFullYear(); ui.calM = d.getMonth(); R.record(); },
  'rec-next': () => { const d = new Date(ui.calY, ui.calM + 1, 1); ui.calY = d.getFullYear(); ui.calM = d.getMonth(); R.record(); },
  'cal-day': el => openDateModal(el.dataset.date),
  'rec-set': el => {
    const ok = recordSlot(el.dataset.date, el.dataset.slot, el.dataset.v === '1');
    closeModal();
    if (ok) { refreshAll(); showGrowthIfAny(); refreshBanner(); }
  },

  /* 12번 */
  'med-open': el => { ui.medId = +el.dataset.id; R.mymeds(); $('#s-mymeds').scrollTop = 0; },

  /* 관리자 패널 */
  'admin-med-alert': () => {
    if (!S.meds.length) return toast('등록된 약물이 없어요');
    const slot = daySlots().find(s => recordOf(todayStr(), s) === undefined);
    if (!slot) return toast('기록하지 않은 시간대가 없어요');
    if (ui.screen === 'chat') {
      if (pushDrugQ(slot, true)) { saveChat(); renderChat(); }
      return;
    }
    cur = { kind: 'med', slot, text: medText(slot) }; refreshBanner();   // "하루 한 번" 규칙(medShown)에는 영향 없음
  },
  'admin-reset-records': () => confirmModal('복약 기록을 처음 상태로 되돌릴까요?', () => {
    S.records = {}; S.sideAlerts = []; S.medShown = {}; S.reminders = []; S.asked = {}; S.apptShown = {}; S.peak = 'seed';
    save(); cur = null; ui.viewPeriod = null; refreshAll(); refreshBanner(); toast('복약기록을 처음 상태로 초기화했어요');
  }),
  'admin-reset-all': () => confirmModal('모든 내용을 지울까요?', () => {
    lsDel(KEY); lsDel(CKEY);
    S = defaultState(); chat = { msgs: [], greeted: false, seq: 1 }; save(); saveChat();
    cur = null; pendingGrowth = null; go('home'); toast('모든 내용을 초기화했어요');
  })
};
function answerSym(id, sym) {
  const m = chatMsg(id); if (!m || m.ans) return;
  m.ans = sym; userText(sym);
  const a = S.sideAlerts.find(x => x.id === m.alertId); if (a) { a.done = true; save(); }
  botText('이어서 불편한 정도를 점수로 골라 주세요');
  saveChat(); renderChat();
  setTimeout(() => { if (ui.screen === 'chat') go('side'); }, 1500);
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (fn) fn(el, e);
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-in]'); if (!el) return;
  const [k, f] = el.dataset.in.split(':'), v = el.value;
  switch (el.dataset.in) {
    case 'draftName': draft.name = v; return;
    case 'editName': ui.editName = v; return;
    case 'hospQ': ui.hosp.q = v; $('#hospResults').innerHTML = hospResultsHTML(); return;
    case 'directName': return;
  }
  if (k === 'main' || k === 'edit') { forms[k][f] = v; updateTotal(k); }
  else if (k === 'care') ui.care[f] = v;
  else if (k === 'appt') ui.apptDraft[f] = v;
});
$('#fileDrug').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  readThumb(f, 320, url => { draft.photo = url; if (ui.screen === 'drugreg' && ui.drugView === 'input') { const box = $('#formBox-main'); R.drugreg(); } });
});
$('#fileRx').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  runRx(f);   // 사진은 인식용 입력 자료로만 쓰고 화면에 보여 주지 않음
});
function readThumb(file, max, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => cb('');
    img.src = fr.result;
  };
  fr.onerror = () => cb('');
  fr.readAsDataURL(file);
}

/* =====================================================================
   시작
   ===================================================================== */
go('home');
setInterval(tick, 1000);
