import LegalPage from '../../components/LegalPage';
import { SITE } from '../../lib/site';

export const metadata = { title: '환불 규정' };

export default function Refund() {
  return (
    <LegalPage title="환불 규정">
      <p>구매 전에 무료 샘플 문항으로 학습앱을 써 볼 수 있습니다. 환불은 아래 기준을 따르며, 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령이 이용자에게 더 유리하면 법령을 따릅니다.</p>

      <h2>학습앱 이용권</h2>
      <table className="table">
        <thead><tr><th scope="col">신청 시점</th><th scope="col">환불 금액</th></tr></thead>
        <tbody>
          <tr><th scope="row">결제 후 7일 이내, 이용권 문항을 풀지 않음</th><td>전액</td></tr>
          <tr><th scope="row">결제 후 7일 이내, 이용권 문항을 풂</th><td>결제 금액에서 이용 일수만큼 일할 계산한 금액을 뺀 나머지</td></tr>
          <tr><th scope="row">7일이 지난 뒤</th><td>결제 금액에서 이용 일수만큼 일할 계산한 금액과 결제 금액의 10%를 뺀 나머지</td></tr>
        </tbody>
      </table>

      <h2>교재</h2>
      <p>인쇄 교재는 받은 날부터 7일 이내에 훼손 없이 돌려보내면 전액 환불합니다. 반송비는 단순 변심이면 이용자가, 파본·오배송이면 회사가 부담합니다. PDF 교재는 내려받기 전이면 전액 환불하고, 내려받은 뒤에는 환불이 어렵습니다.</p>

      <h2>온라인 강의</h2>
      <p>결제 후 7일 이내에 강의를 재생하지 않았으면 전액 환불합니다. 재생한 뒤에는 들은 강의 수만큼 공제하고 환불합니다.</p>

      <h2>기관 단체 이용권</h2>
      <p>기관과 맺은 계약의 정산 조항을 따릅니다.</p>

      <h2>신청 방법</h2>
      <p><a href={`mailto:${SITE.email}?subject=${encodeURIComponent('[환불 신청]')}`}>{SITE.email}</a>으로 로그인 이메일, 결제일, 입금자명, 환불 계좌를 보내 주세요. 확인 후 3영업일 안에 환불합니다.</p>
    </LegalPage>
  );
}
