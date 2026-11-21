// 교재 표지 (보상드림 시리즈 공통 틀: 남색 바탕, 왼쪽 금색 띠, 금색 큰 제목)
export default function BookCover({ cover, edition = '2027년 대비 · 00. 00월 판' }) {
  return (
    <div className="bcover" role="img" aria-label={`${cover.subject} ${cover.name.join(' ')} 표지`}>
      <div className="bcover-in" aria-hidden="true">
        <span className="bcover-ring r1" /><span className="bcover-ring r2" />
        <p className="bcover-kicker">{cover.kicker}</p>
        <p className="bcover-lead">{cover.lead}</p>
        <p className="bcover-subject">{cover.subject}</p>
        <p className={`bcover-name${cover.name.length > 1 ? ' two' : ''}`}>{cover.name.map((l) => <span key={l}>{l}</span>)}</p>
        <div className="bcover-scope">{cover.scope.map((l) => <p key={l}>{l}</p>)}</div>
        <ul className="bcover-tags">{cover.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="bcover-edition">{edition}</p>
        <p className="bcover-brand">보상드림<small>토지보상 온라인 교육플랫폼</small></p>
      </div>
    </div>
  );
}
