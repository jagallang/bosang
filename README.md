# 보상관리사 반복학습 (설치형 웹앱 / PWA)

보상관리사 시험 기출·교재 문제은행(264문항)을 간격 반복으로 학습하는 오프라인 지원 웹앱입니다.
휴대폰 홈 화면에 설치해 앱처럼 쓸 수 있습니다.

## 폴더 구성
```
index.html                 학습 앱 (UI·로직)
questions.json             문제은행 (264문항, 3과목)
manifest.webmanifest       앱 정보(이름·아이콘·색상)
service-worker.js          오프라인 캐시 (stale-while-revalidate)
icons/                     앱 아이콘 (192·512·maskable·apple)
scripts/                   변환·분석 스크립트 (개발용)
.nojekyll                  GitHub Pages 처리용(그대로 두세요)
```

## 문제은행 구조 (questions.json)

각 문항의 ID 체계: `<과목코드>-<3자리 일련번호>` (한번 부여한 번호는 재사용 금지)

| 과목 | 코드 | 문항 수 |
|------|------|---------|
| 민법 | `civ` | 45 |
| 부동산관계법규 | `rel` | 67 |
| 토지보상법규 | `lca` | 152 |

문항을 추가할 때는 `questions.json`만 편집하면 됩니다. `index.html`을 건드릴 필요가 없습니다.

```json
{
  "id": "lca-153",
  "q": "문제 본문",
  "opt": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],
  "a": 2,
  "ex": "해설 (<b>핵심</b> 강조 가능)",
  "subject": "토지보상법규",
  "article": { "law": "토지보상법", "no": "제34조" },
  "source": [{ "type": "기출", "year": 2022, "no": 1 }],
  "revised": "2026-09-18"
}
```

## GitHub Pages에 올리기 (약 5분)

### 방법 A — 웹에서 업로드 (가장 쉬움)
1. GitHub에서 **새 저장소(Repository)** 생성 → Public. 예: `bosang-quiz`
2. 저장소 화면에서 **Add file → Upload files** 클릭
3. 이 폴더 안의 **모든 파일**(index.html, manifest.webmanifest, service-worker.js, icons 폴더, .nojekyll)을 드래그해서 올리고 **Commit**
4. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main** / 폴더: **/(root)** → **Save**
5. 1~2분 뒤 주소가 생깁니다: `https://<사용자명>.github.io/<저장소명>/`

### 방법 B — git 사용
```bash
git init
git add .
git commit -m "보상관리사 학습 PWA"
git branch -M main
git remote add origin https://github.com/<사용자명>/<저장소명>.git
git push -u origin main
# 이후 Settings → Pages 에서 위 4번과 동일하게 설정
```

## 휴대폰에 설치하기
1. 폰 크롬(안드로이드)/사파리(아이폰)에서 위 GitHub Pages 주소 열기
2. 안드로이드 크롬: 메뉴(⋮) → **앱 설치** 또는 **홈 화면에 추가**
   아이폰 사파리: 공유 → **홈 화면에 추가**
3. 홈 화면 아이콘으로 실행하면 주소창 없이 앱처럼 열리고, 인터넷 없이도 작동합니다.

## 업데이트 방법
문제를 추가하거나 파일을 바꿀 때는:
1. `questions.json`을 편집하고 저장소에 푸시
2. 캐시는 **stale-while-revalidate** 전략으로 자동 갱신됩니다
   (캐시된 버전을 즉시 보여주고, 백그라운드에서 새 버전을 받아 다음 실행 시 반영)

## 참고
- **학습 진도**(숙련도·정답률·연속일)는 브라우저 저장소(localStorage)에 저장됩니다.
  같은 주소로 접속하는 한 유지되며, 다른 기기와 자동 동기화되지는 않습니다.
- 브라우저 데이터/캐시를 지우면 진도도 초기화됩니다.
- 첫 접속 이후에는 **오프라인**에서도 실행됩니다.
