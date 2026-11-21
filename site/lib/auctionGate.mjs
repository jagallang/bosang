// 보상경매(관리자 전용) 입장 판정. 화면 가림은 편의일 뿐이고, 실제 보호는 Firestore 규칙(auctionItems: isAdmin)이 한다.
export const REQUIRED = ['apiKey', 'authDomain', 'projectId', 'appId'];

/** 빌드 때 넣은 NEXT_PUBLIC_FIREBASE_CONFIG(JSON 문자열) → 설정 객체. 비었거나 깨졌으면 null (= 닫힘) */
export function parseWebConfig(raw) {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    return REQUIRED.every((k) => typeof c[k] === 'string' && c[k]) ? c : null;
  } catch { return null; }
}

/**
 * 상태: unconfigured(설정 없음) | loading | signed-out | checking | denied | open
 * 확실히 관리자일 때만 open. 그 밖의 모든 경우는 닫힌다.
 */
export function gateState({ configured, authReady, user, admin }) {
  if (!configured) return 'unconfigured';
  if (!authReady) return 'loading';
  if (!user) return 'signed-out';
  if (admin === undefined || admin === null) return 'checking';
  return admin === true ? 'open' : 'denied';
}

/** Firestore 문서 id로 쓸 수 있게 ('/' 금지, 1500바이트 제한) */
export function itemDocId(item, i = 0) {
  const raw = String(item.id || item.case || `item-${i}`);
  return raw.replace(/[\/\s]+/g, '_').replace(/^\.+$/, '_').slice(0, 200) || `item-${i}`;
}
