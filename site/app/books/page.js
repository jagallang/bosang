import { SITE, BOOKS, PASSES, won, mailto } from '../../lib/site';

export const metadata = { title: '교재·이용권' };

export default function Books() {
  return (
    <div className="wrap section">
      <h1 className="page-title">교재·이용권</h1>
      <p className="page-lead">교재는 구매 문의로, 학습앱 이용권은 계좌이체 확인 후 계정에 바로 열어 드립니다.</p>

      <h2 className="section-title" id="books">교재</h2>
      <div className="grid3">
        {BOOKS.map((b) => (
          <article key={b.id} className="card product">
            <div className="product-cover">
              <span>{b.stage}</span>
              <strong>{b.title}</strong>
            </div>
            <div className="card-kicker">{b.author}{b.status ? ` · ${b.status}` : ''}</div>
            <h3>{b.title}</h3>
            <p>{b.summary}</p>
            <ul className="checks">{b.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <div className="product-foot">
              <span className="price">{b.price ? won(b.price) : '가격 문의'}</span>
              <a className="btn primary sm" href={mailto(`[교재 문의] ${b.title}`, '성함:\n연락처:\n수량:\n')}>구매 문의</a>
            </div>
          </article>
        ))}
      </div>

      <h2 className="section-title" id="pass">학습앱 이용권</h2>
      <div className="grid2">
        {PASSES.map((p) => (
          <article key={p.id} className={`card pass${p.best ? ' best' : ''}`}>
            {p.best && <span className="badge">추천</span>}
            <h3>{p.name}</h3>
            <div className="pass-price">{won(p.price)}</div>
            <p>{p.note}</p>
            <a
              className={`btn ${p.best ? 'primary' : 'ghost'} block`}
              href={mailto(`[이용권 신청] ${p.name}`, '학습앱에 로그인한 구글 이메일:\n입금자명:\n')}
            >
              신청하기
            </a>
          </article>
        ))}
      </div>

      <div className="card steps">
        <h3>이용권 신청 절차</h3>
        <ol>
          <li><a href={SITE.appPath}>학습앱</a>에서 구글 계정으로 로그인합니다.</li>
          <li>신청하기 버튼으로 로그인한 이메일과 입금자명을 보내 주세요.</li>
          <li>안내받은 계좌로 입금하면 확인 후 계정에 이용권이 열립니다.</li>
        </ol>
        <p className="muted">무료 샘플 문항은 로그인 없이 바로 풀 수 있습니다.</p>
      </div>
    </div>
  );
}
