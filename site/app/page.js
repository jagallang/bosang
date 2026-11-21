import Link from 'next/link';
import ExamSheet from '../components/ExamSheet';
import { SITE, PASSES, won } from '../lib/site';

const BOXES = [1, 2, 4, 8, 16];
const INDEX = [
  { href: '/exam/', title: '시험 안내', body: '1차 민법·부동산관계법규·토지보상법규, 2차 보상실무 1·2의 구성과 합격 기준.' },
  { href: '/books/', title: '교재·이용권', body: `두문자 요약노트와 2차 서술형 예제집, 학습앱 전체 문항 이용권 ${won(PASSES[0].price)}부터.` },
  { href: '/info/', title: '전국 보상정보', body: '사업지구별 보상 진행 단계를 무료로 공개할 준비를 하고 있습니다.' },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <h1>보상관리사 합격,<br />조문부터 답안까지.</h1>
            <p className="lead">
              객관식은 간격반복 학습앱으로 매일 굴리고, 2차 서술형은 예제집으로 답안 구조를 잡습니다.
              2022년 기출문제 한 문제를 바로 풀어 보세요.
            </p>
            <div className="cta-row">
              <a href={SITE.appPath} className="btn btn-seal">무료 문제 풀기</a>
              <Link href="/books/" className="btn btn-line-inv">교재·이용권 보기</Link>
            </div>
          </div>
          <ExamSheet />
        </div>
      </section>

      <section className="wrap block">
        <h2 className="h2">보상드림에서 할 수 있는 것</h2>
        <ul className="index">
          {INDEX.map((x) => (
            <li key={x.href}>
              <Link href={x.href}>
                <strong>{x.title}</strong>
                <span>{x.body}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="paper-band">
        <div className="wrap block two-col">
          <div>
            <h2 className="h2">맞힌 문제는 간격을 두고 다시 나옵니다</h2>
            <p className="body">
              처음 맞힌 문제는 하루 뒤, 다시 맞히면 이틀 뒤, 그다음은 나흘 뒤에 나옵니다. 틀리면 첫 칸으로 돌아가 다음 날 다시 풉니다.
              매일 나오는 복습 문제만 풀어도 잊어버리기 직전에 한 번씩 다시 보게 됩니다.
            </p>
            <a href={SITE.appPath} className="btn btn-ink">오늘 복습 시작</a>
          </div>
          <figure className="leitner" aria-label="간격반복 5단계: 1일, 2일, 4일, 8일, 16일 뒤 복습">
            <ol>
              {BOXES.map((d, k) => (
                <li key={d} style={{ '--h': `${28 + k * 16}%` }}>
                  <span className="lb-bar" />
                  <span className="lb-day">{d}일 뒤</span>
                  <span className="lb-step">{k + 1}단계</span>
                </li>
              ))}
            </ol>
            <figcaption>틀리면 1단계로</figcaption>
          </figure>
        </div>
      </section>

      <section className="wrap block">
        <div className="rule-row">
          <div>
            <h2 className="h2">모의고사는 실제 합격 기준으로 채점합니다</h2>
            <p className="body">과목별로 고르게 출제하고, 한 과목이라도 40점 미만이면 과락으로 표시합니다.</p>
          </div>
          <dl className="score-rule">
            <div><dt>과락</dt><dd>40<small>점 미만</small></dd></div>
            <div><dt>합격</dt><dd>60<small>점 이상 평균</small></dd></div>
          </dl>
        </div>
      </section>
    </>
  );
}
