// 보상경매 개인용 툴. 데이터: content/info(사업지구) + tools/auction/data(물건, 비공개)
import { findProjectsByParcel, regionHints, currentStage, openDeadlines } from '../../site/lib/infoModel.mjs';
import { investmentReturn, maxBidFor, DEFAULTS } from './calc.mjs';
import { checkWarnings } from './warnings.mjs';

const $ = (s) => document.querySelector(s);
const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function getJson(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }

const DEMO = new URLSearchParams(location.search).has('demo') || !!globalThis.__BOSANG_DEMO; // npm run demo 결과(가상 데이터)
const ontology = await getJson('../../content/info/ontology.json');
const index = await getJson(DEMO ? '../../demo/out/info/index.json' : '../../content/info/index.json').catch(() => ({ projects: [] }));
// 실제 지구 + (내 물건 파일이 없을 때) 매칭 시연용 예시 지구
const sampleProjects = await getJson('data/projects.sample.json').then((p) => [p]).catch(() => []);
let items, source;
if (DEMO) { items = await getJson('../../demo/out/items.json').catch(() => []); source = '가상 데이터 (npm run demo)'; }
else try { items = await getJson('data/items.json'); source = '내 물건 (data/items.json)'; }
catch { items = await getJson('data/items.sample.json'); source = '예시 물건 — data/items.json을 만들면 그걸 씁니다'; }
const projects = source.startsWith('예시') ? [...index.projects, ...sampleProjects] : index.projects;
$('#dataHint').textContent = `${source} · 사업지구 ${projects.length}개`;

const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 안 되는 환경 */ } } };
const prefs = JSON.parse(store.get('auction:prefs') || '{}');
$('#publicOfficial').checked = !!prefs.publicOfficial;
$('#publicOfficial').addEventListener('change', (e) => { prefs.publicOfficial = e.target.checked; store.set('auction:prefs', JSON.stringify(prefs)); if (sel) show(sel); });

const matched = items.map((it) => {
  const hits = findProjectsByParcel(projects, { pnu: it.pnu, address: it.address });
  return { it, hits, near: hits.length ? [] : regionHints(projects, it.address) };
});
// 사업지구 필지 일치 → 같은 시군구 → 나머지 순
const rank = (m) => (m.hits.length ? 0 : m.near.length ? 1 : 2);
matched.sort((a, b) => rank(a) - rank(b) || String(a.it.saleDate).localeCompare(String(b.it.saleDate)));
let sel = null;

$('#items').innerHTML = matched.map(({ it, hits, near }, i) => `
  <button class="item" data-i="${i}">
    <b>${esc(it.address)}</b>${hits.length ? '<span class="tag hit">사업지구 안</span>' : near.length ? '<span class="tag near">같은 시군구</span>' : '<span class="tag miss">매칭 없음</span>'}
    <small>${esc(it.case)} · ${esc(it.landUse || '')} ${it.areaM2 ? `${it.areaM2.toLocaleString()}㎡` : ''}</small>
    <small>최저 ${it.minPrice ? won(it.minPrice) : esc(it.minPriceText || '-')} · 입찰 ${esc(it.saleDate || '-')}${it.share ? ' · 지분' : ''}</small>
  </button>`).join('');
$('#items').addEventListener('click', (e) => {
  const b = e.target.closest('.item'); if (!b) return;
  document.querySelectorAll('.item').forEach((x) => x.classList.toggle('on', x === b));
  show(matched[Number(b.dataset.i)]);
});

const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

function show(m) {
  sel = m;
  const { it, hits, near } = m;
  const hit = hits[0];
  const stage = hit ? currentStage(hit.project, ontology) : null;
  const dl = hit ? openDeadlines(hit.project, today)[0] : null;
  const saved = (prefs.calc || {})[it.id] || {};
  const v = { bid: saved.bid ?? it.minPrice, expectedComp: saved.expectedComp ?? it.appraisal, months: saved.months ?? 18,
    otherCosts: saved.otherCosts ?? 0, acqTaxRate: saved.acqTaxRate ?? DEFAULTS.acqTaxRate, gainTaxRate: saved.gainTaxRate ?? 0.2,
    acquireDate: saved.acquireDate ?? it.saleDate ?? today, target: saved.target ?? 0.15 };

  $('#detail').innerHTML = `
    <h2>${esc(it.address)}</h2>
    <p class="hint">${esc(it.case)} · 출처 ${esc(it.source)} · 감정가 ${it.appraisal ? won(it.appraisal) : '-'} · 최저가 ${it.minPrice ? won(it.minPrice) : esc(it.minPriceText || '-')}${it.failCount ? ` · 유찰 ${it.failCount}회` : ''}${it.bidEnd ? ` · 입찰 ${esc(it.saleDate)}~${esc(it.bidEnd)}` : ''}</p>
    <h3>사업지구 매칭</h3>
    ${hit ? `<div class="match"><b>${esc(hit.project.name)}</b> (${hit.by === 'pnu' ? 'PNU 일치' : '지번 일치'})<br>
      현재 단계: ${stage ? esc(stage.name) : '정보 없음'}${dl ? ` · ${esc(dl.title)} D-${dl.daysLeft}` : ''}</div>`
      : near.length ? `<div class="match near">필지가 등록된 사업지구는 없고, 같은 시·군·구에 등록된 사업이 있습니다: ${near.map((p) => `<b>${esc(p.name)}</b>`).join(', ')}<br><small>사업지구 경계 안인지는 토지이음 지형도면으로 직접 확인해야 합니다.</small></div>`
      : '<p class="hint">등록된 사업지구 필지와 맞는 것이 없습니다. 사업지구에 필지(PNU)를 추가하면 매칭됩니다.</p>'}
    <h3>수익 계산</h3>
    <div class="form">
      <label>낙찰가(원)<input name="bid" type="number" value="${v.bid}"></label>
      <label>예상 보상금(원)<input name="expectedComp" type="number" value="${v.expectedComp}"></label>
      <label>보상까지 개월<input name="months" type="number" value="${v.months}"></label>
      <label>기타 비용(원)<input name="otherCosts" type="number" value="${v.otherCosts}"></label>
      <label>취득세율(소수)<input name="acqTaxRate" type="number" step="0.001" value="${v.acqTaxRate}"></label>
      <label>양도세 실효세율 추정<input name="gainTaxRate" type="number" step="0.01" value="${v.gainTaxRate}"></label>
      <label>취득 예정일<input name="acquireDate" type="date" value="${v.acquireDate}"></label>
      <label>목표 연수익률<input name="target" type="number" step="0.01" value="${v.target}"></label>
    </div>
    <div id="calcOut"></div>
    <p class="note">예상 보상금은 감정가와 다를 수 있습니다. 세율은 직접 넣는 추정치이며, 결과는 투자 판단의 참고일 뿐입니다.</p>
    <h3>확인할 것</h3>
    <ul class="warn" id="warns"></ul>`;

  const read = () => Object.fromEntries([...document.querySelectorAll('.form input')].map((x) => [x.name, x.type === 'date' ? x.value : Number(x.value)]));
  const update = () => {
    const f = read();
    prefs.calc = { ...(prefs.calc || {}), [it.id]: f }; store.set('auction:prefs', JSON.stringify(prefs));
    try {
      const r = investmentReturn(f);
      const mb = maxBidFor(f.target, f);
      $('#calcOut').innerHTML = `<dl class="result">
        <div><dt>총 투입</dt><dd>${won(r.totalCost)}</dd></div>
        <div><dt>세후 순이익</dt><dd class="${r.net < 0 ? 'neg' : 'pos'}">${won(r.net)}</dd></div>
        <div><dt>연환산 수익률</dt><dd class="${r.annual < 0 ? 'neg' : 'pos'}">${pct(r.annual)}</dd></div>
        <div><dt>목표 ${pct(f.target)} 최대 낙찰가</dt><dd>${won(mb)}</dd></div></dl>`;
    } catch (e) { $('#calcOut').innerHTML = `<p class="hint">${esc(e.message)}</p>`; }
    const w = hit ? checkWarnings({ project: hit.project, ontology, acquireDate: f.acquireDate, user: prefs })
      : [{ level: 'mid', text: '사업지구 매칭이 없어 보상 관련 경고를 낼 수 없습니다.' }];
    if (it.share) w.unshift({ level: 'high', text: '지분 물건입니다. 보상금도 지분만큼만 받고, 공유자 협의·공유물분할 문제가 생길 수 있습니다.' });
    $('#warns').innerHTML = w.map((x) => `<li class="${x.level}">${esc(x.text)}</li>`).join('');
  };
  document.querySelectorAll('.form input').forEach((x) => x.addEventListener('input', update));
  update();
}
