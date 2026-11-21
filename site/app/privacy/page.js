import LegalPage from '../../components/LegalPage';
import { SITE } from '../../lib/site';

export const metadata = { title: '개인정보처리방침' };

export default function Privacy() {
  const b = SITE.business;
  return (
    <LegalPage title="개인정보처리방침">
      <p>{b.company || '보상드림'}은 서비스 제공에 꼭 필요한 개인정보만 처리하며, 「개인정보 보호법」을 지킵니다.</p>

      <h2>1. 처리하는 개인정보와 목적</h2>
      <table className="table">
        <thead><tr><th scope="col">항목</th><th scope="col">목적</th><th scope="col">보유 기간</th></tr></thead>
        <tbody>
          <tr><th scope="row">구글 계정 이메일, 이름</th><td>로그인, 이용권 확인</td><td>탈퇴(삭제 요청) 시까지</td></tr>
          <tr><th scope="row">학습 기록(푼 문항, 정답 여부, 학습일, 모의고사 점수)</th><td>간격반복 학습, 기기 간 진도 동기화</td><td>탈퇴(삭제 요청) 시까지</td></tr>
          <tr><th scope="row">입금자명, 결제일, 금액</th><td>이용권 개통, 환불</td><td>관계 법령에 따른 기간</td></tr>
          <tr><th scope="row">문의 메일 내용</th><td>문의 답변</td><td>답변 후 1년</td></tr>
        </tbody>
      </table>
      <p>로그인하지 않고 무료 문항을 풀면 학습 기록은 이용자 기기 안에만 저장되며 회사로 보내지지 않습니다.</p>

      <h2>2. 기관 단체 이용권의 학습 현황 제공</h2>
      <p>기관이 계약해 열어 준 이용권으로 공부하는 경우, 해당 기관 교육 담당자에게 학습일수, 푼 문항 수, 정답률, 숙련도, 모의고사 점수를 매달 제공합니다. 이 사실은 개통할 때 안내하며, 기관 이용권이 아닌 개인 이용권의 기록은 누구에게도 제공하지 않습니다.</p>

      <h2>3. 처리 위탁과 국외 이전</h2>
      <p>로그인과 데이터 저장에 Google LLC의 Firebase(인증, 데이터베이스, 호스팅)를 씁니다. 데이터는 Google의 국외 서버에 저장될 수 있습니다. 구체적인 이전 국가, 일시, 방법은 확정 후 이 항목에 적습니다.</p>

      <h2>4. 이용자의 권리</h2>
      <p>이용자는 언제든지 자기 개인정보의 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다. 학습앱의 &lsquo;진도 초기화&rsquo;로 기록을 지울 수 있고, 계정 자체의 삭제는 메일로 요청하면 바로 처리합니다.</p>

      <h2>5. 개인정보 보호책임자</h2>
      <p>{b.owner ? `${b.owner}, ` : ''}<a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
    </LegalPage>
  );
}
