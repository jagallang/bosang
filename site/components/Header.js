import Link from 'next/link';
import { SITE } from '../lib/site';

const NAV = [
  { href: '/about/', label: '보상관리사란?' },
  { href: '/exam/', label: '보상관리사 시험' },
  { href: '/books/', label: '가격 문의' },
  { href: '/info/', label: '보상정보' },
  { href: '/auction/', label: '보상경매', admin: true },
];

export default function Header() {
  return (
    <header className="header">
      <div className="wrap header-inner">
        <Link href="/" className="logo" aria-label={`${SITE.name} 홈`}>
          <span className="seal" aria-hidden="true">補</span>
          <span className="logo-word">{SITE.name}</span>
        </Link>
        <nav className="nav" aria-label="주 메뉴">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} rel={n.admin ? 'nofollow' : undefined}>
              {n.label}{n.admin && <span className="nav-lock" title="관리자 전용">관리자</span>}
            </Link>
          ))}
          <a href={SITE.appPath} className="btn btn-ink sm">학습앱</a>
        </nav>
      </div>
    </header>
  );
}
