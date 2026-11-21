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

// 교재 — 가격은 우선 문의로 받는다 (price가 null이면 '가격 문의')
export const BOOKS = [
  {
    id: 'basic',
    title: '보상관리사 기본서',
    author: '보상드림',
    stage: '2차',
    summary: '보상실무 1·2를 단원별로 정리한 기본서. 단원마다 대표예제와 자주 나오는 지문 OX를 붙였습니다.',
    points: ['보상실무 1·2 단원별 구성', '단원별 대표예제', '빈출 지문 OX'],
    price: null,
    status: '제작 중',
  },
  {
    id: 'mcq',
    title: '보상관리사 객관식 문제집',
    author: '보상드림',
    stage: '2차',
    summary: '보상실무 1·2 객관식 예상문제를 단원별로 묶은 문제집.',
    points: ['보상실무 1·2 단원별 객관식', '2차 오지선다형 대비'],
    price: null,
    status: '제작 중',
  },
];

export const won = (n) => `${n.toLocaleString('ko-KR')}원`;

export function mailto(subject, body = '') {
  const q = new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20');
  return `mailto:${SITE.email}?${q}`;
}
