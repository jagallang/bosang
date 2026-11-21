// 의존성 없는 표 파서: 공공기관 게시판의 <table> 목록을 행·칸 텍스트와 링크로 바꾼다
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·' };
export const decodeHtml = (s) => String(s)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
export const textOf = (html) => decodeHtml(String(html).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** <tr> 마다 { cells: [텍스트], links: [href] } (머리행 th만 있는 줄은 뺀다) */
export function tableRows(html) {
  const out = [];
  for (const tr of Array.from(String(html).matchAll(/<tr[\s>][\s\S]*?<\/tr>/gi), (m) => m[0])) {
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => textOf(m[1]));
    if (!cells.length) continue;
    const links = [...tr.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => decodeHtml(m[1]));
    const onclick = [...tr.matchAll(/onclick\s*=\s*["']([^"']+)["']/gi)].map((m) => decodeHtml(m[1]));
    out.push({ cells, links, onclick });
  }
  return out;
}
