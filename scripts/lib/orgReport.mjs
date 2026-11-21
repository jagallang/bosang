// 기관 리포트용 순수 함수 — Firestore에 의존하지 않아 테스트할 수 있다.
const STAGES = ['1', '2'];

/** 학습 진도(v5) 한 사람분을 단계별 요약으로 바꾼다 */
export function summarizeProgress(progress, today) {
  const out = {};
  for (const s of STAGES) {
    const sp = progress?.[s];
    if (!sp) { out[s] = null; continue; }
    const cards = Object.values(sp.cards || {});
    const seen = cards.filter((c) => (c.seen || 0) > 0).length;
    const boxSum = cards.reduce((a, c) => a + (c.box || 0), 0);
    const days = sp.studyDays || [];
    const last = days.length ? Math.max(...days) : null;
    out[s] = {
      studyDays: new Set(days).size,
      answered: sp.totalAnswered || 0,
      accuracy: sp.totalAnswered ? Math.round((sp.totalCorrect / sp.totalAnswered) * 100) : 0,
      mastery: cards.length ? Math.round((boxSum / (cards.length * 5)) * 100) : 0,
      seenQuestions: seen,
      lastStudy: last === null ? '' : new Date(last * 86400000).toISOString().slice(0, 10),
      idleDays: last === null || today == null ? null : today - last,
    };
  }
  return out;
}

const HEADER = ['이메일', '이용권 만료', '단계', '학습일수', '푼 문항', '정답률(%)', '숙련도(%)', '마지막 학습일', '미학습 일수'];

const cell = (v) => {
  const t = v == null ? '' : String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** rows: [{ email, until, summary }] → CSV (엑셀 한글 깨짐 방지 BOM 포함) */
export function toCsv(rows) {
  const lines = [HEADER.join(',')];
  for (const r of rows) {
    for (const s of STAGES) {
      const x = r.summary?.[s];
      if (!x || !x.answered) continue;
      lines.push([r.email, r.until || '무기한', `${s}차`, x.studyDays, x.answered, x.accuracy, x.mastery, x.lastStudy, x.idleDays ?? ''].map(cell).join(','));
    }
    if (!STAGES.some((s) => r.summary?.[s]?.answered)) lines.push([r.email, r.until || '무기한', '-', 0, 0, '', '', '', ''].map(cell).join(','));
  }
  return '﻿' + lines.join('\n') + '\n';
}

/** CSV/줄 목록에서 이메일만 뽑는다 (첫 열 또는 이메일 모양의 값) */
export function parseEmails(text) {
  const found = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  return [...new Set(found.map((e) => e.toLowerCase()))];
}
