import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allProjects, ontology, buildDate } from '../../../lib/infoData';
import { currentStage, openDeadlines, timeline, stageMap, articleUrl } from '../../../lib/infoModel.mjs';
import { SITE } from '../../../lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return allProjects().map((p) => ({ id: p.id }));
}

const find = (id) => allProjects().find((p) => p.id === id);

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = find(id);
  return p ? { title: `${p.name} 보상 진행현황`, description: `${p.name}의 보상 단계, 고시, 열람 기한.` } : {};
}

const md = (s) => s.slice(5).replace('-', '/');

export default async function ProjectPage({ params }) {
  const { id } = await params;
  const p = find(id);
  if (!p) notFound();
  const today = buildDate();
  const stage = currentStage(p, ontology);
  const deadlines = openDeadlines(p, today);
  const smap = stageMap(ontology);
  const meta = [`${p.region?.sido || ''} ${p.region?.sigungu || ''}`.trim(), p.type, p.operator,
    p.areaM2 ? `${(p.areaM2 / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}ha` : ''].filter(Boolean);

  return (
    <div className="wrap block narrow">
      <p className="crumb"><Link href="/info/">전국 보상정보</Link></p>
      <header className="page-head">
        <h1>{p.name}</h1>
        <p>{meta.join(' · ')}</p>
      </header>

      {p.sample && (
        <aside className="callout"><h3>예시 데이터</h3><p>화면 구성을 보여 주기 위한 가상의 사업입니다.</p></aside>
      )}

      {deadlines.map((d) => (
        <aside key={d.date + d.title} className="deadline">
          <span className="dday big">D-{d.daysLeft}</span>
          <div>
            <strong>{d.title} · {md(d.period.to)}까지</strong>
            <p>{smap.get(d.stage)?.desc}</p>
          </div>
        </aside>
      ))}

      <h2 className="h2">보상 단계</h2>
      <ol className="stepper">
        {ontology.stages.map((s) => {
          const state = !stage ? '' : s.order < stage.order ? 'done' : s.order === stage.order ? 'now' : '';
          return <li key={s.id} className={state}><span>{s.order}</span>{s.name}</li>;
        })}
      </ol>

      {stage && (
        <section className="stage-now">
          <h3>지금: {stage.name}</h3>
          <p>{stage.desc}</p>
          <p className="laws">
            근거 {ontology.law.short}{' '}
            {stage.articles.map((a, i) => (
              <span key={a}>{i > 0 && ', '}<a href={articleUrl(ontology.law, a)} target="_blank" rel="noopener">제{a}조</a></span>
            ))}
          </p>
          <p className="terms">{stage.terms.map((t) => <span key={t}>{t}</span>)}</p>
        </section>
      )}

      <h2 className="h2">고시·공고</h2>
      <table className="table">
        <thead><tr><th scope="col">날짜</th><th scope="col">단계</th><th scope="col">내용</th></tr></thead>
        <tbody>
          {timeline(p).map((n) => (
            <tr key={n.date + n.title}>
              <th scope="row" className="num">{n.date}</th>
              <td>{smap.get(n.stage)?.name}</td>
              <td>
                {n.url ? <a href={n.url} target="_blank" rel="noopener">{n.title}</a> : n.title}
                {n.period && <small className="period"> 기간 {n.period.from} ~ {n.period.to}</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {p.parcels?.length > 0 && <p className="note">편입 필지 {p.parcels.length}개가 등록되어 있습니다.</p>}
      <p className="note">기준일 {today}. 기한과 내용은 사업시행자 공고 원문으로 확인하세요.</p>

      <div className="cta-row">
        <Link href="/info/" className="btn btn-line">다른 지구 보기</Link>
        <a href={SITE.appPath} className="btn btn-ink">보상 절차 공부하기</a>
      </div>
    </div>
  );
}
