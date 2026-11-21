/**
 * 풀이 화면: 선택형, 서술형, 모의고사, 세션 요약, 모의고사 성적표
 */
import { CHOICE_MARKS, ESSAY_PASS_SCORE } from '../../domain/constants.js';
import { KeywordCheck } from '../../domain/grading.js';
import { sourceLabel } from '../../domain/question.js';
import { EssayPhase } from '../../domain/session.js';
import { act, boxDots, difficultyTag, esc, ring, scoreColor, studyTop } from './common.js';

export function mcq(vm) {
  const { session, question: q, card } = vm;
  const chosen = session.answerOf();
  const answered = chosen !== undefined;
  const opts = q.opt.map((t, i) => {
    let cls = 'opt';
    if (answered) cls += i === q.a ? ' correct' : i === chosen ? ' wrong' : ' dim';
    return `<button class="${cls}" ${answered ? 'disabled' : ''} ${act('answer', { i })}><span class="no">${CHOICE_MARKS[i]}</span><span>${t}</span></button>`;
  }).join('');

  const ok = answered && chosen === q.a;
  const verdict = answered
    ? `<div class="verdict ${ok ? 'ok' : 'no'}" role="status"><div class="vh">${ok ? '✓ 정답' : '✕ 오답'} · 정답은 ${CHOICE_MARKS[q.a]}</div><div class="ex">${q.ex || ''}</div></div>
       <div class="actionbar"><button class="btn" ${act('next')}>${session.isLast ? '세션 마치기' : '다음 문항 →'}</button><span class="kbd-hint"><kbd>Enter</kbd> 다음</span></div>`
    : `<div class="actionbar"><span class="kbd-hint"><kbd>1</kbd>~<kbd>5</kbd> 로 답 선택</span></div>`;

  const src = sourceLabel(q);
  return `${studyTop(session)}
  <div class="qcard">
    <div class="qmeta">
      <span class="tag subj">${esc(q.subject)}</span>
      ${difficultyTag(q)}
      ${src ? `<span class="tag origin">${esc(src)}</span>` : ''}
      ${boxDots(card?.box || 0)}
    </div>
    <div class="qtext">${q.q}</div>
    <div class="opts">${opts}</div>
    ${verdict}
  </div>`;
}

export function essay(vm) {
  const { session, question: q, card } = vm;
  const kws = q.keywords || [];
  const st = session.essay();
  let body;

  if (st.phase === EssayPhase.SHEET) {
    const slots = kws.map((kw, i) => {
      const shown = st.hints.has(i);
      return `<button class="ans-slot ${shown ? 'shown' : ''}" ${act('hint', { i })} style="width:100%;text-align:left">
        <span class="ans-no">${i + 1}</span>
        ${shown ? `<span class="ans-kw">${esc(kw.term)}</span>` : '<span class="ans-blank">탭하여 힌트 확인</span>'}
      </button>`;
    }).join('');
    const left = kws.length - st.hints.size;
    body = `<div class="ans-sheet">
      <div class="ans-title">📝 답안지 — 핵심 키워드를 떠올려 보세요</div>
      <div class="ans-sub">항목을 탭하면 힌트가 표시됩니다 (${st.hints.size}/${kws.length})</div>
      <div class="ans-list">${slots}</div>
      <div class="actionbar" style="margin-top:14px">
        <button class="btn" ${act('reveal')}>정답 확인</button>
        ${left > 0 ? `<span class="kbd-hint">${left}개 항목 남음</span>` : ''}
      </div>
    </div>`;
  } else if (st.phase === EssayPhase.REVEALED) {
    const items = kws.map((kw, i) => {
      const c = st.checks[i] || KeywordCheck.NONE;
      const cls = c === KeywordCheck.CHECKED ? 'checked' : c === KeywordCheck.UNSURE ? 'unsure' : '';
      return `<button class="kw-item ${cls}" ${act('kw', { i })} style="width:100%;text-align:left" aria-label="${esc(kw.term)} ${c === KeywordCheck.CHECKED ? '체크됨' : c === KeywordCheck.UNSURE ? '확신 없음' : '미체크'}">
        <input type="checkbox" tabindex="-1" aria-hidden="true" style="pointer-events:none" ${c === KeywordCheck.CHECKED ? 'checked' : ''}>
        <span>${esc(kw.term)}</span>
        ${kw.weight > 1 ? `<span class="kw-weight">×${kw.weight}</span>` : ''}
      </button>`;
    }).join('');
    body = `${modelAnswer(q)}
    <div class="kw-title">키워드 자가 채점 (확실히 알고 있던 항목만 체크 · 한 번 더 누르면 '확신 없음')</div>
    <div class="kw-list">${items}</div>
    <div class="actionbar">
      <button class="btn" ${act('grade-essay')}>채점하기</button>
      <span class="kbd-hint">알고 있던 키워드만 체크하세요</span>
    </div>`;
  } else {
    const sc = session.answerOf();
    const pass = sc >= ESSAY_PASS_SCORE;
    body = `${modelAnswer(q)}
    <div class="essay-score ${pass ? 'pass' : 'fail'}" role="status">${pass ? '✓ 숙달' : '✕ 복습 필요'} · 키워드 달성률 ${sc}%</div>
    <div class="actionbar"><button class="btn" ${act('next')}>${session.isLast ? '세션 마치기' : '다음 문항 →'}</button><span class="kbd-hint"><kbd>Enter</kbd> 다음</span></div>`;
  }

  return `${studyTop(session)}
  <div class="qcard">
    <div class="qmeta">
      <span class="tag subj">${esc(q.subject)}</span>
      ${difficultyTag(q)}
      <span class="tag origin">서술형</span>
      ${boxDots(card?.box || 0)}
    </div>
    <div class="qtext">${q.q}</div>
    ${body}
  </div>`;
}

const modelAnswer = (q) => `<div class="model-answer"><div class="ma-title">모범답안</div><div class="ma-body">${q.model || ''}</div></div>`;

export function exam(vm) {
  const { session, question: q } = vm;
  const chosen = session.answerOf();
  const ptsPer = Math.round(100 / session.total);
  const opts = q.opt.map((t, i) => {
    const on = chosen === i;
    return `<button class="opt" aria-pressed="${on}" style="${on ? 'border-color:var(--ink);background:var(--surface-2)' : ''}" ${act('exam-pick', { i })}>
      <span class="no" style="${on ? 'background:var(--ink);border-color:var(--ink);color:#fff' : ''}">${CHOICE_MARKS[i]}</span><span>${t}</span></button>`;
  }).join('');
  const warn = session.insufficient && session.position === 1
    ? `<div style="padding:8px 12px;background:var(--wrong-bg);border:1px solid var(--wrong);border-radius:8px;font-size:12px;color:var(--wrong);margin-bottom:12px">일부 과목의 문항이 부족하여 ${session.total}문항으로 출제됩니다.</div>`
    : '';
  return `${studyTop(session, { quitLabel: '← 나가기' })}
  ${warn}
  <div class="qcard">
    <div class="qmeta"><span class="tag subj">${esc(q.subject)}</span><span class="tag origin">모의고사 · ${ptsPer}점</span></div>
    <div class="qtext">${q.q}</div>
    <div class="opts">${opts}</div>
    <div class="actionbar">
      ${session.idx > 0 ? `<button class="btn ghost" ${act('exam-prev')}>← 이전</button>` : ''}
      <button class="btn" ${act('exam-next')} ${chosen === undefined ? 'aria-disabled="true" style="opacity:.5"' : ''}>${session.isLast ? '제출하고 채점' : '다음 →'}</button>
      <span class="kbd-hint"><kbd>1</kbd>~<kbd>5</kbd> 선택 · <kbd>Enter</kbd> 다음</span>
    </div>
  </div>`;
}

export function summary(vm) {
  const { session } = vm;
  const acc = session.accuracyPct;
  return `<div class="card"><div class="summary">
    <div class="eyebrow">세션 완료</div>
    ${ring({ pct: acc, label: '정답률', color: scoreColor(acc), cls: 'ring', fontSize: 26 })}
    <h2>${acc >= 80 ? '훌륭합니다' : acc >= 60 ? '잘 하고 있어요' : '복습이 더 필요해요'}</h2>
    <div class="sline">${session.total}문항 중 ${session.correctCount}문항 정답</div>
    <div class="sgrid">
      <div class="sbox up"><div class="n">▲ ${session.levelUp}</div><div class="l">숙련도 상승</div></div>
      <div class="sbox"><div class="n mono">${session.correctCount}/${session.total}</div><div class="l">이번 세션</div></div>
      <div class="sbox down"><div class="n">▼ ${session.levelDown}</div><div class="l">1레벨로 하락</div></div>
    </div>
    <div class="actionbar" style="justify-content:center">
      <button class="btn" ${act('quit')}>돌아가기</button>
      <button class="btn ghost" ${act('repeat')}>한 번 더</button>
    </div>
  </div></div>`;
}

export function examResult(vm) {
  const { session, report: r } = vm;
  const pf = r.passFail;
  const pfHtml = `<div class="pf-card ${pf.pass ? 'pass' : 'fail'}">
    <div class="pf-head" style="color:${pf.pass ? 'var(--correct)' : 'var(--wrong)'}">${pf.pass ? '합격 (PASS)' : '불합격 (FAIL)'}${pf.anyFailed && pf.avgScore >= 60 ? ' — 과락 과목 있음' : ''}</div>
    ${pf.results.map((x) => `<div class="pf-row"><span>${esc(x.subject)}</span><span style="font-weight:700;color:${x.failed ? 'var(--wrong)' : 'var(--ink)'}">${x.score}점 ${x.failed ? '(과락 위험 — 40점 미만)' : ''}</span></div>`).join('')}
    <div class="pf-avg"><span>평균</span><span style="color:${pf.avgScore >= 60 ? 'var(--correct)' : 'var(--wrong)'}">${pf.avgScore}점 ${pf.avgScore >= 60 ? '(60점 이상)' : '(60점 미만)'}</span></div>
  </div>`;
  const rows = r.rows.map(({ question: q, chosen, ok }, n) => `<div style="padding:12px 0;border-bottom:1px solid var(--line-2)">
      <div style="display:flex;gap:8px;align-items:flex-start">
        <span class="mono" style="color:${ok ? 'var(--correct)' : 'var(--wrong)'};font-weight:800;flex:none">${ok ? '✓' : '✕'} ${n + 1}.</span>
        <div style="flex:1">
          <div style="font-size:13.5px;font-weight:600;line-height:1.5;word-break:keep-all">${q.q}</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:5px">내 답 ${CHOICE_MARKS[chosen] || '-'} · 정답 <b style="color:var(--correct)">${CHOICE_MARKS[q.a]}</b></div>
          <div style="font-size:12.5px;color:var(--ink-2);margin-top:4px;line-height:1.5;word-break:keep-all">${q.ex || ''}</div>
        </div>
      </div></div>`).join('');
  return `<div class="card"><div class="summary" style="padding-bottom:8px">
    <div class="eyebrow">채점 결과 · ${esc(session.subject)}</div>
    <h2 style="margin-top:10px;font-size:40px;color:${scoreColor(r.percent)}">${r.points}<span style="font-size:18px;color:var(--muted)"> / 100점</span></h2>
    <div class="sline">${r.total}문항 중 ${r.correct}문항 정답 · ${r.percent}%</div>
    ${pfHtml}
  </div>
  <div style="margin-top:6px"><div class="eyebrow" style="margin-bottom:6px">문항별 해설</div>${rows}</div>
  <div class="actionbar" style="justify-content:center;margin-top:20px">
    <button class="btn" ${act('quit')}>돌아가기</button>
    <button class="btn ghost" ${act('repeat')}>새 모의고사</button>
  </div></div>`;
}
