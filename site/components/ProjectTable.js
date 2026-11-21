'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

/** 지구 목록 + 시·도 필터 */
export default function ProjectTable({ items, stageCount }) {
  const sidos = useMemo(() => [...new Set(items.map((i) => i.sido).filter(Boolean))].sort(), [items]);
  const [sido, setSido] = useState('');
  const rows = sido ? items.filter((i) => i.sido === sido) : items;

  return (
    <div>
      <div className="filter">
        <label htmlFor="sido">지역</label>
        <select id="sido" value={sido} onChange={(e) => setSido(e.target.value)}>
          <option value="">전체 ({items.length})</option>
          {sidos.map((s) => <option key={s} value={s}>{s} ({items.filter((i) => i.sido === s).length})</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table className="table projects">
          <thead>
            <tr><th scope="col">사업지구</th><th scope="col">지역</th><th scope="col">현재 단계</th><th scope="col">다가오는 기한</th><th scope="col">최근 고시</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/info/${p.id}/`} className="prj-name">{p.name}</Link>
                  <span className="prj-sub">{[p.type, p.operator].filter(Boolean).join(' · ')}{p.sample && <span className="badge-sample">예시</span>}</span>
                </td>
                <td>{p.sido} {p.sigungu}</td>
                <td>
                  {p.stage ? (
                    <span className="stage-cell">
                      <span className="mini-steps" aria-hidden="true">
                        {Array.from({ length: stageCount }, (_, k) => <i key={k} className={k < p.stage.order ? 'on' : ''} />)}
                      </span>
                      {p.stage.name}
                    </span>
                  ) : '—'}
                </td>
                <td>{p.nextDeadline ? <span className="dday">D-{p.nextDeadline.daysLeft} <small>{p.nextDeadline.title}</small></span> : '—'}</td>
                <td className="num">{p.lastNotice?.date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
