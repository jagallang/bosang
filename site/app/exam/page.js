import { SITE } from '../../lib/site';

export const metadata = { title: '보상관리사 시험 안내' };

const ROWS = [
  ['1차', '민법', '객관식'],
  ['1차', '부동산관계법규', '객관식'],
  ['1차', '토지보상법규', '객관식'],
  ['2차', '보상실무 1', '객관식·서술형'],
  ['2차', '보상실무 2', '객관식·서술형'],
];

export default function Exam() {
  return (
    <div className="wrap block narrow">
      <header className="page-head">
        <h1>보상관리사 시험 안내</h1>
        <p>보상드림 학습앱과 교재가 다루는 과목과 채점 기준입니다.</p>
      </header>

      <table className="table">
        <caption className="h2">과목 구성</caption>
        <thead><tr><th scope="col">시험</th><th scope="col">과목</th><th scope="col">학습앱 문항 형식</th></tr></thead>
        <tbody>
          {ROWS.map(([s, n, t], k) => (
            <tr key={n}>
              {(k === 0 || ROWS[k - 1][0] !== s) && <th scope="row" rowSpan={ROWS.filter((r) => r[0] === s).length}>{s}</th>}
              <td>{n}</td><td>{t}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="h2">합격 기준</h2>
      <dl className="score-rule wide">
        <div><dt>과목별 만점</dt><dd>100<small>점</small></dd></div>
        <div><dt>과락</dt><dd>40<small>점 미만</small></dd></div>
        <div><dt>합격</dt><dd>60<small>점 이상 평균</small></dd></div>
      </dl>
      <p className="note">학습앱 모의고사는 이 기준으로 채점합니다.</p>

      <aside className="callout">
        <h3>시험 일정과 접수</h3>
        <p>시험 일정, 접수 기간, 응시료는 매년 시행기관 공고로 정해집니다. 응시 전에 시행기관의 최신 공고를 확인하세요.</p>
      </aside>

      <a href={SITE.appPath} className="btn btn-ink">1차 문제 풀어 보기</a>
    </div>
  );
}
