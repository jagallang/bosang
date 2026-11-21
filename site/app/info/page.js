import Link from 'next/link';
import ProjectTable from '../../components/ProjectTable';
import { ontology, summaries, buildDate } from '../../lib/infoData';
import { articleUrl } from '../../lib/infoModel.mjs';
import { SITE } from '../../lib/site';

export const metadata = {
  title: '전국 보상정보',
  description: '전국 공익사업 지구별 보상 진행 단계와 고시, 다가오는 열람 기한.',
};

export default function Info() {
  const items = summaries();
  const hasSample = items.some((i) => i.sample);
  return (
    <div className="wrap block">
      <header className="page-head">
        <h1>전국 보상정보</h1>
        <p>공익사업 지구마다 지금 어느 보상 단계에 있는지, 열람 기한이 언제까지인지 한곳에서 봅니다. 무료입니다.</p>
      </header>

      {hasSample && (
        <aside className="callout">
          <h3>예시 데이터</h3>
          <p>&lsquo;예시&rsquo; 표시가 붙은 지구는 화면 구성을 보여 주기 위한 가상의 사업입니다. 실제 고시를 수집해 채우는 중입니다.</p>
        </aside>
      )}

      <h2 className="h2">사업지구</h2>
      <ProjectTable items={items} stageCount={ontology.stages.length} />
      <p className="note">기준일 {buildDate()}. 고시 원문과 다를 수 있으니 중요한 기한은 사업시행자 공고로 확인하세요.</p>

      <h2 className="h2">토지보상 절차</h2>
      <ol className="flow">
        {ontology.stages.map((s) => (
          <li key={s.id}>
            <span className="flow-num">{s.order}</span>
            <div>
              <strong>{s.name}</strong>
              <p>{s.desc}</p>
              <p className="laws">
                {ontology.law.short}{' '}
                {s.articles.map((a, i) => (
                  <span key={a}>{i > 0 && ', '}<a href={articleUrl(ontology.law, a)} target="_blank" rel="noopener">제{a}조</a></span>
                ))}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <p className="note">일반적인 흐름이며 사업에 따라 순서가 다를 수 있습니다.</p>

      <div className="cta-row">
        <a href={SITE.appPath} className="btn btn-ink">토지보상법규 문제 풀어 보기</a>
        <Link href="/pro/" className="btn btn-line">행정사·공인중개사용 과정</Link>
      </div>
    </div>
  );
}
