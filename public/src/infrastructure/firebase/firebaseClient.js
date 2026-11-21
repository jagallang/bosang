/**
 * Firebase SDK를 필요할 때만 CDN에서 불러온다. (로컬 모드에서는 전혀 내려받지 않음)
 * 버전은 고정한다. 올릴 때는 세 주소를 함께 바꾼다.
 */
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

let cached = null;

export async function loadFirebase(config) {
  if (cached) return cached;
  if (!config?.apiKey || !config?.projectId) {
    throw new Error('config.js의 firebase 설정(apiKey, projectId 등)이 비어 있습니다.');
  }
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(config);
  cached = {
    app,
    auth: authMod.getAuth(app),
    db: fsMod.getFirestore(app),
    authMod,
    fsMod,
  };
  return cached;
}
