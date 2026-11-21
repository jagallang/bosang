import Link from 'next/link';
import { SITE } from '../lib/site';

export const metadata = { title: '페이지를 찾을 수 없습니다' };

export default function NotFound() {
  return (
    <div className="wrap block narrow">
      <header className="page-head">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>주소가 바뀌었거나 없는 페이지입니다. 아래에서 찾으시는 곳으로 가세요.</p>
      </header>
      <div className="cta-row">
        <Link href="/" className="btn btn-ink">첫 화면</Link>
        <a href={SITE.appPath} className="btn btn-line">학습앱</a>
        <Link href="/books/" className="btn btn-line">가격 문의</Link>
      </div>
    </div>
  );
}
