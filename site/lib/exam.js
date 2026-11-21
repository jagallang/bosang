// 보상관리사 시험 정보 — 출처: (사)한국토지보상관리사협회 누리집. 바뀌면 checked 날짜와 함께 고친다
export const KLCMA = {
  url: 'https://www.klcma.or.kr/new/sub_lcmInfo/index.php',
  examUrl: 'https://www.klcma.or.kr/new/sub_testRece/info.php',
  noticeUrl: 'https://www.klcma.or.kr/new/sub_customer/notice.php',
  checked: '2026년 11월',
};

export const SUBJECTS = [
  { round: '1차', name: '민법', scope: '물권, 상속' },
  { round: '1차', name: '부동산관계법규', scope: '국토계획법, 국유재산법, 건축법, 부동산공시법, 농지법, 산지관리법 중 산지 보전 관련 규정' },
  { round: '1차', name: '토지보상법규', scope: '토지보상 관련 법규' },
  { round: '2차', name: '보상실무 1', scope: '사업준비, 지적·측량, 협의에 의한 취득·사용, 감정평가·손실보상, 생활보상, 이주대책 등' },
  { round: '2차', name: '보상실무 2', scope: '이의신청, 수용에 의한 취득·사용, 보상공탁, 보상소송, 보상세무, 토지관리, 환매 등' },
];

export const ROUNDS = {
  '1차': { method: '선택형 필기', time: '120분' },
  '2차': { method: '논문형 기본, 선택형·기입형 병행', time: '100분' },
};
