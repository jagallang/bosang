// 공공데이터포털 CSV는 EUC-KR(CP949)인 경우가 많다. UTF-8로 먼저 읽고 깨지면 EUC-KR로 다시 읽는다
import { readFileSync } from 'node:fs';

export function decodeKorean(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, ''); }
  catch { return new TextDecoder('euc-kr').decode(buf); }
}

export const readKoreanText = (path) => decodeKorean(readFileSync(path));
