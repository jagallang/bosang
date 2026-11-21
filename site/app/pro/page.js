import Link from 'next/link';
import { SITE, PASSES, won, mailto } from '../../lib/site';

export const metadata = {
  title: '행정사·공인중개사',
  description: '행정사와 공인중개사가 보상 업무로 일을 넓히는 보상관리사 과정.',
};

const ROLES = [
  {
    id: 'admin',
    who: '행정사',
    title: '보상 사건을 맡을 수 있는 실력',
    body: '토지수용위원회 재결에 대한 이의신청서 작성과 제출은 행정사 업무에 해당한다는 법제처 해석이 있습니다. 다만 소송이나 법률 사건의 대리는 할 수 없습니다.',
    topics: ['수용 절차와 재결·이의재결 흐름', '보상금 산정 구조와 감정평가 읽는 법', '이주대책·이주정착금 요건', '이의신청서에 담을 쟁점 정리'],
  },
  {
    id: 'broker',
    who: '공인중개사',
    title: '보상지역 고객을 놓치지 않는 지식',
    body: '사업지구가 지정되면 거래와 상담의 내용이 달라집니다. 수용 일정, 보상 기준일, 택지·대토 요건을 알아야 매수·매도 고객에게 정확히 안내할 수 있습니다.',
    topics: ['공익사업 단계별 일정과 고시 읽는 법', '협의양도인택지·이주자택지 요건', '대토보상과 잔여지 매수청구', '보상지역 매물 상담 시 확인할 것'],
  },
];

const group = mailto('[단체 할인 문의] 행정사·공인중개사', '단체명(행정사회·지회 등):\n담당자·연락처:\n예상 인원:\n');

export default function Pro() {
  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <p className="kicker">행정사 · 공인중개사용</p>
          <h1>보상 업무로<br />일을 넓히세요.</h1>
          <p className="lead">
            보상관리사 자격 과정에 더해, 보상 사건과 보상지역 상담에 바로 쓰는 주제를 직역별로 묶었습니다.
            보상관리사는 보상기관 채용에서 지원 요건으로 쓰이는 공인민간자격이기도 합니다.
          </p>
          <div className="cta-row">
            <a href={SITE.appPath} className="btn btn-seal">무료 문제 풀기</a>
            <a href={group} className="btn btn-line-inv">단체 할인 문의</a>
          </div>
        </div>
      </section>

      <div className="wrap block">
        <div className="roles">
          {ROLES.map((r) => (
            <section key={r.id} className="role" id={r.id}>
              <p className="role-who">{r.who}</p>
              <h2>{r.title}</h2>
              <p className="role-body">{r.body}</p>
              <h3>다루는 주제</h3>
              <ul className="ticks stack">{r.topics.map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          ))}
        </div>

        <h2 className="h2">과정 구성</h2>
        <table className="table">
          <thead><tr><th scope="col">과정</th><th scope="col">내용</th><th scope="col">가격</th></tr></thead>
          <tbody>
            <tr><th scope="row">학습앱</th><td>1·2차 전 과목 간격반복, 오답노트, 모의고사</td><td>월 {won(PASSES[0].price)} · 연 {won(PASSES[1].price)}</td></tr>
            <tr><th scope="row">자격 과정</th><td>학습앱 + 교재 + 온라인 강의</td><td>{won(300000)}</td></tr>
            <tr><th scope="row">직역별 실무 과정</th><td>위의 주제를 사례 중심으로 다루는 짧은 과정</td><td>준비 중</td></tr>
          </tbody>
        </table>
        <p className="note">행정사회·공인중개사 지회 단위로 신청하면 단체 할인을 드립니다.</p>

        <aside className="callout">
          <h3>알아 두실 점</h3>
          <p>이 페이지의 업무 범위 설명은 일반적인 안내이며 법률 자문이 아닙니다. 구체적인 사건의 수임 가능 여부는 소속 협회나 변호사에게 확인하세요.</p>
        </aside>

        <div className="cta-row">
          <Link href="/books/" className="btn btn-ink">교재·이용권 보기</Link>
          <a href={group} className="btn btn-line">단체 할인 문의</a>
        </div>
      </div>
    </>
  );
}
