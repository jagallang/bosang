/* 보상드림 서비스 워커 — Stale-While-Revalidate
   같은 출처의 GET만 캐시한다. Firebase·Firestore 같은 외부 요청은 손대지 않는다
   (Firestore 실시간 채널을 캐시하면 동작이 깨지고, 유료 문항이 기기 캐시에 남는다).
   파일 목록이나 코드를 바꾸면 CACHE 이름의 숫자를 올린다. */
const CACHE = 'bosang-v13';
const ASSETS = [
  './',
  './index.html',
  './styles/app.css',
  './manifest.webmanifest',
  './data/questions.free.json',
  './src/main.js',
  './src/config.js',
  './src/domain/constants.js',
  './src/domain/question.js',
  './src/domain/progress.js',
  './src/domain/selection.js',
  './src/domain/grading.js',
  './src/domain/session.js',
  './src/domain/migration.js',
  './src/domain/legacyIdMap.js',
  './src/application/StudyService.js',
  './src/application/AccessService.js',
  './src/application/ports.js',
  './src/infrastructure/browser.js',
  './src/infrastructure/repositories.js',
  './src/presentation/App.js',
  './src/presentation/views/common.js',
  './src/presentation/views/home.js',
  './src/presentation/views/study.js',
  './src/presentation/views/pages.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // 파일 하나가 없어도 설치가 실패하지 않게 개별로 담는다
      .then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
