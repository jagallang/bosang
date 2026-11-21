// 사이트 전역 정보 — 값이 비어 있으면 화면에 표시하지 않는다.
export const SITE = {
  name: '보상드림',
  tagline: '보상관리사 합격부터 토지보상 실무까지',
  description: '보상관리사 시험 대비 교재·학습앱과 전국 토지보상 정보를 제공하는 보상드림',
  email: 'episode0611@gmail.com',
  appPath: '/app/',
  // 사업자 정보 (통신판매 전 반드시 채울 것)
  business: {
    company: '',      // 상호
    owner: '',        // 대표자
    regNo: '',        // 사업자등록번호
    mailOrderNo: '',  // 통신판매업 신고번호
    address: '',
    phone: '',
  },
};

// 교재 — price가 null이면 '구매 문의'로 표시
export const BOOKS = [
  {
    id: 'mnemonic',
    title: '비법노트 두문자편',
    author: '정혜영 행정사',
    stage: '1·2차',
    summary: '시험에 자주 나오는 조문·요건을 두문자로 묶어 단기간에 암기하는 요약 노트.',
    points: ['과목별 핵심 조문 두문자 정리', '헷갈리는 요건·기간 비교표', '시험 직전 회독용 분량'],
    price: null,
    status: '제작 중',
  },
  {
    id: 'essay26',
    title: '26 보상관리사 2차 서술형 예제',
    author: '보상드림',
    stage: '2차',
    summary: '2차 보상실무 서술형을 쟁점 → 근거 → 결론 구조로 연습하는 예제집.',
    points: ['기출 유형별 서술형 예제', '채점 키워드 표시 모범답안', '답안 구성 틀 제공'],
    price: null,
    status: '제작 중',
  },
  {
    id: 'workbook2',
    title: '보상관리사 2차 통합문제집',
    author: '보상드림',
    stage: '2차',
    summary: '보상실무1·2 객관식과 서술형을 한 권으로 묶은 통합문제집.',
    points: ['과목별 객관식 + 서술형', '해설과 근거 조문', '학습앱 문항과 연동'],
    price: null,
    status: '제작 중',
  },
];

// 학습앱 이용권
export const PASSES = [
  { id: 'month', name: '1개월 이용권', price: 20000, note: '전체 문항 · 오답노트 · 모의고사' },
  { id: 'year', name: '1년 이용권', price: 100000, note: '월 8,300원 꼴 · 시험 시즌 전체', best: true },
];

// 기관(B2B) 도입 — 단가는 1인 기준, 10인 이상은 견적
export const ORG_PLAN = {
  appPerSeat: 100000,      // 학습앱 1년
  coursePerSeat: 300000,   // 학습앱 + 온라인 강의
  minSeatsForQuote: 10,
  pilot: { seats: 10, months: 1 },
};

export const won = (n) => `${n.toLocaleString('ko-KR')}원`;

export function mailto(subject, body = '') {
  const q = new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20');
  return `mailto:${SITE.email}?${q}`;
}
