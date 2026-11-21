/**
 * 오답노트·의견 보내기·불러오기 상태 화면
 */
import { sourceYearLabel } from '../../domain/question.js';
import { act, esc } from './common.js';

const pageHead = (title, sub = '') => `<div class="page-head">
    <button class="link" ${act('go', { page: 'home' })}>학습으로</button>
    <h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}
  </div>`;

/** 본문 HTML에서 태그를 빼고 앞부분만 */
const preview = (html, n = 90) => {
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return esc(text.length > n ? `${text.slice(0, n)}…` : text);
};

export function wrongNote(vm) {
  const items = vm.wrongNote;
  const list = items.length
    ? `<div class="list">${items.map(({ question: q, card: c, accuracy }) => `<button class="row" ${act('retry-item', { id: q.id })}>
        <span class="row-main">
          <small>${esc(q.subject)}${sourceYearLabel(q) ? ` · ${esc(sourceYearLabel(q))}` : ''}</small>
          <b class="clamp">${preview(q.q)}</b>
          <small>맞힘 ${c.correct} · 틀림 ${c.wrong} · 정답률 ${accuracy}%</small>
        </span>
        <span class="row-end go">다시 풀기</span>
      </button>`).join('')}</div>`
    : '<section class="panel empty"><h2>오답이 없습니다</h2><p>틀린 문항이 생기면 여기에 모입니다. 다시 맞히면 목록에서 빠집니다.</p></section>';
  return `${pageHead('오답노트', `${items.length}문항`)}${list}`;
}

export function feedback() {
  return `${pageHead('의견·오류 보내기', '문제나 정답이 틀렸다면 문제 첫 줄을 함께 적어 주세요.')}
  <section class="panel form">
    <label for="fb-type">종류</label>
    <select id="fb-type">
      <option value="wrong">문제·정답 오류</option>
      <option value="bug">앱 오류</option>
      <option value="idea">기능 제안</option>
      <option value="etc">기타</option>
    </select>
    <label for="fb-text">내용</label>
    <textarea id="fb-text" rows="6"></textarea>
    <button class="btn" ${act('send-feedback')}>메일로 보내기</button>
  </section>`;
}

export function loading() {
  return '<section class="panel empty"><h2>불러오는 중</h2><p>문제은행과 학습 기록을 준비하고 있습니다.</p></section>';
}

export function loadError(message) {
  return `<section class="panel empty">
    <h2>문제를 불러오지 못했습니다</h2>
    <p class="break">${esc(message)}</p>
    <button class="btn" ${act('reload')}>다시 시도</button>
  </section>`;
}
