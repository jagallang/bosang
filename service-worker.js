/* 보상드림 - Stale-While-Revalidate 캐시.
   캐시를 즉시 내주고 뒤에서 갱신 → 다음 실행 시 새 버전 반영.
   오프라인에서도 캐시된 버전으로 즉시 로딩. */
const CACHE = 'bosang-v9';
const ASSETS = [
  './',
  './index.html',
  './questions.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => { try { c.put(e.request, copy); } catch (_) {} });
        return resp;
      });
      return cached || fetchPromise;
    })
  );
});
