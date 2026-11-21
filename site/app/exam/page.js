import { SITE } from '../../lib/site';

export const metadata = { title: '보상관리사 시험 안내' };

const STAGES = [
  { stage: '1차', type: '객관식', subjects: ['민법', '부동산관계법규', '토지보상법규'] },
  { stage: '2차', type: '객관식 + 서술형', subjects: ['보상실무 1', '보상실무 2'] },
];

export default function Exam() {
  return (
    <div className="wrap section narrow">
      <h1 className="page-title">보상관리사 시험 안내</h1>
      <p className="page-lead">보상드림 학습앱과 교재가 다루는 과목 구성입니다.</p>

      <div className="grid2">
        {STAGES.map((s) => (
          <article key={s.stage} className="card">
            <div className="card-kicker">{s.type}</div>
            <h3>{s.stage} 시험</h3>
            <ul className="checks">{s.subjects.map((x) => <li key={x}>{x}</li>)}</ul>
          </article>
        ))}
      </div>

      <div className="card">
        <h3>합격 기준 (학습앱 모의고사 채점 기준)</h3>
        <ul className="checks">
          <li>과목별 100점 만점</li>
          <li>한 과목이라도 40점 미만이면 과락</li>
          <li>과락 없이 전 과목 평균 60점 이상이면 합격</li>
        </ul>
      </div>

      <div className="card notice">
        <h3>시험 일정·접수</h3>
        <p>
          시험 일정, 접수 기간, 응시료는 매년 시행기관 공고로 정해집니다. 응시 전에 반드시 시행기관의 최신 공고를 확인하세요.
        </p>
      </div>

      <div className="cta-row center">
        <a href={SITE.appPath} className="btn primary">1차 문제 풀어보기</a>
      </div>
    </div>
  );
}
