/**
 * 브라우저 어댑터: localStorage, 시계, 대화상자.
 */
import { dayNumber } from '../domain/progress.js';

/** localStorage가 막힌 환경(시크릿 모드 등)에서도 메모리로 계속 동작하는 저장소 */
export class SafeLocalStorage {
  constructor({ onFailure } = {}) {
    this._mem = new Map();
    this._onFailure = onFailure;
    this._warned = false;
  }

  get(key) {
    try {
      const v = localStorage.getItem(key);
      if (v != null) return JSON.parse(v);
    } catch (e) {
      console.warn('localStorage 읽기 실패:', e.message);
    }
    return this._mem.has(key) ? this._mem.get(key) : null;
  }

  set(key, value) {
    this._mem.set(key, value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage 저장 실패:', e.message);
      if (!this._warned && this._onFailure) {
        this._warned = true;
        this._onFailure(e);
      }
    }
  }
}

export const systemClock = { today: () => dayNumber(Date.now()) };

export const browserDialogs = {
  notify: (msg) => window.alert(msg),
  confirm: (msg) => window.confirm(msg),
};
