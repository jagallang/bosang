/**
 * 보상계획·협의·재결 공고 게시판 수집 (설정형). 사업시행자·지자체 게시판마다 목록 표 모양이 달라서
 * 열 위치와 주소를 collect.config.json에 적는다. robots.txt가 허용할 때만 받는다.
 *
 * 설정 예:
 *  { "id": "gg-notice", "listUrl": "https://.../list.do?page={page}", "pages": 3,
 *    "cols": { "title": 1, "date": 3, "no": 0 }, "linkBase": "https://...",
 *    "sido": "경기도", "operator": "", "keywords": ["보상계획", "손실보상", "수용재결"] }
 */
import { tableRows } from '../lib/html.mjs';
import { stageOf, typeOf, projectNameOf, regionOf } from '../lib/classify.mjs';
import { normDate } from './eumGosiCsv.mjs';
import { robotsGate, sleep, USER_AGENT } from '../lib/robots.mjs';

export const COMPENSATION_WORDS = ['보상계획', '손실보상', '보상협의', '협의 요청', '수용재결', '재결신청', '이의재결', '감정평가', '토지조서', '물건조서', '열람공고', '지장물'];

/** 목록 HTML → 보상 관련 행만 후보로 */
export function boardRowsToCandidates(html, cfg) {
  const words = cfg.keywords?.length ? cfg.keywords : COMPENSATION_WORDS;
  const out = [];
  for (const r of tableRows(html)) {
    const title = r.cells[cfg.cols.title] || '';
    if (!words.some((w) => title.replace(/\s/g, '').includes(w.replace(/\s/g, '')))) continue;
    const date = normDate(r.cells[cfg.cols.date]);
    if (!date) continue;
    // 보상 공고 제목에는 단계어가 없을 수 있다 (예: "○○지구 토지 및 지장물 열람공고") → 보상계획으로 본다
    const stage = stageOf(title) || 'plan';
    const t = typeOf(title);
    const projectName = t ? projectNameOf(title, t.keyword) : null;
    const region = cfg.sido ? { sido: cfg.sido, sigungu: cfg.sigungu || regionOf(title).sigungu || null } : regionOf(cfg.operator || '');
    const href = r.links.find((h) => !/^(#|javascript:)/i.test(h));
    const high = !!projectName && !!region.sido;
    out.push({
      stage, type: t?.type || '', projectName: projectName || title, region, date, title,
      url: href ? new URL(href, cfg.linkBase || cfg.listUrl).toString() : cfg.listUrl.replace('{page}', '1'),
      operator: cfg.operator || '', source: cfg.id,
      confidence: high ? 'high' : 'low', reason: high ? '게시판 보상 공고' : '사업명을 제목에서 뽑지 못함',
    });
  }
  return out;
}

export async function fetchBoard(cfg, { fetchImpl = fetch, robots = robotsGate(fetchImpl), delayMs = 1500, log = () => {} } = {}) {
  const url1 = cfg.listUrl.replace('{page}', '1');
  const gate = await robots(url1);
  if (gate !== 'allowed') throw new Error(`${cfg.id}: robots.txt ${gate === 'disallowed' ? '수집 불허' : '확인 불가'} — 수집하지 않습니다`);
  const out = [];
  for (let p = 1; p <= (cfg.pages || 1); p++) {
    if (p > 1) await sleep(delayMs);
    const res = await fetchImpl(cfg.listUrl.replace('{page}', String(p)), { headers: { 'user-agent': USER_AGENT } });
    if (!res.ok) throw new Error(`${cfg.id}: HTTP ${res.status}`);
    const c = boardRowsToCandidates(await res.text(), cfg);
    log(`  ${cfg.id} ${p}쪽 보상 공고 ${c.length}건`);
    out.push(...c);
  }
  return out;
}
