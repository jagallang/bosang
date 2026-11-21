import Link from 'next/link';
import { SITE } from '../lib/site';

const NAV = [
  { href: '/exam/', label: '보상관리사 시험' },
  { href: '/books/', label: '교재·이용권' },
  { href: '/info/', label: '보상정보' },
];

export default function Header() {
  return (
    <header className="header">
      <div className="wrap header-inner">
        <Link href="/" className="logo">
          <span className="seal">補</span>
          <span>{SITE.name}</span>
        </Link>
        <nav className="nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
          {/* 퀴즈앱은 Next 라우트가 아니라 정적 앱이므로 a 태그 */}
          <a href={SITE.appPath} className="nav-cta">학습앱</a>
        </nav>
      </div>
    </header>
  );
}
