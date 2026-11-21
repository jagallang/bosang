import Link from 'next/link';
import { ontology, termQuestionCounts } from '../../../lib/infoData';
import { articleUrl } from '../../../lib/infoModel.mjs';
import { SITE } from '../../../lib/site';

export const metadata = {
  title: '토지보상 개념지도',
  description: '보상 절차 7단계별 핵심 용어와 근거 조문, 시험 출제 빈도.',
};

export const termId = (t) => `t-${encodeURIComponent(t.replace(/\s+/g, '-'))}`;

export default function Terms() {
  const counts = termQuestionCounts();
  return (
    <div className="wrap block">
      <p className="crumb"><Link href="/info/">전국 보상정보</Link></p>
      <header className="page-head">
        <h1>토지보상 개념지도</h1>
        <p>보상 절차의 단계마다 알아야 할 용어와 근거 조문을 묶었습니다. 숫자는 보상드림 문제은행에서 그 용어가 나오는 문항 수입니다.</p>
      </header>
      <ol className="concept-map">
        {ontology.stages.map((s) => (
          <li key={s.id} id={s.id}>
            <div className="cm-stage">
              <span className="cm-no">{s.order}</span>
              <div>
                <h2>{s.name}</h2>
                <p className="laws">
                  {ontology.law.short}{' '}
                  {s.articles.map((a, i) => (
                    <span key={a}>{i > 0 && ', '}<a href={articleUrl(ontology.law, a)} target="_blank" rel="noopener">제{a}조</a></span>
                  ))}
                </p>
              </div>
            </div>
            <ul className="cm-terms">
              {s.terms.map((t) => (
                <li key={t} id={termId(t)}>
                  <span>{t}</span>
                  {counts[t] > 0 && <small title="문제은행 관련 문항 수">{counts[t]}문항</small>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="cta-row">
        <a href={SITE.appPath} className="btn btn-ink">학습앱에서 문제 풀기</a>
        <Link href="/info/" className="btn btn-line">사업지구 보기</Link>
      </div>
    </div>
  );
}
