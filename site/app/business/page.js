import { SITE, ORG_PLAN, won, mailto } from '../../lib/site';

export const metadata = {
  title: '기관 도입',
  description: '보상전문기관·공기업 직원의 보상관리사 자격 취득을 기관 단위로 지원합니다.',
};

const INCLUDES = [
  ['단체 이용권 일괄 개통', '직원 이메일 목록을 주시면 한 번에 열어 드립니다. 퇴사·교체도 메일 한 통으로 처리합니다.'],
  ['월간 학습 리포트', '직원별 학습일수, 푼 문항 수, 정답률, 숙련도를 매달 엑셀 파일로 보내 드립니다.'],
  ['1·2차 학습 과정', '1차 3과목 객관식과 2차 보상실무 객관식·서술형을 간격반복 학습앱과 교재로 준비합니다.'],
  ['정산 서류', '견적서, 세금계산서, 수강 확인 자료를 기관 정산 절차에 맞춰 드립니다.'],
];

const STEPS = [
  ['도입 문의', '기관명, 대상 인원, 희망 시작일을 알려 주세요.'],
  [`무료 파일럿 ${ORG_PLAN.pilot.seats}명 · ${ORG_PLAN.pilot.months}개월`, '실제 직원이 써 보고, 첫 리포트로 효과를 확인합니다.'],
  ['견적·계약', '인원과 기간에 맞춘 견적서를 드리고, 기관 계약 절차를 따릅니다.'],
  ['일괄 개통', '계약 인원 전체의 이용권을 한 번에 엽니다.'],
  ['매달 리포트', '교육 담당자에게 학습 현황을 보내 드립니다.'],
];

// 리포트 예시 (가상의 값)
const REPORT = [
  ['직원 A', '1차', 18, 412, 78, 46],
  ['직원 B', '1차', 9, 205, 64, 21],
  ['직원 C', '2차', 22, 380, 71, 52],
];

const inquiry = mailto(
  '[기관 도입 문의] 보상드림',
  '기관명:\n담당 부서·성함:\n연락처:\n대상 인원:\n희망 시작일:\n파일럿 희망 여부:\n'
);

export default function Business() {
  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="kicker">보상전문기관 · 공기업 · 지방공사 교육 담당자용</p>
          <h1>직원 보상관리사 자격,<br />기관 단위로 준비하세요.</h1>
          <p className="lead">
            LH는 2026년 보상 전문역 채용에서 보상 관련 공인민간자격을 지원 요건 중 하나로 두었습니다.
            자격 보유 인원이 곧 보상 조직의 역량 지표가 되고 있습니다.
          </p>
          <div className="cta-row">
            <a href={inquiry} className="btn btn-seal">도입 문의</a>
            <a href={SITE.appPath} className="btn btn-line-inv">학습앱 먼저 보기</a>
          </div>
        </div>
      </section>

      <div className="wrap block">
        <h2 className="h2">기관 도입에 포함되는 것</h2>
        <dl className="spec">
          {INCLUDES.map(([t, d]) => (
            <div key={t}><dt>{t}</dt><dd>{d}</dd></div>
          ))}
        </dl>

        <h2 className="h2">월간 학습 리포트 예시</h2>
        <div className="table-wrap">
          <table className="table report">
            <thead>
              <tr><th scope="col">직원</th><th scope="col">대상</th><th scope="col">학습일수</th><th scope="col">푼 문항</th><th scope="col">정답률</th><th scope="col">숙련도</th></tr>
            </thead>
            <tbody>
              {REPORT.map(([n, s, d, a, c, m]) => (
                <tr key={n}><td>{n}</td><td>{s}</td><td>{d}일</td><td>{a}</td><td>{c}%</td><td><span className="meter" style={{ '--v': `${m}%` }} />{m}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">예시 값입니다. 실제 리포트는 기관 소속 직원만 담아 담당자에게만 보냅니다.</p>

        <h2 className="h2">진행 순서</h2>
        <ol className="flow">
          {STEPS.map(([t, d], i) => (
            <li key={t}>
              <span className="flow-num">{i + 1}</span>
              <div><strong>{t}</strong><p>{d}</p></div>
            </li>
          ))}
        </ol>

        <h2 className="h2">단가</h2>
        <dl className="score-rule wide">
          <div><dt>학습앱 1년</dt><dd>{won(ORG_PLAN.appPerSeat).replace('원', '')}<small>원 / 1인</small></dd></div>
          <div><dt>학습앱 + 온라인 강의</dt><dd>{won(ORG_PLAN.coursePerSeat).replace('원', '')}<small>원 / 1인</small></dd></div>
        </dl>
        <p className="note">{ORG_PLAN.minSeatsForQuote}명 이상은 인원과 기간에 맞춰 견적을 드립니다. 부가세 별도 여부는 견적서에 적습니다.</p>

        <aside className="callout">
          <h3>안내</h3>
          <p>보상드림은 보상관리사 시험을 시행하는 기관이 아니며, 시험 시행기관과 관계없는 독립 학습 서비스입니다. 2차 시험 응시에 필요한 실무연수는 시행기관 안내를 따르세요.</p>
        </aside>

        <a href={inquiry} className="btn btn-ink">도입 문의 메일 쓰기</a>
      </div>
    </>
  );
}
