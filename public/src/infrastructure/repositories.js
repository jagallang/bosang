/**
 * 로그인 없이 쓰는 기본 저장소 구현.
 * 저장 키는 기존 버전과 같게 유지해 이미 쌓인 진도를 그대로 이어받는다.
 */
export const PROGRESS_KEY = 'bosang:progress:v3';
export const STAGE_KEY = 'bosang:curStage';

/** @implements {import('../application/ports.js').ProgressRepository} */
export class LocalProgressRepository {
  constructor(store, key = PROGRESS_KEY) {
    this._store = store;
    this._key = key;
  }
  async load() { return this._store.get(this._key); }
  async save(progress) { this._store.set(this._key, progress); }
}

/** @implements {import('../application/ports.js').PreferenceRepository} */
export class LocalPreferenceRepository {
  constructor(store) { this._store = store; }
  async getStage() { return this._store.get(STAGE_KEY); }
  async setStage(stage) { this._store.set(STAGE_KEY, stage); }
}

/**
 * 정적 JSON 문제은행. 주소 목록 중 처음 성공한 것을 쓴다.
 * @implements {import('../application/ports.js').QuestionRepository}
 */
export class HttpQuestionRepository {
  constructor(urls, fetchImpl = (...a) => fetch(...a)) {
    this._urls = Array.isArray(urls) ? urls : [urls];
    this._fetch = fetchImpl;
  }

  async loadAll() {
    let lastError;
    for (const url of this._urls) {
      try {
        const res = await this._fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error(`${url}: 배열이 아닙니다`);
        return data;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('문제은행 주소가 없습니다');
  }
}

/**
 * 여러 문제은행을 합친다. 같은 ID는 뒤의 저장소가 이긴다.
 * optional 저장소(예: 이용권이 필요한 유료 문항)는 실패해도 나머지로 계속한다.
 */
export class CompositeQuestionRepository {
  /** @param {{repo: import('../application/ports.js').QuestionRepository, optional?: boolean}[]} sources */
  constructor(sources) { this._sources = sources; }

  async loadAll() {
    const map = new Map();
    for (const { repo, optional } of this._sources) {
      try {
        for (const q of await repo.loadAll()) map.set(q.id, q);
      } catch (e) {
        if (!optional) throw e;
        console.warn('선택 문제은행을 불러오지 못했습니다:', e?.message || e);
      }
    }
    return [...map.values()];
  }
}

/**
 * 원격 저장소를 쓰되 기기에도 사본을 둔다. 원격에 진도가 없으면 기기 진도를 이어받는다.
 * @implements {import('../application/ports.js').ProgressRepository}
 */
export class HybridProgressRepository {
  /**
   * @param {object} remote
   * @param {object} local
   * @param {{remoteDelayMs?: number}} [opts] 원격 저장을 몰아서 하는 지연(문항마다 쓰기 방지)
   */
  constructor(remote, local, { remoteDelayMs = 3000 } = {}) {
    this._remote = remote;
    this._local = local;
    this._delay = remoteDelayMs;
    this._timer = null;
    this._pending = null;
  }

  /** 화면을 떠날 때 등 즉시 원격에 반영 */
  async flush() {
    clearTimeout(this._timer);
    this._timer = null;
    const p = this._pending;
    this._pending = null;
    if (!p) return;
    try {
      await this._remote.save(p);
    } catch (e) {
      console.warn('원격 진도 저장 실패(기기에는 저장됨):', e?.message || e);
    }
  }

  async load() {
    try {
      const remote = await this._remote.load();
      if (remote) return remote;
    } catch (e) {
      console.warn('원격 진도를 불러오지 못해 기기 진도를 씁니다:', e?.message || e);
    }
    return this._local.load();
  }

  async save(progress) {
    await this._local.save(progress);
    this._pending = progress;
    if (this._delay <= 0) return this.flush();
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.flush(), this._delay);
  }
}

/** 로그인 기능을 쓰지 않을 때 */
export const disabledAuth = {
  enabled: false,
  currentUser: () => null,
  ready: async () => null,
  signIn: async () => {},
  signOut: async () => {},
  onChange: () => () => {},
};

/** 로컬 모드: 기기에 있는 문항은 모두 이용 가능 */
export const allAccessEntitlement = { check: async () => ({ paid: true, until: null }) };
export const noAccessEntitlement = { check: async () => ({ paid: false, until: null }) };
