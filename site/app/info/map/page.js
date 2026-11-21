import Link from 'next/link';
import InfoMap from '../../../components/InfoMap';
import { mapItems, buildDate } from '../../../lib/infoData';

export const metadata = {
  title: '보상정보 지도',
  description: '전국 공익사업 지구의 위치와 보상 진행 단계를 지도에서 봅니다.',
};

export default function MapPage() {
  const items = mapItems();
  const counts = items.reduce((m, x) => ({ ...m, [x.precision]: (m[x.precision] || 0) + 1 }), {});
  return (
    <div className="wrap block map-page">
      <p className="crumb"><Link href="/info/">전국 보상정보</Link></p>
      <header className="page-head">
        <h1>보상정보 지도</h1>
        <p>사업지구가 어디에 있고 보상이 어느 단계까지 왔는지 봅니다. 지구를 누르면 진행현황으로 갑니다.</p>
      </header>
      <InfoMap items={items} />
      <p className="note">
        기준일 {buildDate()}. 지구 경계 {counts.boundary || 0}곳 · 필지 {counts.parcels || 0}곳 · 경계 미수집 {counts.sigungu || 0}곳.
        경계를 아직 모은 지구는 시군구 범위를 점선으로 표시하며, 점 위치는 실제 사업지 위치가 아닙니다.
        시군구 경계: 통계청 SGIS 2018.
      </p>
    </div>
  );
}
