import BookCover from '../../components/BookCover';
import { BOOKS, won, mailto } from '../../lib/site';

export const metadata = { title: '교재 가격 문의' };

export default function Books() {
  return (
    <div className="wrap block">
      <header className="page-head">
        <h1>교재 가격 문의</h1>
        <p>교재 가격과 구매는 이메일로 안내해 드립니다. 기관·단체 구매도 같은 방법으로 문의해 주세요.</p>
      </header>

      {['1차', '2차'].map((stage) => (
        <section key={stage} className="shelf-group">
          <h2 className="h2">{stage}</h2>
          <ul className="shelf">
            {BOOKS.filter((b) => b.stage === stage).map((b) => (
              <li key={b.id} className="shelf-item">
                <BookCover cover={b.cover} />
                <div className="shelf-body">
                  <h3>{b.title}</h3>
                  <p>{b.summary}</p>
                  <div className="shelf-foot">
                    <span className="price">{b.price ? won(b.price) : '가격 문의'}</span>
                    <a className="btn btn-line sm" href={mailto(`[가격 문의] ${b.title}`, '성함:\n연락처:\n수량:\n기관·단체명(해당 시):\n')}>이메일로 문의</a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
