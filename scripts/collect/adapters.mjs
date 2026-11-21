/**
 * 수집 어댑터. 각 어댑터는 { name, enabled(), fetch() → Promise<InboxRow[]> } 를 따른다.
 * InboxRow는 inbox CSV의 열과 같은 모양이다 (content/info/inbox/README.md).
 *
 * 원자료(토지이음 고시목록, 보상계획 CSV)는 collect.mjs가 inbox/auto-*.csv로 바꿔 두므로 여기서는 inbox만 읽는다.
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

export const ADAPTERS = (info) => [
  inboxAdapter(join(info, 'inbox')),
];
