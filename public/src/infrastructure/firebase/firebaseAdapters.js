/**
 * Firebase 어댑터: 구글 로그인, 이용권, 유료 문항, 클라우드 진도.
 *
 * Firestore 구조 (firestore.rules 와 짝)
 *   questionChunks/{과목코드}  { items: Question[], updatedAt }   이용권 있는 사용자만 읽기
 *   entitlements/{uid}         { paid: true, until?: Timestamp, email? }  관리자만 쓰기
 *   progress/{uid}             { data: 진도(v5), updatedAt }      본인만 읽기·쓰기
 *   admins/{uid}               { }                                   콘솔에서만 추가
 */

/** @implements {import('../../application/ports.js').AuthService} */
export class FirebaseAuthService {
  constructor(fb) {
    this._fb = fb;
    this.enabled = true;
    this._user = null;
    this._listeners = new Set();
    this._ready = new Promise((resolve) => {
      let first = true;
      fb.authMod.onAuthStateChanged(fb.auth, (u) => {
        this._user = u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null;
        if (first) { first = false; resolve(this._user); return; }
        this._listeners.forEach((cb) => cb(this._user));
      });
    });
    // 리다이렉트 로그인 결과 처리(모바일·설치형 앱)
    fb.authMod.getRedirectResult(fb.auth).catch((e) => console.warn('로그인 결과 처리 실패:', e?.message || e));
  }

  currentUser() { return this._user; }
  ready() { return this._ready; }

  async signIn() {
    const { authMod, auth } = this._fb;
    const provider = new authMod.GoogleAuthProvider();
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches;
    if (standalone) return authMod.signInWithRedirect(auth, provider);
    try {
      await authMod.signInWithPopup(auth, provider);
    } catch (e) {
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
        return authMod.signInWithRedirect(auth, provider);
      }
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') throw e;
    }
  }

  signOut() { return this._fb.authMod.signOut(this._fb.auth); }

  onChange(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }
}

/** @implements {import('../../application/ports.js').EntitlementService} */
export class FirestoreEntitlementService {
  constructor(fb) { this._fb = fb; }

  async check(user) {
    if (!user) return { paid: false, until: null };
    const { fsMod, db } = this._fb;
    const snap = await fsMod.getDoc(fsMod.doc(db, 'entitlements', user.uid));
    if (!snap.exists()) return { paid: false, until: null };
    const e = snap.data();
    const until = e.until?.toDate ? e.until.toDate() : null;
    const paid = e.paid === true && (!until || until.getTime() > Date.now());
    return { paid, until };
  }
}

/**
 * 유료 문항. 과목별 묶음 문서로 읽어 읽기 횟수를 줄인다 (문서 4~5개).
 * @implements {import('../../application/ports.js').QuestionRepository}
 */
export class FirestoreQuestionRepository {
  constructor(fb) { this._fb = fb; }

  async loadAll() {
    const { fsMod, db } = this._fb;
    const snap = await fsMod.getDocs(fsMod.collection(db, 'questionChunks'));
    const out = [];
    snap.forEach((d) => out.push(...(d.data().items || [])));
    return out;
  }
}

/** @implements {import('../../application/ports.js').ProgressRepository} */
export class FirestoreProgressRepository {
  constructor(fb, uid) {
    this._fb = fb;
    this._uid = uid;
  }

  async load() {
    const { fsMod, db } = this._fb;
    const snap = await fsMod.getDoc(fsMod.doc(db, 'progress', this._uid));
    return snap.exists() ? snap.data().data || null : null;
  }

  async save(progress) {
    const { fsMod, db } = this._fb;
    await fsMod.setDoc(fsMod.doc(db, 'progress', this._uid), {
      data: progress,
      updatedAt: fsMod.serverTimestamp(),
    });
  }
}
