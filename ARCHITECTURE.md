# 아키텍처

보상관리사 반복학습 PWA의 기술 구조 문서. v5.1.0 기준.

## 파일 구조

```
index.html              앱 전체 (UI + 로직, 812줄)
questions.json          문제은행 (264문항)
service-worker.js       오프라인 캐시 (stale-while-revalidate)
manifest.webmanifest    PWA 메타데이터
icons/                  앱 아이콘 4종
scripts/                개발용 변환·분석 스크립트
```

빌드 도구, 프레임워크, 외부 의존성 없음. 순수 Vanilla JS + CSS.

## 데이터 흐름

```
questions.json ──fetch──▶ BANK[] ──filter──▶ stageBank()
                              │                    │
                              ▼                    ▼
                          BANK_MAP           dueCards() / weakCards()
                          (id→obj)                 │
                              │                    ▼
                              ▼              buildQueue() / buildBalancedExam()
                         renderStudy()             │
                              │                    ▼
                              ▼              session{queue,idx,answers}
                         applyResult()             │
                              │                    ▼
                              ▼              gradeExam() → calcPassFail()
                          sp().cards
                              │
                              ▼
                     localStorage (STORE_KEY)
```

## 전역 상태

| 변수 | 타입 | 용도 |
|------|------|------|
| `BANK` | array | 전체 문항 (questions.json에서 로드) |
| `BANK_MAP` | object | ID→문항 O(1) 조회 |
| `P` | object | 진도 데이터 (v5, stage별 분리) |
| `curStage` | `"1"\|"2"` | 현재 선택된 시험 단계 |
| `curPage` | `"home"\|"mastery"\|"status"` | 현재 화면 |
| `session` | object\|null | 진행 중인 학습 세션 |
| `filterDiff` | `0\|1\|2\|3` | 난이도 필터 (0=전체) |
| `randomMode` | bool | 랜덤/순서 토글 |
| `menuOpen` | bool | 햄버거 메뉴 열림 |

## 진도 데이터 구조 (v5)

```javascript
{
  version: 5,
  "1": {                              // 1차 시험
    cards: {
      "civ-001": {
        box: 0,        // 0-5 (Leitner box 레벨)
        seen: 0,       // 학습 횟수
        correct: 0,    // 정답 횟수
        wrong: 0,      // 오답 횟수
        lastDay: null, // 마지막 학습일 (Unix day)
        dueDay: 0      // 다음 복습일 (Unix day)
      },
      ...
    },
    totalAnswered: 0,
    totalCorrect: 0,
    studyDays: []      // 학습한 날짜 배열 (Unix day)
  },
  "2": { ... }                        // 2차 시험 (동일 구조)
}
```

**저장 위치**: `localStorage` 키 `"bosang:progress:v3"`
**단계 선택**: `localStorage` 키 `"bosang:curStage"`

## 마이그레이션 체인

```
v3 (초기, 평면 cards)
  ↓ migrateIdProgress()
v4 (새 ID 체계: civ-001, rel-001, lca-001)
  ↓ migrateToV5()
v5 (stage별 분리: P["1"], P["2"])
```

- `ID_MIGRATION` 맵(264엔트리)이 index.html에 내장
- 부팅 시 `loadProgress()`에서 자동 감지·실행
- 멱등: 이미 마이그레이션된 데이터는 건너뜀

## 상수

```javascript
STAGES = {
  "1": { subjects: ["민법","부동산관계법규","토지보상법규"], examSize: 25 },
  "2": { subjects: ["보상실무1","보상실무2"], examSize: 20 }
}
BOX_INTERVALS = [1, 2, 4, 8, 16]   // 일 단위
MAX_BOX = 5                         // 최대 숙련도 레벨
QUEUE_REVIEW = 20                   // 복습 세션 최대 문항
QUEUE_PRACTICE = 15                 // 연습 세션 최대 문항
```

## 핵심 함수

### Stage 헬퍼
| 함수 | 설명 |
|------|------|
| `stageSubjects(s)` | 해당 stage의 과목 목록 |
| `stageBank(s)` | 해당 stage의 문항 배열 |
| `sp(s)` | 해당 stage의 progress 객체 |

### 학습 로직
| 함수 | 설명 |
|------|------|
| `applyResult(id, ok)` | 정답/오답 처리, box 이동 |
| `masteryPct()` | 전체 숙련도 % |
| `subjMastery(s)` | 과목별 숙련도 |
| `dueCards()` | 복습할 문항 필터 |
| `weakCards()` | 취약 문항 필터 (box≤2 또는 오답>정답) |
| `weightedPick(pool, n)` | 가중 랜덤 샘플링 (약한 문항 우선) |
| `calcPassFail(answers, queue)` | 과락 판정 (40점/60점 기준) |

### 큐 빌드
| 함수 | 설명 |
|------|------|
| `buildQueue(mode, subject)` | 모드별 학습 큐 생성 |
| `buildBalancedExam()` | 과목 균등 모의고사 (1차: 8+8+9) |

### 뷰
| 함수 | 설명 |
|------|------|
| `topbar()` | 상단 네비 + 단계 표시 + 햄버거 |
| `renderDash()` | 홈 대시보드 |
| `renderMastery()` | 숙련도 히트맵 |
| `renderStatus()` | 통계 현황 |
| `renderStudy()` | 학습 카드 (정답 즉시 표시) |
| `renderExam()` | 모의고사 (채점 후 표시) |
| `renderEmpty()` | 빈 상태 안내 (2차 문항 없을 때) |

## questions.json 스키마

```javascript
{
  id: "civ-001",        // <과목코드>-<3자리>, 재사용 금지
  stage: 1,             // 1 또는 2
  type: "mcq",          // mcq | fill(예정) | essay(예정)
  q: "문제 본문",
  opt: ["①","②","③","④","⑤"],
  a: 3,                 // 0-based 인덱스. 3 = ④번
  ex: "해설 (<b>강조</b> 가능)",
  subject: "민법",
  article: null,        // { law, no, clause } 또는 null
  source: [{ type: "기출", year: 2022, no: 1 }],
  revised: null,        // ISO 날짜 또는 null
  diff: 2               // 1=기초, 2=표준(기본값), 3=심화
}
```

**과목 코드**: `civ`(민법), `rel`(부동산관계법규), `lca`(토지보상법규), `prc1`(보상실무1), `prc2`(보상실무2)

## 간격 반복 (Leitner Box)

```
정답 → box +1 (최대 5)
오답 → box = 1 (리셋)

box 0: 미학습 (즉시 복습 대상)
box 1: 1일 후 복습
box 2: 2일 후
box 3: 4일 후
box 4: 8일 후
box 5: 16일 후 (숙달)
```

숙련도 = `sum(모든 box) / (문항수 × 5) × 100`

## 과락 판정

```
과목별 점수 = correct / total × 100
과락 = 어느 한 과목이 40점 미만
불합격 = 과락 OR 평균 60점 미만
```

1차·2차 동일 규칙. `calcPassFail()` 함수 하나로 양쪽에 사용.

## 모의고사 균등 추출

1차 25문항: 과목별 8+8+9 (3과목 균등 분배)
2차 20문항: 과목별 10+10 (2과목 균등 분배)

특정 과목 문항이 부족하면 가능한 만큼만 추출 + 안내 표시.

## Service Worker

**전략**: Stale-While-Revalidate
- 캐시된 버전을 즉시 반환
- 백그라운드에서 네트워크 갱신
- 다음 실행 시 새 버전 반영
- 오프라인에서도 캐시로 동작

**캐시 버전**: `bosang-v6`

## 부팅 순서

```
1. fetch('questions.json') → BANK
2. BANK_MAP 생성 (O(1) 조회)
3. localStorage에서 curStage 복원
4. loadProgress() — 마이그레이션 자동 실행
5. saveProgress() — v5 형식 보장
6. render()
```

## 배포

GitHub Pages 정적 배포. 서버 불필요.

```
questions.json 편집 → git push → SW가 다음 실행 시 자동 갱신
```
