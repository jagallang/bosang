import { SITE } from '../lib/site';

export default function Footer() {
  const b = SITE.business;
  const rows = [
    b.company && `상호 ${b.company}`,
    b.owner && `대표 ${b.owner}`,
    b.regNo && `사업자등록번호 ${b.regNo}`,
    b.mailOrderNo && `통신판매업 ${b.mailOrderNo}`,
    b.address,
    b.phone && `전화 ${b.phone}`,
  ].filter(Boolean);
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-brand">{SITE.name}</div>
        {rows.length > 0 && <p className="footer-biz">{rows.join(' · ')}</p>}
        <p>문의 <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        <p className="footer-note">
          보상드림의 정보는 학습·참고용이며 법률 자문이 아닙니다. 개별 사건은 변호사·감정평가사 등 전문가와 상담하세요.
        </p>
        <p className="footer-copy">© {new Date().getFullYear()} {SITE.name}</p>
      </div>
    </footer>
  );
}
