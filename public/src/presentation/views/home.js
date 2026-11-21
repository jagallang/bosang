/**
 * 학습(대시보드)·숙련도·현황 화면
 */
import { MAX_BOX, SUBJECT_COLOR } from '../../domain/constants.js';
import { BOX_COLORS, act, emptyStage, esc, ring, scoreColor } from './common.js';

export function dashboard(vm) {
  const { overview: o, ui } = vm;
  if (!o.total) return emptyStage(vm);
  const chip = (action, data, label, sub) =>
    `<button class="diff-card" ${act(action, data)}><span class="dc-label">${esc(label)}</span><span class="dc-sub">${sub}</span></button>`;

  const typeRow = o.hasMcq && o.hasEssay
    ? `<div class="diff-main">
        <div class="dm-title" style="margin-bottom:8px">유형별 연습</div>
        <div class="diff-cards">
          ${chip('start', { mode: 'type', type: 'all' }, '전체', o.total)}
          ${chip('start', { mode: 'type', type: 'mcq' }, '객관식', o.typeCounts.mcq)}
          ${chip('start', { mode: 'type', type: 'essay' }, '서술형', o.typeCounts.essay)}
        </div>
      </div>`
    : '';

  const exam = o.hasMcq
    ? `<button class="quick-card" ${act('start-exam')}>
        <div class="qc-icon" aria-hidden="true">📝</div><div class="qc-title">모의고사</div>
        <div class="qc-count">${o.examSize}題</div><div class="qc-desc">실전 채점·과락 경보</div>
      </button>`
    : `<div class="quick-card" style="opacity:.5;cursor:default">
        <div class="qc-icon" aria-hidden="true">📝</div><div class="qc-title">모의고사</div>
        <div class="qc-count">—</div><div class="qc-desc">객관식 문항 추가 시 지원</div>
      </div>`;

  return `
  <div class="stat-compact">
    <div class="sc-item">숙련도 <b>${o.mastery.pct}%</b></div>
    <div class="sc-item">정답률 <b>${o.accuracy}%</b></div>
    <div class="sc-item">연속 <b>${o.streak}일</b>${o.streak >= 3 ? ' 🔥' : ''}</div>
    <div class="sc-item">복습 <b style="color:${o.dueCount > 0 ? 'var(--seal)' : 'var(--correct)'}">×${o.dueCount}</b></div>
  </div>

  ${accessBanner(vm)}

  <div class="diff-main">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div class="dm-title" style="margin-bottom:0">과목별 연습</div>
      <button ${act('toggle-random')} aria-pressed="${ui.random}" style="display:flex;align-items:center;gap:4px;font-size:11px;color:${ui.random ? 'var(--correct)' : 'var(--faint)'};padding:4px 8px;border:1px solid var(--line);border-radius:6px">🔀 ${ui.random ? '랜덤' : '순서대로'}</button>
    </div>
    <div class="diff-cards">
      ${chip('start', { mode: 'practice', subject: '전체' }, '전체', o.total)}
      ${o.subjects.map((s) => chip('start', { mode: 'practice', subject: s.name }, s.name, `${s.pct}%`)).join('')}
    </div>
  </div>

  ${typeRow}

  <div class="quick-grid">
    <button class="quick-card primary" ${act('start', { mode: 'review' })}>
      <div class="qc-icon" aria-hidden="true">📖</div><div class="qc-title">오늘의 복습</div>
      <div class="qc-count">${o.dueCount}題</div><div class="qc-desc">간격 반복 알고리즘</div>
    </button>
    <button class="quick-card" ${act('start', { mode: 'weak' })}>
      <div class="qc-icon" aria-hidden="true">🎯</div><div class="qc-title">약점 집중</div>
      <div class="qc-count">${o.weakCount}題</div><div class="qc-desc">취약 문항 반복</div>
    </button>
    ${exam}
  </div>

  <div class="foot">총 ${o.total}문항 · ${vm.access.user ? '진도는 계정에 자동 저장됩니다' : '진도는 이 기기에 자동 저장됩니다'}</div>`;
}

/** 로그인·이용권 안내 (firebase 모드에서 이용권이 없을 때만) */
function accessBanner(vm) {
  const { access, config } = vm;
  if (!access.enabled || access.paid) return '';
  const buy = config.purchase?.url
    ? `<a class="btn ghost" style="padding:8px 14px;font-size:13px;text-decoration:none" href="${esc(config.purchase.url)}" >${esc(config.purchase.label)}</a>`
    : '';
  const login = access.user ? '' : `<button class="btn" style="padding:8px 14px;font-size:13px" ${act('sign-in')}>구글 로그인</button>`;
  return `<div class="card" style="margin-bottom:14px;padding:14px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between">
    <div style="font-size:13px;line-height:1.5"><b>무료 샘플 문항</b>을 풀고 있습니다.<br><span style="color:var(--muted)">${access.user ? '이용권이 확인되면 전체 문항이 열립니다.' : '이용권이 있다면 로그인하세요.'}</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${login}${buy}</div>
  </div>`;
}

export function mastery(vm) {
  const { overview: o, cells } = vm;
  if (!o.total) return emptyStage(vm);
  const plots = cells.map((c) =>
    `<div class="${c.box === 0 ? 'plot new' : 'plot'}" style="background:${BOX_COLORS[c.box]}" title="${esc(c.subject)} · 레벨 ${c.box}/${MAX_BOX}"></div>`).join('');
  const bar = (name, m, color) =>
    `<div class="subj"><div class="top"><b>${esc(name)}</b><span class="n">${m.mastered}/${m.n} 숙달 · ${m.pct}%</span></div><div class="track"><div class="fill" style="width:${m.pct}%;background:${color}"></div></div></div>`;
  const DIFF = { 1: ['★ 기초', '#3A5BA0'], 2: ['★★ 표준', '#8A6D1F'], 3: ['★★★ 심화', '#B23A3A'] };
  return `
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px">
      <div style="font-size:30px;font-weight:800;letter-spacing:-1px">${o.mastery.pct}<small style="font-size:14px;color:var(--muted);font-weight:600;margin-left:3px">% 숙달</small></div>
      <div style="text-align:right;font-size:12px;color:var(--muted)">학습한 문항<br><b style="font-size:15px;color:var(--ink)">${o.mastery.seen} / ${o.total}</b></div>
    </div>
    <div class="plots">${plots}</div>
    <div class="legend"><span><i style="background:var(--b0)"></i>미학습</span><span><i style="background:var(--b1)"></i>취약</span><span><i style="background:var(--b3)"></i>학습중</span><span><i style="background:var(--b5)"></i>숙달</span></div>
  </div>
  <div class="card" style="margin-bottom:16px"><div class="eyebrow" style="margin-bottom:10px">과목별 숙련도</div><div class="subj-bars">${o.subjects.map((s) => bar(s.name, s, SUBJECT_COLOR[s.name] || 'var(--ink)')).join('')}</div></div>
  <div class="card"><div class="eyebrow" style="margin-bottom:10px">난이도별 숙련도</div><div class="subj-bars">${o.difficulties.map((d) => bar(DIFF[d.level][0], d, DIFF[d.level][1])).join('')}</div></div>
  <div style="text-align:center;margin-top:16px"><button style="font-size:12px;color:var(--faint);border:1px solid var(--line);border-radius:7px;padding:6px 10px" ${act('reset')}>전체 기록 초기화</button></div>`;
}

export function status(vm) {
  const { overview: o } = vm;
  if (!o.total) return emptyStage(vm);
  return `
  <div class="card" style="margin-bottom:16px;text-align:center;padding:24px">
    ${ring({ pct: o.mastery.pct, label: '전체 숙련도', color: scoreColor(o.mastery.pct, 80, 40) })}
  </div>
  <div class="card" style="margin-bottom:16px">
    <div class="statline streak"><span class="k">연속 학습</span><span class="v">${o.streak}일 ${o.streak >= 3 ? '🔥' : ''}</span></div>
    <div class="statline"><span class="k">오늘 복습할 문항</span><span class="v">${o.dueCount}題</span></div>
    <div class="statline"><span class="k">누적 정답률</span><span class="v">${o.accuracy}%</span></div>
    <div class="statline"><span class="k">총 푼 문항</span><span class="v mono">${o.totalAnswered}</span></div>
    <div class="statline"><span class="k">총 문항 수</span><span class="v mono">${o.total}</span></div>
  </div>
  ${examHistory(o)}
  <div class="modes">
    <button class="mode primary" ${act('start', { mode: 'review' })}><div class="mt">오늘의 복습 <span class="badge ${o.dueCount > 0 ? 'due' : ''}">${o.dueCount}題</span></div><div class="md">간격 반복으로 복습할 문항을 풀어보세요.</div></button>
    <button class="mode" ${act('start', { mode: 'weak' })}><div class="mt">약점 집중 <span class="badge">${o.weakCount}題</span></div><div class="md">취약 문항만 집중 반복합니다.</div></button>
  </div>`;
}

const dayLabel = (day) => {
  const d = new Date(day * 86400000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

/** 모의고사 기록 카드 (최근 5회) */
function examHistory(o) {
  const ex = o.exams;
  if (!ex || !ex.count) {
    return o.hasMcq
      ? `<div class="card exam-hist" style="margin-bottom:16px"><div class="eyebrow" style="margin-bottom:8px">모의고사 기록</div>
         <p class="eh-empty">아직 응시 기록이 없습니다. 모의고사를 보면 점수가 여기에 쌓입니다.</p>
         <button class="btn" ${act('start-exam')}>모의고사 보기</button></div>`
      : '';
  }
  const rows = ex.recent.map((r) => `
    <tr>
      <td>${dayLabel(r.day)}</td>
      <td class="mono">${r.avg}</td>
      <td><span class="eh-tag ${r.pass ? 'pass' : 'fail'}">${r.pass ? '합격' : '불합격'}</span></td>
      <td class="eh-subj">${Object.entries(r.subjects).map(([k, v]) => `<span class="${v < 40 ? 'low' : ''}">${esc(k)} ${v}</span>`).join('')}</td>
    </tr>`).join('');
  return `<div class="card exam-hist" style="margin-bottom:16px">
    <div class="eh-head"><span class="eyebrow">모의고사 기록</span><span class="eh-meta">${ex.count}회 · 최고 평균 ${ex.best.avg}점</span></div>
    <table class="eh-table"><thead><tr><th>날짜</th><th>평균</th><th>결과</th><th>과목별</th></tr></thead><tbody>${rows}</tbody></table>
  </div>`;
}
