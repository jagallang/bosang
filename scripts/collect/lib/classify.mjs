/**
 * 고시·공고 제목을 보상 절차 단계와 사업 정보로 분류한다 (순수 함수).
 * 규칙 기반이라 틀릴 수 있으므로 confidence를 함께 돌려주고, 낮으면 사람이 검토한다.
 */

// 공익사업 유형: 제목에 이 말이 있어야 보상 관련 고시로 본다
export const PROJECT_TYPES = [
  ['공공주택지구', '공공주택'], ['공공주택 복합지구', '도심복합'], ['도심 공공주택 복합지구', '도심복합'],
  ['택지개발예정지구', '택지개발'], ['택지개발지구', '택지개발'], ['택지개발사업', '택지개발'],
  ['도시개발구역', '도시개발'], ['도시개발사업', '도시개발'],
  ['산업단지', '산업단지'], ['물류단지', '물류단지'], ['연구개발특구', '연구개발'],
  ['도시계획시설사업', '도시계획시설'], ['도시·군계획시설사업', '도시계획시설'], ['도시계획사업', '도시계획시설'],
  ['도로', '도로'], ['철도', '철도'], ['하천', '하천'], ['공원', '공원'], ['댐', '댐'],
  ['정비구역', '재개발'], ['재개발', '재개발'], ['재정비촉진', '재개발'],
];

// 단계 규칙: 위에서부터 먼저 맞는 것을 쓴다 (늦은 단계를 먼저 검사)
const STAGE_RULES = [
  ['objection', /이의재결|이의신청/],
  ['adjudication', /수용재결|재결신청|재결\s*신청서류|수용\s*재결/],
  ['negotiation', /손실보상\s*협의|보상협의|협의\s*요청/],
  ['appraisal', /감정평가/],
  ['plan', /보상계획|토지조서|물건조서|조서\s*열람/],
  ['survey', /기본조사|토지\s*·?\s*물건\s*조사/],
  ['designation', /지구\s*지정|구역\s*지정|지정\s*고시|지정\s*변경|지정\s*및|(산업단지|물류단지)\s*계획\s*(\([^)]*\)\s*)?(변경\s*)?(\(\d+차\)\s*)?승인|실시계획\s*(\(?변경\)?\s*)?(인가|승인)|실시계획\s*(변경)?\s*인가|실시계획\s*(변경)?\s*승인|지구계획\s*(변경)?\s*승인|사업인정|사업계획\s*(변경)?\s*승인|개발계획\s*(변경)?\s*(승인|수립)/],
];

// 보상과 무관한 고시 (용도지역 변경, 지형도면만 등)
// 지형도면은 지정 고시에도 붙으므로 여기 넣지 않는다
const NOT_COMPENSATION = /용도지역|지구단위계획|개발행위허가\s*제한|경관|건축선|토지거래허가|공원조성계획|관리기본계획|준공/;

export function stageOf(title) {
  for (const [id, re] of STAGE_RULES) if (re.test(title)) return id;
  return null;
}

export function typeOf(title) {
  const t = title.replace(/\s+/g, ' ');
  for (const [kw, type] of PROJECT_TYPES) if (t.includes(kw)) return { keyword: kw, type };
  return null;
}

/** 제목에서 사업명을 뽑는다: 유형 키워드까지 포함한 앞부분 */
export function projectNameOf(title, typeKeyword) {
  let t = title
    .replace(/^\s*\[[^\]]*\]\s*/, '')            // [신규] [변경]
    .replace(/\([^)]*\)/g, ' ')                   // 괄호
    .replace(/[「」『』<>《》"']/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const i = t.indexOf(typeKeyword);
  if (i < 0) return null;
  let name = t.slice(0, i + typeKeyword.length).trim();
  name = name.replace(/^(고시|공고|알림|안내)\s*[:：-]?\s*/, '').trim();
  // 앞에 붙은 기관명·고시번호 덩어리 제거 ("○○시 고시 제2026-1호 ")
  name = name.replace(/^.*?제\s*\d{4}\s*-\s*\d+\s*호\s*/, '').trim();
  if (name.length < typeKeyword.length + 1) return null; // 유형 키워드만 있으면 사업명이 아님
  return name;
}

const SIDO = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시', '세종특별자치시',
  '경기도', '강원특별자치도', '강원도', '충청북도', '충청남도', '전북특별자치도', '전라북도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
  '전남광주통합특별시'];

/** "부산광역시 서구 고시 제1999-45호" 또는 기관명에서 시도·시군구 */
export function regionOf(text) {
  const s = String(text || '').trim();
  const sido = SIDO.find((x) => s.startsWith(x)) || null;
  let rest = sido ? s.slice(sido.length).trim() : s;
  const m = rest.match(/^([가-힣]+(?:시|군|구))(?:\s+([가-힣]+구))?/);
  const sigungu = m && !/^(고시|공고)$/.test(m[1]) ? [m[1], m[2]].filter(Boolean).join(' ') : null;
  return { sido, sigungu };
}

/** 사업명 비교용 */
export const normName = (s) => String(s || '').replace(/\s+/g, '').replace(/[·ㆍ.]/g, '');

/** 영문 소문자 id (사업명 해시) */
export function projectIdOf(name) {
  let h = 2166136261;
  for (const ch of normName(name)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return `p-${h.toString(36)}`;
}

/**
 * 고시 한 건을 분류한다.
 * @returns {null | {stage, type, projectName, region, confidence:'high'|'low', reason}}
 */
export function classifyNotice({ title, org = '', gosiNo = '' }) {
  if (!title || NOT_COMPENSATION.test(title)) return null;
  const type = typeOf(title);
  const stage = stageOf(title);
  if (!type || !stage) return null;
  const projectName = projectNameOf(title, type.keyword);
  const byNo = regionOf(gosiNo);
  const region = byNo.sido ? byNo : regionOf(org);
  const high = !!projectName && !!region.sido && !['도로', '공원', '하천', '철도', '댐'].includes(type.type);
  return {
    stage, type: type.type, projectName, region,
    confidence: high ? 'high' : 'low',
    reason: high ? '유형·단계·사업명·지역 모두 확인' : !projectName ? '사업명을 뽑지 못함' : !region.sido ? '지역 불명' : '도로·공원 등은 사업명이 모호해 검토',
  };
}
