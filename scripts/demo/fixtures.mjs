/**
 * 가상 데이터 생성 (실제 자료를 붙이기 전 파이프라인 시험용).
 * 사업지구·동 이름은 지어낸 것이다. 시도·시군구와 형식(고시번호, PNU 19자리, 온비드 필드)만 실제를 따른다.
 */

// 결정적 난수 (같은 seed면 같은 데이터)
export function rng(seed = 20261121) {
  let s = seed >>> 0;
  const next = () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; s ^= s >>> 13; return (s >>> 0) / 4294967296; };
  return { next, int: (a, b) => a + Math.floor(next() * (b - a + 1)), pick: (arr) => arr[Math.floor(next() * arr.length)] };
}

const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

// 가상 사업지구. code = 시군구코드(5) + 가상 읍면동코드(5)
export const PROJECTS = [
  { name: '누리1 공공주택지구', kw: '공공주택지구', sido: '경기도', sigungu: '화성시', dong: '누리동', code: '4159099901', operator: '한국토지주택공사', start: '2024-09-10', upTo: 'negotiation' },
  { name: '한빛 도시첨단산업단지', kw: '산업단지', sido: '충청남도', sigungu: '천안시 서북구', dong: '한빛리', code: '4413399902', operator: '충남개발공사', start: '2025-01-15', upTo: 'appraisal' },
  { name: '가온2 택지개발지구', kw: '택지개발지구', sido: '경기도', sigungu: '평택시', dong: '가온동', code: '4122099903', operator: '경기주택도시공사', start: '2024-03-04', upTo: 'adjudication' },
  { name: '솔빛 도시개발구역', kw: '도시개발구역', sido: '전라남도', sigungu: '나주시', dong: '솔빛동', code: '4617099904', operator: '나주시', start: '2025-06-20', upTo: 'plan' },
  { name: '다온 공공주택지구', kw: '공공주택지구', sido: '인천광역시', sigungu: '서구', dong: '다온동', code: '2826099905', operator: '인천도시공사', start: '2026-02-11', upTo: 'designation' },
  { name: '미르 일반산업단지', kw: '산업단지', sido: '경상남도', sigungu: '김해시', dong: '미르리', code: '4825099906', operator: '김해시', start: '2023-11-01', upTo: 'objection' },
];

const STAGES = ['designation', 'survey', 'plan', 'appraisal', 'negotiation', 'adjudication', 'objection'];
const TITLE = {
  designation: (p) => `${p.name} 지정 및 지형도면 고시`.replace('지정 및 지형도면', p.kw.includes('구역') ? '구역 지정' : '지구 지정'),
  survey: (p) => `${p.name} 토지·물건 기본조사 실시 공고`,
  plan: (p) => `${p.name} 토지 및 물건 보상계획 공고`,
  appraisal: (p) => `${p.name} 감정평가업자 추천 안내 공고`,
  negotiation: (p) => `${p.name} 손실보상 협의 요청 공고`,
  adjudication: (p) => `${p.name} 수용재결 신청에 따른 열람 공고`,
  objection: (p) => `${p.name} 이의재결 결과 공고`,
};
// 단계 사이 간격(일): 실제 사업 평균이 아니라 화면 시험용 값
const GAP = { survey: 120, plan: 150, appraisal: 60, negotiation: 90, adjudication: 150, objection: 180 };

/** 토지이음 고시목록 형식의 행 (보상 고시 + 걸러져야 할 잡음) */
export function eumRows(r = rng()) {
  const rows = [];
  let no = 100;
  const gosiNo = (p, d) => `${p.sido} 고시 제${d.slice(0, 4)}-${no++}호`;
  for (const p of PROJECTS) {
    let d = p.start;
    for (const st of STAGES.slice(0, STAGES.indexOf(p.upTo) + 1)) {
      if (st !== 'designation') d = addDays(d, GAP[st] + r.int(-20, 20));
      rows.push({ 고시번호: gosiNo(p, d), 고시일: d.replace(/-/g, '.'), 접속경로: `https://example.invalid/eum/${no}`, 고시제목: (st === 'designation' && r.next() < 0.5 ? '[신규] ' : '') + TITLE[st](p) });
    }
    // 실시계획 변경 같은 추가 지정 고시
    rows.push({ 고시번호: gosiNo(p, addDays(p.start, 200)), 고시일: addDays(p.start, 200), 접속경로: '', 고시제목: `${p.name} 실시계획 변경인가 고시` });
  }
  const noise = [
    ['경기도 화성시 고시 제2025-501호', '2025-04-02', '화성 도시관리계획(용도지역) 변경 결정 고시'],
    ['경기도 평택시 고시 제2025-502호', '2025-05-12', '가온 지구단위계획 결정(변경) 및 지형도면 고시'],
    ['충청남도 고시 제2025-503호', '2025-07-01', '지방도 600호선 도로 확포장공사 수용재결 신청 공고'],
    ['', '2025-08-08', '별빛 도시개발구역 지정 고시'],
    ['경상남도 고시 제2019-504호', '2019-03-03', '오래된 산업단지 지정 고시'],
    ['인천광역시 고시 제2025-505호', '2025-09-09', '개발행위허가 제한지역 지정 고시'],
    ['경기도 고시 제2025-506호', '2025-10-10', '회의 결과 알림'],
  ];
  for (const [n, d, t] of noise) rows.push({ 고시번호: n, 고시일: d, 접속경로: '', 고시제목: t });
  return rows;
}

/** 경북개발공사 보상계획공고 형식 */
export function compPlanRows() {
  return [
    { 보상계획번호: 'D-1', 사업명: '별내음 일반산업단지', 보상공고명: '별내음 일반산업단지 보상계획 공고', 공고일자: '2026-10-05', 개별통보일자: '2026-10-06', 공람신청시작일자: '2026-10-07', 공람신청종료일자: '2026-10-21', 공람장소: '가상군청' },
    { 보상계획번호: 'D-2', 사업명: '하람 도시개발사업', 보상공고명: '하람 도시개발사업 보상계획 공고', 공고일자: '2026-11-16', 개별통보일자: '2026-11-17', 공람신청시작일자: '2026-11-18', 공람신청종료일자: '2026-12-02', 공람장소: '가상시청' },
  ];
}

const pnuOf = (code, main, sub, mountain = false) => `${code}${mountain ? '2' : '1'}${String(main).padStart(4, '0')}${String(sub).padStart(4, '0')}`;

/** 사업지구 필지 (토지조서에서 옮겨 적었다고 가정) */
export function parcelRows(r = rng(7)) {
  const out = [];
  for (const p of PROJECTS) {
    for (let i = 0; i < 25; i++) {
      const main = 100 + i * 3, sub = r.next() < 0.5 ? 0 : r.int(1, 9);
      out.push({ project_name: p.name, pnu: pnuOf(p.code, main, sub), address: `${p.sido} ${p.sigungu} ${p.dong} ${main}${sub ? `-${sub}` : ''}` });
    }
  }
  return out;
}

const USE = [
  ['10100', '토지', ['대지', '전', '답', '임야', '잡종지']],
  ['10200', '주거용건물', ['아파트', '단독주택', '다세대주택']],
  ['10300', '상가용및업무용건물', ['근린생활시설', '사무실']],
];
const PRPT = [['0007', '압류재산'], ['0005', '기타일반재산'], ['0010', '국유재산'], ['0011', '공공개발재산']];

/**
 * 온비드 부동산 물건목록 item 형식 (명세 필드 이름 그대로). PNU는 0/1 표기로 낸다(보고된 온비드 방식).
 * 토지 물건 중 일부는 가상 사업지구 필지와 같고, 일부는 같은 시군구, 나머지는 무관.
 */
export function onbidItems(r = rng(11), today = '2026-11-21') {
  const parcels = parcelRows();
  const items = [];
  let seq = 1;
  const ymdhm = (d, hm) => d.replace(/-/g, '') + hm;
  const base = (use) => {
    const [mCd, mNm, sList] = use;
    const [pCd, pNm] = r.pick(PRPT);
    const apsl = r.int(30, 900) * 1000000;
    const fails = r.int(0, 5);
    const start = addDays(today, r.int(-3, 40));
    const min = Math.round(apsl * Math.max(0.3, 1 - 0.1 * fails));
    const no = `2026-${String(1000 + seq).padStart(4, '0')}-${String(r.int(1, 999)).padStart(3, '0')}`;
    seq++;
    return {
      cltrMngNo: no, pbctCdtnNo: String(r.int(1000000, 9999999)), onbidCltrno: String(r.int(1e6, 9e6)), onbidPbancNo: `202611-${r.int(10000, 99999)}-00`,
      prptDivCd: pCd, prptDivNm: pNm, dspsMthodCd: '0001', dspsMthodNm: '매각', bidDivCd: '0001', bidDivNm: '인터넷',
      cltrUsgLclsCtgrId: '10000', cltrUsgLclsCtgrNm: '부동산', cltrUsgMclsCtgrId: mCd, cltrUsgMclsCtgrNm: mNm, cltrUsgSclsCtgrNm: r.pick(sList),
      apslEvlAmt: String(apsl), lowstBidPrcIndctCont: r.next() < 0.03 ? '비공개' : String(min), usbdNft: String(fails),
      cltrBidBgngDt: ymdhm(start, '1000'), cltrBidEndDt: ymdhm(addDays(start, 2), '1700'),
      pbctStatCd: '0001', pbctStatNm: '입찰준비중', pvctTrgtYn: 'N', alcYn: r.next() < 0.2 ? 'Y' : 'N',
      orgNm: pCd === '0007' ? '한국자산관리공사' : '가상기관', rqstOrgNm: pCd === '0007' ? `가상세무서` : '',
      landSqms: String(r.int(50, 5000) + r.int(0, 99) / 100), mdfcnDt: ymdhm(today, '090000'),
    };
  };
  const toZeroOne = (pnu) => pnu.slice(0, 10) + (pnu[10] === '2' ? '1' : '0') + pnu.slice(11);
  // 1) 사업지구 필지와 같은 토지 12건
  for (let i = 0; i < 12; i++) {
    const pc = parcels[r.int(0, parcels.length - 1)];
    const [sido, ...rest] = pc.address.split(' ');
    const emd = rest[rest.length - 2];
    const sgg = rest.slice(0, -2).join(' ');
    const b = base(USE[0]);
    items.push({ ...b, onbidCltrNm: `${pc.address} ${b.cltrUsgSclsCtgrNm}`, lctnSdnm: sido, lctnSggnm: sgg, lctnEmdNm: emd, ltnoPnu: toZeroOne(pc.pnu) });
  }
  // 2) 같은 시군구, 다른 동 토지 10건 (PNU 없는 것 포함)
  for (let i = 0; i < 10; i++) {
    const p = r.pick(PROJECTS);
    const main = r.int(1, 999);
    const pnu = pnuOf(p.code.slice(0, 5) + '10' + String(r.int(100, 999)), main, 0);
    const b = base(USE[0]);
    items.push({ ...b, onbidCltrNm: `${p.sido} ${p.sigungu} 가상${i}동 ${main} ${b.cltrUsgSclsCtgrNm}`, lctnSdnm: p.sido, lctnSggnm: p.sigungu, lctnEmdNm: `가상${i}동`, ltnoPnu: i % 3 ? toZeroOne(pnu) : '' });
  }
  // 3) 무관한 지역 토지 18건, 건물 40건 (서버가 용도로 걸러야 함)
  for (let i = 0; i < 18; i++) items.push({ ...base(USE[0]), onbidCltrNm: `강원특별자치도 가상군 가상면 ${i + 1} 임야`, lctnSdnm: '강원특별자치도', lctnSggnm: '가상군', lctnEmdNm: '가상면', ltnoPnu: '' });
  for (let i = 0; i < 40; i++) items.push({ ...base(r.pick(USE.slice(1))), onbidCltrNm: `서울특별시 가상구 가상동 ${i + 1} 건물`, lctnSdnm: '서울특별시', lctnSggnm: '가상구', lctnEmdNm: '가상동', ltnoPnu: '' });
  // 수의계약 가능 물건 일부
  for (const it of items.filter((_, i) => i % 9 === 4)) { it.pvctTrgtYn = 'Y'; it.pbctStatCd = '0009'; it.pbctStatNm = '수의계약가능'; }
  return items;
}

export const toCsv = (rows) => {
  const head = Object.keys(rows[0]);
  const cell = (v) => { const t = String(v ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return [head.join(','), ...rows.map((r) => head.map((h) => cell(r[h])).join(','))].join('\r\n') + '\r\n';
};

/** 토지이음 웹 목록에 최근 올라온 것처럼 보일 고시 (가상) */
export function eumWebRows(today = '2026-11-21') {
  const d = (n) => new Date(Date.parse(today) - n * 86400000).toISOString().slice(0, 10);
  return [
    { date: d(0), gosiNo: '국토교통부 고시 제2026-901호', kind: '신규', title: '새솔 공공주택지구 지정 및 지형도면 고시', org: '경기도 안성시' },
    { date: d(1), gosiNo: '경기도 고시 제2026-6001호', kind: '신규', title: '푸른들 일반산업단지계획 승인 및 지형도면 고시', org: '경기도' },
    { date: d(1), gosiNo: '경기도 화성시 고시 제2026-990호', kind: '변경', title: '화성 도시관리계획(용도지역) 결정(변경) 및 지형도면 고시', org: '경기도 화성시' },
    { date: d(2), gosiNo: '충청남도 고시 제2026-300호', kind: '신규', title: '한빛 도시첨단산업단지 실시계획 변경승인 고시', org: '충청남도' },
    { date: d(3), gosiNo: '경기도 평택시 고시 제2026-777호', kind: '신규', title: '가온2 택지개발지구 실시계획 변경인가 고시', org: '경기도 평택시' },
    { date: d(20), gosiNo: '경기도 고시 제2026-5000호', kind: '신규', title: '오래된 도시개발구역 지정 고시', org: '경기도' },
  ];
}

/** 브이월드 토지이용계획 가짜 응답: 가상 사업지구 필지는 공공주택지구 '포함' */
export function landUseFixture() {
  const out = {};
  for (const p of parcelRows()) {
    out[p.pnu] = [
      { pnu: p.pnu, prposAreaDstrcCodeNm: '자연녹지지역', cnflcAtNm: '포함' },
      { pnu: p.pnu, prposAreaDstrcCodeNm: p.project_name.includes('산업단지') ? '일반산업단지' : p.project_name.includes('택지') ? '택지개발지구' : '공공주택지구', cnflcAtNm: '포함' },
      { pnu: p.pnu, prposAreaDstrcCodeNm: '토지거래계약에관한허가구역', cnflcAtNm: '포함' },
    ];
  }
  return out;
}
