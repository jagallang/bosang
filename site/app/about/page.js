import Link from 'next/link';
import { SITE } from '../../lib/site';
import { KLCMA } from '../../lib/exam';

export const metadata = {
  title: '보상관리사란?',
  description: '공익사업 토지 등의 보상업무를 전문적으로 관리하는 국토교통부 공인 민간자격, 보상관리사.',
};

const DUTIES = [
  ['기초 조사와 현장 조사', '보상계획 수립·공고·통지, 토지·건축물 등 공부 조사, 권리관계 조사, 토지조서·물건조서 작성을 위한 조사, 잔여지·거주자·분묘 조사와 이주비·이장비 등 보상액 산정'],
  ['보상 협의와 계약', '보상협의와 계약 체결, 보상금 지급, 소유권이전 등기 신청, 국·공유지 협의와 취득'],
  ['재결과 민원 지원', '이의신청 등 민원과 소송 지원, 재결 신청, 재결보상금 지급·공탁'],
];

const FIELDS = ['국가·지방자치단체의 보상 관련 부서', '보상전문기관', '보상전문회사와 감정평가업체', '건설회사·조합 등 민간기업'];

export default function About() {
  return (
    <div className="wrap block narrow">
      <header className="page-head">
        <h1>보상관리사란?</h1>
        <p>
          도로·택지·산업단지 같은 공익사업에 편입되는 토지와 물건의 보상업무를 전문적으로 관리할 수 있는 직무능력을 인정하는 자격입니다.
          보상전문 교육과정(실무연수)을 이수하고 자격검정시험에 합격하면 취득합니다.
        </p>
      </header>

      <h2 className="h2">자격 정보</h2>
      <table className="table">
        <tbody>
          <tr><th scope="row">종류</th><td>공인 민간자격</td></tr>
          <tr><th scope="row">공인</th><td>국토교통부장관 공인 제2022-2호</td></tr>
          <tr><th scope="row">등록</th><td>민간자격 등록 제2013-2176호</td></tr>
          <tr><th scope="row">관리·발급</th><td>(사)한국토지보상관리사협회</td></tr>
        </tbody>
      </table>

      <h2 className="h2">하는 일</h2>
      <p className="body">보상업무는 사업 준비부터 협의, 수용재결까지 이어집니다. 보상관리사는 이 과정 전체를 맡습니다. 다만 보상액의 감정평가는 감정평가사가, 소송 대리는 변호사가 합니다.</p>
      <ol className="steps">
        {DUTIES.map(([t, d]) => <li key={t}><strong>{t}</strong> — {d}</li>)}
      </ol>

      <h2 className="h2">어디서 일하나요</h2>
      <ul className="ticks stack">{FIELDS.map((f) => <li key={f}>{f}</li>)}</ul>
      <p className="note">토지보상법 시행령 제43조는 사업시행자가 보상업무를 위탁할 수 있는 보상전문기관을 정합니다.</p>

      <h2 className="h2">취득 절차</h2>
      <ol className="steps">
        <li>1차 시험(민법, 부동산관계법규, 토지보상법규)에 합격합니다. 응시 제한은 없습니다.</li>
        <li>협회의 실무연수(보상전문과정)를 이수합니다. 20시간이며, 보상실무경력 2년 미만이면 기본조사 실습을 더해 24시간입니다.</li>
        <li>2차 시험(보상실무 1·2)에 합격하면 자격을 받습니다.</li>
      </ol>

      <aside className="callout">
        <h3>최신 공고를 확인하세요</h3>
        <p>
          이 페이지는 {KLCMA.checked} 기준으로 <a href={KLCMA.url} target="_blank" rel="noopener">한국토지보상관리사협회</a> 안내를 정리한 것입니다.
          응시료·일정·출제 방식은 해마다 바뀔 수 있으니 협회 공지를 확인하세요.
        </p>
      </aside>

      <div className="cta-row">
        <Link href="/exam/" className="btn btn-ink">시험 과목과 합격 기준 보기</Link>
        <a href={SITE.appPath} className="btn btn-line">문제 풀어 보기</a>
      </div>
    </div>
  );
}
