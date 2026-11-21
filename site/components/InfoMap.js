'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';

const KEY = process.env.NEXT_PUBLIC_VWORLD_KEY || '';
const DOMAIN = process.env.NEXT_PUBLIC_VWORLD_DOMAIN || '';

// 단계 묶음 → 색 (사이트 팔레트)
export const GROUPS = [
  { id: 'early', name: '지정·조사', test: (o) => o >= 1 && o <= 2, color: '#a9791f' },
  { id: 'comp', name: '보상 진행', test: (o) => o >= 3 && o <= 5, color: '#b23a3a' },
  { id: 'adj', name: '수용·불복', test: (o) => o >= 6, color: '#1c2740' },
  { id: 'none', name: '단계 미확인', test: () => true, color: '#8a929c' },
];
const groupOf = (it) => GROUPS.find((g) => g.test(it.stage?.order || 0));
const PRECISION = { boundary: '지구 경계', parcels: '필지 경계', sigungu: '경계 미수집' };

const OVERLAYS = [
  { id: 'lt_c_lhblpn', name: '택지개발지구' },
  { id: 'lt_c_damdan', name: '산업단지' },
  { id: 'lp_pa_cbnd_bubun', name: '지적도', minZoom: 15 },
];

/** 같은 시군구에 여러 지구가 겹치면 점을 조금씩 벌린다 (시군구 범위 표시일 때만) */
function spread(items) {
  const seen = new Map();
  return items.map((it) => {
    if (it.precision !== 'sigungu') return { ...it, point: it.center };
    const k = it.center.join(',');
    const n = seen.get(k) || 0;
    seen.set(k, n + 1);
    if (!n) return { ...it, point: it.center };
    const a = (n * 2 * Math.PI) / 5;
    return { ...it, point: [it.center[0] + 0.018 * Math.cos(a), it.center[1] + 0.014 * Math.sin(a)] };
  });
}

export default function InfoMap({ items }) {
  const el = useRef(null);
  const api = useRef({});
  const [hidden, setHidden] = useState(() => new Set());
  const [active, setActive] = useState(null);
  const [base, setBase] = useState(KEY ? 'vworld' : 'osm');
  const [overlays, setOverlays] = useState(() => new Set());
  const list = useMemo(() => spread(items).map((it) => ({ ...it, group: groupOf(it) })), [items]);
  const visible = list.filter((it) => !hidden.has(it.group.id));

  // 지도 만들기 (한 번)
  useEffect(() => {
    let map;
    let dead = false;
    import('leaflet').then(({ default: L }) => {
      if (dead || !el.current) return;
      map = L.map(el.current, { zoomControl: true, attributionControl: true, minZoom: 6, maxZoom: 19 }).setView([36.4, 127.8], 7);
      const osm = () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      });
      let baseLayer;
      if (KEY) {
        // 브이월드 배경지도. 키에 등록한 도메인이 아니면 타일이 안 온다 → 앞쪽 타일이 계속 실패하면 OSM으로 바꾼다
        let ok = 0, fail = 0;
        baseLayer = L.tileLayer(`https://api.vworld.kr/req/wmts/1.0.0/${KEY}/Base/{z}/{y}/{x}.png`, {
          maxZoom: 19, attribution: '&copy; <a href="https://www.vworld.kr">브이월드</a>',
        }).on('tileload', () => { ok++; }).on('tileerror', () => {
          fail++;
          if (!ok && fail >= 4 && map.hasLayer(baseLayer)) { map.removeLayer(baseLayer); osm().addTo(map).bringToBack(); setBase('osm'); }
        });
      } else baseLayer = osm();
      baseLayer.addTo(map);

      const layers = new Map();
      const rangeOf = new Map();
      const all = [];
      for (const it of list) {
        const color = it.group.color;
        const rough = it.precision === 'sigungu';
        const shape = L.geoJSON({ type: 'GeometryCollection', geometries: it.geometries }, {
          style: { color, weight: rough ? 1.2 : 2, dashArray: rough ? '4 4' : null, fillColor: color, fillOpacity: rough ? 0.04 : 0.22 },
        });
        const dot = L.circleMarker([it.point[1], it.point[0]], { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 });
        // 경계 미수집 지구의 시군구 범위는 고를 때만 보인다 (넓은 범위가 겹쳐 어지럽지 않게)
        if (rough) rangeOf.set(it.id, shape);
        const g = L.featureGroup(rough ? [dot] : [shape, dot]).on('click', () => setActive(it.id));
        g.bindTooltip(it.name, { direction: 'top', offset: [0, -8] });
        layers.set(it.id, g);
        all.push(g);
        g.addTo(map);
      }
      const fitAll = () => { const b = L.featureGroup(all).getBounds(); if (b.isValid()) map.fitBounds(b, { padding: [24, 24] }); };
      fitAll();
      api.current = { L, map, layers, rangeOf, fitAll, wms: new Map(), shown: null };

      const id = new URLSearchParams(window.location.search).get('id');
      if (id && layers.has(id)) setActive(id);
    });
    return () => { dead = true; if (map) map.remove(); };
  }, [list]);

  // 단계 필터
  useEffect(() => {
    const { map, layers } = api.current;
    if (!map) return;
    for (const it of list) {
      const g = layers.get(it.id);
      if (hidden.has(it.group.id)) map.removeLayer(g); else if (!map.hasLayer(g)) g.addTo(map);
    }
  }, [hidden, list]);

  // 선택한 지구로 이동
  useEffect(() => {
    const cur = api.current;
    const { map, layers, rangeOf } = cur;
    if (!map) return;
    if (cur.shown) { map.removeLayer(cur.shown); cur.shown = null; }
    if (!active) return;
    const range = rangeOf.get(active);
    if (range) { range.addTo(map); cur.shown = range; }
    const target = range || layers.get(active);
    if (target) map.flyToBounds(target.getBounds(), { padding: [40, 40], maxZoom: 14, duration: 0.6 });
  }, [active]);

  // 브이월드 겹쳐 보기 (WMS)
  useEffect(() => {
    const { L, map, wms } = api.current;
    if (!map || !KEY) return;
    for (const o of OVERLAYS) {
      const on = overlays.has(o.id);
      if (on && !wms.has(o.id)) {
        wms.set(o.id, L.tileLayer.wms('https://api.vworld.kr/req/wms', {
          layers: o.id, styles: o.id, format: 'image/png', transparent: true, version: '1.3.0',
          key: KEY, domain: DOMAIN, minZoom: o.minZoom || 0, opacity: 0.75,
        }).addTo(map));
      } else if (!on && wms.has(o.id)) { map.removeLayer(wms.get(o.id)); wms.delete(o.id); }
    }
  }, [overlays]);

  const toggle = (set, setter, id) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); setter(n); };
  const sel = list.find((x) => x.id === active);

  return (
    <div className="imap">
      <div className="imap-bar">
        <div className="imap-legend" role="group" aria-label="단계별로 보기">
          {GROUPS.filter((g) => list.some((it) => it.group.id === g.id)).map((g) => (
            <button key={g.id} type="button" aria-pressed={!hidden.has(g.id)} onClick={() => toggle(hidden, setHidden, g.id)}>
              <i style={{ background: g.color }} />{g.name} <span>{list.filter((it) => it.group.id === g.id).length}</span>
            </button>
          ))}
        </div>
        {KEY && base === 'vworld' && (
          <div className="imap-over" role="group" aria-label="겹쳐 보기">
            {OVERLAYS.map((o) => (
              <label key={o.id}><input type="checkbox" checked={overlays.has(o.id)} onChange={() => toggle(overlays, setOverlays, o.id)} />{o.name}</label>
            ))}
          </div>
        )}
      </div>
      {base === 'osm' && KEY && <p className="imap-warn">브이월드 지도를 불러오지 못해 OpenStreetMap으로 표시합니다. 브이월드 키에 등록한 주소에서 열어야 합니다.</p>}

      <div className="imap-body">
        <div className="imap-map" ref={el} role="region" aria-label="사업지구 지도" />
        <aside className="imap-side">
          {sel ? (
            <div className="imap-card">
              <button type="button" className="imap-back" onClick={() => { setActive(null); api.current.fitAll?.(); }}>전체 보기</button>
              <p className="imap-stage" style={{ color: sel.group.color }}>{sel.stage ? sel.stage.name : '단계 미확인'}</p>
              <h3>{sel.name}{sel.sample && <span className="badge-sample">예시</span>}</h3>
              <p className="imap-meta">{[sel.region, sel.type].filter(Boolean).join(' · ')}</p>
              {sel.daysLeft != null && <p className="imap-due">열람 기한 {sel.daysLeft === 0 ? '오늘까지' : `${sel.daysLeft}일 남음`}</p>}
              <p className="imap-prec">위치: {PRECISION[sel.precision]}<br /><small>{sel.source}</small></p>
              <Link href={`/info/${sel.id}/`} className="btn btn-ink sm">진행현황 보기</Link>
            </div>
          ) : (
            <ul className="imap-list">
              {visible.map((it) => (
                <li key={it.id}>
                  <button type="button" onClick={() => setActive(it.id)}>
                    <i style={{ background: it.group.color }} />
                    <span><b>{it.name}</b><small>{it.region}{it.precision === 'sigungu' ? ' · 경계 미수집' : ''}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
