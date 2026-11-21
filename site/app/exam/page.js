import Link from 'next/link';
import { SITE } from '../../lib/site';
import { KLCMA, SUBJECTS, ROUNDS } from '../../lib/exam';

export const metadata = {
  title: '보상관리사 시험',
  description: '보상관리사 1·2차 시험 과목과 범위, 응시자격, 실무연수, 합격 기준.',
};

export default function Exam() {
  return (
    <div className="wrap block narrow">
      <header className="page-head">
        <h1>보상관리사 시험</h1>
        <p>1차는 법규 3과목 선택형, 2차는 보상실무 2과목 논술 중심입니다. 1차에 붙고 실무연수를 마쳐야 2차를 볼 수 있습니다.</p>
      </header>

      <h2 className="h2">과목과 범위</h2>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th scope="col">시험</th><th scope="col">과목</th><th scope="col">범위</th></tr></thead>
          <tbody>
            {SUBJECTS.map((s, k) => {
              const first = k === 0 || SUBJECTS[k - 1].round !== s.round;
              const n = SUBJECTS.filter((x) => x.round === s.round).length;
              return (
                <tr key={s.name}>
                  {first && (
                    <th scope="row" rowSpan={n}>
                      {s.round}
                      <div className="muted">{ROUNDS[s.round].time}</div>
                    </th>
                  )}
                  <td>{s.name}</td><td>{s.scope}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">검정 방법: 1차 {ROUNDS['1차'].method}, 2차 {ROUNDS['2차'].method}. 시험시간은 차수별 전체 과목 기준입니다.</p>

      <aside className="callout">
        <h3>2026년 제15회 2차 출제 방식</h3>
        <p>협회 공지에 따르면 과목마다 오지선다형 10문제(40점)와 논술형 4~6문제(60점)로 100점이 출제되었고, 2과목을 쉬는 시간 없이 100분에 치렀습니다.</p>
      </aside>

      <h2 className="h2">합격 기준</h2>
      <dl className="score-rule wide">
        <div><dt>과목별 만점</dt><dd>100<small>점</small></dd></div>
        <div><dt>과락</dt><dd>40<small>점 미만</small></dd></div>
        <div><dt>합격</dt><dd>60<small>점 이상 평균</small></dd></div>
      </dl>
      <p className="note">1·2차 같은 기준입니다. 보상드림 학습앱 모의고사도 이 기준으로 채점합니다.</p>

      <h2 className="h2">응시자격</h2>
      <ul className="ticks stack">
        <li>1차는 응시 제한이 없습니다.</li>
        <li>2차는 1차에 합격했거나 면제받고, 협회 실무연수를 이수한 사람이 볼 수 있습니다.</li>
        <li>실무연수는 20시간입니다. 보상실무경력이 2년 미만이면 기본조사 실습을 더해 24시간입니다.</li>
        <li>실무연수는 보상실무경력 1년 이상이거나 1차에 합격한 사람이 신청할 수 있습니다.</li>
        <li>1차에 합격하면 다음 회차 시험에 한해 1차가 면제됩니다.</li>
        <li>1·2차를 같은 날 치르면, 1차에 불합격한 사람의 2차는 무효가 됩니다.</li>
      </ul>
      <p className="note">미성년자, 피성년·피한정후견인 등 결격사유가 있으면 응시할 수 없습니다. 자세한 사유는 <a href={KLCMA.examUrl} target="_blank" rel="noopener">협회 응시자격 안내</a>에 있습니다.</p>

      <aside className="callout">
        <h3>일정과 접수</h3>
        <p>원서 접수, 시험일, 합격자 발표, 응시료는 협회가 회차마다 따로 공지합니다. <a href={KLCMA.noticeUrl} target="_blank" rel="noopener">협회 공지사항</a>에서 확인하세요. ({KLCMA.checked} 기준 정리)</p>
      </aside>

      <div className="cta-row">
        <a href={SITE.appPath} className="btn btn-ink">1차 문제 풀어 보기</a>
        <Link href="/books/" className="btn btn-line">교재 가격 문의</Link>
      </div>
    </div>
  );
}
