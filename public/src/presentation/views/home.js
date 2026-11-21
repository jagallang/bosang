/**
 * 학습(첫 화면)·기록 화면
 */
import { act, bar, emptyStage, esc, figure, level, stageSwitch } from './common.js';

const row = (attrs, title, sub, end, extra = '') => `<button class="row" ${attrs}>
    <span class="row-main"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}${extra}</span>
    <span class="row-end">${end}</span>
  </button>`;

export function dashboard(vm) {
  const { overview: o, ui } = vm;
  if (!o.total) return emptyStage(vm);
  const due = o.dueCount;

  const today = `<section class="hero">
    <div class="hero-head">
      <p class="hero-label">오늘의 복습</p>
      <p class="hero-n"><b>${due}</b>문항</p>
      <p class="hero-sub">${due ? '잊어버리기 직전의 문항입니다. 오늘 풀면 다음 복습 간격이 늘어납니다.' : '오늘 복습할 문항을 모두 풀었습니다. 약점 집중이나 과목별 연습을 해 보세요.'}</p>
    </div>
    <button class="btn btn-light" ${act('start', { mode: 'review' })} ${due ? '' : 'disabled'}>복습 시작</button>
    <dl class="hero-stats">
      <div><dt>숙련도</dt><dd>${o.mastery.pct}%</dd></div>
      <div><dt>정답률</dt><dd>${o.accuracy}%</dd></div>
      <div><dt>연속 학습</dt><dd>${o.streak}일</dd></div>
    </dl>
  </section>`;

  const quick = `<section class="group">
    <h2 class="g-title">바로 풀기</h2>
    <div class="list">
      ${row(act('start', { mode: 'weak' }), '약점 집중', '틀렸거나 숙련도가 낮은 문항', `${o.weakCount}<small>문항</small>`)}
      ${o.hasMcq ? row(act('start-exam'), '모의고사', '실제 합격 기준으로 채점', `${o.examSize}<small>문항</small>`) : ''}
      ${row(act('go', { page: 'wrong' }), '오답노트', '아직 다시 맞히지 못한 문항', `${o.wrongCount}<small>문항</small>`)}
    </div>
  </section>`;

  const subjects = `<section class="group">
    <div class="g-head">
      <h2 class="g-title">과목별 연습</h2>
      <button class="switch" role="switch" aria-checked="${ui.random}" ${act('toggle-random')}><span class="knob" aria-hidden="true"></span>무작위 순서</button>
    </div>
    <div class="list">
      ${row(act('start', { mode: 'practice', subject: '전체' }), '전체 과목', `${o.total}문항`, `${o.mastery.pct}%`, bar(o.mastery.pct))}
      ${o.subjects.map((s) => (s.n
        ? row(act('start', { mode: 'practice', subject: s.name }), esc(s.name), `${s.n}문항`, `${s.pct}%`, bar(s.pct))
        : `<div class="row off"><span class="row-main"><b>${esc(s.name)}</b><small>문항 준비 중</small></span></div>`)).join('')}
    </div>
  </section>`;

  const types = o.hasMcq && o.hasEssay ? `<section class="group">
    <h2 class="g-title">유형별 연습</h2>
    <div class="list">
      ${row(act('start', { mode: 'type', type: 'mcq' }), '객관식', '', `${o.typeCounts.mcq}<small>문항</small>`)}
      ${row(act('start', { mode: 'type', type: 'essay' }), '서술형', '키워드 자가 채점', `${o.typeCounts.essay}<small>문항</small>`)}
    </div>
  </section>` : '';

  return `<div class="home">
    <div class="home-head">
      <h1>${esc(o.label)}</h1>
      ${stageSwitch(o)}
    </div>
    ${accessBanner(vm)}
    ${today}
    ${quick}
    ${subjects}
    ${types}
    <p class="foot">총 ${o.total}문항 · 진도는 ${vm.access.user ? '계정에' : '이 기기에'} 자동 저장됩니다</p>
  </div>`;
}

/** 로그인·이용권 안내 (firebase 모드에서 이용권이 없을 때만) */
function accessBanner(vm) {
  const { access, config } = vm;
  if (!access.enabled || access.paid) return '';
  const buy = config.purchase?.url ? `<a class="btn btn-line sm" href="${esc(config.purchase.url)}">${esc(config.purchase.label)}</a>` : '';
  const login = access.user ? '' : `<button class="btn sm" ${act('sign-in')}>구글 로그인</button>`;
  return `<div class="notice">
    <p><b>무료 샘플 문항</b>을 풀고 있습니다. ${access.user ? '이용권이 확인되면 전체 문항이 열립니다.' : '이용권이 있다면 로그인하세요.'}</p>
    <div class="notice-act">${login}${buy}</div>
  </div>`;
}

const DIFF_NAME = { 1: '기초', 2: '표준', 3: '심화' };

export function records(vm) {
  const { overview: o, cells } = vm;
  if (!o.total) return emptyStage(vm);
  const plots = cells.map((c) => `<i class="${level(c.box)}" title="${esc(c.subject)} · ${c.box}단계"></i>`).join('');
  const bars = (list, name) => list.map((m) => `<div class="mbar">
      <div class="mbar-top"><b>${esc(name(m))}</b><span>${m.mastered}/${m.n} 숙달 · ${m.pct}%</span></div>${bar(m.pct)}
    </div>`).join('');

  return `<div class="records">
    <div class="home-head">
      <h1>${esc(o.label)} 기록</h1>
      ${stageSwitch(o)}
    </div>

    <section class="panel">
      <div class="figs">
        ${figure(o.mastery.pct, '%', '숙련도')}
        ${figure(o.accuracy, '%', '누적 정답률')}
        ${figure(o.streak, '일', '연속 학습')}
        ${figure(o.totalAnswered, '회', '푼 횟수')}
      </div>
    </section>

    <section class="panel">
      <div class="p-head"><h2>문항별 숙련도</h2><span>${o.mastery.seen} / ${o.total} 학습</span></div>
      <div class="plots">${plots}</div>
      <div class="legend"><span><i class="lv0"></i>미학습</span><span><i class="lv1"></i>취약</span><span><i class="lv3"></i>학습 중</span><span><i class="lv5"></i>숙달</span></div>
    </section>

    <section class="panel">
      <div class="p-head"><h2>과목별</h2></div>
      ${bars(o.subjects, (m) => m.name)}
    </section>

    <section class="panel">
      <div class="p-head"><h2>난이도별</h2></div>
      ${bars(o.difficulties, (m) => DIFF_NAME[m.level])}
    </section>

    ${examHistory(o)}
  </div>`;
}

const dayLabel = (day) => {
  const d = new Date(day * 86400000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

/** 모의고사 기록 (최근 5회) */
function examHistory(o) {
  if (!o.hasMcq) return '';
  const ex = o.exams;
  if (!ex || !ex.count) {
    return `<section class="panel">
      <div class="p-head"><h2>모의고사</h2></div>
      <p class="muted">아직 응시 기록이 없습니다. 모의고사를 보면 점수가 여기에 쌓입니다.</p>
      <button class="btn sm" ${act('start-exam')}>모의고사 보기</button>
    </section>`;
  }
  const rows = ex.recent.map((r) => `<tr>
      <td>${dayLabel(r.day)}</td>
      <td class="num">${r.avg}</td>
      <td><span class="pill ${r.pass ? 'good' : 'bad'}">${r.pass ? '합격' : '불합격'}</span></td>
      <td class="subj">${Object.entries(r.subjects).map(([k, v]) => `<span class="${v < 40 ? 'bad' : ''}">${esc(k)} ${v}</span>`).join('')}</td>
    </tr>`).join('');
  return `<section class="panel">
    <div class="p-head"><h2>모의고사</h2><span>${ex.count}회 · 최고 평균 ${ex.best.avg}점</span></div>
    <table class="tbl"><thead><tr><th>날짜</th><th>평균</th><th>결과</th><th>과목별</th></tr></thead><tbody>${rows}</tbody></table>
  </section>`;
}
