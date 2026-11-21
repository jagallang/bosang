import AuctionGate from '../../components/AuctionGate';
import { allProjects } from '../../lib/infoData';

export const metadata = {
  title: '보상경매 (관리자)',
  robots: { index: false, follow: false },
};

export default function Auction() {
  // 사업지구는 이미 공개된 보상정보라 함께 실어도 된다. 경매 물건은 로그인 후 Firestore에서만 받는다.
  const projects = allProjects().map((p) => ({
    id: p.id, name: p.name, sample: !!p.sample, region: p.region || null,
    parcels: (p.parcels || []).map((x) => ({ pnu: x.pnu || '', address: x.address || '' })),
  }));
  return (
    <div className="wrap block">
      <header className="page-head">
        <h1>보상경매</h1>
        <p>관리자 전용입니다. 경매 물건을 보상 진행 중인 사업지구와 맞춰 봅니다.</p>
      </header>
      <AuctionGate projects={projects} />
    </div>
  );
}
