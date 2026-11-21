import { SITE } from '../lib/site';
import { allProjects } from '../lib/infoData';

export const dynamic = 'force-static';

const PATHS = ['/', '/about/', '/exam/', '/books/', '/info/', '/info/terms/', '/terms/', '/privacy/', '/refund/'];

/** SITE_URL이 없으면 빈 sitemap (배포 주소가 정해지면 채워진다) */
export default function sitemap() {
  if (!SITE.url) return [];
  const paths = [...PATHS, ...allProjects().filter((p) => !p.sample).map((p) => `/info/${p.id}/`)];
  return paths.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: 'weekly', priority: p === '/' ? 1 : 0.7 }));
}
