import { SITE } from '../lib/site';

/** 약관류 공통 틀: 제목, 시행일, 초안 표시 */
export default function LegalPage({ title, children }) {
  return (
    <div className="wrap block narrow legal">
      <header className="page-head">
        <h1>{title}</h1>
        <p>시행일 {SITE.legalUpdated}</p>
      </header>
      {SITE.legalDraft && (
        <aside className="callout">
          <h3>초안</h3>
          <p>이 문서는 공개 전 검토 중인 초안입니다. 사업자 정보와 세부 조항은 확정 후 바뀔 수 있습니다.</p>
        </aside>
      )}
      {children}
    </div>
  );
}
