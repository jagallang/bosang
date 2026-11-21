/**
 * 로그인과 이용권 상태. 어떤 문항·진도 저장소를 쓸지는 이 상태를 보고 조립 지점이 정한다.
 */
export class AccessService {
  /**
   * @param {object} deps
   * @param {import('./ports.js').AuthService} deps.auth
   * @param {import('./ports.js').EntitlementService} deps.entitlement
   */
  constructor({ auth, entitlement }) {
    this._auth = auth;
    this._entitlement = entitlement;
    this.state = { enabled: auth.enabled, user: null, paid: false, until: null };
  }

  async refresh() {
    const user = this._auth.currentUser();
    let paid = false, until = null;
    try {
      ({ paid, until = null } = await this._entitlement.check(user));
    } catch (e) {
      console.warn('이용권 확인 실패:', e?.message || e);
    }
    this.state = { enabled: this._auth.enabled, user, paid, until };
    return this.state;
  }

  async init() {
    await this._auth.ready();
    return this.refresh();
  }

  signIn() { return this._auth.signIn(); }
  signOut() { return this._auth.signOut(); }
  onChange(cb) { return this._auth.onChange(cb); }
}
