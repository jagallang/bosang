/**
 * robots.txt 확인. 허용 여부를 모르면 수집하지 않는 것이 기본이다.
 * 판정: 우리 UA 또는 * 그룹의 Allow/Disallow 중 가장 긴 접두어가 이긴다 (Google 방식, 와일드카드는 접두어까지만).
 */
export const USER_AGENT = 'BosangDreamCollector/1.0 (+https://github.com/jagallang/bosang)';

export function parseRobots(text) {
  const groups = [];
  let cur = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
    } else if (cur && (key === 'allow' || key === 'disallow')) {
      cur.rules.push({ allow: key === 'allow', path: val.replace(/\*.*$/, '') });
    }
  }
  return groups;
}

export function isAllowed(groups, path, ua = 'bosangdreamcollector') {
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && ua.includes(a)));
  const use = mine.length ? mine : groups.filter((g) => g.agents.includes('*'));
  let best = null;
  for (const r of use.flatMap((g) => g.rules)) {
    if (r.path === '' && !r.allow) continue; // "Disallow:" 빈 값 = 전부 허용
    if (path.startsWith(r.path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return best ? best.allow : true;
}

/** 사이트별 robots를 한 번만 받아 판정한다. 받지 못하면 'unknown' */
export function robotsGate(fetchImpl = fetch) {
  const cache = new Map();
  return async (url) => {
    const u = new URL(url);
    if (!cache.has(u.origin)) {
      try {
        const res = await fetchImpl(`${u.origin}/robots.txt`, { headers: { 'user-agent': USER_AGENT } });
        cache.set(u.origin, res.status === 404 ? [] : res.ok ? parseRobots(await res.text()) : null);
      } catch { cache.set(u.origin, null); }
    }
    const g = cache.get(u.origin);
    if (g === null) return 'unknown';
    return isAllowed(g, u.pathname + u.search) ? 'allowed' : 'disallowed';
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
