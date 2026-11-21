# 보상드림 — 보상관리사 학습 (PWA)

보상관리사 1차·2차 문제은행을 간격 반복으로 학습하는 설치형 웹앱. 오프라인에서도 동작한다.
구조와 규칙은 [ARCHITECTURE.md](ARCHITECTURE.md)에 있다.

## 시험 구조

| 단계 | 과목 | 코드 | 검정방법 |
|------|------|------|----------|
| 1차 | 민법 | `civ` | 선택형 |
| 1차 | 부동산관계법규 | `rel` | 선택형 |
| 1차 | 토지보상법규 | `lca` | 선택형 |
| 2차 | 보상실무1 | `prc1` | 논문형 + 선택형 |
| 2차 | 보상실무2 | `prc2` | 논문형 + 선택형 (준비중) |

합격 기준: 매 과목 40점 이상, 전 과목 평균 60점 이상.

## 빠른 시작

```bash
npm test               # 테스트 (Node 20 이상)
npm run content:local  # 무료 샘플 + 로컬용 전체 문항 생성
npm run serve          # http://localhost:8080 에서 확인
```

## 문항 편집

`content/questions.json`만 고친다. `a`는 **0-based** (`"a": 0`이 ①번).
고친 뒤 `npm test`로 형식 검사를 통과해야 `npm run content`가 파일을 만든다.

```json
{
  "id": "lca-153", "stage": 1, "type": "mcq",
  "q": "문제 본문", "opt": ["①", "②", "③", "④", "⑤"], "a": 2,
  "ex": "해설 (<b>강조</b> 가능)",
  "subject": "토지보상법규",
  "article": { "law": "토지보상법", "no": "제34조" },
  "source": [{ "type": "기출", "year": 2022, "no": 1 }],
  "revised": "2026-11-21"
}
```

ID는 `<과목코드>-<3자리>`이며 한번 쓴 번호는 다시 쓰지 않는다 (진도가 ID에 묶여 있다).

## 배포

- **firebase 모드 (권장)**: `public/src/config.js`에서 `mode: 'firebase'`와 Firebase 설정을 채우고 ARCHITECTURE.md의 배포 순서를 따른다. 무료 샘플만 공개되고 전체 문항은 이용권이 있어야 읽힌다.
- **local 모드**: 로그인 없이 기기에만 저장. `public/`을 그대로 정적 호스팅하면 된다. 이때 `data/questions.json`을 올리면 전체 문항이 공개되니 주의한다.

## TTS 음성

```bash
python scripts/tts_pipeline.py generate      # 서술형 44문항 문제·답안 음성
python scripts/tts_mnemonic.py               # 두문자편 음성
```
상세: `scripts/TTS_개발문서.md`. 음성 대본(`scripts/*음성대본.json`)은 유료 콘텐츠이므로 저장소를 비공개로 유지한다.

## 메인 사이트 (site/)

Next.js 15 정적 내보내기. 첫 화면 `/`, 교재·이용권 `/books/`, 시험 안내 `/exam/`, 보상정보 `/info/`.
퀴즈앱은 배포 시 `/app/`에 붙는다.

```bash
npm run build     # 문항 빌드 → next build → dist/ 조립 (dist/app = public/)
npm run serve     # http://localhost:8080 (사이트), /app/ (학습앱)
npm run deploy    # 테스트 → 빌드 → firebase deploy (hosting.public = dist)
```

상품·가격·사업자 정보는 `site/lib/site.js`에서 수정한다. 가격이 `null`이면 '가격 문의'로 나오고,
사업자 정보는 채운 항목만 푸터에 표시된다. 통신판매 전에 사업자 정보를 반드시 채울 것.
