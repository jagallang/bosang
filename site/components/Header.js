import Link from 'next/link';
import { SITE } from '../lib/site';

const NAV = [
  { href: '/exam/', label: '시험 안내' },
  { href: '/books/', label: '교재·이용권' },
  { href: '/info/', label: '보상정보' },
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
          {NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
          <a href={SITE.appPath} className="btn btn-ink sm">학습앱</a>
        </nav>
      </div>
    </header>
  );
}
