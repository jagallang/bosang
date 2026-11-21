/**
 * 여러 화면이 함께 쓰는 조각. 모든 뷰는 (데이터) => HTML 문자열인 순수 함수다.
 * 클릭은 data-action 속성으로 표시하고 App이 한 곳에서 처리한다 (인라인 onclick 없음).
 *
 * 문제 본문·해설·모범답안(q, ex, model)은 운영자가 쓴 신뢰된 HTML이라 그대로 넣는다.
 * 그 밖의 문자열은 esc()로 이스케이프한다.
 */
import { DIFFICULTY_LABEL, MAX_BOX } from '../../domain/constants.js';
import { difficultyOf } from '../../domain/question.js';

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** data-* 속성 묶음 */
export const act = (action, data = {}) =>
  `data-action="${esc(action)}"` + Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');

export const BOX_COLORS = ['var(--b0)', 'var(--b1)', 'var(--b2)', 'var(--b3)', 'var(--b4)', 'var(--b5)'];

export function topbar(vm) {
  const { overview: o, ui } = vm;
  const tab = (page, label) => `<button class="nav-tab ${ui.page === page && !ui.inSession ? 'on' : ''}" ${act('go', { page })}>${label}</button>`;
  return `<div class="topbar">
    <div class="logo">
      <span class="seal-mark" aria-hidden="true">補</span>
      <div><h1>보상드림</h1><div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:-2px">${esc(o.label)}</div></div>
    </div>
    <div class="nav-tabs">
      ${tab('home', '학습')}
      ${tab('mastery', `숙련도 <span style="font-size:10px">${o.mastery.pct}%</span>`)}
      ${tab('status', `현황${o.dueCount > 0 ? ` <span class="tab-badge">${o.dueCount}</span>` : ''}`)}
    </div>
    <button class="hamburger" ${act('toggle-menu')} aria-label="메뉴 열기" aria-expanded="${ui.menuOpen}">☰</button>
  </div>${ui.menuOpen ? menu(vm) : ''}`;
}

function menu(vm) {
  const { overview: o, access, config } = vm;
  const stageItem = (s) => `<button class="menu-item" role="menuitem" aria-current="${o.stage === s}" ${act('switch-stage', { stage: s })}>📝 ${s}차 시험 <span style="margin-left:auto;font-size:11px;color:var(--faint)">${o.stageCounts[s] ? `${o.stageCounts[s]}문항` : '준비중'}</span></button>`;
  const account = access.enabled
    ? `<div class="menu-divider"></div>
       ${access.user
        ? `<div class="menu-stage-label" style="text-transform:none;letter-spacing:0">${esc(access.user.email || access.user.displayName || '로그인됨')}${access.paid ? ' · 이용권' : ' · 무료'}</div>
           <button class="menu-item" role="menuitem" ${act('sign-out')}>🚪 로그아웃</button>`
        : `<button class="menu-item" role="menuitem" ${act('sign-in')}>🔑 구글 계정으로 로그인</button>`}`
    : '';
  return `<div class="menu-overlay" ${act('toggle-menu')}></div>
  <div class="menu-panel" role="menu">
    <a class="menu-item" role="menuitem" href="../" style="text-decoration:none">🏠 보상드림 홈</a>
    <a class="menu-item" role="menuitem" href="../books/" style="text-decoration:none">📚 교재·이용권</a>
    <div class="menu-divider"></div>
    <div class="menu-stage-label">시험 선택</div>
    ${stageItem('1')}
    ${stageItem('2')}
    <div class="menu-divider"></div>
    <button class="menu-item" role="menuitem" ${act('go', { page: 'wrong' })}>📕 오답노트 ${o.wrongCount ? `<span style="margin-left:auto;font-size:11px;color:var(--wrong)">${o.wrongCount}문항</span>` : ''}</button>
    <button class="menu-item" role="menuitem" ${act('go', { page: 'feedback' })}>💬 의견 보내기</button>
    ${account}
    <div class="menu-divider"></div>
    <button class="menu-item" role="menuitem" ${act('reset')} style="color:var(--seal)">🗑️ 진도 초기화</button>
    <div style="margin-top:16px;font-size:10px;color:var(--faint);text-align:center">보상드림 v${esc(config.version)}</div>
  </div>`;
}

export function emptyStage(vm) {
  return `<div class="card" style="text-align:center;padding:48px 24px">
    <div style="font-size:48px;margin-bottom:16px" aria-hidden="true">📚</div>
    <div style="font-size:18px;font-weight:800;margin-bottom:8px">${esc(vm.overview.label)}</div>
    <div style="font-size:14px;color:var(--muted);line-height:1.6">문항 준비 중입니다.<br>곧 학습할 수 있도록 문항을 추가할 예정입니다.</div>
  </div>`;
}

export function boxDots(box) {
  const dots = Array.from({ length: MAX_BOX }, (_, i) =>
    `<i class="${i < box ? 'on' : ''}" style="${i < box ? `background:${BOX_COLORS[i + 1]}` : ''}"></i>`).join('');
  return `<div class="boxdots"><span class="bl">숙련도</span>${dots}</div>`;
}

export function difficultyTag(q) {
  const d = difficultyOf(q);
  return `<span class="tag diff d${d}">${'★'.repeat(d)} ${DIFFICULTY_LABEL[d]}</span>`;
}

export function studyTop(session, { quitLabel = '← 그만두기' } = {}) {
  return `<div class="study-top">
    <button class="back" ${act('quit')}>${quitLabel}</button>
    <div class="prog" role="progressbar" aria-valuenow="${session.position}" aria-valuemin="1" aria-valuemax="${session.total}"><i style="width:${session.progressPct}%"></i></div>
    <div class="prog-txt">${session.position}/${session.total}</div>
  </div>`;
}

/** 원형 진행 링 */
export function ring({ pct, label, color, size = 120, cls = '', fontSize = 24 }) {
  const r = 52, circ = 2 * Math.PI * r, off = circ * (1 - pct / 100);
  return `<svg class="${cls}" style="${cls ? '' : `width:${size}px;height:${size}px;margin-bottom:12px`}" viewBox="0 0 120 120" role="img" aria-label="${esc(label)} ${pct}%">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--line)" stroke-width="10"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 60 60)"/>
    <text x="60" y="58" text-anchor="middle" font-size="${fontSize}" font-weight="800" fill="var(--ink)">${pct}%</text>
    <text x="60" y="76" text-anchor="middle" font-size="11" fill="var(--muted)">${esc(label)}</text>
  </svg>`;
}

export const scoreColor = (pct, good = 80, ok = 60) => (pct >= good ? 'var(--correct)' : pct >= ok ? 'var(--gold)' : 'var(--seal)');
