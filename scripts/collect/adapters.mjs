/**
 * 수집 어댑터. 각 어댑터는 { name, enabled(), fetch() → Promise<InboxRow[]> } 를 따른다.
 * InboxRow는 inbox CSV의 열과 같은 모양이다 (content/info/inbox/README.md).
 *
 * 공공 API는 인증키가 필요하고 응답 형식을 확인한 뒤 붙인다. 지금은 inbox(CSV)만 동작한다.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from './merge.mjs';

export function inboxAdapter(dir) {
  return {
    name: 'inbox',
    enabled: () => true,
    async fetch() {
      return readdirSync(dir).filter((f) => f.endsWith('.csv'))
        .flatMap((f) => parseCsv(readFileSync(join(dir, f), 'utf8')).map((r) => ({ ...r, source: r.source || f })));
    },
  };
}

/** 키가 있어야 켜지는 자리. 응답 형식을 확인하고 fetch를 구현한다 */
function pending(name, envKey, note) {
  return {
    name,
    enabled: () => !!process.env[envKey],
    async fetch() {
      throw new Error(`${name}: 아직 구현 전 (${note}). 인증키 환경변수 ${envKey}`);
    },
  };
}

export const ADAPTERS = (root) => [
  inboxAdapter(join(root, 'content/info/inbox')),
  pending('토지이음 고시정보', 'EUM_API_KEY', '지구지정·실시계획 고시'),
  pending('온비드 공매', 'ONBID_API_KEY', '보상경매 툴용 공매 물건'),
];
