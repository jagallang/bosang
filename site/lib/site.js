// 사이트 전역 정보 — 값이 비어 있으면 화면에 표시하지 않는다.
export const SITE = {
  name: '보상드림',
  tagline: '보상관리사 합격부터 토지보상 실무까지',
  description: '보상관리사 시험 대비 교재·학습앱과 전국 토지보상 정보를 제공하는 보상드림',
  email: 'episode0611@gmail.com',
  appPath: '/app/',
  // 배포 주소 (sitemap·robots용). 빌드 시 SITE_URL 환경변수로 넣는다. 비어 있으면 sitemap을 만들지 않는다
  url: (process.env.SITE_URL || '').replace(/\/$/, ''),
  // 약관·개인정보처리방침이 아직 법률 검토 전이면 true → 페이지 위에 초안 표시
  legalDraft: true,
  legalUpdated: '2026-11-21',
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

// 교재 — 가격은 우선 문의로 받는다 (price가 null이면 '가격 문의').
// cover: 표지에 들어가는 글. edition의 'OO월 판'은 판이 정해지면 채운다
export const BOOKS = [
  {
    id: 'basic1',
    title: '1차 기본서',
    stage: '1차',
    summary: '1차 3과목을 과목·단원 순서로 정리한 기본서. 조문과 핵심 정리, 대표예제를 함께 봅니다.',
    cover: {
      kicker: '보상관리사 1차 · 2027년 대비',
      lead: '교재 + 핵심 정리 + 대표예제',
      subject: '1차 법규',
      name: ['기본서'],
      scope: ['민법 · 부동산관계법규 · 토지보상법규', '시험 범위 전 과목'],
      tags: ['관련 조문 원문 수록', '판례 · 유권해석', '대표예제 풀이', '빈출 지문 OX'],
    },
    price: null,
  },
  {
    id: 'mcq1',
    title: '1차 객관식 문제집',
    stage: '1차',
    summary: '1차 3과목 객관식 예상문제를 단원별로 묶은 문제집. 문항마다 해설과 근거 조문을 붙입니다.',
    cover: {
      kicker: '보상관리사 1차 · 2027년 대비',
      lead: '단원별 예상문제 + 해설',
      subject: '1차 법규',
      name: ['객관식', '문제집'],
      scope: ['민법 · 부동산관계법규 · 토지보상법규', '단원별 객관식 예상문제'],
      tags: ['단원별 예상문제', '해설 · 근거 조문', '실전 모의고사'],
    },
    price: null,
  },
  {
    id: 'basic2',
    title: '2차 기본서',
    stage: '2차',
    summary: '보상실무 Ⅰ·Ⅱ 전 범위를 협회 교재 단원 순서대로 정리한 기본서. 대표예제와 빈출 지문 OX를 붙였습니다.',
    cover: {
      kicker: '보상관리사 2차 · 2027년 대비',
      lead: '교재 + 핵심 정리 + 대표예제',
      subject: '보상실무',
      name: ['기본서'],
      scope: ['보상실무 Ⅰ · 보상실무 Ⅱ 전 범위', '협회 교재(제17회 보상전문과정, 2026. 9.) 단원 순서 그대로'],
      tags: ['관련 조문 원문 수록', '판례 · 유권해석', '대표예제 답안 풀이', '빈출 지문 OX', '사례 · 절차 도식'],
    },
    price: null,
  },
  {
    id: 'mcq2',
    title: '2차 객관식 문제집',
    stage: '2차',
    summary: '보상실무 Ⅰ·Ⅱ 오지선다형 예상문제를 협회 교재 단원별로 묶은 문제집. 문항마다 해설과 근거를 붙입니다.',
    cover: {
      kicker: '보상관리사 2차 · 2027년 대비',
      lead: '단원별 예상문제 + 해설',
      subject: '보상실무',
      name: ['객관식', '문제집'],
      scope: ['보상실무 Ⅰ · 보상실무 Ⅱ 오지선다형 대비', '협회 교재 단원별 객관식 예상문제'],
      tags: ['단원별 예상문제', '해설 · 근거 조문', '빈출 지문 정리'],
    },
    price: null,
  },
  {
    id: 'essay2',
    title: '2차 서술형 문제집',
    stage: '2차',
    summary: '2차 논술형을 쟁점 → 근거 → 사례 적용 순서로 연습하는 문제집. 모범답안과 답안 구성 틀을 함께 봅니다.',
    cover: {
      kicker: '보상관리사 2차 · 2027년 대비',
      lead: '서술형 예제 + 모범답안',
      subject: '보상실무',
      name: ['서술형', '문제집'],
      scope: ['보상실무 Ⅰ · 보상실무 Ⅱ 논술형 대비', '단원별 서술형 예제'],
      tags: ['단원별 서술형 예제', '모범답안', '답안 구성 틀', '두문자 암기'],
    },
    price: null,
  },
];

export const won = (n) => `${n.toLocaleString('ko-KR')}원`;

export function mailto(subject, body = '') {
  const q = new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20');
  return `mailto:${SITE.email}?${q}`;
}
