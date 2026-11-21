// 데이터 위치. BOSANG_INFO_DIR을 주면 그 폴더를 보상정보 데이터로 쓴다 (가상 데이터 시험용)
import { isAbsolute, join, resolve } from 'node:path';

export function infoDir(root) {
  const d = process.env.BOSANG_INFO_DIR;
  return d ? (isAbsolute(d) ? d : resolve(root, d)) : join(root, 'content/info');
}
export const isDemo = () => !!process.env.BOSANG_INFO_DIR;
