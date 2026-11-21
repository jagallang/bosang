import Link from 'next/link';
import { SITE, BOOKS, PASSES, won } from '../lib/site';

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">보상관리사 1·2차 대비</p>
          <h1>
            외우는 공부는 앱으로,<br />
            쓰는 공부는 교재로.
          </h1>
          <p className="lead">
            간격반복 학습앱으로 객관식을 매일 굴리고, 서술형 예제집으로 2차 답안 구조를 잡습니다.
          </p>
          <div className="cta-row">
            <a href={SITE.appPath} className="btn primary">무료 문제 풀어보기</a>
            <Link href="/books/" className="btn ghost">교재·이용권 보기</Link>
          </div>
          <p className="hint">로그인 없이 과목별 샘플 문항을 바로 풀 수 있습니다.</p>
        </div>
      </section>

      <section className="wrap section">
        <h2 className="section-title">보상드림이 하는 일</h2>
        <div className="grid3">
          <Link href="/exam/" className="card link-card">
            <div className="card-kicker">시험</div>
            <h3>보상관리사 시험 안내</h3>
            <p>1차 3과목, 2차 2과목의 구성과 합격 기준을 정리했습니다.</p>
          </Link>
          <Link href="/books/" className="card link-card">
            <div className="card-kicker">교재 {BOOKS.length}종 · 이용권</div>
            <h3>교재와 학습앱 이용권</h3>
            <p>두문자 요약노트, 2차 서술형 예제, 통합문제집. 학습앱 이용권 {won(PASSES[0].price)}부터.</p>
          </Link>
          <Link href="/info/" className="card link-card">
            <div className="card-kicker">무료 · 준비 중</div>
            <h3>전국 보상정보</h3>
            <p>사업지구별 보상 진행 단계와 공고를 한곳에서 볼 수 있도록 준비하고 있습니다.</p>
          </Link>
        </div>
      </section>

      <section className="band">
        <div className="wrap section">
          <h2 className="section-title">학습앱은 이렇게 돌아갑니다</h2>
          <div className="grid3">
            <div className="feature">
              <div className="feature-num">01</div>
              <h3>간격반복 5단계</h3>
              <p>맞힌 문제는 1·2·4·8·16일 뒤에 다시, 틀린 문제는 다음 날 다시 나옵니다.</p>
            </div>
            <div className="feature">
              <div className="feature-num">02</div>
              <h3>실전 모의고사</h3>
              <p>과목별 균형 출제, 과목 40점 미만 과락·평균 60점 합격 기준으로 채점합니다.</p>
            </div>
            <div className="feature">
              <div className="feature-num">03</div>
              <h3>서술형 키워드 채점</h3>
              <p>2차 서술형은 답안을 쓴 뒤 핵심 키워드를 스스로 체크해 점수를 매깁니다.</p>
            </div>
          </div>
          <div className="cta-row center">
            <a href={SITE.appPath} className="btn primary">학습앱 열기</a>
          </div>
        </div>
      </section>
    </>
  );
}
