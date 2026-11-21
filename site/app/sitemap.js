import { SITE } from '../lib/site';

export const dynamic = 'force-static';

const PATHS = ['/', '/business/', '/pro/', '/books/', '/exam/', '/info/', '/terms/', '/privacy/', '/refund/'];

/** SITE_URL이 없으면 빈 sitemap (배포 주소가 정해지면 채워진다) */
export default function sitemap() {
  if (!SITE.url) return [];
  return PATHS.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: 'weekly', priority: p === '/' ? 1 : 0.7 }));
}
