'use client';
import { useState } from 'react';
import { SAMPLE } from '../lib/sample';
import { SITE } from '../lib/site';

const MARKS = ['①', '②', '③', '④', '⑤'];

export default function ExamSheet() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const q = SAMPLE[i];
  const done = pick !== null;
  const ok = pick === q.a;
  const next = () => { setI((i + 1) % SAMPLE.length); setPick(null); };

  return (
    <div className="sheet" aria-live="polite">
      <div className="sheet-head">
        <span>{q.subject}</span>
        <span>샘플 문제 {i + 1}/{SAMPLE.length}</span>
      </div>
      <p className="sheet-q">{q.q}</p>
      <ol className="sheet-opts">
        {q.opt.map((o, k) => {
          const state = !done ? '' : k === q.a ? ' is-answer' : k === pick ? ' is-wrong' : ' is-dim';
          return (
            <li key={k}>
              <button type="button" className={`opt${state}`} disabled={done} onClick={() => setPick(k)}>
                <span className="opt-mark">{MARKS[k]}</span>
                <span>{o}</span>
                {done && k === q.a && <span className="stamp" aria-hidden="true">정답</span>}
              </button>
            </li>
          );
        })}
      </ol>
      {done ? (
        <div className="sheet-result">
          <p className={ok ? 'res ok' : 'res no'}>{ok ? '맞혔습니다.' : `정답은 ${MARKS[q.a]}입니다.`}</p>
          <p className="sheet-ex" dangerouslySetInnerHTML={{ __html: q.ex }} />
          <div className="sheet-actions">
            <a href={SITE.appPath} className="btn btn-seal sm">학습앱에서 이어 풀기</a>
            <button type="button" className="btn btn-line sm" onClick={next}>다른 과목 문제</button>
          </div>
        </div>
      ) : (
        <p className="sheet-hint">답을 고르면 정답과 해설이 나옵니다.</p>
      )}
    </div>
  );
}
