/**
 * 풀이 화면: 선택형, 서술형, 모의고사, 세션 요약, 모의고사 성적표
 */
import { CHOICE_MARKS, ESSAY_PASS_SCORE } from '../../domain/constants.js';
import { KeywordCheck } from '../../domain/grading.js';
import { sourceLabel } from '../../domain/question.js';
import { EssayPhase } from '../../domain/session.js';
import { act, boxDots, difficultyText, esc, figure, scoreTone, studyTop } from './common.js';

const meta = (parts, card) => `<div class="q-meta"><span>${parts.filter(Boolean).map(esc).join(' · ')}</span>${card !== undefined ? boxDots(card?.box || 0) : ''}</div>`;
const nextBtn = (session) => `<div class="s-act"><button class="btn wide" ${act('next')}>${session.isLast ? '세션 마치기' : '다음 문항'}</button><span class="kbd"><kbd>Enter</kbd> 다음</span></div>`;

export function mcq(vm) {
  const { session, question: q, card } = vm;
  const chosen = session.answerOf();
  const answered = chosen !== undefined;
  const opts = q.opt.map((t, i) => {
    const state = !answered ? '' : i === q.a ? ' is-correct' : i === chosen ? ' is-wrong' : ' is-dim';
    return `<button class="opt${state}" ${answered ? 'disabled' : ''} ${act('answer', { i })}><span class="no">${CHOICE_MARKS[i]}</span><span class="ot">${t}</span></button>`;
  }).join('');
  const ok = answered && chosen === q.a;
  const after = answered
    ? `<div class="verdict ${ok ? 'good' : 'bad'}" role="status"><p class="v-head">${ok ? '정답입니다' : '오답'}${ok ? '' : `<span>정답 ${CHOICE_MARKS[q.a]}</span>`}</p><div class="v-body">${q.ex || ''}</div></div>${nextBtn(session)}`
    : '<p class="kbd center"><kbd>1</kbd>–<kbd>5</kbd> 키로도 고를 수 있습니다</p>';
  return `${studyTop(session)}
  <article class="q">
    ${meta([q.subject, difficultyText(q), sourceLabel(q)], card)}
    <div class="q-text">${q.q}</div>
    <div class="opts">${opts}</div>
    ${after}
  </article>`;
}

export function essay(vm) {
  const { session, question: q, card } = vm;
  const kws = q.keywords || [];
  const st = session.essay();
  let body;

  if (st.phase === EssayPhase.SHEET) {
    const slots = kws.map((kw, i) => {
      const shown = st.hints.has(i);
      return `<button class="slot${shown ? ' shown' : ''}" ${act('hint', { i })}><span class="slot-no">${i + 1}</span><span>${shown ? esc(kw.term) : '눌러서 힌트 보기'}</span></button>`;
    }).join('');
    body = `<section class="sheet-box">
      <p class="sb-title">답안에 들어갈 핵심 키워드 ${kws.length}개를 먼저 떠올려 보세요</p>
      <div class="slots">${slots}</div>
      <div class="s-act"><button class="btn wide" ${act('reveal')}>모범답안 보기</button><span class="kbd">힌트 ${st.hints.size}/${kws.length}</span></div>
    </section>`;
  } else if (st.phase === EssayPhase.REVEALED) {
    const items = kws.map((kw, i) => {
      const c = st.checks[i] || KeywordCheck.NONE;
      const cls = c === KeywordCheck.CHECKED ? ' checked' : c === KeywordCheck.UNSURE ? ' unsure' : '';
      const label = c === KeywordCheck.CHECKED ? '알았음' : c === KeywordCheck.UNSURE ? '애매함' : '';
      return `<button class="kw${cls}" ${act('kw', { i })} aria-pressed="${c === KeywordCheck.CHECKED}">
        <span class="box" aria-hidden="true"></span><span class="kw-t">${esc(kw.term)}</span>
        ${kw.weight > 1 ? `<span class="kw-w">×${kw.weight}</span>` : ''}${label ? `<span class="kw-s">${label}</span>` : ''}
      </button>`;
    }).join('');
    body = `${modelAnswer(q)}
    <section class="kw-box">
      <p class="sb-title">스스로 채점하기</p>
      <p class="muted">확실히 쓸 수 있었던 키워드만 누르세요. 한 번 더 누르면 '애매함'입니다.</p>
      <div class="kws">${items}</div>
      <div class="s-act"><button class="btn wide" ${act('grade-essay')}>채점하기</button></div>
    </section>`;
  } else {
    const sc = session.answerOf();
    const pass = sc >= ESSAY_PASS_SCORE;
    body = `${modelAnswer(q)}
    <div class="verdict ${pass ? 'good' : 'bad'}" role="status"><p class="v-head">${pass ? '숙달' : '복습 필요'}<span>키워드 ${sc}%</span></p></div>
    ${nextBtn(session)}`;
  }
  return `${studyTop(session)}
  <article class="q">
    ${meta([q.subject, difficultyText(q), '서술형'], card)}
    <div class="q-text">${q.q}</div>
    ${body}
  </article>`;
}

const modelAnswer = (q) => `<section class="model"><p class="sb-title">모범답안</p><div class="model-body">${q.model || ''}</div></section>`;

export function exam(vm) {
  const { session, question: q } = vm;
  const chosen = session.answerOf();
  const ptsPer = Math.round(100 / session.total);
  const opts = q.opt.map((t, i) => `<button class="opt${chosen === i ? ' is-picked' : ''}" aria-pressed="${chosen === i}" ${act('exam-pick', { i })}><span class="no">${CHOICE_MARKS[i]}</span><span class="ot">${t}</span></button>`).join('');
  const warn = session.insufficient && session.position === 1
    ? `<p class="notice">일부 과목의 문항이 부족해 ${session.total}문항으로 출제합니다.</p>` : '';
  return `${studyTop(session, { quitLabel: '나가기' })}
  ${warn}
  <article class="q">
    ${meta([q.subject, `모의고사 ${ptsPer}점`])}
    <div class="q-text">${q.q}</div>
    <div class="opts">${opts}</div>
    <div class="s-act split">
      ${session.idx > 0 ? `<button class="btn btn-line" ${act('exam-prev')}>이전</button>` : '<span></span>'}
      <button class="btn" ${act('exam-next')} ${chosen === undefined ? 'disabled' : ''}>${session.isLast ? '제출하고 채점' : '다음'}</button>
    </div>
  </article>`;
}

export function summary(vm) {
  const { session } = vm;
  const acc = session.accuracyPct;
  return `<section class="panel result">
    <p class="r-label">세션 완료</p>
    <p class="r-score ${scoreTone(acc)}">${acc}<small>%</small></p>
    <p class="r-sub">${session.total}문항 중 ${session.correctCount}문항 정답</p>
    <div class="figs three">
      ${figure(session.levelUp, '문항', '숙련도 상승')}
      ${figure(session.correctCount, `/${session.total}`, '정답')}
      ${figure(session.levelDown, '문항', '1단계로')}
    </div>
    <div class="s-act center">
      <button class="btn" ${act('quit')}>학습으로</button>
      <button class="btn btn-line" ${act('repeat')}>한 번 더</button>
    </div>
  </section>`;
}

export function examResult(vm) {
  const { session, report: r } = vm;
  const pf = r.passFail;
  const subjRows = pf.results.map((x) => `<tr><td>${esc(x.subject)}</td><td class="num ${x.failed ? 'bad' : ''}">${x.score}점${x.failed ? ' · 과락' : ''}</td></tr>`).join('');
  const rows = r.rows.map(({ question: q, chosen, ok }, n) => `<div class="review ${ok ? 'good' : 'bad'}">
      <p class="rv-no">${n + 1}. ${ok ? '정답' : '오답'}</p>
      <div class="rv-q">${q.q}</div>
      <p class="rv-a">내 답 ${CHOICE_MARKS[chosen] || '-'} · 정답 <b>${CHOICE_MARKS[q.a]}</b></p>
      <div class="rv-ex">${q.ex || ''}</div>
    </div>`).join('');
  return `<section class="panel result">
    <p class="r-label">모의고사 · ${esc(session.subject)}</p>
    <p class="r-score ${pf.pass ? 'good' : 'bad'}">${r.points}<small>/100</small></p>
    <p class="r-sub"><span class="pill ${pf.pass ? 'good' : 'bad'}">${pf.pass ? '합격' : '불합격'}</span> ${r.total}문항 중 ${r.correct}문항 정답${pf.anyFailed && pf.avgScore >= 60 ? ' · 과락 과목 있음' : ''}</p>
    <table class="tbl narrow"><tbody>${subjRows}<tr class="sum"><td>평균</td><td class="num ${pf.avgScore >= 60 ? 'good' : 'bad'}">${pf.avgScore}점</td></tr></tbody></table>
    <div class="s-act center">
      <button class="btn" ${act('quit')}>학습으로</button>
      <button class="btn btn-line" ${act('repeat')}>새 모의고사</button>
    </div>
  </section>
  <h2 class="g-title">문항별 해설</h2>
  ${rows}`;
}
