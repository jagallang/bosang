/**
 * 여러 화면이 함께 쓰는 조각. 모든 뷰는 (데이터) => HTML 문자열인 순수 함수다.
 * 클릭은 data-action 속성으로 표시하고 App이 한 곳에서 처리한다 (인라인 onclick·인라인 style 없음).
 *
 * 문제 본문·해설·모범답안(q, ex, model)은 운영자가 쓴 신뢰된 HTML이라 그대로 넣는다.
 * 그 밖의 문자열은 esc()로 이스케이프한다.
 */
import { DIFFICULTY_LABEL, MAX_BOX, STAGE_IDS } from '../../domain/constants.js';
import { difficultyOf } from '../../domain/question.js';

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** data-* 속성 묶음 */
export const act = (action, data = {}) =>
  `data-action="${esc(action)}"` + Object.entries(data).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');

/** 숙련도 0~5 → 색 단계 클래스 */
export const level = (box) => `lv${Math.max(0, Math.min(MAX_BOX, box | 0))}`;

/** 0~100 → 막대 (폭은 CSS 변수로) */
export const bar = (pct, tone = '') => `<span class="bar ${tone}"><i style="--w:${Math.max(0, Math.min(100, pct))}%"></i></span>`;

export function topbar(vm) {
  const { overview: o, ui } = vm;
  const onRecords = ['records', 'mastery', 'status'].includes(ui.page);
  const tab = (page, label, on) => `<button class="tab${on && !ui.inSession ? ' on' : ''}" ${act('go', { page })}>${label}</button>`;
  return `<header class="top">
    <div class="top-in">
      <a class="brand" href="../" aria-label="보상드림 홈"><span class="seal" aria-hidden="true">補</span>보상드림</a>
      <nav class="tabs" aria-label="학습앱 메뉴">
        ${tab('home', '학습', !onRecords && ui.page === 'home')}
        ${tab('records', `기록${o.dueCount > 0 ? ` <span class="dot" aria-label="복습 ${o.dueCount}문항">${o.dueCount}</span>` : ''}`, onRecords)}
      </nav>
      <button class="menu-btn" ${act('toggle-menu')} aria-label="메뉴" aria-expanded="${ui.menuOpen}"><span></span><span></span><span></span></button>
    </div>
  </header>${ui.menuOpen ? menu(vm) : ''}`;
}

function menu(vm) {
  const { overview: o, access, config } = vm;
  const item = (attrs, label, end = '') => `<button class="m-item" role="menuitem" ${attrs}>${label}${end ? `<span class="m-end">${end}</span>` : ''}</button>`;
  const link = (href, label) => `<a class="m-item" role="menuitem" href="${href}">${label}</a>`;
  const account = !access.enabled ? '' : access.user
    ? `<p class="m-note">${esc(access.user.email || access.user.displayName || '로그인됨')} · ${access.paid ? '이용권' : '무료'}</p>${item(act('sign-out'), '로그아웃')}`
    : item(act('sign-in'), '구글 계정으로 로그인');
  return `<div class="scrim" ${act('toggle-menu')}></div>
  <div class="sheet" role="menu" aria-label="메뉴">
    ${item(act('go', { page: 'wrong' }), '오답노트', o.wrongCount ? `${o.wrongCount}문항` : '')}
    ${item(act('go', { page: 'feedback' }), '의견·오류 보내기')}
    ${account ? `<hr>${account}` : ''}
    <hr>
    ${link('../', '보상드림 홈')}
    ${link('../books/', '교재 가격 문의')}
    <hr>
    ${item(`${act('reset')} data-tone="danger"`, `${esc(o.label)} 기록 초기화`)}
    <p class="m-ver">v${esc(config.version)}</p>
  </div>`;
}

/** 1차·2차 전환 */
export function stageSwitch(o) {
  return `<div class="seg" role="group" aria-label="시험 선택">
    ${STAGE_IDS.map((s) => `<button class="${o.stage === s ? 'on' : ''}" aria-pressed="${o.stage === s}" ${act('switch-stage', { stage: s })}>${s}차${o.stageCounts[s] ? '' : ' <small>준비 중</small>'}</button>`).join('')}
  </div>`;
}

export function emptyStage(vm) {
  return `<section class="panel empty">
    <h2>${esc(vm.overview.label)} 문항 준비 중</h2>
    <p>문항을 추가하는 중입니다. 다른 시험을 먼저 풀어 보세요.</p>
    ${stageSwitch(vm.overview)}
  </section>`;
}

export function boxDots(box) {
  const dots = Array.from({ length: MAX_BOX }, (_, i) => `<i class="${i < box ? level(i + 1) : ''}"></i>`).join('');
  return `<span class="dots" title="숙련도 ${box}/${MAX_BOX}" aria-label="숙련도 ${box}/${MAX_BOX}">${dots}</span>`;
}

export function difficultyText(q) {
  return DIFFICULTY_LABEL[difficultyOf(q)];
}

export function studyTop(session, { quitLabel = '그만두기' } = {}) {
  return `<div class="s-top">
    <button class="link" ${act('quit')}>${quitLabel}</button>
    <div class="prog" role="progressbar" aria-valuenow="${session.position}" aria-valuemin="1" aria-valuemax="${session.total}"><i style="--w:${session.progressPct}%"></i></div>
    <span class="num">${session.position} / ${session.total}</span>
  </div>`;
}

/** 큰 숫자 + 단위 */
export const figure = (n, unit, label) => `<div class="fig"><b>${n}<small>${unit}</small></b><span>${label}</span></div>`;

export const scoreTone = (pct, good = 80, ok = 60) => (pct >= good ? 'good' : pct >= ok ? 'mid' : 'bad');
