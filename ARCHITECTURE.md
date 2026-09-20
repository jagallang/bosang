# 아키텍처

보상드림(보상관리사 학습) PWA의 기술 구조 문서. v7.0.0 기준.

## 파일 구조

```
index.html              앱 전체 (UI + 로직, 1,064줄)
questions.json          문제은행 (323문항: 1차 264 + 2차 59)
service-worker.js       오프라인 캐시 (stale-while-revalidate)
manifest.webmanifest    PWA 메타데이터
icons/                  앱 아이콘 4종 + OG 미리보기 이미지
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
                  renderStudy() ──type분기──▶ renderEssay() (서술형)
                              │                    │
                              ▼                    ▼
                         applyResult()       gradeEssay() (키워드 자가채점)
                              │
                              ▼
                     gradeExam() → calcPassFail()
                              │
                              ▼
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
| `curPage` | `"home"\|"mastery"\|"status"\|"wrong"\|"feedback"` | 현재 화면 |
| `session` | object\|null | 진행 중인 학습 세션 |
| `filterDiff` | `0` | 난이도 필터 (현재 비활성, 항상 전체) |
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
| `renderMenu()` | 햄버거 메뉴 (단계 전환·오답노트·피드백·초기화) |
| `renderDash()` | 홈 대시보드 |
| `renderMastery()` | 숙련도 히트맵 |
| `renderStatus()` | 통계 현황 |
| `renderStudy()` | 학습 카드 — type 분기 (mcq/essay) |
| `renderExam()` | 모의고사 (채점 후 표시) |
| `renderEssay()` | 서술형 학습 (답안지→힌트→정답→채점) |
| `renderEmpty()` | 빈 상태 안내 |
| `renderWrong()` | 오답노트 |
| `renderFeedback()` | 의견 보내기 (이메일) |

### 서술형 (essay) 전용
| 함수 | 설명 |
|------|------|
| `revealHint(i)` | 답안지 슬롯 탭 → 키워드 힌트 공개 |
| `showFullAnswer()` | 모범답안 + 자가채점 체크리스트 표시 |
| `toggleKw(i)` | 키워드 체크/확신없음/미체크 3단계 토글 |
| `gradeEssay()` | 가중 합계 채점 (80% 이상 → 정답) |

## questions.json 스키마

### mcq (선택형, 1차)
```javascript
{
  id: "civ-001",        // <과목코드>-<3자리>, 재사용 금지
  stage: 1,             // 1 또는 2
  type: "mcq",          // mcq | fill(예정) | essay
  q: "문제 본문",
  opt: ["①","②","③","④","⑤"],
  a: 3,                 // 0-based 인덱스. 3 = ④번
  ex: "해설 (<b>강조</b> 가능)",
  subject: "민법",
  article: null,        // { law, no, clause } 또는 null
  source: [{ type: "기출", year: 2022, no: 1 }],
  revised: null,        // ISO 날짜 또는 null
  diff: 2               // 1=기초, 2=표준(기본값), 3=심화 (현재 비활성)
}
```

### essay (서술형, 2차)
```javascript
{
  id: "prc1-001",
  stage: 2,
  type: "essay",
  q: "문제 본문",
  model: "모범답안 전문 (줄바꿈 포함)",
  keywords: [
    { term: "핵심 키워드", weight: 1 }
  ],
  subject: "보상실무1",
  diff: 2,
  source: [{ type: "예상문제집", no: 1 }],
  article: null,
  revised: null
}
```

**과목 코드**: `civ`(민법), `rel`(부동산관계법규), `lca`(토지보상법규), `prc1`(보상실무1), `prc2`(보상실무2)

**현재 문항 분포**:
| 과목 | 코드 | 문항 수 | 타입 |
|------|------|---------|------|
| 민법 | civ | 45 | mcq |
| 부동산관계법규 | rel | 67 | mcq |
| 토지보상법규 | lca | 152 | mcq |
| 보상실무1 | prc1 | 59 | essay |
| 보상실무2 | prc2 | 0 | — |

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

### essay 채점
- 가중 합계: `score = sum(체크한 weight) / sum(전체 weight) × 100`
- 80% 이상 → 정답 (box +1)
- 80% 미만 → 오답 (box = 1)
- 체크/확신없음/미체크 3단계 (확신없음은 점수 미산입)

## 과락 판정

```
과목별 점수 = correct / total × 100
과락 = 어느 한 과목이 40점 미만
불합격 = 과락 OR 평균 60점 미만
```

1차·2차 동일 규칙. `calcPassFail()` 함수 하나로 양쪽에 사용.

## 모의고사

1차 25문항: 과목별 8+8+9 (3과목 균등 분배, mcq만)
2차: mcq 문항이 없으면 모의고사 비활성화

특정 과목 문항이 부족하면 가능한 만큼만 추출 + 안내 표시.

## 1차/2차 테마

- 1차: 차가운 회색 (`--bg:#E7EBEE`)
- 2차: 따뜻한 베이지 (`--bg:#EBE7E0`)
- `body[data-stage="2"]` CSS 오버라이드로 배경·카드·텍스트 톤 변경

## 카카오톡 대응

- **인앱브라우저 → 외부 브라우저**: User-Agent `KAKAOTALK` 감지 시 Android는 `intent://`로 크롬, iOS는 `kakaotalk://web/openExternal`로 Safari 이동
- **OG 미리보기**: `og:title`, `og:description`, `og:image`(1200×630) 메타태그

## 추가 기능

- **오답노트**: 틀린 문항 목록 (오답 많은 순), "다시 풀기" 버튼
- **피드백**: 유형 선택 + 텍스트 → `mailto:` 이메일 발송
- **버전 표시**: 메뉴 하단에 현재 버전

## Service Worker

**전략**: Stale-While-Revalidate
- 캐시된 버전을 즉시 반환
- 백그라운드에서 네트워크 갱신
- 다음 실행 시 새 버전 반영
- 오프라인에서도 캐시로 동작

**캐시 버전**: `bosang-v7`

## 부팅 순서

```
1. 카카오톡 인앱브라우저 감지 → 외부 브라우저 이동
2. fetch('questions.json') → BANK
3. BANK_MAP 생성 (O(1) 조회)
4. localStorage에서 curStage 복원
5. loadProgress() — 마이그레이션 자동 실행
6. saveProgress() — v5 형식 보장
7. render() — body[data-stage] 설정
```

## 배포

GitHub Pages 정적 배포. 서버 불필요.
URL: https://jagallang.github.io/bosang/

```
questions.json 편집 → git push → SW가 다음 실행 시 자동 갱신
```

## 현재 비활성 기능

- **난이도 필터**: HTML 주석 처리. 문항 난이도 분류 완료 후 복원 예정
- **fill (기입형)**: 렌더러 분기점만 존재, 구현 예정
- **보상실무2**: 과목 정의만 있고 문항 0개
