'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { open } from '../lib/vault.mjs';
import { findProjectsByParcel, regionHints } from '../lib/infoModel.mjs';

const won = (n) => (n !== '' && n != null && Number.isFinite(+n) ? `${Math.round(+n).toLocaleString('ko-KR')}원` : '—');

export default function AuctionGate({ projects }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [data, setData] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      const r = await fetch('vault.json', { cache: 'no-store' });
      if (!r.ok) { setMsg('이 배포본에는 경매 데이터가 없습니다. 빌드할 때 AUCTION_PASSWORD를 설정해야 합니다.'); return; }
      const got = await open(await r.json(), pw);
      if (!got) { setMsg('비밀번호가 틀렸습니다.'); return; }
      setData(got); setPw('');
    } catch { setMsg('데이터를 불러오지 못했습니다.'); }
    finally { setBusy(false); }
  };

  const rows = useMemo(() => (data?.items || []).map((it) => {
    const hits = findProjectsByParcel(projects, { pnu: it.pnu, address: it.address });
    return { it, hits, near: hits.length ? [] : regionHints(projects, it.address) };
  }).sort((a, b) => (a.hits.length ? 0 : a.near.length ? 1 : 2) - (b.hits.length ? 0 : b.near.length ? 1 : 2)
    || String(a.it.saleDate || '').localeCompare(String(b.it.saleDate || ''))), [data, projects]);

  if (!data) return (
    <aside className="callout gate">
      <h3>관리자 전용</h3>
      <p>관리자 비밀번호를 넣어야 들어갈 수 있습니다.</p>
      <form onSubmit={submit} className="gate-form">
        <label htmlFor="auction-pw" className="sr-only">관리자 비밀번호</label>
        <input id="auction-pw" type="password" autoComplete="current-password" value={pw}
          onChange={(e) => setPw(e.target.value)} placeholder="관리자 비밀번호" required />
        <button type="submit" className="btn btn-ink sm" disabled={busy || !pw}>{busy ? '확인 중…' : '들어가기'}</button>
      </form>
      {msg && <p className="gate-msg" role="alert">{msg}</p>}
      <p><Link href="/info/">공개 보상정보로 가기</Link></p>
    </aside>
  );

  return (
    <section>
      <p className="muted">{data.source} · {data.items.length}건 · {data.sealedAt} 기준 <button type="button" className="btn btn-line sm" onClick={() => setData(null)}>잠그기</button></p>
      {data.items.length === 0 ? <p>물건이 없습니다.</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>사건·물건</th><th>소재지</th><th>감정가</th><th>최저가</th><th>매각기일</th><th>사업지구</th></tr></thead>
            <tbody>
              {rows.map(({ it, hits, near }, i) => (
                <tr key={it.id || i}>
                  <td>{it.case || it.id}{it.source ? <div className="muted">{it.source}</div> : null}</td>
                  <td>{it.address}{it.landUse ? <div className="muted">{it.landUse}{it.areaM2 ? ` · ${it.areaM2}㎡` : ''}</div> : null}</td>
                  <td>{won(it.appraisal)}</td>
                  <td>{won(it.minPrice)}</td>
                  <td>{it.saleDate || '—'}</td>
                  <td>
                    {hits.map((h) => <div key={h.project.id}><Link href={`/info/${h.project.id}/`}>{h.project.name}</Link> (필지 {h.by === 'pnu' ? 'PNU' : '주소'} 일치)</div>)}
                    {!hits.length && near.slice(0, 2).map((p) => <div key={p.id} className="muted">같은 시군구: {p.name}</div>)}
                    {!hits.length && !near.length && <span className="muted">없음</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
