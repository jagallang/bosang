/**
 * 오답노트·의견 보내기·불러오기 상태 화면
 */
import { sourceYearLabel } from '../../domain/question.js';
import { act, esc } from './common.js';

const pageHeader = (title) => `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
    <div class="eyebrow">${title}</div>
    <button class="btn ghost" style="padding:6px 12px;font-size:12px" ${act('go', { page: 'home' })}>← 돌아가기</button>
  </div>`;

/** 본문 HTML에서 태그를 빼고 앞부분만 */
const preview = (html, n = 80) => {
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return esc(text.length > n ? `${text.slice(0, n)}...` : text);
};

export function wrongNote(vm) {
  const items = vm.wrongNote;
  const list = items.length
    ? items.map(({ question: q, card: c, accuracy }) => `<div class="card" style="margin-bottom:8px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;color:var(--muted)">${esc(q.subject)} ${esc(sourceYearLabel(q))}</span>
        <span style="font-size:12px;font-weight:700;color:${accuracy >= 50 ? 'var(--gold)' : 'var(--wrong)'}">${c.correct}✓ ${c.wrong}✕ (${accuracy}%)</span>
      </div>
      <div style="font-size:14px;font-weight:600;line-height:1.5;word-break:keep-all;color:var(--ink)">${preview(q.q)}</div>
      <div style="margin-top:8px"><button style="font-size:12px;color:var(--correct);font-weight:600" ${act('retry-item', { id: q.id })}>다시 풀기 →</button></div>
    </div>`).join('')
    : '<div class="empty"><div class="big">오답이 없습니다</div>틀린 문항이 생기면 여기에 표시됩니다.</div>';
  return `${pageHeader(`📕 오답노트 · ${items.length}문항`)}${list}`;
}

export function feedback() {
  return `${pageHeader('💬 의견 보내기')}
  <div class="card" style="padding:20px">
    <label for="fb-type" style="display:block;font-size:14px;font-weight:700;margin-bottom:12px">앱 사용 중 의견이나 오류를 알려주세요</label>
    <select id="fb-type" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font-size:16px;margin-bottom:10px;background:var(--surface)">
      <option value="bug">🐛 버그/오류 신고</option>
      <option value="wrong">❌ 문제/정답 오류</option>
      <option value="idea">💡 기능 제안</option>
      <option value="etc">📝 기타 의견</option>
    </select>
    <textarea id="fb-text" rows="5" aria-label="의견 내용" placeholder="내용을 작성해주세요. 문제 오류라면 문항 번호나 문제 첫 줄을 적어 주세요." style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font-size:16px;resize:vertical;font-family:var(--sans)"></textarea>
    <div style="margin-top:12px">
      <button class="btn" ${act('send-feedback')}>✉️ 메일 보내기</button>
    </div>
  </div>`;
}

export function loading() {
  return '<div class="empty"><div class="big">불러오는 중…</div>문제은행과 학습 기록을 준비하고 있습니다.</div>';
}

export function loadError(message) {
  return `<div class="card" style="text-align:center;padding:40px 20px">
    <div style="font-size:16px;font-weight:800;margin-bottom:8px">문제를 불러오지 못했습니다</div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:16px;word-break:break-all">${esc(message)}</div>
    <button class="btn" ${act('reload')}>다시 시도</button>
  </div>`;
}
