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

## 3축 구조

데이터는 하나, 서비스는 셋이다.

| 축 | 공개 | 위치 | 데이터 |
| --- | --- | --- | --- |
| 보상관리사 교육 | 공개(유료) | `site/`(/, /business, /pro, /books), `public/` → `/app/` | `content/questions.json` |
| 보상정보 | 공개(무료) | `site/app/info/` → `/info/`, `/info/<지구>/` | `content/info/` |
| 보상경매 툴 | 비공개(본인용) | `tools/auction/` (배포본 제외) | `content/info/` + `tools/auction/data/` |

공통 기반
- `content/info/ontology.json` — 보상 절차 7단계, 근거 조문(토지보상법), 용어
- `content/info/projects/*.json` — 사업지구(고시·필지). `"sample": true`는 화면 확인용 가상 데이터
- `site/lib/infoModel.mjs` — 현재 단계, 기한, 필지 매칭, 검증 (사이트·수집기·툴 공용 순수 함수)
- `scripts/collect/` — 수집기 (로컬 실행). 설정은 루트의 `collect.config.json`
  - 보상정보: 공공데이터포털 파일데이터(토지이음 고시목록, 기관별 보상계획공고 CSV)를 제목 규칙으로 분류해 inbox에 넣는다 → `content/info/sources/README.md`
  - 보상경매: 온비드 부동산 물건목록 API(공공데이터포털)를 받아 `tools/auction/data/items.json`에 넣는다

```bash
npm run collect          # 원자료 CSV 분류 → inbox/auto-*.csv + review/*.csv → projects/*.json 합치기·검증
npm run info:check       # 검증만
DATA_GO_KR_KEY=… npm run collect:probe    # 온비드 첫 페이지 원본 저장 + 필드 이름 출력
DATA_GO_KR_KEY=… npm run collect:auction  # 온비드 토지 물건 → tools/auction/data/items.json
npm run tool             # 보상경매 툴: http://127.0.0.1:8090/tools/auction/
npm run local            # 수집 + 사이트 빌드 (배포 없이 로컬 확인)
```

### 가상 데이터로 시험

```bash
npm run demo              # 가상 원자료 + 가짜 온비드 서버로 수집 전 과정을 돌린다 → demo/out/ (커밋 안 함)
npm run tool              # http://127.0.0.1:8090/tools/auction/?demo  (가상 물건으로 툴 확인)
npm run demo -- --site    # 가상 데이터로 사이트까지 빌드 (dist/는 배포 금지, 배포 전 npm run build)
```

가상 사업지구·동 이름은 지어낸 것이고, 형식(고시 제목, PNU 19자리, 온비드 응답 필드)만 실제를 따른다. 실제 데이터(`content/info`, `tools/auction/data`)는 건드리지 않는다.

온비드 요청주소(`OnbidRlstListSrvc2/getRlstCltrList2`)와 필드 이름은 포털 swagger 명세 사본과 공개된 실호출 기록에서 가져왔다. 내 인증키로는 아직 호출하지 못했다. 처음에는 `--probe`로 필드 이름을 확인하고, 다르면 `collect.config.json`의 `mapping`에 넣는다. 인증키는 포털의 '디코딩' 키를 환경변수로 준다.

정적 사이트라 보상정보의 D-day는 빌드한 날 기준이다. 공개 후에는 매일 다시 빌드·배포해야 한다.
