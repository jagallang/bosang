import { SITE, mailto } from '../../lib/site';

export const metadata = { title: '전국 보상정보' };

const FLOW = [
  ['사업 승인·고시', '사업인정 또는 개별법에 따른 사업인정 의제'],
  ['조서 작성', '토지·물건조서 작성, 열람'],
  ['보상계획 공고', '보상계획 열람·이의 제출'],
  ['감정평가', '감정평가법인 2~3곳 평가'],
  ['협의', '보상금 제시와 협의'],
  ['수용재결', '협의 불성립 시 토지수용위원회 재결'],
  ['이의재결·소송', '중앙토지수용위원회 이의신청, 행정소송'],
];

export default function Info() {
  return (
    <div className="wrap section narrow">
      <h1 className="page-title">전국 보상정보</h1>
      <p className="page-lead">
        전국 공익사업의 보상 진행 단계와 공고를 사업지구별로 모아 무료로 공개할 예정입니다.
      </p>

      <div className="card notice">
        <h3>준비 중입니다</h3>
        <p>공개되면 알림을 받고 싶으시면 이메일로 알려 주세요.</p>
        <a className="btn ghost sm" href={mailto('[보상정보 알림 신청]', '관심 지역 또는 사업지구:\n')}>알림 신청</a>
      </div>

      <h2 className="section-title">토지보상 절차 한눈에 보기</h2>
      <ol className="flow">
        {FLOW.map(([t, d], i) => (
          <li key={t}>
            <span className="flow-num">{i + 1}</span>
            <div>
              <strong>{t}</strong>
              <p>{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="muted">
        일반적인 흐름을 단순화한 것이며 사업에 따라 순서와 절차가 다를 수 있습니다. 근거: 공익사업을 위한 토지 등의 취득 및 보상에 관한 법률.
      </p>

      <div className="cta-row center">
        <a href={SITE.appPath} className="btn primary">토지보상법규 문제 풀어보기</a>
      </div>
    </div>
  );
}
