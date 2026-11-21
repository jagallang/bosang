'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { parseWebConfig, gateState } from '../lib/auctionGate.mjs';
import { findProjectsByParcel, regionHints } from '../lib/infoModel.mjs';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
const CONFIG = parseWebConfig(process.env.NEXT_PUBLIC_FIREBASE_CONFIG);
const won = (n) => (Number.isFinite(+n) && n !== '' && n != null ? `${Math.round(+n).toLocaleString('ko-KR')}원` : '—');

async function loadFirebase() {
  const [appMod, authMod, fsMod] = await Promise.all([
    import(/* webpackIgnore: true */ `${SDK}/firebase-app.js`),
    import(/* webpackIgnore: true */ `${SDK}/firebase-auth.js`),
    import(/* webpackIgnore: true */ `${SDK}/firebase-firestore.js`),
  ]);
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(CONFIG);
  return { auth: authMod.getAuth(app), db: fsMod.getFirestore(app), authMod, fsMod };
}

function Blocked({ title, children }) {
  return (
    <aside className="callout gate">
      <h3>{title}</h3>
      {children}
      <p><Link href="/info/">공개 보상정보로 가기</Link></p>
    </aside>
  );
}

export default function AuctionGate({ projects }) {
  const [fb, setFb] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!CONFIG) return undefined;
    let off = () => {};
    loadFirebase().then((f) => {
      setFb(f);
      off = f.authMod.onAuthStateChanged(f.auth, (u) => { setUser(u); setAdmin(null); setItems(null); setAuthReady(true); });
    }).catch(() => { setError('로그인 모듈을 불러오지 못했습니다. 네트워크를 확인해 주세요.'); setAuthReady(true); });
    return () => off();
  }, []);

  useEffect(() => {
    if (!fb || !user) return;
    // admins/{uid}는 본인만 읽을 수 있다(규칙). 읽기 실패도 '관리자 아님'으로 닫는다.
    fb.fsMod.getDoc(fb.fsMod.doc(fb.db, 'admins', user.uid))
      .then((d) => setAdmin(d.exists()))
      .catch(() => setAdmin(false));
  }, [fb, user]);

  useEffect(() => {
    if (!fb || admin !== true) return;
    fb.fsMod.getDocs(fb.fsMod.collection(fb.db, 'auctionItems'))
      .then((s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setError('물건 목록을 읽지 못했습니다. 관리자 권한과 Firestore 규칙 배포를 확인해 주세요.'));
  }, [fb, admin]);

  const rows = useMemo(() => (items || []).map((it) => {
    const hits = findProjectsByParcel(projects, { pnu: it.pnu, address: it.address });
    return { it, hits, near: hits.length ? [] : regionHints(projects, it.address) };
  }).sort((a, b) => (a.hits.length ? 0 : a.near.length ? 1 : 2) - (b.hits.length ? 0 : b.near.length ? 1 : 2)
    || String(a.it.saleDate || '').localeCompare(String(b.it.saleDate || ''))), [items, projects]);

  const state = gateState({ configured: !!CONFIG, authReady, user, admin });
  const signIn = async () => {
    setError('');
    try { await fb.authMod.signInWithPopup(fb.auth, new fb.authMod.GoogleAuthProvider()); }
    catch (e) { if (e?.code !== 'auth/popup-closed-by-user') setError('로그인하지 못했습니다. 팝업 차단을 확인해 주세요.'); }
  };
  const signOut = () => fb && fb.authMod.signOut(fb.auth);

  if (state === 'unconfigured') return (
    <Blocked title="진입할 수 없습니다">
      <p>관리자 로그인이 아직 설정되지 않은 배포본입니다. 이 화면은 관리자만 씁니다.</p>
    </Blocked>
  );
  if (state === 'loading' || state === 'checking') return <p className="muted">{error || '확인 중…'}</p>;
  if (state === 'signed-out') return (
    <Blocked title="관리자 전용">
      <p>관리자 계정으로 로그인해야 들어갈 수 있습니다.</p>
      <p><button type="button" className="btn btn-ink sm" onClick={signIn} disabled={!fb}>구글 계정으로 로그인</button></p>
      {error && <p className="muted">{error}</p>}
    </Blocked>
  );
  if (state === 'denied') return (
    <Blocked title="진입 금지">
      <p>{user.email} 계정은 관리자가 아닙니다.</p>
      <p><button type="button" className="btn btn-line sm" onClick={signOut}>다른 계정으로 로그인</button></p>
    </Blocked>
  );

  return (
    <section>
      <p className="muted">{user.email} · 관리자 <button type="button" className="btn btn-line sm" onClick={signOut}>로그아웃</button></p>
      {error && <p className="muted">{error}</p>}
      {!items && !error && <p className="muted">물건을 불러오는 중…</p>}
      {items && items.length === 0 && <p>올린 물건이 없습니다. <code>node scripts/admin.mjs upload-auction</code>으로 올려 주세요.</p>}
      {items && items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>사건·물건</th><th>소재지</th><th>감정가</th><th>최저가</th><th>매각기일</th><th>사업지구</th></tr></thead>
            <tbody>
              {rows.map(({ it, hits, near }) => (
                <tr key={it.id}>
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
