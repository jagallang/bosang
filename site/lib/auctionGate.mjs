// Firestore 문서 id로 쓸 수 있게 ('/' 금지) — admin.mjs upload-auction에서 쓴다
export function itemDocId(item, i = 0) {
  const raw = String(item.id || item.case || `item-${i}`);
  return raw.replace(/[\/\s]+/g, '_').replace(/^\.+$/, '_').slice(0, 200) || `item-${i}`;
}
