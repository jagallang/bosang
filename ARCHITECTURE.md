# 아키텍처 (v8.0.0)

보상드림(보상관리사 학습) PWA. 1,087줄짜리 단일 `index.html`을 클린 아키텍처 4계층으로 나눴다.
빌드 도구 없이 브라우저 ES 모듈로 돌아가며, 정적 호스팅(Firebase Hosting, GitHub Pages) 어디든 올라간다.

## 계층과 의존 방향

```
presentation ─┐
              ├──▶ application ──▶ domain
infrastructure┘
main.js (조립 지점)이 위 셋을 연결한다
```

| 계층 | 폴더 | 하는 일 | 모르는 것 |
|---|---|---|---|
| domain | `public/src/domain/` | 시험 규칙, Leitner 간격반복, 출제, 채점·과락, 세션, 진도 마이그레이션 | DOM, 저장소, 네트워크, 현재 시각 |
| application | `public/src/application/` | 유스케이스(`StudyService`), 접근 권한(`AccessService`), 포트 정의(`ports.js`) | 저장 방식, 화면 |
| infrastructure | `public/src/infrastructure/` | localStorage, 정적 JSON, Firebase 로그인·이용권·Firestore | 화면 |
| presentation | `public/src/presentation/` | UI 상태, 클릭·키보드 → 유스케이스 호출, 뷰(순수 함수) | 저장 방식, 채점 규칙 |

규칙: 안쪽 계층은 바깥 계층을 import하지 않는다. 날짜(`clock`)와 난수(`rng`)도 밖에서 주입해 도메인·유스케이스를 Node에서 그대로 테스트한다.

## 파일 구성

```
public/                       배포 루트 (Firebase Hosting public)
  index.html                  셸: 메타, 카카오 인앱 이동, 모듈 로드, SW 등록
  styles/app.css              스타일 (기존과 동일)
  data/questions.free.json    무료 샘플 (scripts/build-content.mjs가 생성)
  data/questions.json         전체 문항 — 로컬 테스트 전용, gitignore·배포 제외
  src/
    config.js                 동작 모드(local|firebase), Firebase 설정, 이용권 안내
    main.js                   조립 지점
    domain/
      constants.js            단계·과목·상자 간격·합격 기준
      question.js             QuestionBank, 유형·출처 헬퍼
      progress.js             카드, applyResult, 숙련도·복습·취약·오답 조회
      selection.js            학습 큐, 가중 추출, 균등 모의고사
      grading.js              서술형 키워드 채점, 과락 판정, 100점 환산
      session.js              StudySession (서술형 상태는 문항별로 분리)
      migration.js            v3 → v4 → v5 진도 변환
      legacyIdMap.js          옛 문항 ID 표
    application/
      ports.js                저장소·인증·이용권·시계 계약 (JSDoc)
      StudyService.js         불러오기, 조회, 세션 시작, 풀이, 채점, 초기화
      AccessService.js        로그인·이용권 상태
    infrastructure/
      browser.js              SafeLocalStorage, 시계, 대화상자
      repositories.js         Local/Http/Composite/Hybrid 저장소, 인증 없음 어댑터
      firebase/
        firebaseClient.js     SDK 지연 로드 (firebase 모드에서만)
        firebaseAdapters.js   구글 로그인, 이용권, 유료 문항, 클라우드 진도
    presentation/
      App.js                  UI 상태, data-action 이벤트 위임, 키보드
      views/                  common, home, study, pages (데이터 → HTML)
  service-worker.js           같은 출처 GET만 SWR 캐시
content/questions.json        문제은행 원본 (편집은 여기서). 배포되지 않음
scripts/build-content.mjs     형식 검사 + 무료 샘플·업로드 묶음 생성
scripts/admin.mjs             유료 문항 업로드, 이용권 부여·해제 (firebase-admin)
scripts/legacy/               예전 변환·중복탐지 스크립트 (.cjs)
tests/                        node:test (도메인·유스케이스·저장소)
firestore.rules               유료 문항·이용권·진도 접근 규칙
firebase.json                 Hosting(public/) + Firestore 규칙
```

## 동작 모드 (`public/src/config.js`)

| | local | firebase |
|---|---|---|
| 로그인 | 없음 | 구글 로그인 (설치형 앱은 리다이렉트) |
| 문항 | `data/questions.json` 있으면 전체, 없으면 무료 샘플 | 무료 샘플 + 이용권 있으면 Firestore `questionChunks` |
| 진도 | 기기 localStorage | 로그인 시 Firestore `progress/{uid}` + 기기 사본 (원격 저장 3초 몰아쓰기) |

Firebase SDK는 firebase 모드에서만 내려받는다. 초기화에 실패하면 무료 샘플로 계속 동작한다.

## Firestore 구조

| 경로 | 내용 | 읽기 | 쓰기 |
|---|---|---|---|
| `questionChunks/{civ,rel,lca,prc1,prc2}` | `{items: Question[]}` | 이용권 유효자·관리자 | 관리자 |
| `entitlements/{uid}` | `{paid, until?, email}` | 본인·관리자 | 관리자 |
| `progress/{uid}` | `{data: 진도 v5, updatedAt}` | 본인 | 본인 |
| `admins/{uid}` | 빈 문서 | 본인 | 콘솔에서만 |

과목별 묶음 문서라 문항 전체를 읽어도 4~5회 읽기로 끝난다.

## 데이터 흐름

```
main.js ─ AccessService.refresh() ─▶ 상태(user, paid)
        ─ repositoriesFor(상태)   ─▶ 문항·진도 저장소 선택
        ─ StudyService.load()     ─▶ QuestionBank + normalizeProgress(저장값)
App.dispatch(action) ─▶ StudyService 유스케이스 ─▶ domain 규칙 ─▶ ProgressRepository.save
App.render() ─▶ StudyService.overview() 등 조회 ─▶ views (HTML 문자열)
```

## 진도 데이터 (v5, 기존과 동일)

```js
{ version: 5,
  "1": { cards: { "civ-001": { box, seen, correct, wrong, lastDay, dueDay } }, totalAnswered, totalCorrect, studyDays: [] },
  "2": { ... } }
```
저장 키 `bosang:progress:v3`, 단계 키 `bosang:curStage`는 그대로라 기존 사용자의 진도가 이어진다.

## 학습 규칙

- Leitner 5상자: 정답 상자 +1(최대 5), 오답 상자 1. 다음 복습 1/2/4/8/16일 뒤
- 숙련도 = 상자 합 / (문항 수 × 5)
- 모의고사: 선택형만, 과목 균등 (1차 9+8+8). 문항 없는 과목은 몫에서 빼고 부족 안내
- 과락: 과목 40점 미만이면 불합격, 평균 60점 이상이면 합격. 출제되지 않은 과목은 판정 제외
- 서술형: 키워드 가중 합계, '확신 없음'은 0점, 80% 이상이면 정답

## v7 → v8에서 고친 동작

1. 2차 모의고사에 서술형이 섞여 화면이 멈추던 문제 — 선택형만 출제
2. 2차 모의고사가 문항 없는 보상실무2를 0점 과락으로 처리해 늘 불합격이던 문제 — 출제 과목만 판정
3. 서술형 힌트가 다음 문항으로 넘어가도 남던 문제 — 문항별 상태
4. 서술형에서 채점 전에 Enter를 누르면 채점 없이 넘어가던 문제 — 채점 후에만 이동
5. 모의고사 점수를 `정답 수 × round(100/문항 수)`로 계산해 문항이 부족하면 만점이 100이 아니던 문제 — 100점 환산
6. 서비스 워커가 외부 요청까지 캐시하던 문제 — 같은 출처만
7. 옛 ID 마이그레이션에서 이미 새 형식인 카드가 지워지던 문제 — 보존

## 문항 편집과 배포

```bash
# 1) content/questions.json 편집
npm test                      # 도메인·유스케이스 테스트 + 문제은행 형식 검사
npm run content               # 무료 샘플·업로드 묶음 생성 (형식 오류면 중단)
npm run content:local         # 로컬 테스트용 전체 문항까지
npm run serve                 # http://localhost:8080

# 2) firebase 모드 배포 (최초 1회 firebase init, admins/{내 uid} 문서 생성)
node scripts/admin.mjs upload-questions
node scripts/admin.mjs grant buyer@gmail.com 365
firebase deploy
```

## 다음 단계

- 관리자 화면에서 이용권 부여 (지금은 `scripts/admin.mjs`)
- 결제 연동 (토스페이먼츠 → Cloud Functions → `entitlements`)
- 문항에 `article`(근거 조문)·`revised`(검수일) 채우기
- 디자인 개편 (뷰가 분리돼 있어 `views/`와 `styles/`만 바꾸면 된다)
