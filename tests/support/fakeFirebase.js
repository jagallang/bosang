/**
 * 테스트용 가짜 Firebase SDK (firebase-app/auth/firestore 모듈의 쓰는 부분만).
 * firestore.rules의 핵심 규칙을 흉내 내 권한 없는 읽기·쓰기를 거부한다.
 */
export function fakeFirebase({ now = () => Date.now() } = {}) {
  const docs = new Map(); // 'col/id' → data
  let user = null;
  const listeners = new Set();

  const ts = (ms) => ({ toDate: () => new Date(ms), toMillis: () => ms });
  const isAdmin = () => !!user && docs.has(`admins/${user.uid}`);
  const isPaid = () => {
    if (!user) return false;
    const e = docs.get(`entitlements/${user.uid}`);
    return !!e && e.paid === true && (!e.until || e.until.toMillis() > now());
  };
  const deny = (op, path) => { const err = new Error(`permission-denied: ${op} ${path}`); err.code = 'permission-denied'; throw err; };
  const canRead = (col, id) => {
    if (col === 'questionChunks') return isPaid() || isAdmin();
    if (col === 'entitlements') return !!user && (user.uid === id || isAdmin());
    if (col === 'progress') return !!user && user.uid === id;
    if (col === 'admins') return !!user && user.uid === id;
    return false;
  };
  const canWrite = (col, id, data) => {
    if (col === 'progress') return !!user && user.uid === id && Object.keys(data).every((k) => ['data', 'updatedAt'].includes(k));
    if (col === 'questionChunks' || col === 'entitlements') return isAdmin();
    return false;
  };

  const fsMod = {
    doc: (_db, col, id) => ({ col, id, path: `${col}/${id}` }),
    collection: (_db, col) => ({ col }),
    serverTimestamp: () => ts(now()),
    async getDoc(ref) {
      if (!canRead(ref.col, ref.id)) deny('read', ref.path);
      const data = docs.get(ref.path);
      return { exists: () => data !== undefined, data: () => (data === undefined ? undefined : { ...data }) };
    },
    async getDocs(ref) {
      const list = [...docs.entries()].filter(([k]) => k.startsWith(`${ref.col}/`));
      for (const [k] of list) if (!canRead(ref.col, k.split('/')[1])) deny('list', ref.col);
      return { forEach: (cb) => list.forEach(([, d]) => cb({ data: () => ({ ...d }) })) };
    },
    async setDoc(ref, data) {
      if (!canWrite(ref.col, ref.id, data)) deny('write', ref.path);
      docs.set(ref.path, { ...data });
    },
  };

  const authMod = {
    onAuthStateChanged: (_auth, cb) => { listeners.add(cb); queueMicrotask(() => cb(user)); return () => listeners.delete(cb); },
    getRedirectResult: async () => null,
    GoogleAuthProvider: class {},
    signInWithPopup: async () => {},
    signInWithRedirect: async () => {},
    signOut: async () => { user = null; listeners.forEach((cb) => cb(null)); },
  };

  return {
    fb: { app: {}, auth: {}, db: {}, authMod, fsMod },
    /** 관리자 SDK처럼 규칙을 거치지 않고 직접 넣는다 */
    admin: { set: (path, data) => docs.set(path, data), get: (path) => docs.get(path), ts },
    login(u) { user = u; listeners.forEach((cb) => cb(u)); },
  };
}
