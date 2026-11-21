import Link from 'next/link';
import ExamSheet from '../components/ExamSheet';
import { SITE, PASSES, won } from '../lib/site';

const BOXES = [1, 2, 4, 8, 16];
const PATHS = [
  { href: '/business/', who: '기관 교육 담당자', title: '직원 자격 취득을 기관 단위로', body: '단체 이용권 일괄 개통과 월간 학습 리포트. 10명 1개월 무료 파일럿부터 시작합니다.' },
  { href: '/pro/', who: '행정사 · 공인중개사', title: '보상 업무로 일을 넓히기', body: '보상관리사 자격 과정과, 보상 사건·보상지역 상담에 바로 쓰는 실무 주제를 정리했습니다.' },
  { href: '/books/', who: '수험생', title: '혼자 준비하는 1·2차', body: `학습앱 이용권 ${won(PASSES[0].price)}부터, 두문자 노트와 2차 서술형 예제집.` },
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
              옆의 샘플 문제를 바로 풀어 보세요.
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
        <h2 className="h2">어떤 분이신가요?</h2>
        <ul className="index paths">
          {PATHS.map((x) => (
            <li key={x.href}>
              <Link href={x.href}>
                <strong><small>{x.who}</small>{x.title}</strong>
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
