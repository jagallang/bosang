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
    <div className="wrap block narrow">
      <header className="page-head">
        <h1>전국 보상정보</h1>
        <p>전국 공익사업의 보상 진행 단계와 공고를 사업지구별로 모아 무료로 공개할 예정입니다.</p>
      </header>

      <aside className="callout">
        <h3>준비 중입니다</h3>
        <p>공개 소식을 받으려면 관심 지역이나 사업지구를 이메일로 알려 주세요.</p>
        <a className="btn btn-line sm" href={mailto('[보상정보 알림 신청]', '관심 지역 또는 사업지구:\n')}>공개 알림 신청</a>
      </aside>

      <h2 className="h2">토지보상 절차</h2>
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
      <p className="note">
        일반적인 흐름을 단순화한 것이며 사업에 따라 순서와 절차가 다를 수 있습니다. 근거: 공익사업을 위한 토지 등의 취득 및 보상에 관한 법률.
      </p>

      <a href={SITE.appPath} className="btn btn-ink">토지보상법규 문제 풀어 보기</a>
    </div>
  );
}
