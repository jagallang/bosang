import { SITE, BOOKS, PASSES, won, mailto } from '../../lib/site';

export const metadata = { title: '교재·이용권' };

export default function Books() {
  return (
    <div className="wrap block">
      <header className="page-head">
        <h1>교재·이용권</h1>
        <p>교재는 이메일로 구매 문의를 받고, 학습앱 이용권은 입금 확인 후 로그인한 계정에 열어 드립니다.</p>
      </header>

      <h2 className="h2" id="books">교재</h2>
      <ul className="books">
        {BOOKS.map((b) => (
          <li key={b.id} className="book">
            <div className="cover" aria-hidden="true">
              <span className="cover-stage">{b.stage}</span>
              <span className="cover-title">{b.title}</span>
              <span className="cover-seal">補</span>
            </div>
            <div className="book-body">
              <h3>{b.title}</h3>
              <p className="book-meta">{b.author} 지음{b.status ? `, ${b.status}` : ''}</p>
              <p>{b.summary}</p>
              <ul className="ticks">{b.points.map((p) => <li key={p}>{p}</li>)}</ul>
              <div className="book-foot">
                <span className="price">{b.price ? won(b.price) : '가격 문의'}</span>
                <a className="btn btn-line sm" href={mailto(`[교재 문의] ${b.title}`, '성함:\n연락처:\n수량:\n')}>구매 문의</a>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="h2" id="pass">학습앱 이용권</h2>
      <div className="passes">
        {PASSES.map((p) => (
          <article key={p.id} className={`pass${p.best ? ' pass-best' : ''}`}>
            <h3>{p.name}</h3>
            <p className="pass-price">{won(p.price)}</p>
            <p className="pass-note">{p.note}</p>
            <a className={`btn ${p.best ? 'btn-seal' : 'btn-line'} wide`}
               href={mailto(`[이용권 신청] ${p.name}`, '학습앱에 로그인한 구글 이메일:\n입금자명:\n')}>
              {p.name} 신청
            </a>
          </article>
        ))}
      </div>

      <section className="howto">
        <h3>이용권은 이렇게 열립니다</h3>
        <ol className="steps">
          <li><a href={SITE.appPath}>학습앱</a>에서 구글 계정으로 로그인합니다.</li>
          <li>신청 버튼으로 로그인한 이메일과 입금자명을 보냅니다.</li>
          <li>안내받은 계좌로 입금하면 확인 후 이용권이 열립니다.</li>
        </ol>
        <p className="note">샘플 문항은 로그인 없이 바로 풀 수 있습니다. 환불은 <a href="/refund/">환불 규정</a>을 따릅니다.</p>
      </section>
    </div>
  );
}
